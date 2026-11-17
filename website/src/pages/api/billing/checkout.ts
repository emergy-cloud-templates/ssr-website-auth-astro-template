// Adapted from /common/legos/node/stripe-billing@1.0.0 (dvk-common dfb9868). Owned by this project.
// Lego stripe-billing page file: copy to website/src/pages/api/billing/checkout.ts. Body { plan }; answers { url }.
import { json, readBody, text } from "~/lib/api-route";
import { billing } from "~/lib/billing";
import { defineRoute } from "~/lib/route";

export const POST = defineRoute({ name: "/api/billing/checkout", auth: "user" }, async (ctx) => {
  const body = (await readBody(ctx.request)) as { plan?: unknown };
  const url = await billing.checkoutUrl({
    userId: ctx.user.id,
    email: ctx.user.email,
    plan: text(body.plan, "plan"),
    origin: ctx.url.origin,
  });
  return json({ url });
});
