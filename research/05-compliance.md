# Compliance & Legal

## PCI DSS v4.0.1 for Agent Payments

PCI DSS v4.0.1 took effect January 1, 2025, with 51 future-dated requirements becoming mandatory March 31, 2025. The PCI Security Standards Council has published specific AI guidance.

**Core mandate:** "Use of AI does not remove or bypass the need to meet the requirements of any applicable PCI SSC standard."

### Requirements Applicable to Agent Payment Systems

| Requirement | Application to AI Agents |
|---|---|
| Req 1 (Network Security) | Agent infrastructure in scope if it touches payment data |
| Req 3 (Data at Rest) | Cardholder data stored by agents must be encrypted |
| Req 4 (Data in Transit) | All agent-to-merchant/PSP transmissions must use strong cryptography |
| Req 6 (Secure Development) | Agent software requires secure SDLC, change management |
| Req 7 (Least Privilege) | Agents should use tokens or single-use PANs, never full PAN |
| Req 10 (Logging/Monitoring) | All AI actions must be logged — prompt inputs, reasoning, outcomes |
| Req 11 (Testing) | Continuous validation throughout the AI lifecycle |
| Req 12 (Policies/IR) | AI must be treated as a potential insider threat |

**Critical prohibitions:**
- AI systems should NOT be entrusted with unprotected sensitive data
- AI should NOT have agency over complete creation-to-deployment pipelines without human oversight
- AI should NOT generate cryptographic keys

### How This Project Addresses PCI

The CLI tool is designed to **stay out of PCI scope**:

1. **Never stores raw card data** — Only Stripe payment method IDs (`pm_...`) are stored in the vault
2. **Uses SPTs for merchant interaction** — Scoped, expiring tokens replace card data
3. **Stripe handles PCI** — All actual payment processing happens on Stripe's PCI-compliant infrastructure
4. **Touch ID provides human oversight** — Every payment requires biometric confirmation

The only PCI-relevant data the CLI touches is the Stripe API key (which is a merchant credential, not cardholder data) and payment method IDs (which are tokenized references, not PANs).

---

## GDPR Implications

GDPR applies to all AI agents processing personal data of EU residents. Non-compliance can generate fines up to 4% of global revenue or EUR 20 million.

### Key Challenges for Agent Commerce

- Personal data can appear in conversation history, embeddings, and logs — all in scope
- Five critical principles: transparency, data minimization, purpose limitation, limited retention, appropriate technical security
- Privacy by design is mandatory — data protection must be structural, not bolted on
- Complete audit logs required: who accessed what data, when, from where
- Right to erasure (Article 17) is complicated when agent training data contains PII

### How This Project Addresses GDPR

1. **Data minimization** — The vault stores only what's necessary (payment method tokens, service credentials). No conversation logs or browsing history.
2. **Purpose limitation** — Stored data is used only for payment confirmation. No analytics, no profiling.
3. **Erasure** — `agent-pay vault remove` deletes data from Keychain. No cloud copies.
4. **Local-only** — All data stays on the user's machine in macOS Keychain. Nothing is transmitted except to Stripe during payment.
5. **Transparency** — The CLI shows exactly what's being confirmed (service, amount, method) before Touch ID.

---

## Agent Liability

Legal liability for agent-initiated purchases is **deeply unsettled**.

### Agency Law (Most Commonly Applied)

- Principal-agent doctrine: the human user is the principal, the AI acts as agent
- Courts examine: did the user expressly authorize the action? Did third parties reasonably believe it was authorized? Did the principal ratify it?
- Under UETA (Uniform Electronic Transactions Act), agents can form binding contracts on behalf of users

### Consumer Liability

- Likely defaults to the consumer since the agent acts as their authorized proxy
- Stanford CodeX analysis: the Transactional Agent Provider (not the agent itself) bears liability since only legal entities can be liable
- Providers currently disclaim responsibility via ToS and seek user indemnification

### Merchant Risk

- Merchants face a proof-of-authorization problem: how to prove authentication when an AI agent initiated the transaction
- Without accepted proof-of-authorization models, merchants apply existing fraud controls (SCA, 3DS, bot detection) that may block agent transactions

### How This Project Mitigates Liability

Touch ID confirmation creates a strong proof-of-authorization:
1. **Biometric verification** — The user physically authenticated with their fingerprint
2. **Transaction details shown** — The user saw exactly what they were approving (service, amount, method)
3. **Audit trail** — The confirmation result includes timestamp and device attestation
4. **Single-use approval** — Each transaction requires a separate confirmation

This is arguably stronger authorization evidence than clicking "Buy" in a browser — it includes biometric proof that the account holder was physically present.

---

## Regulatory Landscape

### United States

- No unified federal AI law; fragmented sector-specific approach
- FTC required to issue policy statement by March 11, 2026 on how FTC Act applies to AI
- CFPB monitoring AI agents in financial services; position: "There is no 'fancy technology' exemption"
- Consumer Bankers Association published Agentic AI Payments white paper (January 2026)
- December 2025 Executive Order established national AI policy framework

### European Union

- EU AI Act effective August 2024, full enforcement by August 2, 2026
- Risk-based framework: AI in financial services classified as high-risk
- AI agents facilitating financial transactions likely require conformity assessments
- High-risk systems need: structured risk management, quality management, human supervision, bias checks

### Key Gap

No regulator has issued specific guidance on AI agent-initiated retail commerce transactions. The "agent shopping on your behalf" use case sits in a regulatory gray zone. This project's emphasis on human-in-the-loop (Touch ID) positions it well for whatever regulations emerge.

---

## What an OSS Project Needs to Document

For compliance purposes, this project should clearly document:

1. **Data flow diagram** — What data goes where (all local except Stripe API calls)
2. **PCI scope statement** — The CLI does not process, store, or transmit cardholder data. All payment processing is handled by Stripe.
3. **GDPR data inventory** — What personal data is stored (payment method tokens, service credentials), where (macOS Keychain), and how to delete it
4. **Authorization model** — How Touch ID provides proof of user authorization
5. **Liability disclaimer** — The CLI is a tool; the user is responsible for their purchases

## Sources

- [PCI SSC: AI Principles for Payment Environments](https://blog.pcisecuritystandards.org/ai-principles-securing-the-use-of-ai-in-payment-environments)
- [GDPR Compliance for AI Agents (Protecto)](https://www.protecto.ai/blog/gdpr-compliance-for-ai-agents-startup-guide/)
- [Stanford CodeX: From Fine Print to Machine Code](https://law.stanford.edu/2025/01/14/from-fine-print-to-machine-code-how-ai-agents-are-rewriting-the-rules-of-engagement/)
- [FTC Artificial Intelligence Page](https://www.ftc.gov/industry/technology/artificial-intelligence)
- [EU AI Act Summary](https://www.softwareimprovementgroup.com/blog/eu-ai-act-summary/)
- [CBA Agentic AI Payments White Paper](https://consumerbankers.com/wp-content/uploads/2026/01/CBA-Agentic-Symposium-White-Paper-2026-01v2.pdf)
