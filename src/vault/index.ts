import { execFile } from "node:child_process";

/**
 * Vault module — stores and retrieves payment method tokens and service
 * credentials using macOS Keychain as the backing store.
 *
 * Never stores raw card numbers — only Stripe payment method IDs and
 * service API keys/tokens.
 */

const KEYCHAIN_SERVICE = "com.agent-commerce.vault";

interface KeychainEntry {
  account: string;
  data: string;
}

function security(
  args: string[]
): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile("/usr/bin/security", args, (error, stdout, stderr) => {
      if (error) {
        // "could not be found" is expected when key doesn't exist
        if (stderr?.includes("could not be found")) {
          resolve("");
          return;
        }
        reject(new Error(stderr || error.message));
        return;
      }
      resolve(stdout.trim());
    });
  });
}

export async function vaultSet(
  key: string,
  value: string
): Promise<void> {
  // Delete existing entry if present (update = delete + add)
  try {
    await security([
      "delete-generic-password",
      "-s", KEYCHAIN_SERVICE,
      "-a", key,
    ]);
  } catch {
    // Ignore — may not exist
  }

  await security([
    "add-generic-password",
    "-s", KEYCHAIN_SERVICE,
    "-a", key,
    "-w", value,
    "-U", // update if exists
  ]);
}

export async function vaultGet(
  key: string
): Promise<string | null> {
  const result = await security([
    "find-generic-password",
    "-s", KEYCHAIN_SERVICE,
    "-a", key,
    "-w",
  ]);
  return result || null;
}

export async function vaultDelete(key: string): Promise<void> {
  await security([
    "delete-generic-password",
    "-s", KEYCHAIN_SERVICE,
    "-a", key,
  ]);
}

export async function vaultList(): Promise<string[]> {
  // security dump-keychain doesn't filter well, so we maintain a key index
  const index = await vaultGet("__vault_index__");
  if (!index) return [];
  return JSON.parse(index) as string[];
}

async function updateIndex(fn: (keys: string[]) => string[]): Promise<void> {
  const current = await vaultList();
  const updated = fn(current);
  await vaultSet("__vault_index__", JSON.stringify(updated));
}

export async function vaultStore(
  key: string,
  value: string
): Promise<void> {
  await vaultSet(key, value);
  await updateIndex((keys) =>
    keys.includes(key) ? keys : [...keys, key]
  );
}

export async function vaultRemove(key: string): Promise<void> {
  await vaultDelete(key);
  await updateIndex((keys) => keys.filter((k) => k !== key));
}

export interface PaymentMethod {
  id: string; // Stripe payment method ID (pm_...)
  brand: string; // visa, mastercard, etc.
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
}

export async function getPaymentMethods(): Promise<PaymentMethod[]> {
  const raw = await vaultGet("payment_methods");
  if (!raw) return [];
  return JSON.parse(raw) as PaymentMethod[];
}

export async function addPaymentMethod(
  method: PaymentMethod
): Promise<void> {
  const methods = await getPaymentMethods();
  // If this is the first method or marked default, clear other defaults
  if (method.isDefault || methods.length === 0) {
    for (const m of methods) m.isDefault = false;
    method.isDefault = true;
  }
  methods.push(method);
  await vaultSet("payment_methods", JSON.stringify(methods));
}

export async function getDefaultPaymentMethod(): Promise<PaymentMethod | null> {
  const methods = await getPaymentMethods();
  return methods.find((m) => m.isDefault) ?? methods[0] ?? null;
}
