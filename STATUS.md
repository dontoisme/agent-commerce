# agent-pay — Project Status

**Last updated:** March 5, 2026

## What This Is

A CLI-native transaction confirmation layer for AI agent commerce. Lets terminal agents (Claude Code, Copilot CLI, Codex) trigger Touch ID-confirmed payments without leaving the terminal. Bridges existing protocols (Stripe ACP, SPTs) to the CLI surface that nobody else is building for.

## What's Done

### Phase 1: Research (6/6 complete)

Deep analysis backed by live web research across primary sources:

| Doc | Topic | Key Finding |
|-----|-------|-------------|
| `01-landscape.md` | Protocol comparison matrix | 7 active protocols, all focused on browser/API agents |
| `02-payment-protocols.md` | ACP, AP2, UCP, ATXP, TAP, MC, ACK deep dives | Stripe SPTs are the right primitive for CLI payments |
| `03-identity-layer.md` | 1Password, Keychain, Vault, DID/VC, CyberArk, Okta | macOS Touch ID works from CLI (underdocumented by Apple) |
| `04-cli-gap-analysis.md` | Browser vs CLI agent capabilities | Zero CLI payment infra exists; Purl/x402 are API-access only |
| `05-compliance.md` | PCI DSS v4.0.1, GDPR, agent liability | Touch ID confirmation = strong proof-of-authorization |
| `06-opportunity-map.md` | Strategic positioning | First mover in a specific gap; narrow but defensible |

### Phase 2: Spec (3/3 complete)

| Doc | Content |
|-----|---------|
| `architecture.md` | Component diagram, data flow, security model, trust boundaries |
| `confirmation-flow.md` | Touch ID integration, fallback chain, binary interface, future pluggable confirmers |
| `integration-points.md` | Stripe SPT flow, MCP registry extension proposal, credential delivery protocol |

### Phase 3: Prototype (5/5 complete)

| Component | File | Status |
|-----------|------|--------|
| Touch ID binary | `src/confirm/TouchIDConfirm.swift` | Compiles, triggers macOS biometric prompt |
| Touch ID bridge | `src/confirm/index.ts` | Node.js wrapper with timeout handling |
| Vault | `src/vault/index.ts` | macOS Keychain CRUD, payment method management |
| Stripe adapter | `src/adapters/stripe.ts` | SPT creation, PaymentIntent, test mode |
| MCP Registry | `src/adapters/mcp-registry.ts` | Service discovery with pricing (simulated catalog) |
| CLI | `src/cli/index.ts` | `discover`, `confirm`, `vault`, `status`, `services` commands |
| Barrel export | `src/index.ts` | Clean public API |

**Build status:** TypeScript compiles clean. Swift binary compiles clean. `pnpm dev -- services` and `pnpm dev -- discover linear` work.

### Phase 4: Docs (1/2 complete)

- README with vision, architecture diagram, quick start, status checklist
- E2E example flow in `examples/signup-for-service/`

## What's Left

### Must-do

1. **Live Stripe test-mode E2E** — Need a Stripe test key to exercise the full confirm → SPT → PaymentIntent flow end-to-end. The code is there, just needs a real API key to validate.

2. **Blog post: "The Missing Layer in Agent Commerce"** — The last open beads task. The research and framing are solid; this is mostly writing and editing. Could target Hacker News, dev Twitter, or a personal blog.

### Should-do

3. **MCP server mode** — Expose agent-pay as an MCP server so any MCP-compatible agent can call `discover`, `confirm`, etc. as tools. This is the natural distribution mechanism.

4. **GitHub publish** — Push to `dontoisme/agent-commerce`. README is ready. Might want to add a LICENSE file and clean up any test artifacts.

5. **Beads cleanup** — Close the 4 open epics (they're containers, all child tasks are done). The blog post task stays open.

### Nice-to-have

6. **Linux support** — FIDO2/passkey-based confirmation as an alternative to Touch ID. The `Confirmer` interface is designed to be pluggable.

7. **Real MCP registry integration** — Replace the simulated service catalog with queries to `registry.modelcontextprotocol.io` once pricing metadata is available.

8. **Demo GIF** — Record the full flow: `agent-pay discover linear` → Touch ID prompt → payment confirmation. Good for README and blog post.

## File Inventory

```
agent-commerce/
├── research/              # 6 deep-dive docs (complete)
│   ├── 01-landscape.md
│   ├── 02-payment-protocols.md
│   ├── 03-identity-layer.md
│   ├── 04-cli-gap-analysis.md
│   ├── 05-compliance.md
│   └── 06-opportunity-map.md
├── spec/                  # 3 spec docs (complete)
│   ├── README.md
│   ├── architecture.md
│   ├── confirmation-flow.md
│   └── integration-points.md
├── src/                   # Prototype (compiles clean)
│   ├── confirm/           # Swift Touch ID binary + Node.js bridge
│   ├── vault/             # macOS Keychain credential store
│   ├── adapters/          # Stripe + MCP registry
│   ├── cli/               # Commander-based CLI
│   └── index.ts           # Barrel export
├── examples/              # E2E demo walkthrough
├── bin/                   # Compiled Swift binary (gitignored)
├── package.json           # pnpm, TypeScript, Stripe, Commander
├── tsconfig.json
├── PLAN.md                # Original project plan
├── README.md              # Project overview
└── STATUS.md              # This file
```

## Task Tracking (beads)

```
Total: 20 tasks
Closed: 15
Open: 5 (4 epic containers + 1 blog post)
Blocked: 0
```

Run `bd list` or `bd ready` for current state.

## Key Decisions Made

- **Stripe over raw card processing** — Stays out of PCI scope entirely. Only tokenized references stored.
- **Swift binary over Node.js native module** — No mature Node.js binding for LocalAuthentication. Shell-out pattern is clean and proven.
- **macOS Keychain over custom encryption** — OS-level trust, biometric protection, device-bound. Why rebuild what Apple already ships?
- **Simulated registry over live API** — MCP registry doesn't have pricing metadata yet. Simulated catalog proves the concept; swap in real API later.
- **Commander over custom CLI parsing** — Standard, well-documented, handles subcommands cleanly.
