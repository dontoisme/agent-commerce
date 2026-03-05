import { execFile } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface ConfirmationRequest {
  service: string;
  amount: string;
  paymentMethod: string;
}

export interface ConfirmationResult {
  success: boolean;
  service?: string;
  amount?: string;
  error?: string;
}

const BINARY_PATHS = [
  resolve(__dirname, "../../bin/touchid-confirm"),
  resolve(__dirname, "../../../bin/touchid-confirm"),
];

function findBinary(): string {
  for (const p of BINARY_PATHS) {
    if (existsSync(p)) return p;
  }
  throw new Error(
    "Touch ID binary not found. Run: pnpm build:confirm"
  );
}

export function confirm(
  request: ConfirmationRequest
): Promise<ConfirmationResult> {
  const binary = findBinary();

  return new Promise((resolve, reject) => {
    execFile(
      binary,
      [
        "--service", request.service,
        "--amount", request.amount,
        "--method", request.paymentMethod,
      ],
      { timeout: 30_000 },
      (error, stdout, stderr) => {
        if (error && !stdout) {
          reject(new Error(`Touch ID process failed: ${stderr || error.message}`));
          return;
        }

        try {
          const result = JSON.parse(stdout.trim()) as ConfirmationResult;
          resolve(result);
        } catch {
          reject(new Error(`Invalid response from Touch ID: ${stdout}`));
        }
      }
    );
  });
}
