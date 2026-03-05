# Identity & Credential Vaults

## Production-Ready Solutions

### 1. 1Password SDK — Agent Integration

**Status: Production (GA mid-2025)**

1Password provides purpose-built agent credential access via SDKs (Python, JavaScript/TypeScript, Go). Core mechanism is `secrets.resolve()` with secret reference URIs.

**Architecture:**
- Create a dedicated vault with only the credentials the agent needs
- Generate a Service Account token with read-only access to that vault
- At runtime, SDK resolves `op://vault/item/field` URIs into actual secret values
- Agent cannot craft its own requests — only resolves pre-defined references

```javascript
const sdk = require("@1password/sdk");

const client = await sdk.createClient({
  auth: process.env.OP_SERVICE_ACCOUNT_TOKEN,
  integrationName: "Agent Commerce CLI",
  integrationVersion: "v1.0.0",
});

const secret = await client.secrets.resolve("op://agent-payments/stripe/api-key");
```

Also supports `DesktopAuth` for local desktop app authentication (no service account needed):

```javascript
const client = await sdk.createClient({
  auth: new sdk.DesktopAuth("your-account-name"),
});
```

**Key constraints:**
- Agents cannot discover secrets dynamically
- 1Password explicitly notes this is "not our recommended integration approach" due to direct credential exposure
- They recommend short-lived, tightly scoped tokens with strong auditing
- Activity Logs provide per-service-account audit trails

**Assessment:** Good for simple cases but too opinionated for a general-purpose CLI tool. Better as an optional integration than a core dependency.

### 2. HashiCorp Vault

**Status: Production (Enterprise); MCP server in beta**

HashiCorp has built a validated pattern for AI agent identity using Vault, centered on OAuth 2.0 token exchange with dynamic secrets.

**Architecture (four layers):**
1. Web UI — User authenticates via IdP, receives JWT
2. AI Agent — Exchanges user JWT for an On-Behalf-Of (OBO) token
3. MCP Server — Authenticates to Vault using OBO token via JWT auth backend
4. Vault — Issues dynamic, short-lived credentials scoped to user claims

```hcl
resource "vault_jwt_auth_backend_role" "default" {
  user_claim      = "preferred_username"
  groups_claim    = "groups"
  bound_audiences = [var.audience_tool_client_id]
  bound_claims    = { "azp" = var.azp_agent_client_id }
}
```

**Key developments (2025-2026):**
- Vault Enterprise 1.21: Vault MCP server (beta) for managing secrets via natural language
- HCP Vault Radar MCP server (beta): AI tools can scan for leaked secrets
- Project Infragraph (private beta): Centralized data substrate for autonomous agents

**Assessment:** Enterprise-grade, overkill for an OSS CLI tool. Valuable as an optional adapter for teams already using Vault.

### 3. CyberArk Secure AI Agents

**Status: GA since December 2025**

First purpose-built identity security solution for AI agents.

**Core components:**
- **AI Agent Gateway** — Enforcement point between agents and their tools, integrated with MCP servers
- **Agent Discovery** — Automatically detects agents across SaaS, cloud, and developer environments
- **Zero Standing Privileges** — Agents get just-in-time access with automatic revocation post-task
- **Lifecycle Management** — Creation through decommissioning with comprehensive audit logs

**Assessment:** Enterprise-only. Not relevant for OSS CLI tool but important context for the landscape.

---

## Apple Keychain + Touch ID from CLI

**Status: Works but underdocumented by Apple**

### How It Works

`LocalAuthentication` framework's `LAContext.evaluatePolicy()` triggers a system-level biometric dialog regardless of whether the caller is a GUI app or a CLI process. macOS handles the prompt at the WindowServer level.

### Minimal Swift CLI for Touch ID

```swift
import LocalAuthentication
import Foundation

let context = LAContext()
var error: NSError?

guard context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error) else {
    print("Biometrics unavailable: \(error?.localizedDescription ?? "unknown")")
    exit(1)
}

let semaphore = DispatchSemaphore(value: 0)

context.evaluatePolicy(.deviceOwnerAuthenticationWithBiometrics,
                        localizedReason: "Confirm $8/mo payment to Linear") { success, authError in
    if success {
        print("AUTH_SUCCESS")
    } else {
        print("AUTH_FAILED: \(authError?.localizedDescription ?? "unknown")")
    }
    semaphore.signal()
}

semaphore.wait()
```

Compile: `swiftc -o touchid-auth main.swift -framework LocalAuthentication`

### Keychain Integration Pattern

```swift
// Create access control requiring biometric auth
let access = SecAccessControlCreateWithFlags(nil,
    kSecAttrAccessibleWhenUnlockedThisDeviceOnly,
    .biometryCurrentSet,
    nil)

// Store item (biometric-protected)
let query: [String: Any] = [
    kSecClass as String: kSecClassGenericPassword,
    kSecAttrService as String: "com.agent-commerce.vault",
    kSecAttrAccount as String: "stripe-pm-token",
    kSecValueData as String: "pm_1234...".data(using: .utf8)!,
    kSecAttrAccessControl as String: access!
]
SecItemAdd(query as CFDictionary, nil)
```

### Existing CLI Tools

**Keymaster** (github.com/johnthethird/keymaster) — Swift CLI wrapping macOS Keychain with Touch ID. Last commit June 2022. 32 stars. Good reference, not production-grade.

**keychain-fingerprint** (github.com/dss99911/keychain-fingerprint) — Created January 2026. More complete with proper security attributes. 2 commits.

### Node.js Integration

No mature native binding exists. The pattern is: compile Swift binary, shell out from Node.js:

```javascript
const { execFile } = require('child_process');
execFile('./bin/touchid-confirm', ['--service', 'Linear', '--amount', '$8/mo'], (err, stdout) => {
  const result = JSON.parse(stdout);
  // { success: true, service: "Linear", amount: "$8/mo" }
});
```

### Requirements
- macOS with Touch ID hardware (MacBook Pro/Air, or Magic Keyboard with Touch ID on Apple Silicon)
- Xcode Command Line Tools (for `swiftc`)
- No `Info.plist` needed for Touch ID on macOS (unlike Face ID on iOS)
- Items with `.biometryCurrentSet` are invalidated if fingerprints change

**Assessment:** This is the core of our CLI confirmation layer. Proven to work, just needs productionization.

---

## DID/VC Ecosystem for Agent Identity

**Status: Research/experimental for agents; VC standards themselves are production-ready**

### W3C Standards

- **VC Data Model v2.0** — W3C Recommendation (May 2025). Refined for JOSE/COSE and Data Integrity proof mechanisms.
- **DID Core** — Stable W3C standard. Multiple DID methods in production (did:web, did:key, did:ion).

### Academic Framework (arxiv 2511.02841)

Proposes equipping each AI agent with a DID anchored on a distributed ledger:
- **Basic VCs (bVCs)** — Minimal claims issued at deployment
- **Rich VCs (rVCs)** — Detailed role/capability claims after mutual attestation
- Protocol: Agent presents bVC -> mutual auth -> authority issues rVCs

### Agent Credential Inheritance (2026 Pattern)

Emerging pattern where agents inherit human KYC status via cryptographic delegation:
- **ERC-7710** — On-chain delegation standard (spending caps, approved contracts, time boundaries)
- **KYA (Know Your Agent)** standards emerging: ERC-8004, Sumsub Agent Verification

### walt.id and CREDEBL

- **walt.id** — Open-source VC infrastructure (Kotlin). 25K+ developers. No agent-specific features yet.
- **CREDEBL** — LF Decentralized Trust project. Deployed for national digital IDs. No agent-specific features yet.

**Assessment:** Theoretically important but practically premature for agent commerce. Worth tracking but not depending on for the prototype.

---

## Okta XAA + Auth0 for AI Agents

**Status: Announced September 2025; rolling out through 2026**

**Cross App Access (XAA)** — Open protocol standardizing how AI agents connect to applications. Supported by AWS, Google Cloud, Salesforce, Box, and others.

**Auth0 capabilities for agents:**
- Token Vault — Automated access/refresh token management
- Async Authorization — Pause agent workflows for human approval on high-stakes decisions
- Fine-Grained Authorization — Granular permissions for RAG pipelines

Key stat: 23% of organizations report credential exposure via agents; only 10% have a documented agent security strategy.

**Assessment:** Important for enterprise adoption but not a dependency for the prototype.

---

## Production Readiness Matrix

| Solution | Maturity | Best For |
|----------|----------|----------|
| **1Password SDK** | Production | Simple secret injection |
| **HashiCorp Vault** | Production (MCP beta) | Enterprise dynamic secrets |
| **CyberArk** | Production (GA Dec 2025) | Enterprise agent privilege management |
| **macOS Touch ID CLI** | Works (DIY) | Local credential protection |
| **DID/VC for agents** | Research | Decentralized agent identity |
| **Okta XAA** | Early production | Multi-app agent authorization |

## Sources

- [1Password SDK for AI Agents](https://developer.1password.com/docs/sdks/ai-agent/)
- [HashiCorp Vault AI Agent Identity Pattern](https://developer.hashicorp.com/validated-patterns/vault/ai-agent-identity-with-hashicorp-vault)
- [CyberArk Secure AI Agents](https://www.cyberark.com/resources/product-insights-blog/cyberark-secure-ai-agents)
- [Okta AI Agent Security](https://www.okta.com/solutions/secure-ai/)
- [AI Agents with DIDs and VCs (arxiv)](https://arxiv.org/abs/2511.02841)
- [walt.id Identity Infrastructure](https://walt.id/identity-infrastructure)
- [Keymaster GitHub](https://github.com/johnthethird/keymaster)
- [Agent Identity: How AI Wallets Inherit Credentials](https://blog.getpara.com/agent-identity-how-agent-wallets-inherit-credentials-in-2026/)
