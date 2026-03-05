# Integration Points

## 1. Stripe ACP / SPTs

### How agent-pay Connects to Stripe

agent-pay uses Stripe as the payment processor. The integration has three parts:

### a) Setup (One-time)

```bash
# User provides their Stripe test/live API key
agent-pay vault add --stripe-key sk_test_xxx

# User adds a payment method (test mode)
agent-pay vault add --test-card
# → Stores pm_test_visa_4242 in Keychain
```

In production, the payment method would be created via Stripe's secure card collection (Stripe Elements or Checkout) and the resulting `pm_` token stored in the vault.

### b) Payment Flow

```typescript
// 1. Create SPT with tight constraints
const spt = await stripe.sharedPayment.grantedTokens.create({
  payment_method: "pm_xxx",
  usage_limits: {
    currency: "usd",
    max_amount: 800,        // $8.00
    expires_at: now + 300,  // 5 minutes
  },
  seller_details: {
    network_id: "linear",   // merchant identifier
  },
});

// 2. Use SPT to create PaymentIntent
const pi = await stripe.paymentIntents.create({
  amount: 800,
  currency: "usd",
  shared_payment_granted_token: spt.id,
  confirm: true,
  metadata: {
    source: "agent-commerce-cli",
    merchant: "Linear",
  },
});
```

### c) ACP Merchant Integration (Future)

For merchants implementing the full ACP protocol, agent-pay would interact with their checkout endpoints directly:

```
POST /acp/checkout/create    → Create checkout session
POST /acp/checkout/update    → Set shipping, apply SPT
POST /acp/checkout/complete  → Finalize purchase
```

This requires merchants to implement ACP endpoints, which is a broader ecosystem dependency.

## 2. MCP Service Discovery

### Current: Simulated Registry

agent-pay includes a local service catalog with demo entries (Linear, Asana, GitHub Copilot). Each entry includes:

```typescript
interface ServiceListing {
  name: string;
  slug: string;
  description: string;
  pricing: {
    amount: number;     // cents
    currency: string;
    interval: "month" | "year" | "one_time";
    display: string;    // "$8/mo"
  };
  mcpServer?: {
    url: string;
    transport: "stdio" | "sse" | "streamable-http";
    configTemplate: Record<string, string>;
  };
}
```

### Future: MCP Registry Integration

The MCP registry at `registry.modelcontextprotocol.io` lists available servers but doesn't include pricing or signup flows. For agent-pay to work at scale, the registry would need to support:

1. **Pricing metadata** — Cost, billing interval, free tier availability
2. **Signup endpoint** — URL or API for creating accounts
3. **Credential delivery** — How to return API keys post-purchase
4. **Payment methods** — Which payment processors the service accepts

### Proposed Registry Extension

```json
{
  "name": "linear",
  "description": "Project management and issue tracking",
  "server": {
    "command": "npx",
    "args": ["-y", "@anthropic/linear-mcp-server"]
  },
  "commerce": {
    "pricing": [
      { "plan": "standard", "amount": 800, "currency": "usd", "interval": "month" }
    ],
    "signup": {
      "protocol": "acp",
      "endpoint": "https://api.linear.app/acp"
    },
    "credentials": {
      "delivery": "post-checkout",
      "format": { "LINEAR_API_KEY": "string" }
    }
  }
}
```

## 3. Credential Delivery to Agent

### The Missing Link

After a successful payment, the agent needs service credentials (API key, OAuth token, etc.) to configure the MCP server. No standard protocol exists for this step.

### Proposed Flow

```
Payment succeeds
    │
    ├── Option A: Credentials in checkout response
    │   POST /acp/checkout/complete
    │   → { status: "complete", credentials: { apiKey: "lin_xxx" } }
    │
    ├── Option B: Webhook delivery
    │   Stripe webhook → agent-pay receives credentials
    │   → stores in vault → returns to agent
    │
    └── Option C: OAuth flow
        Service redirects to localhost callback
        → agent-pay captures OAuth token
        → stores in vault → returns to agent
```

### How the Agent Receives Credentials

agent-pay returns a structured response to the calling agent:

```json
{
  "success": true,
  "service": "linear",
  "payment": {
    "id": "pi_xxx",
    "amount": 800,
    "currency": "usd"
  },
  "credentials": {
    "LINEAR_API_KEY": "lin_xxx"
  },
  "mcp": {
    "command": "npx",
    "args": ["-y", "@anthropic/linear-mcp-server"],
    "env": {
      "LINEAR_API_KEY": "lin_xxx"
    }
  }
}
```

The agent then uses this to configure the MCP server (e.g., updating `claude_desktop_config.json` or the equivalent CLI config).

## 4. Agent Integration

### Claude Code

Claude Code could call agent-pay as a shell command:

```bash
agent-pay confirm linear "$8/mo" --json
```

Or agent-pay could be registered as an MCP server itself:

```json
{
  "mcpServers": {
    "agent-pay": {
      "command": "npx",
      "args": ["-y", "agent-commerce"],
      "tools": ["discover", "confirm", "vault-list", "status"]
    }
  }
}
```

### GitHub Copilot CLI

Same pattern — shell command or MCP server integration.

### Any MCP-Compatible Agent

By exposing tools via MCP, agent-pay becomes available to any agent that supports MCP servers, without custom integration work.

## 5. Future Integration Targets

| Integration | How | Priority |
|-------------|-----|----------|
| Stripe ACP merchants | Direct ACP endpoint calls | High |
| UCP checkout | UCP REST API for broader merchant coverage | Medium |
| ACK | W3C DID/VC-based identity and payment | Medium |
| 1Password | Optional vault backend via SDK | Low |
| FIDO2/WebAuthn | Alternative confirmer for Linux/Windows | Medium |
| AP2 mandates | VDC-based confirmation tokens | Low |
