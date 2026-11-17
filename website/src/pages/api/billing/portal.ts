// Adapted from /common/legos/node/stripe-billing@1.0.0 (dvk-common dfb9868). Owned by this project.
// Lego stripe-billing page file: copy to website/src/pages/api/billing/portal.ts. Answers { url } (Stripe's portal).
import { json } from "~/lib/api-route";
import { billing } from "~/lib/billing";
import { defineRoute } from "~/lib/route";

export const POST = defineRoute({ name: "/api/billing/portal", auth: "user" }, async (ctx) =>
  json({ url: await billing.portalUrl({ userId: ctx.user.id, origin: ctx.url.origin }) }),
);
