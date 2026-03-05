#!/usr/bin/env node

import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { confirm } from "../confirm/index.js";
import {
  vaultStore,
  vaultRemove,
  getPaymentMethods,
  addPaymentMethod,
  getDefaultPaymentMethod,
} from "../vault/index.js";
import { createPayment } from "../adapters/stripe.js";
import {
  discoverService,
  searchServices,
  listServices,
} from "../adapters/mcp-registry.js";

const program = new Command();

program
  .name("agent-pay")
  .description("CLI-native transaction confirmation for AI agent commerce")
  .version("0.1.0");

// ── discover ────────────────────────────────────────────────────────────

program
  .command("discover <query>")
  .description("Search for available services")
  .action(async (query: string) => {
    const spinner = ora("Searching services...").start();
    const results = await searchServices(query);
    spinner.stop();

    if (results.length === 0) {
      console.log(chalk.yellow(`No services found for "${query}"`));
      return;
    }

    console.log(chalk.bold("\nAvailable Services:\n"));
    for (const svc of results) {
      console.log(
        `  ${chalk.cyan(svc.name)} ${chalk.dim(`(${svc.slug})`)}` +
        `  ${chalk.green(svc.pricing.display)}`
      );
      console.log(`  ${chalk.dim(svc.description)}`);
      if (svc.mcpServer) {
        console.log(`  ${chalk.dim("MCP server available")}`);
      }
      console.log();
    }
  });

// ── confirm ─────────────────────────────────────────────────────────────

program
  .command("confirm <service> <amount>")
  .description("Confirm a payment with Touch ID")
  .action(async (service: string, amount: string) => {
    const method = await getDefaultPaymentMethod();
    if (!method) {
      console.log(
        chalk.red("No payment method configured. Run: agent-pay vault add")
      );
      process.exit(1);
    }

    const methodDisplay = `${method.brand.charAt(0).toUpperCase() + method.brand.slice(1)} ****${method.last4}`;

    console.log(
      chalk.bold(`\nPayment Confirmation Required\n`) +
      `  Service: ${chalk.cyan(service)}\n` +
      `  Amount:  ${chalk.green(amount)}\n` +
      `  Method:  ${methodDisplay}\n`
    );

    const spinner = ora("Waiting for Touch ID...").start();

    try {
      const result = await confirm({
        service,
        amount,
        paymentMethod: methodDisplay,
      });

      if (result.success) {
        spinner.succeed(chalk.green("Payment confirmed via Touch ID"));

        // Look up the service to get amount in cents
        const svc = await discoverService(service.toLowerCase());
        if (svc) {
          const paymentSpinner = ora("Processing payment...").start();
          const payment = await createPayment({
            amount: svc.pricing.amount,
            description: `${svc.name} subscription`,
            paymentMethodId: method.id,
            merchantName: svc.name,
          });

          if (payment.success) {
            paymentSpinner.succeed(
              chalk.green(`Payment processed: ${payment.paymentIntentId}`)
            );

            if (svc.mcpServer) {
              console.log(
                chalk.dim("\nMCP server config available. Configure with:") +
                `\n  ${chalk.cyan(`agent-pay configure ${svc.slug}`)}`
              );
            }
          } else {
            paymentSpinner.fail(chalk.red(`Payment failed: ${payment.error}`));
          }
        }
      } else {
        spinner.fail(chalk.red(`Authentication failed: ${result.error}`));
      }
    } catch (err) {
      spinner.fail(
        chalk.red(`Error: ${err instanceof Error ? err.message : err}`)
      );
      process.exit(1);
    }
  });

// ── vault ───────────────────────────────────────────────────────────────

const vault = program
  .command("vault")
  .description("Manage stored credentials and payment methods");

vault
  .command("add")
  .description("Add a payment method or credential")
  .option("--stripe-key <key>", "Set Stripe API key")
  .option("--test-card", "Add Stripe test card (4242...)")
  .action(async (opts: { stripeKey?: string; testCard?: boolean }) => {
    if (opts.stripeKey) {
      await vaultStore("stripe_secret_key", opts.stripeKey);
      console.log(chalk.green("Stripe API key stored in vault"));
      return;
    }

    if (opts.testCard) {
      await addPaymentMethod({
        id: "pm_test_visa_4242",
        brand: "visa",
        last4: "4242",
        expMonth: 12,
        expYear: 2028,
        isDefault: true,
      });
      console.log(chalk.green("Test Visa ****4242 added as default payment method"));
      return;
    }

    console.log(
      chalk.yellow("Specify what to add:") +
      "\n  --stripe-key <key>  Set Stripe API key" +
      "\n  --test-card         Add Stripe test card"
    );
  });

vault
  .command("list")
  .description("List stored payment methods")
  .action(async () => {
    const methods = await getPaymentMethods();
    if (methods.length === 0) {
      console.log(chalk.yellow("No payment methods stored"));
      return;
    }

    console.log(chalk.bold("\nPayment Methods:\n"));
    for (const m of methods) {
      const defaultTag = m.isDefault ? chalk.green(" (default)") : "";
      console.log(
        `  ${m.brand.toUpperCase()} ****${m.last4}` +
        `  ${chalk.dim(`exp ${m.expMonth}/${m.expYear}`)}` +
        defaultTag
      );
    }
    console.log();
  });

vault
  .command("remove <key>")
  .description("Remove a stored credential")
  .action(async (key: string) => {
    await vaultRemove(key);
    console.log(chalk.green(`Removed "${key}" from vault`));
  });

// ── status ──────────────────────────────────────────────────────────────

program
  .command("status")
  .description("Show agent-pay status")
  .action(async () => {
    const methods = await getPaymentMethods();
    const hasStripeKey = !!(await import("../vault/index.js")).vaultGet(
      "stripe_secret_key"
    );

    console.log(chalk.bold("\nagent-pay status\n"));
    console.log(
      `  Stripe: ${hasStripeKey ? chalk.green("configured") : chalk.red("not configured")}`
    );
    console.log(
      `  Payment methods: ${methods.length > 0 ? chalk.green(String(methods.length)) : chalk.yellow("none")}`
    );
    console.log(
      `  Touch ID: ${chalk.green("available")} ${chalk.dim("(macOS)")}`
    );
    console.log();
  });

// ── demo ────────────────────────────────────────────────────────────────

program
  .command("demo [service]")
  .description("Dry-run the full purchase flow with step-by-step logging")
  .action(async (service: string = "linear") => {
    const step = (n: number, label: string) =>
      console.log(`\n${chalk.dim(`[${n}/8]`)} ${chalk.bold(label)}`);

    const log = (msg: string) => console.log(`      ${chalk.dim(msg)}`);
    const ok = (msg: string) => console.log(`      ${chalk.green("✓")} ${msg}`);
    const data = (label: string, value: string) =>
      console.log(`      ${chalk.dim(label + ":")} ${value}`);

    console.log(chalk.bold("\n━━━ agent-pay dry run ━━━"));
    console.log(chalk.dim("No real payments. No Stripe calls. Just the flow.\n"));

    // 1
    step(1, "Agent requests service signup");
    log(`Claude Code: "I recommend ${service}. Want me to set it up?"`);
    log(`User: "Yes"`);

    // 2
    step(2, "Discover service via MCP registry");
    const svc = await discoverService(service.toLowerCase());
    if (svc) {
      ok(`Found: ${svc.name}`);
      data("Price", svc.pricing.display);
      data("MCP server", svc.mcpServer ? "available" : "none");
    } else {
      ok(`Found: ${service} (simulated)`);
      data("Price", "$8/mo");
    }

    // 3
    step(3, "Load payment method from vault");
    const method = await getDefaultPaymentMethod();
    if (method) {
      ok(`${method.brand.toUpperCase()} ****${method.last4} (from macOS Keychain)`);
      data("Payment method ID", method.id);
      data("Storage", "macOS Keychain (biometric-protected)");
    } else {
      ok("Visa ****4242 (simulated — no vault configured)");
      data("Payment method ID", "pm_test_visa_4242");
    }

    const pm = method
      ? { brand: method.brand, last4: method.last4, id: method.id }
      : { brand: "visa", last4: "4242", id: "pm_test_visa_4242" };

    const methodDisplay = `${pm.brand.charAt(0).toUpperCase() + pm.brand.slice(1)} ****${pm.last4}`;
    const price = svc?.pricing.display ?? "$8/mo";
    const serviceName = svc?.name ?? service;

    // 4
    step(4, "Trigger Touch ID confirmation");
    log("Calling: bin/touchid-confirm");
    data("--service", serviceName);
    data("--amount", price);
    data("--method", methodDisplay);
    console.log();
    console.log(chalk.yellow("      ┌─────────────────────────────────────────┐"));
    console.log(chalk.yellow("      │  Touch ID                               │"));
    console.log(chalk.yellow("      │                                         │"));
    console.log(chalk.yellow(`      │  Confirm ${price.padEnd(6)} payment to ${serviceName.padEnd(10)} │`));
    console.log(chalk.yellow(`      │  using ${methodDisplay.padEnd(22)}  │`));
    console.log(chalk.yellow("      │                                         │"));
    console.log(chalk.yellow("      │  [Cancel]           [Use Password]      │"));
    console.log(chalk.yellow("      └─────────────────────────────────────────┘"));
    console.log();
    ok("User authenticates with fingerprint");
    data("Result", '{"success": true}');

    // 5
    step(5, "Create Shared Payment Token (SPT)");
    const now = Math.floor(Date.now() / 1000);
    data("payment_method", pm.id);
    data("max_amount", String(svc?.pricing.amount ?? 800) + " cents");
    data("currency", "usd");
    data("expires_at", `${now + 300} (5 minutes from now)`);
    ok("SPT created: spt_demo_" + Math.random().toString(36).slice(2, 10));

    // 6
    step(6, "Process payment via Stripe");
    data("API call", "POST /v1/payment_intents");
    data("amount", String(svc?.pricing.amount ?? 800));
    data("currency", "usd");
    data("shared_payment_granted_token", "spt_demo_...");
    data("confirm", "true");
    ok("PaymentIntent succeeded: pi_demo_" + Math.random().toString(36).slice(2, 10));
    log(chalk.dim("(dry run — no actual Stripe call made)"));

    // 7
    step(7, "Receive service credentials");
    const apiKey = "lin_demo_" + Math.random().toString(36).slice(2, 14);
    data("Source", "Post-checkout credential delivery");
    data(`${serviceName.toUpperCase()}_API_KEY`, apiKey);
    ok("Credentials stored in vault");

    // 8
    step(8, "Configure MCP server");
    if (svc?.mcpServer) {
      console.log(chalk.dim("      MCP config:"));
      console.log(chalk.dim(`      {`));
      console.log(chalk.dim(`        "mcpServers": {`));
      console.log(chalk.dim(`          "${svc.slug}": {`));
      console.log(chalk.dim(`            "command": "${svc.mcpServer.configTemplate.command}",`));
      console.log(chalk.dim(`            "args": "${svc.mcpServer.configTemplate.args}",`));
      console.log(chalk.dim(`            "env": { "${serviceName.toUpperCase()}_API_KEY": "${apiKey}" }`));
      console.log(chalk.dim(`          }`));
      console.log(chalk.dim(`        }`));
      console.log(chalk.dim(`      }`));
    }
    ok(`${serviceName} MCP server ready`);

    // Summary
    console.log(chalk.bold("\n━━━ complete ━━━\n"));
    console.log(chalk.green("  Agent can now use " + serviceName + " via MCP."));
    console.log(chalk.dim("  Total flow: ~10 seconds. Zero browser. Zero context switching.\n"));
  });

// ── services ────────────────────────────────────────────────────────────

program
  .command("services")
  .description("List all available services")
  .action(async () => {
    const services = await listServices();

    console.log(chalk.bold("\nAvailable Services:\n"));
    for (const svc of services) {
      const mcp = svc.mcpServer ? chalk.dim(" [MCP]") : "";
      console.log(
        `  ${chalk.cyan(svc.name.padEnd(20))} ${chalk.green(svc.pricing.display.padEnd(10))} ${svc.description}${mcp}`
      );
    }
    console.log();
  });

program.parse();
