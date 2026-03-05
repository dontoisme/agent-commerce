# Example: Agent Signs Up for a Service

This demonstrates the full E2E flow: an AI agent discovers a service, confirms payment via Touch ID, and receives credentials.

## Prerequisites

```bash
cd agent-commerce
pnpm install
pnpm build:confirm   # Compile Swift Touch ID binary
```

## Setup (One-time)

```bash
# Add Stripe test API key
agent-pay vault add --stripe-key sk_test_your_key_here

# Add test payment method
agent-pay vault add --test-card
# → "Test Visa ****4242 added as default payment method"
```

## The Flow

### Step 1: Agent discovers available services

```bash
$ agent-pay discover linear

Available Services:

  Linear (linear)  $8/mo
  Project management and issue tracking
  MCP server available
```

### Step 2: Agent confirms payment with Touch ID

```bash
$ agent-pay confirm linear "$8/mo"

Payment Confirmation Required
  Service: linear
  Amount:  $8/mo
  Method:  Visa ****4242

⠋ Waiting for Touch ID...
```

macOS Touch ID dialog appears:

```
┌─────────────────────────────────────┐
│  Touch ID                            │
│                                     │
│  Confirm $8/mo payment to linear    │
│  using Visa ****4242                │
│                                     │
│  [Cancel]          [Use Password]   │
└─────────────────────────────────────┘
```

User touches fingerprint sensor.

```
✔ Payment confirmed via Touch ID
⠋ Processing payment...
✔ Payment processed: pi_3abc123...

MCP server config available. Configure with:
  agent-pay configure linear
```

### Step 3: Agent configures MCP server

The agent receives the response and updates its MCP config:

```json
{
  "mcpServers": {
    "linear": {
      "command": "npx",
      "args": ["-y", "@anthropic/linear-mcp-server"],
      "env": {
        "LINEAR_API_KEY": "lin_xxx"
      }
    }
  }
}
```

## What Just Happened

1. Agent discovered Linear via the service registry
2. CLI presented transaction details and triggered Touch ID
3. User confirmed with their fingerprint (biometric proof of authorization)
4. CLI created a time-limited Stripe SPT and processed payment
5. Credentials were returned to the agent
6. Agent configured the MCP server automatically

Total time: ~10 seconds. Zero context switching.
