// Adapted from /common/legos/node/stripe-billing@1.0.0 (dvk-common dfb9868). Owned by this project.
// Lego stripe-billing: the product's billing tables in memory, for tests and local development.
import type { BillingStore, SubscriptionState } from "./billing.ts";

export function memoryBillingStore(): BillingStore & { all(): SubscriptionState[] } {
  const customers = new Map<string, string>();
  const subs = new Map<string, SubscriptionState>();
  return {
    all: () => [...subs.values()],
    async customerId(userId) {
      return customers.get(userId) ?? null;
    },
    async saveCustomer(userId, customerId) {
      customers.set(userId, customerId);
    },
    async userIdForCustomer(customerId) {
      for (const [userId, c] of customers) if (c === customerId) return userId;
      return null;
    },
    async saveSubscription(state) {
      subs.set(state.id, state);
    },
    async subscriptions(userId) {
      return [...subs.values()].filter((s) => s.userId === userId);
    },
  };
}
