// Adapted from /common/legos/node/stripe-billing@1.0.0 (dvk-common dfb9868), glue/billing.ts. Owned by this project.
// The one file of the lego that imports the Stripe SDK and Astro. Payments are off until STRIPE_SECRET_KEY is set
// (the emergy.cloud platform delivers it, with STRIPE_WEBHOOK_SECRET, once the project's Payments service is ready);
// local development uses an in-memory Stripe.
import { getSecret } from "astro:env/server";
import Stripe from "stripe";

import { getDb } from "~/lib/db";
import {
  BillingError,
  createStripeBilling,
  fakeStripe,
  memoryBillingStore,
  postgresBillingStore,
  type BillingStore,
} from "~/lib/stripe-billing";

// Pinned: webhook payload shapes (periods on subscription items) depend on it.
const API_VERSION = "2026-09-30.endive";

let stripe: Stripe | null = null;
const dev = fakeStripe({ prices: [{ id: "price_dev_pro", lookup_key: "pro_monthly" }] });
const memory = memoryBillingStore();

/** Local development: no ENV (astro dev) or ENV=local. A deployed environment always has ENV (Terraform). */
const isLocal = () => {
  const env = getSecret("ENV");
  return !env || env === "local";
};

const store: BillingStore = {
  customerId: (u) => current().customerId(u),
  saveCustomer: (u, c) => current().saveCustomer(u, c),
  userIdForCustomer: (c) => current().userIdForCustomer(c),
  saveSubscription: (s) => current().saveSubscription(s),
  subscriptions: (u) => current().subscriptions(u),
};
const current = (): BillingStore => {
  const sql = getDb();
  return sql ? postgresBillingStore(() => sql) : memory;
};

export const billing = createStripeBilling({
  stripe: () => {
    const key = getSecret("STRIPE_SECRET_KEY");
    if (!key) {
      // Never the fake in a deployed environment: its webhook secret is public.
      if (isLocal()) return dev.stripe;
      throw new BillingError("Payments are not configured for this environment.", 503);
    }
    return (stripe ??= new Stripe(key, {
      apiVersion: API_VERSION as Stripe.LatestApiVersion,
      maxNetworkRetries: 2,
      timeout: 20_000,
    })) as never;
  },
  webhookSecret: () =>
    getSecret("STRIPE_WEBHOOK_SECRET") ?? (!getSecret("STRIPE_SECRET_KEY") && isLocal() ? "whsec_dev" : undefined),
  // ADAPT: the plans this product sells; a price id per environment, or the lookup key a setup script sets.
  plans: {
    pro: { priceId: () => getSecret("STRIPE_PRICE_PRO"), lookupKey: "pro_monthly" },
  },
  store,
  // The emergy.cloud webhook relay routes events by these tags: the project, and in test mode the environment
  // (dev and staging share one Stripe test mode).
  metadata: () => {
    const project = getSecret("PROJECT_ID");
    const env = getSecret("ENV");
    return { ...(project ? { project } : {}), ...(env && env !== "prod" ? { env } : {}) };
  },
  automaticTax: () => getSecret("STRIPE_AUTOMATIC_TAX") === "true",
  portalConfiguration: () => getSecret("STRIPE_PORTAL_CONFIGURATION"),
});

export const devStripe = dev;
