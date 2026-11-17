// Adapted from /common/legos/node/stripe-billing@1.0.0 (dvk-common dfb9868). Owned by this project.
// Lego stripe-billing: the slice of the Stripe SDK the lego calls, as structural types (so the lego type-checks
// without `stripe` installed), the payload helpers every product needed, and an in-memory Stripe for tests and local
// development.
import { createHmac, timingSafeEqual } from "node:crypto";

export interface StripePrice {
  id: string;
  lookup_key?: string | null;
}

export interface StripeSubscription {
  id: string;
  customer: string | { id: string };
  status: string;
  cancel_at_period_end?: boolean | null;
  metadata?: Record<string, string> | null;
  /** Before API 2025-03-31 the period lived on the subscription; since, on each item. */
  current_period_start?: number;
  current_period_end?: number;
  items: { data: { price?: StripePrice | null; current_period_start?: number; current_period_end?: number }[] };
}

type Params = Record<string, unknown>;

/** What the lego calls on `new Stripe(key)`. */
export interface StripeLike {
  customers: { create(params: Params, options?: { idempotencyKey?: string }): Promise<{ id: string }> };
  prices: { list(params: Params): Promise<{ data: StripePrice[] }> };
  checkout: { sessions: { create(params: Params): Promise<{ id: string; url: string | null }> } };
  billingPortal: { sessions: { create(params: Params): Promise<{ url: string }> } };
  subscriptions: {
    retrieve(id: string): Promise<StripeSubscription>;
    list(params: Params): Promise<{ data: StripeSubscription[] }>;
    update(id: string, params: Params): Promise<StripeSubscription>;
    cancel(id: string): Promise<StripeSubscription>;
  };
  webhooks: {
    constructEventAsync(
      payload: string,
      signature: string,
      secret: string,
    ): Promise<{ type: string; data: { object: Record<string, unknown> } }>;
  };
}

/**
 * The billing period in milliseconds. Stripe moved `current_period_start` / `_end` from the subscription to its items
 * (API 2025-03-31); boulot and storeai each wrote this fallback, recapify pinned the new shape.
 */
export function periodOf(sub: StripeSubscription): { start: number | null; end: number | null } {
  const item = sub.items.data[0];
  const start = item?.current_period_start ?? sub.current_period_start;
  const end = item?.current_period_end ?? sub.current_period_end;
  return { start: typeof start === "number" ? start * 1000 : null, end: typeof end === "number" ? end * 1000 : null };
}

/** An invoice's subscription: `parent.subscription_details.subscription` since API 2025-03-31, `subscription` before. */
export function subscriptionIdOfInvoice(invoice: Record<string, unknown>): string | null {
  const parent = invoice.parent as { subscription_details?: { subscription?: unknown } } | null | undefined;
  const value = parent?.subscription_details?.subscription ?? invoice.subscription;
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && typeof (value as { id?: unknown }).id === "string")
    return (value as { id: string }).id;
  return null;
}

/** Stripe's webhook signature header for `payload`: `t=<seconds>,v1=<hmac>` (tests and the fake). */
export function signStripePayload(payload: string, secret: string, seconds = Math.floor(Date.now() / 1000)): string {
  return `t=${seconds},v1=${createHmac("sha256", secret).update(`${seconds}.${payload}`).digest("hex")}`;
}

/** Verifies a Stripe signature header the way the SDK does (any v1, five minutes of tolerance). */
export function verifyStripeSignature(
  payload: string,
  header: string,
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1000),
  tolerance = 300,
): boolean {
  const parts = header.split(",").map((p) => p.split("=", 2) as [string, string]);
  const t = Number(parts.find(([k]) => k === "t")?.[1]);
  if (!Number.isFinite(t) || Math.abs(nowSeconds - t) > tolerance) return false;
  const expected = Buffer.from(createHmac("sha256", secret).update(`${t}.${payload}`).digest("hex"));
  return parts.some(
    ([k, v]) =>
      k === "v1" && v && Buffer.from(v).length === expected.length && timingSafeEqual(Buffer.from(v), expected),
  );
}

/**
 * An in-memory Stripe for tests and local development (no account, no network): customers, prices by lookup key,
 * Checkout that "pays" at once (`complete(sessionId)` creates the subscription), the portal, subscriptions, and
 * signed webhooks (`event(type, object)` returns the raw body and the signature header).
 */
export function fakeStripe(options: { prices?: StripePrice[]; baseUrl?: string; now?: () => number } = {}) {
  const now = () => Math.floor((options.now?.() ?? Date.now()) / 1000);
  const base = options.baseUrl ?? "http://localhost:4321/dev/stripe";
  let seq = 0;
  const next = (prefix: string) => `${prefix}_fake_${++seq}`;
  const customers = new Map<string, Params>();
  const sessions = new Map<string, Params>();
  const subscriptions = new Map<string, StripeSubscription>();
  const prices = options.prices ?? [];
  const month = 30 * 86_400;

  const stripe: StripeLike = {
    customers: {
      async create(params) {
        const id = next("cus");
        customers.set(id, params);
        return { id };
      },
    },
    prices: {
      async list(params) {
        const keys = (params.lookup_keys as string[] | undefined) ?? [];
        return { data: prices.filter((p) => !keys.length || keys.includes(p.lookup_key ?? "")) };
      },
    },
    checkout: {
      sessions: {
        async create(params) {
          const id = next("cs");
          sessions.set(id, params);
          return { id, url: `${base}/checkout/${id}` };
        },
      },
    },
    billingPortal: {
      sessions: {
        async create(params) {
          return { url: `${base}/portal/${String(params.customer)}` };
        },
      },
    },
    subscriptions: {
      async retrieve(id) {
        const sub = subscriptions.get(id);
        if (!sub) throw Object.assign(new Error(`No such subscription: ${id}`), { statusCode: 404 });
        return structuredClone(sub);
      },
      async list(params) {
        return {
          data: [...subscriptions.values()]
            .filter((s) => s.customer === params.customer)
            .map((s) => structuredClone(s)),
        };
      },
      async update(id, params) {
        const sub = subscriptions.get(id);
        if (!sub) throw new Error(`No such subscription: ${id}`);
        if (typeof params.cancel_at_period_end === "boolean") sub.cancel_at_period_end = params.cancel_at_period_end;
        return structuredClone(sub);
      },
      async cancel(id) {
        const sub = subscriptions.get(id);
        if (!sub) throw new Error(`No such subscription: ${id}`);
        sub.status = "canceled";
        return structuredClone(sub);
      },
    },
    webhooks: {
      async constructEventAsync(payload, signature, secret) {
        if (!verifyStripeSignature(payload, signature, secret, now()))
          throw new Error("No signatures found matching the expected signature for payload");
        return JSON.parse(payload);
      },
    },
  };

  return {
    stripe,
    sessions,
    subscriptions,
    customers,
    /** Pays a Checkout session: creates its subscription (active, or trialing with trial days) and returns its id. */
    complete(sessionId: string): { subscriptionId: string; session: Params } {
      const s = sessions.get(sessionId);
      if (!s) throw new Error(`No such session: ${sessionId}`);
      const data = (s.subscription_data ?? {}) as { metadata?: Record<string, string>; trial_period_days?: number };
      const price = (s.line_items as { price: string }[])[0].price;
      const id = next("sub");
      const start = now();
      subscriptions.set(id, {
        id,
        customer: String(s.customer),
        status: data.trial_period_days ? "trialing" : "active",
        cancel_at_period_end: false,
        metadata: data.metadata ?? {},
        items: {
          data: [
            {
              price: prices.find((p) => p.id === price) ?? { id: price },
              current_period_start: start,
              current_period_end: start + month,
            },
          ],
        },
      });
      const session = {
        id: sessionId,
        object: "checkout.session",
        mode: s.mode,
        subscription: id,
        client_reference_id: s.client_reference_id,
        customer: s.customer,
      };
      return { subscriptionId: id, session };
    },
    /** A signed webhook for `type` and `object`, as Stripe would post it. */
    event(type: string, object: Params, secret: string): { body: string; signature: string } {
      const body = JSON.stringify({ id: next("evt"), type, data: { object } });
      return { body, signature: signStripePayload(body, secret, now()) };
    },
  };
}
