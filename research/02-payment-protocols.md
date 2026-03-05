# Payment Protocol Deep Dives

## 1. Stripe ACP + Shared Payment Tokens (SPTs)

### Architecture

ACP is a RESTful + MCP specification. Merchants implement four endpoints:

1. **Create Checkout** — Agent initiates a purchase session
2. **Update Checkout** — Agent modifies cart/shipping/payment
3. **Complete Checkout** — Agent finalizes purchase
4. **Cancel Checkout** — Agent abandons session

All endpoints return current checkout state. Secured via HTTPS + Bearer token auth + HMAC webhook signatures.

The MCP server at `https://mcp.stripe.com` exposes 30+ tools covering payment links, intents, refunds, customers, invoices, subscriptions, and products. Supports OAuth (granular permissions) or restricted API keys.

### Shared Payment Tokens (SPTs)

SPTs are scoped, expiring credential tokens that let agents pass payment methods to merchants without exposing raw card data.

```bash
# Creating an SPT (test mode)
curl https://api.stripe.com/v1/test_helpers/shared_payment/granted_tokens \
  -u "sk_test_...:" \
  -d payment_method=pm_card_visa \
  -d "usage_limits[currency]"=usd \
  -d "usage_limits[max_amount]"=10000 \
  -d "usage_limits[expires_at]"=1775332425 \
  -d "seller_details[network_id]"=internal

# Using an SPT to create a PaymentIntent
curl https://api.stripe.com/v1/payment_intents \
  -u "sk_test_...:" \
  -d amount=10000 \
  -d currency=usd \
  -d shared_payment_granted_token=spt_123 \
  -d confirm=true
```

**SPT constraints:** currency-locked, max amount, expiration timestamp, agent-revocable.

**Webhook events:** `shared_payment.granted_token.used`, `shared_payment.granted_token.deactivated`, plus mirror events on the agent side (`issued_token.*`).

### Integration for This Project

SPTs are the natural fit for the CLI confirmation layer. The flow would be:

1. User pre-authorizes a payment method in the vault
2. CLI triggers Touch ID confirmation
3. On confirmation, CLI creates an SPT with tight constraints
4. SPT is passed to the merchant's ACP endpoint
5. Merchant completes checkout using the SPT

---

## 2. Google AP2 (Agent Payments Protocol)

### Architecture (Four Layers)

1. **Discovery Layer** — Agents broadcast capabilities via `AgentCard` (pricing, SLAs, credential requirements)
2. **Negotiation Layer** — Structured messaging over A2A protocol for transaction terms
3. **Policy & Identity Layer** — Credential and compliance management via Verifiable Digital Credentials
4. **Settlement Rail** — Coinbase x402 stablecoin infrastructure

### Verifiable Digital Credentials (Three Mandate Types)

| Mandate | Purpose | Human Required? |
|---------|---------|-----------------|
| **Intent Mandate** | Defines what agent is authorized to purchase autonomously | No |
| **Cart Mandate** | Final basket + payment method + explicit user signature | Yes |
| **Payment Mandate** | Signals agent involvement to acquirers for risk/liability | Varies |

Each mandate is a tamper-evident, cryptographically signed VC establishing non-repudiation.

### Agent Wallets

Bind a DID + risk profile + payment policies. Three modes:
- **Escrowed** — restricted spending
- **Delegated** — bounded authority
- **Fully autonomous** — operates within pre-set policies

### x402 Integration (Coinbase)

Enables deterministic payment flows — deposits, milestone releases, refunds. Supports micro-settlements (fractions of a cent) for API calls, inference tokens, streaming data. Built-in compliance hooks for travel rule, sanctions screening, tax reporting.

### Tech Stack

Python 3.10+, Agent Development Kit (ADK), Gemini 2.5 Flash, `uv` package manager.

### Relevance to This Project

AP2's mandate system maps well to CLI confirmation — the Touch ID prompt is essentially creating a "Cart Mandate" with biometric proof. The mandate structure could be adopted as the confirmation token format.

---

## 3. UCP (Universal Commerce Protocol)

### Overview

UCP is the broadest coalition: Google, Shopify, Etsy, Wayfair, Target, Walmart, and 40+ endorsing partners (Adyen, Klarna, Stripe, PayPal, Mastercard, Visa, Salesforce, Best Buy, Gap, Macy's, Sephora, Ulta, The Home Depot).

### Multi-Transport Support

| Transport | Role |
|-----------|------|
| REST API | Primary for checkout and order operations |
| JSON-RPC | Alternative transport |
| AP2 | Secure payment handling with cryptographic verification |
| A2A | Inter-agent communication |
| MCP | AI/agent framework compatibility |
| OAuth 2.0 | Identity linking and account authorization |

### Core Capabilities

- **Checkout** — Complex cart logic, dynamic pricing, tax calculations
- **Identity Linking** — OAuth 2.0-based agent-to-user relationships without credential sharing
- **Order Management** — Real-time webhooks for status updates, tracking, returns

### Design Principles

Merchant-centric (retailers retain Merchant of Record status), surface-agnostic (chat, visual, voice), extensible for vertical-specific needs.

### Relevance to This Project

UCP is surface-agnostic by design — CLI is a valid surface. The CLI confirmation layer could implement UCP's checkout flow with Touch ID as the confirmation mechanism.

---

## 4. ATXP (Agent Transaction Protocol) — Circuit & Chisel

### Overview

Founded by Louis Amira (Stripe's former Head of Crypto & AI Partnerships) and David Noel-Romas (Stripe's former Head of Crypto Engineering). $19.2M seed funding (September 2025).

### How It Works

- When an AI agent calls an external API, ATXP prices and charges for each function call automatically
- Designed to run inside agent frameworks like MCP servers
- Enables instant, nested, delegated micropayments between AI agents
- Compatible with x402 (Coinbase's HTTP 402 stablecoin payment standard)

### Nested Delegation

Agents can delegate sub-tasks to other agents, each with bounded spending authority. Payment flows cascade through delegation chains.

### Key Differentiator vs x402

x402 operates at the HTTP request level (server returns 402, client pays via `X-PAYMENT` header). ATXP operates at the function-call level within agent frameworks, enabling finer-grained billing.

### Relevance to This Project

ATXP is relevant for agent-to-agent micropayments (e.g., agent paying for a premium API call). Less relevant for the primary use case (user-authorized service subscriptions) but important for the broader ecosystem context.

---

## 5. Visa TAP (Trusted Agent Protocol)

### Architecture (Five Components)

| Component | Tech | Port | Role |
|-----------|------|------|------|
| TAP Agent | Streamlit | 8501 | Generates RFC 9421 signatures |
| Merchant Frontend | React | 3001 | E-commerce interface |
| CDN Proxy | Node.js | 3002 | Intercepts & verifies signatures |
| Merchant Backend | FastAPI | 8000 | Processes verified requests |
| Agent Registry | Python | 8001 | Public key directory for agents |

### HTTP Message Signature Flow (RFC 9421)

1. Agent creates signature containing timestamp, session ID, key ID, algorithm, domain binding
2. CDN proxy intercepts request, fetches agent's public key from Registry
3. Proxy validates signature authenticity and temporal validity
4. Only verified requests pass to merchant backend
5. Signatures are domain-bound (can't reuse across merchants) and time-limited (prevents replay)

### Web Bot Auth

Built on Cloudflare's emerging Web Bot Auth standard. CDN-layer verification means merchants don't need to implement crypto themselves.

### Relevance to This Project

TAP's agent identity verification could be used to authenticate the CLI tool itself to merchants. The HTTP Message Signature pattern is a clean way to prove the CLI's identity.

---

## 6. Mastercard Agentic Tokens / Agent Pay

### How It Works

Builds on Mastercard's existing tokenization stack. Agent submits a Dynamic Token Verification Code — an agentic token formatted to fit standard card payment fields (card number, CVV, expiry). Merchants process it through existing checkout forms with **no integration changes**.

### Agent Registration

Agents must register with Mastercard's network using cryptographic tokens proving legitimacy. Only verified agents can initiate transactions.

### Purchase Intent Data

Mastercard is developing a Verifiable Credential standard with the FIDO Alliance that captures amount, merchant, product details, and consumer consent.

### Security

On-device biometrics for transaction verification. Every transaction tied to a specific agent interaction for audit trail.

### Relevance to This Project

Mastercard's biometric verification approach is the closest analog to what this project does with Touch ID. Their VC standard for purchase intent data could be adopted as the confirmation token format.

---

## 7. ACK (Agent Commerce Kit) — Catena Labs

### Architecture (Two Core Protocols)

| Protocol | Purpose | Standards |
|----------|---------|-----------|
| **ACK-ID** | Identity verification | W3C DIDs + Verifiable Credentials |
| **ACK-Pay** | Payment processing | Payment-rail agnostic |

### Payment Flow

1. Server issues "Payment Required" response
2. Client selects payment method
3. Client obtains a Verifiable Receipt (a VC proving payment)
4. Receipt grants access to protected content/service

### Tech Stack

TypeScript (99.8%), pnpm, Turborepo, Node.js 22+. Notably aligned with our preferred stack.

### Relevance to This Project

ACK is the closest in spirit — TypeScript-native, standards-based, rail-agnostic. Could serve as a dependency or integration target rather than a competitor.

---

## Sources

- [Stripe ACP Documentation](https://docs.stripe.com/agentic-commerce/protocol)
- [Stripe MCP Server](https://docs.stripe.com/mcp)
- [Stripe SPT Documentation](https://docs.stripe.com/agentic-commerce/concepts/shared-payment-tokens)
- [Google AP2 GitHub](https://github.com/google-agentic-commerce/AP2)
- [UCP.dev](https://ucp.dev/)
- [Circuit & Chisel ATXP Launch](https://www.prnewswire.com/news-releases/circuit--chisel-secures-19-2-million-and-launches-atxp-a-web-wide-protocol-for-agentic-payments-302562331.html)
- [Visa TAP Developer Portal](https://developer.visa.com/capabilities/trusted-agent-protocol/overview)
- [Visa TAP GitHub](https://github.com/visa/trusted-agent-protocol)
- [Mastercard Agent Pay](https://www.mastercard.com/us/en/business/artificial-intelligence/mastercard-agent-pay.html)
- [ACK GitHub](https://github.com/agentcommercekit/ack)
