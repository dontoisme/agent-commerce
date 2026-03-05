# The CLI Confirmation Gap

## Current State: Browser Agents Can Shop, CLI Agents Cannot

### Browser-Based Agent Commerce (Production)

Three major platforms have launched consumer-facing agent shopping:

**ChatGPT Instant Checkout (OpenAI + Stripe)**
- Launched September 2025; expanded to all US users (including free tier) February 2026
- Users tap "Buy," confirm order/shipping/payment, complete purchase without leaving chat
- Built on ACP, co-developed with Stripe
- Live with Etsy; 1M+ Shopify merchants coming (Glossier, SKIMS, Spanx, Vuori)
- OpenAI charges 4% transaction fee on top of Stripe's ~2.9% + $0.30
- 700 million weekly ChatGPT users have access

**Perplexity Buy with Pro**
- Partners with PayPal across 5,000+ merchants and Firmly.ai for fulfillment
- Includes "Snap to Shop" visual search
- 5x increase in shopping-intent queries since launch

**Google AI Mode Shopping**
- Checkout within AI Mode in Search and Gemini via Google Pay / Google Wallet
- "Business Agent" lets shoppers chat with brands on Search
- During Cyber Week 2025, AI agents influenced 20% of all orders ($67B in global sales)

### CLI Agent Commerce (Non-existent)

CLI-based coding agents (Claude Code, GitHub Copilot CLI, Codex CLI) have **zero native purchasing capabilities**. Their scope:

- Code generation, editing, debugging, deployment
- File system operations, git workflows, CI/CD
- Tool integration via MCP — extensible to databases, APIs, some payment processors
- GitHub Copilot CLI reached GA February 25, 2026 with custom MCP support but no commerce features

## The Gap Visualized

| Capability | Browser Agents | CLI Agents |
|---|---|---|
| Product/service discovery | Yes | No |
| Price comparison | Yes | No |
| Checkout flow | Yes (ACP, UCP) | No |
| Payment processing | Yes (Stripe, PayPal, Google Pay) | Purl/x402 only (API access) |
| Purchase confirmation | Yes (in-chat) | **No standard UX** |
| Post-purchase support | Yes (UCP) | No |
| Credential delivery | N/A (browser handles auth) | **No standard flow** |

## Prior Art: Almost-There Projects

### Stripe Purl CLI

[github.com/stripe/purl](https://github.com/stripe/purl) — Open-source CLI tool combining "payments" + "curl." Supports HTTP requests that require payment via x402. Currently limited to USDC stablecoin payments on Base.

**Why it's not enough:** Oriented toward API access payment, not product purchasing or service subscriptions.

### x402 Protocol (Coinbase + Cloudflare)

Revives HTTP 402 Payment Required status code. Flow: client requests resource -> server returns 402 -> client pays in USDC -> server grants access.

**Why it's not enough:** Machine-to-machine transactions with no human confirmation. Designed for API monetization, not retail/SaaS subscriptions.

### Stripe Machine Payments (Preview)

Lets developers charge autonomous agents via PaymentIntents API. Supports API access, MCP calls, or HTTP requests.

**Why it's not enough:** Agent-to-service payments (paying for API access), not user-authorized service subscriptions.

## The Specific UX Problem

Today's flow when a CLI agent recommends a paid tool:

```
1. Agent: "I recommend Linear for project management"
2. User: "Set it up"
3. Agent: "You'll need to sign up at linear.app and..."
4. User: [opens browser]
5. User: [creates account, enters payment info, configures settings]
6. User: [copies API key]
7. User: [returns to terminal, configures MCP server manually]
```

Steps 4-7 take 5-15 minutes and break the flow entirely. The agent's recommendation creates friction instead of resolving it.

## The Proposed Flow

```
1. Agent: "I recommend Linear for project management. Want me to set it up?"
2. User: "Yes"
3. Agent: agent-pay discover linear
   → "Linear — $8/mo — Project management and issue tracking"
4. Agent: agent-pay confirm linear "$8/mo"
   → [Touch ID prompt appears on screen]
   → "Confirm $8/mo subscription to Linear using Visa ****4242"
5. User: [touches fingerprint sensor]
6. Agent receives: { success: true, credentials: { apiKey: "lin_..." } }
7. Agent configures Linear MCP server automatically
```

Total time: ~10 seconds. Zero context switching.

## Technical Feasibility

### macOS Touch ID from CLI: Proven

The `LocalAuthentication` framework works from CLI processes. The system presents a Touch ID dialog regardless of caller type. Our Swift helper binary compiles and triggers biometric prompts successfully (see `src/confirm/TouchIDConfirm.swift`).

### Stripe SPTs: Production-Ready

Shared Payment Tokens provide the exact primitive needed — scoped, expiring payment credentials that never expose raw card data. Test mode available.

### MCP Service Discovery: Partially Available

The MCP registry at `registry.modelcontextprotocol.io` lists available servers, but doesn't include pricing or signup flows. This is a gap in the MCP ecosystem itself.

### Credential Delivery: Missing Standard

No standard exists for a service to deliver API credentials to an agent after purchase. This would need to be part of the ACP flow (as a post-checkout callback) or handled via a separate credential exchange protocol.

## What Needs to Be Built

| Component | Exists? | What's Needed |
|-----------|---------|---------------|
| Touch ID confirmation from CLI | Partially (reference code) | Production Swift binary with JSON I/O |
| Payment method vault | Partially (Keychain) | Node.js wrapper with vault management |
| Stripe SPT creation | Yes (Stripe API) | Adapter connecting confirmation to SPT |
| Service discovery | Partially (MCP registry) | Enhanced registry with pricing/signup info |
| Credential delivery | No | Post-purchase credential exchange protocol |
| CLI commands | No | Commander-based CLI tying everything together |

## Sources

- [ChatGPT Instant Checkout](https://openai.com/index/buy-it-in-chatgpt/)
- [Perplexity Buy with Pro](https://www.perplexity.ai/hub/blog/shop-like-a-pro)
- [Google Agentic Commerce](https://blog.google/products/ads-commerce/agentic-commerce-ai-tools-protocol-retailers-platforms/)
- [Stripe Purl GitHub](https://github.com/stripe/purl)
- [x402 Protocol](https://www.coinbase.com/developer-platform/discover/launches/x402)
- [GitHub Copilot CLI GA](https://github.blog/changelog/2026-02-25-github-copilot-cli-is-now-generally-available/)
- [Agentic Terminal — CLI Agents (InfoQ)](https://www.infoq.com/articles/agentic-terminal-cli-agents/)
