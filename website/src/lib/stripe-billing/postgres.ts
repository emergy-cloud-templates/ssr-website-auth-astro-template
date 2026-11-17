// Adapted from /common/legos/node/stripe-billing@1.0.0 (dvk-common dfb9868), supabase.ts. Owned by this project.
// The billing tables (sql/billing.sql) over a postgres.js connection (DATABASE_URL, behind PgBouncer: no prepared
// statements, see src/lib/db.ts). Replaces the lego's Supabase store: this app's database is plain Postgres.
import type { Sql } from "postgres";

import type { BillingStore, SubscriptionState } from "./billing.ts";

const iso = (ms: number | null) => (ms === null ? null : new Date(ms).toISOString());
const ms = (value: Date | string | null) => (value === null ? null : new Date(value).getTime());

export function postgresBillingStore(source: () => Sql): BillingStore {
  return {
    async customerId(userId) {
      const rows = await source()`select customer_id from public.billing_customers where user_id = ${userId}`;
      return (rows[0]?.customer_id as string | undefined) ?? null;
    },
    async saveCustomer(userId, customerId) {
      await source()`
        insert into public.billing_customers (user_id, customer_id) values (${userId}, ${customerId})
        on conflict (user_id) do update set customer_id = excluded.customer_id`;
    },
    async userIdForCustomer(customerId) {
      const rows = await source()`select user_id from public.billing_customers where customer_id = ${customerId}`;
      return (rows[0]?.user_id as string | undefined) ?? null;
    },
    async saveSubscription(s: SubscriptionState) {
      await source()`
        insert into public.billing_subscriptions
          (id, user_id, customer_id, plan, price_id, status, current_period_start, current_period_end,
           cancel_at_period_end, updated_at)
        values (${s.id}, ${s.userId}, ${s.customerId}, ${s.plan}, ${s.priceId}, ${s.status},
                ${iso(s.currentPeriodStart)}, ${iso(s.currentPeriodEnd)}, ${s.cancelAtPeriodEnd}, now())
        on conflict (id) do update set
          user_id = excluded.user_id, customer_id = excluded.customer_id, plan = excluded.plan,
          price_id = excluded.price_id, status = excluded.status,
          current_period_start = excluded.current_period_start, current_period_end = excluded.current_period_end,
          cancel_at_period_end = excluded.cancel_at_period_end, updated_at = now()`;
    },
    async subscriptions(userId) {
      const rows = await source()`
        select status, current_period_end, customer_id from public.billing_subscriptions where user_id = ${userId}`;
      return rows.map((r) => ({
        status: r.status as string,
        currentPeriodEnd: ms(r.current_period_end as Date | string | null),
        customerId: r.customer_id as string,
      }));
    },
  };
}
