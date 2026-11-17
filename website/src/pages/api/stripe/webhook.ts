// Adapted from /common/legos/node/stripe-billing@1.0.0 (dvk-common dfb9868). Owned by this project.
// Lego stripe-billing page file: copy to website/src/pages/api/stripe/webhook.ts. In Stripe: Developers > Webhooks, this
// URL, the events customer.subscription.*, checkout.session.completed, invoice.paid, invoice.payment_failed.
import { json } from "~/lib/api-route";
import { billing } from "~/lib/billing";
import { defineRoute } from "~/lib/route";

export const POST = defineRoute({ name: "/api/stripe/webhook", auth: "public" }, async (ctx) =>
  json(await billing.handleWebhook(await ctx.request.text(), ctx.request.headers.get("stripe-signature"))),
);
