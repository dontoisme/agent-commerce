/**
 * MCP Registry adapter — discovers available services and their
 * MCP server configurations from the MCP registry.
 *
 * Used in the agent commerce flow to:
 * 1. Discover what services are available (e.g., Linear, Asana)
 * 2. Get pricing information
 * 3. Retrieve MCP server config after purchase
 */

export interface ServiceListing {
  name: string;
  slug: string;
  description: string;
  pricing: {
    amount: number; // in cents
    currency: string;
    interval: "month" | "year" | "one_time";
    display: string; // "$8/mo"
  };
  mcpServer?: {
    url: string;
    transport: "stdio" | "sse" | "streamable-http";
    configTemplate: Record<string, string>; // placeholders for credentials
  };
}

// Simulated registry for demo purposes
// In production, this would query registry.modelcontextprotocol.io
const DEMO_SERVICES: ServiceListing[] = [
  {
    name: "Linear",
    slug: "linear",
    description: "Project management and issue tracking",
    pricing: {
      amount: 800,
      currency: "usd",
      interval: "month",
      display: "$8/mo",
    },
    mcpServer: {
      url: "npx",
      transport: "stdio",
      configTemplate: {
        command: "npx",
        args: "-y @anthropic/linear-mcp-server",
        env_LINEAR_API_KEY: "{{API_KEY}}",
      },
    },
  },
  {
    name: "Asana",
    slug: "asana",
    description: "Work management platform",
    pricing: {
      amount: 1099,
      currency: "usd",
      interval: "month",
      display: "$10.99/mo",
    },
    mcpServer: {
      url: "npx",
      transport: "stdio",
      configTemplate: {
        command: "npx",
        args: "-y @anthropic/asana-mcp-server",
        env_ASANA_ACCESS_TOKEN: "{{API_KEY}}",
      },
    },
  },
  {
    name: "GitHub Copilot",
    slug: "github-copilot",
    description: "AI-powered code completion",
    pricing: {
      amount: 1000,
      currency: "usd",
      interval: "month",
      display: "$10/mo",
    },
  },
];

export async function discoverService(
  slug: string
): Promise<ServiceListing | null> {
  // In production: fetch from registry API
  return DEMO_SERVICES.find((s) => s.slug === slug) ?? null;
}

export async function searchServices(
  query: string
): Promise<ServiceListing[]> {
  const q = query.toLowerCase();
  return DEMO_SERVICES.filter(
    (s) =>
      s.name.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q) ||
      s.slug.includes(q)
  );
}

export async function listServices(): Promise<ServiceListing[]> {
  return DEMO_SERVICES;
}
