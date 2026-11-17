import { json, readBody } from "~/lib/api-route";
import { defineRoute } from "~/lib/route";
import { signUp } from "~/lib/waitlist";
import { allowSignUp, clientIp, waitlistBrevo, waitlistStore } from "~/lib/waitlist-wiring";

/** POST { email, source?, website } -> { ok: true }. `website` is the honeypot. */
export const POST = defineRoute({ name: "/api/waitlist", auth: "public" }, async (ctx) => {
  const body = (await readBody(ctx.request)) as Record<string, unknown>;
  await signUp(body, {
    store: waitlistStore(),
    brevo: waitlistBrevo(ctx.url.origin),
    allow: allowSignUp,
    ip: clientIp(ctx.request),
  });
  return json({ ok: true });
});
