# agent-pay

**The missing CLI transaction layer for AI agent commerce.**

CLI agents like Claude Code and GitHub Copilot can recommend tools — but can't buy them. The signup/payment flow is the last mile between "I recommend Linear" and "Linear is configured and ready."

agent-pay bridges that gap with Touch ID-confirmed payments, right from the terminal.

## The Problem

```
Agent: "I recommend Linear for project management"
User:  "Set it up"
Agent: "You'll need to sign up at linear.app and..."
User:  [opens browser, creates account, enters payment, copies API key, returns to terminal...]
```

That's 5-15 minutes of context switching. Every time.

## The Solution

```
Agent: "I recommend Linear. Want me to set it up?"
User:  "Yes"

$ agent-pay confirm linear "$8/mo"

  Touch ID prompt: "Confirm $8/mo payment to Linear using Visa ****4242"
  [user touches fingerprint sensor]

  ✔ Payment confirmed
  ✔ Linear configured via MCP

Total time: ~10 seconds.
```

## How It Works

```
Agent → agent-pay CLI → Touch ID → Stripe SPT → Payment → Credentials → MCP Config
```

1. Agent discovers service via registry (`agent-pay discover linear`)
2. CLI triggers macOS Touch ID with transaction details
3. User confirms with fingerprint (biometric proof of authorization)
4. CLI creates a time-limited Stripe Shared Payment Token
5. Payment processed via Stripe
6. Service credentials returned to agent
7. Agent configures MCP server automatically

**Security:** Your card data never touches the agent. The CLI stores only Stripe payment method tokens in macOS Keychain. Touch ID ensures every payment has biometric authorization.

## Architecture

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  CLI Agent   │────▶│  agent-pay   │────▶│   Stripe     │
│              │     │              │     │              │
│ Claude Code  │     │ ┌──────────┐ │     │ SPTs         │
│ Copilot CLI  │     │ │ Touch ID │ │     │ Payments     │
│ Codex        │     │ │ Vault    │ │     │ Webhooks     │
│              │     │ │ Registry │ │     │              │
└──────────────┘     └──────────────┘     └──────────────┘
                            │
                     ┌──────┴──────┐
                     │ macOS       │
                     │ Keychain    │
                     └─────────────┘
```

## Quick Start

### Prerequisites

- macOS with Touch ID
- Node.js 20+
- pnpm

### Install

```bash
git clone https://github.com/yourusername/agent-commerce.git
cd agent-commerce
pnpm install
pnpm build
pnpm build:confirm  # Compile Swift Touch ID binary
```

### Setup

```bash
# Add Stripe test API key
pnpm dev -- vault add --stripe-key sk_test_xxx

# Add test payment method
pnpm dev -- vault add --test-card
```

### Use

```bash
# Discover services
pnpm dev -- discover linear

# Confirm a payment (triggers Touch ID)
pnpm dev -- confirm linear "$8/mo"

# List payment methods
pnpm dev -- vault list

# Check status
pnpm dev -- status
```

## CLI Commands

| Command | Description |
|---------|-------------|
| `agent-pay discover <query>` | Search for available services |
| `agent-pay services` | List all available services |
| `agent-pay confirm <service> <amount>` | Confirm payment with Touch ID |
| `agent-pay vault add` | Add payment method or credential |
| `agent-pay vault list` | List stored payment methods |
| `agent-pay vault remove <key>` | Remove stored credential |
| `agent-pay status` | Show configuration status |

## Project Structure

```
agent-commerce/
├── research/           # Deep analysis of the agent commerce landscape
├── spec/               # Protocol specification
├── src/
│   ├── confirm/        # Touch ID Swift binary + Node.js bridge
│   ├── vault/          # macOS Keychain credential store
│   ├── adapters/       # Stripe + MCP registry adapters
│   └── cli/            # CLI commands (Commander)
├── examples/           # E2E demo flows
└── bin/                # Compiled binaries (gitignored)
```

## Research

This project is backed by deep research into the agent commerce ecosystem:

- [01 - Protocol Landscape](./research/01-landscape.md) — Comparison of ACP, AP2, UCP, ATXP, TAP, and more
- [02 - Payment Protocols](./research/02-payment-protocols.md) — Deep dives with code examples
- [03 - Identity Layer](./research/03-identity-layer.md) — 1Password, Keychain, Vault, DID/VC
- [04 - CLI Gap Analysis](./research/04-cli-gap-analysis.md) — Why this project needs to exist
- [05 - Compliance](./research/05-compliance.md) — PCI DSS, GDPR, agent liability
- [06 - Opportunity Map](./research/06-opportunity-map.md) — Strategic positioning

## Why This Matters

Browser agents can shop. CLI agents can't. The protocols exist (Stripe ACP, Google UCP). The payment rails exist (Stripe SPTs). The identity layer exists (Touch ID, Keychain). The missing piece is a 10-second UX that connects them — and that's what this project builds.

## Status

- [x] Research — 6 deep-dive documents
- [x] Spec — Architecture, confirmation flow, integration points
- [x] Touch ID — Swift binary compiles and triggers biometric prompt
- [x] Vault — macOS Keychain integration
- [x] Stripe adapter — SPT creation and payment processing
- [x] CLI — All commands functional
- [ ] Live Stripe test-mode E2E (requires Stripe test key)
- [ ] MCP server mode (expose as MCP tools)
- [ ] Linux support (FIDO2/passkey confirmation)

## License

MIT
