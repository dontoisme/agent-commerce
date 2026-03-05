import Stripe from "stripe";
import { vaultGet } from "../vault/index.js";

/**
 * Stripe adapter — handles payment processing via Stripe's API.
 * Uses test mode by default. Supports creating payment intents
 * and managing Shared Payment Tokens (SPTs) for agent commerce.
 */

let stripeClient: Stripe | null = null;

async function getStripe(): Promise<Stripe> {
  if (stripeClient) return stripeClient;

  const apiKey = await vaultGet("stripe_secret_key");
  if (!apiKey) {
    throw new Error(
      "Stripe API key not configured. Run: agent-pay vault add --stripe-key"
    );
  }

  stripeClient = new Stripe(apiKey, {
    apiVersion: "2025-02-24.acacia",
  });
  return stripeClient;
}

export interface CreatePaymentRequest {
  amount: number; // in cents
  currency?: string;
  description: string;
  paymentMethodId: string;
  merchantName: string;
}

export interface PaymentResult {
  success: boolean;
  paymentIntentId?: string;
  status?: string;
  error?: string;
}

export async function createPayment(
  request: CreatePaymentRequest
): Promise<PaymentResult> {
  try {
    const stripe = await getStripe();

    const paymentIntent = await stripe.paymentIntents.create({
      amount: request.amount,
      currency: request.currency ?? "usd",
      description: request.description,
      payment_method: request.paymentMethodId,
      confirm: true,
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: "never",
      },
      metadata: {
        source: "agent-commerce-cli",
        merchant: request.merchantName,
      },
    });

    return {
      success: paymentIntent.status === "succeeded",
      paymentIntentId: paymentIntent.id,
      status: paymentIntent.status,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
}

export interface SetupPaymentMethodRequest {
  type: "card";
  card: {
    number: string;
    expMonth: number;
    expYear: number;
    cvc: string;
  };
}

/**
 * Creates a Stripe payment method from card details.
 * In production, card details would be collected via Stripe Elements
 * or a secure token — never sent through the CLI directly.
 * This is for test-mode demonstration only.
 */
export async function createPaymentMethod(
  request: SetupPaymentMethodRequest
): Promise<{ id: string; brand: string; last4: string }> {
  const stripe = await getStripe();

  const pm = await stripe.paymentMethods.create({
    type: "card",
    card: {
      number: request.card.number,
      exp_month: request.card.expMonth,
      exp_year: request.card.expYear,
      cvc: request.card.cvc,
    },
  });

  return {
    id: pm.id,
    brand: (pm.card?.brand as string) ?? "unknown",
    last4: pm.card?.last4 ?? "0000",
  };
}

/**
 * Creates a Shared Payment Token (SPT) for agentic commerce.
 * SPTs allow an agent to make a payment on behalf of a user
 * without exposing the full payment method details.
 *
 * Note: SPT API may not be publicly available yet — this is
 * based on Stripe's announced ACP specification.
 */
export interface SharedPaymentToken {
  id: string;
  paymentMethodId: string;
  expiresAt: number;
  allowedMerchants?: string[];
  maxAmount?: number;
}

export async function createSharedPaymentToken(opts: {
  paymentMethodId: string;
  maxAmount?: number;
  expiresInSeconds?: number;
  allowedMerchants?: string[];
}): Promise<SharedPaymentToken> {
  // SPT creation would go through Stripe's ACP API
  // For now, simulate the token structure
  const expiresAt = Math.floor(Date.now() / 1000) + (opts.expiresInSeconds ?? 3600);

  return {
    id: `spt_${randomId()}`,
    paymentMethodId: opts.paymentMethodId,
    expiresAt,
    allowedMerchants: opts.allowedMerchants,
    maxAmount: opts.maxAmount,
  };
}

function randomId(): string {
  return Array.from({ length: 24 }, () =>
    "abcdefghijklmnopqrstuvwxyz0123456789"[Math.floor(Math.random() * 36)]
  ).join("");
}
