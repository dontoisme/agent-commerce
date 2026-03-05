# Agent Commerce Protocol — CLI Transaction Layer

## Vision

CLI-based agents (Claude Code, Codex, etc.) can use tools but can't autonomously acquire paid services. The signup/payment flow is the last mile between "I recommend Asana" and "Asana is configured and ready."

Multiple production protocols exist (Stripe ACP, Google UCP/AP2, Visa TAP, Mastercard Agentic Tokens) but a critical gap remains: **no CLI-native transaction confirmation layer** that lets a terminal agent trigger secure payment approval (e.g., Touch ID) without leaving the terminal.

This project builds that missing layer.

## Project Structure

```
agent-commerce/
├── research/                    # Phase 1: Deep analysis docs
│   ├── 01-landscape.md          # Protocol landscape & comparison matrix
│   ├── 02-payment-protocols.md  # ACP, AP2, UCP, SPT, ATXP deep dives
│   ├── 03-identity-layer.md     # DID/VC, vaults, agent identity
│   ├── 04-cli-gap-analysis.md   # The specific gap: CLI confirmation UX
│   ├── 05-compliance.md         # PCI DSS, GDPR, liability
│   └── 06-opportunity-map.md    # Where to build, competitive positioning
├── spec/                        # Phase 2: Protocol spec
│   ├── README.md
│   ├── architecture.md
│   ├── confirmation-flow.md
│   └── integration-points.md
├── src/                         # Phase 3: Working prototype
│   ├── vault/                   # Local encrypted credential store
│   ├── confirm/                 # macOS Touch ID confirmation bridge
│   ├── adapters/                # Stripe, MCP adapter implementations
│   └── cli/                     # CLI commands
├── examples/                    # Demo flows
├── package.json
├── tsconfig.json
└── README.md
```

## Phases

1. **Research** — Deep analysis of protocols, identity, compliance, and the CLI gap
2. **Spec** — Architecture and protocol design for the CLI transaction layer
3. **Prototype** — TypeScript CLI + Swift Touch ID helper
4. **Documentation & Launch** — README, blog post, demo GIF

## Key References

- Stripe ACP: https://docs.stripe.com/agentic-commerce/protocol
- Stripe MCP: https://docs.stripe.com/mcp
- ACP GitHub: https://github.com/agentic-commerce-protocol/agentic-commerce-protocol
- AP2 GitHub: https://github.com/google-agentic-commerce/AP2
- UCP: https://ucp.dev/
- ACK: https://github.com/agentcommercekit/ack
- 1Password Agent SDK: https://developer.1password.com/docs/sdks/ai-agent/
- MCP Registry: https://registry.modelcontextprotocol.io/
