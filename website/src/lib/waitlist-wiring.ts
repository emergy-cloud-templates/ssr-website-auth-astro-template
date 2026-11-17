// Wires the waitlist to this app's configuration (platform-config keys, read per request).
import { getSecret } from "astro:env/server";

import { getDb } from "~/lib/db";
import {
  brevoFromEnv,
  createRateLimiter,
  memoryWaitlistStore,
  postgresWaitlistStore,
  type BrevoOptions,
  type WaitlistStore,
} from "~/lib/waitlist";

const memory = memoryWaitlistStore();
/** 5 sign-ups per IP per 10 minutes. */
export const allowSignUp = createRateLimiter(5, 10 * 60_000);

export function waitlistStore(): WaitlistStore {
  const sql = getDb();
  return sql ? postgresWaitlistStore(sql) : memory;
}

/** Prod only: the three Brevo keys plus SITE_URL (the confirmation redirect). */
export function waitlistBrevo(origin: string): BrevoOptions | null {
  return brevoFromEnv((key) => getSecret(key), getSecret("SITE_URL") || origin);
}

/** The viewer's address: CloudFront appends it as the last X-Forwarded-For entry (earlier ones are client-supplied). */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",").at(-1)?.trim() || "local";
}
