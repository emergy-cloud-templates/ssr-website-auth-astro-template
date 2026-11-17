// Adapted from /common/legos/node/stripe-billing@1.0.0 (dvk-common dfb9868). Owned by this project.
// Lego stripe-billing: subscriptions on Stripe for any product. Checkout for a plan (the portal when the user already
// pays: never two subscriptions), the customer portal, the webhook that mirrors each subscription into the product's
// own table, stop at period end, cancel all (account deletion). recapify.app's provider design (core/billing/
// providers.ts): every event re-reads the subscription from Stripe and mirrors it, so it is idempotent and safe out of
// order. The Stripe SDK and the product's tables come in as arguments.
import { HttpError } from "../api-route/http.ts";
import { periodOf, subscriptionIdOfInvoice, type StripeLike, type StripeSubscription } from "./stripe.ts";

/** A plan the product sells: its price by id (set per environment) or by lookup key (set by a setup script). */
export interface PlanPrice {
  priceId?: () => string | undefined | null;
  lookupKey?: string;
}

/** What the product stores per subscription (its `subscriptions` table). */
export interface SubscriptionState {
  id: string;
  userId: string;
  customerId: string;
  /** The product's plan id, or null for a price this product does not sell. */
  plan: string | null;
  priceId: string | null;
  /** Stripe's status: active, trialing, past_due, canceled, unpaid, incomplete, incomplete_expired, paused. */
  status: string;
  /** Milliseconds. */
  currentPeriodStart: number | null;
  currentPeriodEnd: number | null;
  cancelAtPeriodEnd: boolean;
}

/** The product's tables. */
export interface BillingStore {
  customerId(userId: string): Promise<string | null>;
  saveCustomer(userId: string, customerId: string): Promise<void>;
  userIdForCustomer(customerId: string): Promise<string | null>;
  saveSubscription(state: SubscriptionState): Promise<void>;
  /** The user's subscriptions as stored, for "already paying?" (only ones with a Stripe customer). */
  subscriptions(userId: string): Promise<Pick<SubscriptionState, "status" | "currentPeriodEnd" | "customerId">[]>;
}

export interface StripeBillingOptions {
  /** The Stripe SDK client (`new Stripe(key, { apiVersion })`), created on first use. */
  stripe: () => StripeLike;
  /** STRIPE_WEBHOOK_SECRET, read per request. */
  webhookSecret: () => string | undefined | null;
  plans: Record<string, PlanPrice>;
  store: BillingStore;
  /** Where Checkout and the portal return. Default `<origin>/settings/billing?checkout=success|canceled`. */
  returnUrls?: (origin: string) => { success: string; cancel: string; portal: string };
  /** Stripe Tax: VAT and sales tax, the address it needs, tax ids. */
  automaticTax?: () => boolean;
  allowPromotionCodes?: boolean;
  /** Days of trial for this user and plan (none when undefined or 0). */
  trialDays?: (userId: string, plan: string) => Promise<number | undefined> | number | undefined;
  /**
   * Tags added to the Checkout Session and to the subscription it creates (`metadata`, `subscription_data.metadata`).
   * Divergence from the lego: the emergy.cloud webhook relay routes each event to its project (`project`) and, in
   * test mode, to its environment (`env`) by these tags.
   */
  metadata?: () => Record<string, string>;
  /** A portal configuration id (STRIPE_PORTAL_CONFIGURATION). */
  portalConfiguration?: () => string | undefined | null;
  /** Every verified event after the lego's own handling: one-time payments, credits, notifications. */
  onEvent?: (event: { type: string; data: { object: Record<string, unknown> } }) => Promise<void>;
  /** After a subscription is mirrored (renew credits, reset limits, tell the team). */
  onSubscription?: (state: SubscriptionState) => Promise<void>;
  log?: (message: string, data?: Record<string, unknown>) => void;
  now?: () => number;
}

/** A failure the user should see as is (no plan, no billing account yet): api-route answers its status and message. */
export class BillingError extends HttpError {
  override name = "BillingError";
  constructor(message: string, status = 400) {
    super(status, message);
  }
}

/** Live statuses: the user pays (past_due keeps access while Stripe retries the card). */
export const LIVE_STATUSES = ["active", "trialing", "past_due"];

/** Whether a stored subscription gives access now. */
export function isEntitled(sub: Pick<SubscriptionState, "status" | "currentPeriodEnd">, now = Date.now()): boolean {
  return LIVE_STATUSES.includes(sub.status) && (sub.currentPeriodEnd === null || sub.currentPeriodEnd > now);
}

const PRICE_CACHE_MS = 10 * 60_000;

export function createStripeBilling(o: StripeBillingOptions) {
  const log = o.log ?? ((message: string, data?: Record<string, unknown>) => console.warn(message, data ?? ""));
  const urls =
    o.returnUrls ??
    ((origin: string) => ({
      success: `${origin}/settings/billing?checkout=success`,
      cancel: `${origin}/settings/billing?checkout=canceled`,
      portal: `${origin}/settings/billing`,
    }));
  const lookedUp = new Map<string, { id: string; at: number }>();

  /** The plan's price: its configured id, else the active price with its lookup key (cached ten minutes). */
  async function priceFor(plan: string): Promise<string> {
    const def = o.plans[plan];
    if (!def) throw new BillingError(`Unknown plan: ${plan}`);
    const configured = def.priceId?.();
    if (configured) return configured;
    if (!def.lookupKey) throw new BillingError(`Plan ${plan} has no price id and no lookup key`, 500);
    const cached = lookedUp.get(plan);
    if (cached && Date.now() - cached.at < PRICE_CACHE_MS) return cached.id;
    const { data } = await o.stripe().prices.list({ lookup_keys: [def.lookupKey], active: true, limit: 1 });
    if (!data[0]) throw new BillingError(`No active Stripe price has the lookup key "${def.lookupKey}"`, 500);
    lookedUp.set(plan, { id: data[0].id, at: Date.now() });
    return data[0].id;
  }

  /** The product's plan for a Stripe price, or null. */
  function planForPrice(price: { id: string; lookup_key?: string | null } | null | undefined): string | null {
    if (!price) return null;
    for (const [plan, def] of Object.entries(o.plans)) {
      if (def.priceId?.() === price.id || (def.lookupKey && def.lookupKey === price.lookup_key)) return plan;
    }
    return null;
  }

  async function ensureCustomer(userId: string, email: string): Promise<string> {
    const existing = await o.store.customerId(userId);
    if (existing) return existing;
    const customer = await o
      .stripe()
      .customers.create({ email, metadata: { user_id: userId } }, { idempotencyKey: `customer-${userId}` });
    await o.store.saveCustomer(userId, customer.id);
    return customer.id;
  }

  /** Re-reads a subscription from Stripe and mirrors it: idempotent and safe out of order. */
  async function syncSubscription(subscriptionId: string, userHint?: string | null): Promise<SubscriptionState | null> {
    const sub: StripeSubscription = await o.stripe().subscriptions.retrieve(subscriptionId);
    const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
    const userId = sub.metadata?.user_id || userHint || (await o.store.userIdForCustomer(customerId));
    if (!userId) {
      log(`[billing] subscription ${sub.id} has no known user; ignored`);
      return null;
    }
    await o.store.saveCustomer(userId, customerId);
    const item = sub.items.data[0];
    const plan = planForPrice(item?.price);
    if (!plan && item?.price?.id)
      log(`[billing] subscription ${sub.id} has a price this product does not sell: ${item.price.id}`);
    const period = periodOf(sub);
    const state: SubscriptionState = {
      id: sub.id,
      userId,
      customerId,
      plan,
      priceId: item?.price?.id ?? null,
      status: sub.status,
      currentPeriodStart: period.start,
      currentPeriodEnd: period.end,
      cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
    };
    await o.store.saveSubscription(state);
    await o.onSubscription?.(state);
    return state;
  }

  const portalUrl = async ({ userId, origin }: { userId: string; origin: string }): Promise<string> => {
    const customer = await o.store.customerId(userId);
    if (!customer) throw new BillingError("There is no billing account yet. Choose a plan first.", 404);
    const configuration = o.portalConfiguration?.();
    const session = await o.stripe().billingPortal.sessions.create({
      customer,
      return_url: urls(origin).portal,
      ...(configuration ? { configuration } : {}),
    });
    return session.url;
  };

  const id = (value: unknown): string | null =>
    typeof value === "string"
      ? value
      : value && typeof value === "object"
        ? ((value as { id?: string }).id ?? null)
        : null;

  return {
    priceFor,
    planForPrice,
    syncSubscription,
    portalUrl,

    /**
     * Where to send the user to pay for `plan`. A user who already pays goes to the portal instead: changing or
     * cancelling happens there, never through a second Checkout (two subscriptions).
     */
    async checkoutUrl(p: { userId: string; email: string; plan: string; origin: string }): Promise<string> {
      const paying = (await o.store.subscriptions(p.userId)).filter((s) => s.customerId);
      if (paying.some((s) => isEntitled(s, o.now?.() ?? Date.now()))) return portalUrl(p);
      const price = await priceFor(p.plan);
      const customer = await ensureCustomer(p.userId, p.email);
      const trial = await o.trialDays?.(p.userId, p.plan);
      const tax = o.automaticTax?.()
        ? {
            automatic_tax: { enabled: true },
            customer_update: { address: "auto", name: "auto" },
            tax_id_collection: { enabled: true },
          }
        : {};
      const tags = o.metadata?.() ?? {};
      const session = await o.stripe().checkout.sessions.create({
        mode: "subscription",
        metadata: { ...tags, user_id: p.userId, plan: p.plan },
        customer,
        client_reference_id: p.userId,
        line_items: [{ price, quantity: 1 }],
        subscription_data: {
          metadata: { ...tags, user_id: p.userId, plan: p.plan },
          ...(trial ? { trial_period_days: trial } : {}),
        },
        allow_promotion_codes: o.allowPromotionCodes ?? true,
        success_url: urls(p.origin).success,
        cancel_url: urls(p.origin).cancel,
        ...tax,
      });
      if (!session.url) throw new Error("Stripe returned a Checkout session without a URL");
      return session.url;
    },

    /** Verifies and applies a webhook; a bad signature is a BillingError (400). */
    async handleWebhook(rawBody: string, signature: string | null): Promise<{ type: string }> {
      const secret = o.webhookSecret();
      if (!secret) throw new BillingError("STRIPE_WEBHOOK_SECRET is not configured", 503);
      let event: { type: string; data: { object: Record<string, unknown> } };
      try {
        event = await o.stripe().webhooks.constructEventAsync(rawBody, signature ?? "", secret);
      } catch {
        throw new BillingError("Invalid webhook signature", 400);
      }
      const object = event.data.object;
      switch (event.type) {
        case "checkout.session.completed": {
          const subscriptionId = object.mode === "subscription" ? id(object.subscription) : null;
          if (subscriptionId) await syncSubscription(subscriptionId, id(object.client_reference_id));
          break;
        }
        case "customer.subscription.created":
        case "customer.subscription.updated":
        case "customer.subscription.deleted":
        case "customer.subscription.paused":
        case "customer.subscription.resumed":
          await syncSubscription(String(object.id));
          break;
        case "invoice.paid":
        case "invoice.payment_failed": {
          const subscriptionId = subscriptionIdOfInvoice(object);
          if (subscriptionId) await syncSubscription(subscriptionId);
          break;
        }
        default:
          break;
      }
      await o.onEvent?.(event);
      return { type: event.type };
    },

    /** Stops the user's live subscriptions at the end of the period they paid for. */
    async stopAtPeriodEnd(userId: string): Promise<void> {
      const customer = await o.store.customerId(userId);
      if (!customer) throw new BillingError("You have no subscription to stop.", 404);
      const { data } = await o.stripe().subscriptions.list({ customer, status: "all", limit: 100 });
      const live = data.filter((s) => LIVE_STATUSES.includes(s.status));
      if (!live.length) throw new BillingError("You have no subscription to stop.", 404);
      for (const s of live) {
        await o.stripe().subscriptions.update(s.id, { cancel_at_period_end: true });
        await syncSubscription(s.id, userId);
      }
    },

    /** Ends every subscription now (account deletion). */
    async cancelAll(userId: string): Promise<void> {
      const customer = await o.store.customerId(userId);
      if (!customer) return;
      const { data } = await o.stripe().subscriptions.list({ customer, status: "all", limit: 100 });
      for (const s of data) {
        if (s.status === "canceled" || s.status === "incomplete_expired") continue;
        await o.stripe().subscriptions.cancel(s.id);
      }
    },
  };
}

export type StripeBilling = ReturnType<typeof createStripeBilling>;
