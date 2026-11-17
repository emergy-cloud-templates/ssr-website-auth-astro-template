import Stripe from "stripe";
import { describe, expect, it, vi } from "vitest";

// astro:env reads the environment through the adapter at runtime; the tests read process.env themselves.
vi.mock("astro:env/server", () => ({ getSecret: (key: string) => process.env[key] }));

import { billing, devStripe } from "../../src/lib/billing";
import {
  BillingError,
  createStripeBilling,
  fakeStripe,
  memoryBillingStore,
  postgresBillingStore,
  signStripePayload,
} from "../../src/lib/stripe-billing";

describe("checkout metadata (the webhook relay routes by it)", () => {
  it("puts the project and env tags on the session and the subscription, next to the user and plan", async () => {
    const fake = fakeStripe({ prices: [{ id: "price_pro", lookup_key: "pro_monthly" }] });
    const b = createStripeBilling({
      stripe: () => fake.stripe,
      webhookSecret: () => "whsec_x",
      plans: { pro: { lookupKey: "pro_monthly" } },
      store: memoryBillingStore(),
      metadata: () => ({ project: "proj-1", env: "dev" }),
    });
    await b.checkoutUrl({ userId: "u1", email: "a@example.com", plan: "pro", origin: "https://x.test" });
    const session = [...fake.sessions.values()][0] as Record<string, unknown>;
    expect(session.metadata).toEqual({ project: "proj-1", env: "dev", user_id: "u1", plan: "pro" });
    expect((session.subscription_data as { metadata: unknown }).metadata).toEqual({
      project: "proj-1",
      env: "dev",
      user_id: "u1",
      plan: "pro",
    });
  });

  it("the app's billing sets project always and env outside prod (local development: the fake Stripe)", async () => {
    vi.stubEnv("PROJECT_ID", "proj-9");
    vi.stubEnv("ENV", "");
    await billing.checkoutUrl({ userId: "u2", email: "b@example.com", plan: "pro", origin: "http://localhost:4321" });
    const session = [...devStripe.sessions.values()].at(-1) as { metadata: Record<string, string> };
    expect(session.metadata).toMatchObject({ project: "proj-9", user_id: "u2" });
    expect(session.metadata.env).toBeUndefined();
  });
});

describe("a deployed environment without Stripe keys", () => {
  it("is off: checkout answers 503 and the webhook is not accepted with the public dev secret", async () => {
    vi.stubEnv("ENV", "prod");
    vi.stubEnv("STRIPE_SECRET_KEY", "");
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "");
    await expect(
      billing.checkoutUrl({ userId: "u3", email: "c@example.com", plan: "pro", origin: "https://x.test" }),
    ).rejects.toMatchObject({ status: 503 });
    const body = JSON.stringify({ type: "invoice.paid", data: { object: {} } });
    await expect(billing.handleWebhook(body, signStripePayload(body, "whsec_dev"))).rejects.toBeInstanceOf(
      BillingError,
    );
  });
});

describe("the relay's re-signed events", () => {
  it("pass the Stripe SDK's own signature check with the environment's STRIPE_WEBHOOK_SECRET", async () => {
    const secret = "whsec_env_secret";
    const body = JSON.stringify({
      id: "evt_1",
      type: "customer.subscription.updated",
      data: { object: { id: "sub_1" } },
    });
    const stripe = new Stripe("sk_test_unused");
    const event = await stripe.webhooks.constructEventAsync(body, signStripePayload(body, secret), secret);
    expect(event.type).toBe("customer.subscription.updated");
    await expect(
      stripe.webhooks.constructEventAsync(body, signStripePayload(body, "whsec_other"), secret),
    ).rejects.toThrow();
  });
});

describe("postgresBillingStore", () => {
  it("reads and writes the lego's two tables", async () => {
    const queries: string[] = [];
    const answers: unknown[][] = [
      [{ customer_id: "cus_1" }],
      [],
      [{ status: "active", current_period_end: new Date(5000), customer_id: "cus_1" }],
    ];
    const sql = ((strings: TemplateStringsArray) => {
      queries.push(strings.join("?").replace(/\s+/g, " "));
      return Promise.resolve(answers.shift() ?? []);
    }) as never;
    const store = postgresBillingStore(() => sql);
    expect(await store.customerId("u1")).toBe("cus_1");
    await store.saveCustomer("u1", "cus_1");
    expect(await store.subscriptions("u1")).toEqual([
      { status: "active", currentPeriodEnd: 5000, customerId: "cus_1" },
    ]);
    expect(queries[0]).toContain("from public.billing_customers");
    expect(queries[1]).toContain("on conflict (user_id)");
    expect(queries[2]).toContain("from public.billing_subscriptions");
  });
});
