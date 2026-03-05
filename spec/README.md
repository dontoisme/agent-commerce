# agent-pay Protocol Specification

This directory contains the protocol specification for the CLI-native transaction confirmation layer.

## Documents

- **[architecture.md](./architecture.md)** — System components, data flow, and security model
- **[confirmation-flow.md](./confirmation-flow.md)** — Touch ID integration and confirmation protocol
- **[integration-points.md](./integration-points.md)** — How agent-pay connects to ACP, Stripe SPTs, and MCP

## Design Principles

1. **PII never in agent context** — The agent sees opaque tokens, never raw payment data
2. **Human-in-the-loop always** — Every payment requires biometric confirmation
3. **Leverage existing infrastructure** — Stripe for payments, Keychain for storage, Touch ID for auth
4. **Local-first** — All sensitive data stays on the user's machine
5. **Protocol-agnostic** — Designed to work with ACP, UCP, or any future checkout protocol
