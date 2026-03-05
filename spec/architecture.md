# System Architecture

## Components

```
┌─────────────────────────────────────────────────────────────┐
│                        CLI Agent                            │
│  (Claude Code, Copilot CLI, Codex, etc.)                    │
│                                                             │
│  "I recommend Linear. Want me to set it up?"                │
│  → calls: agent-pay confirm linear $8/mo                    │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                     agent-pay CLI                            │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────┐ │
│  │ Registry │  │ Confirmer│  │  Vault   │  │  Adapters  │ │
│  │          │  │          │  │          │  │            │ │
│  │ discover │  │ Touch ID │  │ Keychain │  │ Stripe     │ │
│  │ search   │  │ fallback │  │ pm tokens│  │ MCP        │ │
│  │ list     │  │ FIDO2    │  │ api keys │  │ (future)   │ │
│  └──────────┘  └──────────┘  └──────────┘  └────────────┘ │
└─────────────────────────┬───────────────────────────────────┘
                          │
              ┌───────────┴───────────┐
              ▼                       ▼
┌──────────────────────┐  ┌──────────────────────┐
│   macOS Keychain     │  │   Stripe API         │
│   (local storage)    │  │   (payment processing)│
│                      │  │                      │
│   - PM tokens (pm_)  │  │   - SPT creation     │
│   - API keys         │  │   - PaymentIntents   │
│   - Service creds    │  │   - Webhooks         │
└──────────────────────┘  └──────────────────────┘
```

## Component Responsibilities

### Registry

Discovers available services and their pricing. Queries the MCP registry (or a local service catalog) for:
- Service name and description
- Pricing (amount, currency, interval)
- MCP server configuration template
- Signup requirements

### Confirmer

Triggers human-in-the-loop payment confirmation:
- Presents transaction details to the user (service, amount, payment method)
- Triggers biometric authentication (Touch ID on macOS)
- Returns a confirmation result (success/failure + metadata)
- Falls back to system password if biometrics unavailable

The Confirmer is a **pluggable interface** — Touch ID is the initial implementation, but FIDO2 keys, YubiKey, or passkey APIs could be added.

### Vault

Encrypted local credential store backed by macOS Keychain:
- Stores Stripe payment method IDs (`pm_...`) — never raw card numbers
- Stores service API keys and credentials received post-purchase
- Stores user preferences (default payment method)
- Maintains a key index for listing stored items

### Adapters

Connect to payment processors and service providers:
- **Stripe adapter** — Creates SPTs, processes payments via PaymentIntents API
- **MCP Registry adapter** — Queries available services and pricing
- Future adapters: direct ACP merchant integration, UCP checkout

## Data Flow

### Purchase Flow

```
1. Agent calls: agent-pay confirm linear $8/mo
2. CLI loads default payment method from Vault (pm_xxx, Visa ****4242)
3. CLI calls Confirmer with transaction details
4. Swift binary triggers Touch ID: "Confirm $8/mo payment to Linear using Visa ****4242"
5. User authenticates with fingerprint
6. Confirmer returns { success: true }
7. CLI calls Stripe adapter to create SPT with constraints:
   - payment_method: pm_xxx
   - max_amount: 800 (cents)
   - currency: usd
   - expires_at: now + 5 minutes
8. SPT is used to create PaymentIntent via Stripe
9. On success, CLI returns credentials to agent
10. Agent configures MCP server with returned credentials
```

### Vault Operations (No Network)

```
agent-pay vault add --test-card    → stores PM token in Keychain
agent-pay vault list               → reads PM index from Keychain
agent-pay vault remove <key>       → deletes from Keychain
```

## Security Model

### Principle: PII Never in Agent Context

The agent (Claude Code, Copilot, etc.) never sees:
- Card numbers, CVVs, or expiration dates
- Raw Stripe API keys
- User's personal information

The agent only sees:
- Service name and price (from registry)
- Confirmation result (success/failure)
- Service credentials (API key for the purchased service)
- MCP server configuration

### Trust Boundaries

```
┌─────────────────────────────────────────────┐
│  Agent Context (untrusted)                   │
│  - Sees: service name, price, result         │
│  - Cannot: access vault, create payments     │
├─────────────────────────────────────────────┤
│  agent-pay CLI (trusted, runs as user)       │
│  - Can: read vault, call Stripe, trigger     │
│    Touch ID                                  │
│  - Cannot: bypass Touch ID, access raw       │
│    card data                                 │
├─────────────────────────────────────────────┤
│  macOS Keychain (OS-level trust)             │
│  - Biometric-protected entries               │
│  - Device-bound, non-exportable              │
├─────────────────────────────────────────────┤
│  Stripe API (PCI-compliant infrastructure)   │
│  - Handles all actual card processing        │
│  - SPTs scope and expire payment authority   │
└─────────────────────────────────────────────┘
```

### What the CLI Stores (and Doesn't)

| Data | Stored? | Where | PCI Scope? |
|------|---------|-------|------------|
| Card numbers | Never | — | — |
| Payment method IDs (pm_) | Yes | Keychain | No (tokenized) |
| Stripe API key | Yes | Keychain | No (merchant credential) |
| Service API keys | Yes | Keychain | No |
| Transaction history | No | — | — |
| User PII | No | — | — |
