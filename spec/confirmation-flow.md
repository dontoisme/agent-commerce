# Confirmation Flow

## Overview

The confirmation flow is the core UX innovation — a biometric payment approval that works from the terminal without requiring a browser.

## macOS Touch ID Integration

### Swift Helper Binary

A compiled Swift binary (`bin/touchid-confirm`) handles the biometric interaction:

```
agent-pay CLI (Node.js)
    │
    ├── execFile("bin/touchid-confirm", [
    │     "--service", "Linear",
    │     "--amount", "$8/mo",
    │     "--method", "Visa ****4242"
    │   ])
    │
    ▼
touchid-confirm (Swift)
    │
    ├── LAContext.evaluatePolicy(.deviceOwnerAuthenticationWithBiometrics)
    │
    ├── macOS presents Touch ID dialog:
    │   ┌─────────────────────────────────────┐
    │   │  Touch ID                            │
    │   │                                     │
    │   │  Confirm $8/mo payment to Linear    │
    │   │  using Visa ****4242                │
    │   │                                     │
    │   │  [Cancel]          [Use Password]   │
    │   └─────────────────────────────────────┘
    │
    ├── User touches fingerprint sensor
    │
    ▼
    stdout → {"success": true, "service": "Linear", "amount": "$8/mo"}
```

### Fallback Chain

1. **Touch ID** — Primary (`.deviceOwnerAuthenticationWithBiometrics`)
2. **System password** — If Touch ID unavailable (`.deviceOwnerAuthentication`)
3. **Error** — If no auth method available, return error JSON

### Binary Interface

**Input:** Command-line arguments
```
touchid-confirm --service "Linear" --amount "$8/mo" --method "Visa ****4242"
```

**Output:** JSON to stdout
```json
// Success
{"success": true, "service": "Linear", "amount": "$8/mo"}

// Failure
{"success": false, "error": "User canceled authentication"}
```

**Exit codes:**
- `0` — Authentication completed (check `success` field for result)
- `1` — System error (no auth method available)

### Timeout

The Swift binary has no timeout — it waits for the user to complete or cancel the Touch ID prompt. The Node.js caller sets a 30-second timeout to prevent indefinite hangs.

## Confirmation Token

The confirmation result is NOT a payment token — it's proof that the user authorized this specific transaction. The actual payment is processed separately via Stripe.

### What the Confirmation Proves

1. The user was **physically present** (biometric verification)
2. The user **saw the transaction details** (displayed in Touch ID prompt)
3. The user **explicitly approved** (touched the sensor)
4. The approval was for a **specific transaction** (service, amount, method)

### What Happens After Confirmation

```
Confirmation succeeds
    │
    ├── CLI reads payment method from vault
    │   └── pm_xxx (Stripe payment method ID)
    │
    ├── CLI creates SPT via Stripe API
    │   ├── payment_method: pm_xxx
    │   ├── max_amount: 800 (cents)
    │   ├── currency: usd
    │   └── expires_at: now + 5 minutes
    │
    ├── CLI uses SPT to create PaymentIntent
    │   ├── amount: 800
    │   ├── currency: usd
    │   ├── shared_payment_granted_token: spt_xxx
    │   └── confirm: true
    │
    ├── On payment success:
    │   ├── Return credentials to agent
    │   └── Optionally store credentials in vault
    │
    └── On payment failure:
        └── Return error to agent
```

## Future: Pluggable Confirmers

The confirmation interface is designed to be replaceable:

```typescript
interface Confirmer {
  confirm(request: ConfirmationRequest): Promise<ConfirmationResult>;
}

interface ConfirmationRequest {
  service: string;
  amount: string;
  paymentMethod: string;
}

interface ConfirmationResult {
  success: boolean;
  error?: string;
}
```

Potential implementations:
- **FIDO2/WebAuthn** — YubiKey or platform authenticator
- **Passkey** — macOS/iOS passkey APIs
- **PIN** — Simple PIN code for environments without biometrics
- **SSH Agent** — Reuse SSH key for confirmation (lower security)

## Security Considerations

### Replay Protection

Each Touch ID confirmation is bound to the specific transaction details shown in the prompt. There's no reusable "confirmation token" — the approval is consumed immediately to create a time-limited SPT.

### Prompt Injection

An attacker could try to manipulate the service name or amount to trick the user. Mitigations:
- The Touch ID prompt shows the actual values being confirmed
- The user must verify the details match their intent
- The CLI validates amounts against the service registry

### Process Isolation

The Swift binary runs as a separate process. The Node.js CLI cannot access the Touch ID result without the user completing the biometric check. There's no way to programmatically "approve" the confirmation.
