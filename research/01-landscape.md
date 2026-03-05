# Protocol Landscape & Comparison Matrix

## Active Agent Commerce Protocols (March 2026)

The agent commerce space has rapidly matured since mid-2025. Seven major protocols are in active development or production, backed by the largest companies in payments, cloud, and AI.

## Comparison Matrix

| Protocol | Backer | Transport | Human-in-Loop | Payment Rail | Maturity | Live Txns? |
|----------|--------|-----------|---------------|-------------|----------|------------|
| **Stripe ACP** | Stripe + OpenAI | REST, MCP | SPT approval | Card (Stripe) | Production | Yes (ChatGPT) |
| **Google AP2** | Google + Coinbase | A2A, REST | VDC mandates | Card, crypto (x402) | Early production | Limited |
| **UCP** | Google, Shopify, 40+ | REST, MCP, A2A, AP2 | OAuth | Any (via AP2/ACP) | Production | Yes (40+ partners) |
| **ATXP** | Circuit & Chisel | MCP-native | Autonomous | Stablecoin (x402) | Early production | Yes |
| **Visa TAP** | Visa | HTTP (RFC 9421) | CDN verification | Card (Visa) | Pilot | Yes (limited) |
| **MC Agent Pay** | Mastercard | Existing checkout | Biometric | Card (Mastercard) | Production | Yes (all US) |
| **ACK** | Catena Labs | REST | DID/VC | Rail-agnostic | Pre-production | No |

## Timeline

| Date | Event |
|------|-------|
| Apr 2025 | Mastercard Agent Pay Programme launched |
| Sep 2025 | Stripe ACP + ChatGPT Instant Checkout launched |
| Sep 2025 | Google AP2 announced with Coinbase (60+ partners) |
| Sep 2025 | Circuit & Chisel raises $19.2M, launches ATXP |
| Sep 2025 | Mastercard first live agent transaction |
| Oct 2025 | Visa TAP announced, reference implementation open-sourced |
| Nov 2025 | Mastercard enables all US cardholders |
| Jan 2026 | UCP announced at NRF with Google, Shopify, 40+ partners |
| Feb 2026 | ChatGPT Instant Checkout expanded to all US users (free tier) |
| Feb 2026 | ACK v0.10.1 released |
| Mar 2026 | Visa TAP pilots in Asia Pacific and Europe |
| Mar 2026 | Mastercard + Santander partnership announced |

## Strategic Positioning

**Stripe** owns the payment processing layer. ACP is designed so Stripe processes every transaction regardless of which agent initiates it. The MCP server at `mcp.stripe.com` makes integration trivial for agent developers.

**Google** is playing the aggregator role. UCP is the broadest coalition (40+ partners including Stripe, Visa, Mastercard, PayPal), while AP2 is the cryptographic payment layer underneath. They're positioning as the protocol layer that connects everything.

**Visa and Mastercard** are extending their existing card network infrastructure. Visa's approach is more innovative (HTTP signatures, CDN-layer verification), while Mastercard's is more pragmatic (dynamic tokens that fit existing checkout forms with zero merchant changes).

**Circuit & Chisel** (ex-Stripe crypto team) is the only pure-play startup. ATXP targets agent-to-agent micropayments — a use case the card networks aren't well-suited for.

**Catena Labs** (ACK) is the standards purist — W3C DIDs, VCs, rail-agnostic. TypeScript-native. The most developer-friendly but least adopted.

## Key Observation

Every protocol focuses on the **browser/API agent** use case. No protocol addresses the **CLI agent** confirmation UX — the gap this project fills.
