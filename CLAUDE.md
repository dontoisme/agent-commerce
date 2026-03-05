# agent-commerce — Claude Context

## Task Tracking

This project uses `bd` (beads) for task management with dependency tracking.

**Every session:**
1. Run `bd ready` to see what's unblocked
2. Run `bd list` for the full picture
3. Claim work with `bd update <id> --claim`
4. Close work with `bd close <id> --comment "what was done"`

**After closing tasks, update `STATUS.md`** — this is the human-readable project dashboard. Keep it accurate: what's done, what's left, what's blocked, and the critical path.

## Project Goal

Ship to Show HN. The bar: would Patrick Collison think "this is badass" if he found it.

## Critical Path

```
Stripe E2E + MCP Server Mode → Demo GIF → Blog Post → Show HN → Awesome Lists
```

## Key Technical Decisions

- Swift binary for Touch ID (no Node.js native binding exists)
- macOS Keychain for vault (OS-level trust, biometric protection)
- Stripe SPTs for payments (stays out of PCI scope)
- Simulated MCP registry (real registry lacks pricing metadata)
- Commander for CLI, chalk/ora for terminal UX
