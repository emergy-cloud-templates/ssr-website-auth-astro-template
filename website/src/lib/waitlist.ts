// Email sign-ups: a `waitlist` table (created by the emergy.cloud platform in the project's database) and, on prod,
// a Brevo double opt-in. Dev and staging get no Brevo keys: the row is stored and nothing is sent.
import type { Sql } from "postgres";

import { normalizeEmail, validateEmail } from "~/components/auth-forms/validation";
import { badRequest, tooManyRequests } from "~/lib/api-route";

export interface WaitlistStore {
  /** Stores the sign-up; false when the email was already there. */
  add(email: string, source: string | null): Promise<boolean>;
}

/** The platform's table: waitlist (id bigserial primary key, email text unique not null, source text, created_at). */
export function postgresWaitlistStore(sql: Sql): WaitlistStore {
  return {
    async add(email, source) {
      const rows = await sql`
        insert into public.waitlist (email, source) values (${email}, ${source})
        on conflict (email) do nothing returning id`;
      return rows.length > 0;
    },
  };
}

/** Local development and tests: nothing survives a restart. */
export function memoryWaitlistStore(): WaitlistStore & { emails(): string[] } {
  const rows = new Map<string, string | null>();
  return {
    emails: () => [...rows.keys()],
    async add(email, source) {
      if (rows.has(email)) return false;
      rows.set(email, source);
      return true;
    },
  };
}

export interface BrevoOptions {
  apiKey: string;
  listId: number;
  templateId: number;
  /** Where Brevo sends the person after they confirm. */
  redirectUrl: string;
}

/** The Brevo options from the platform-config keys, or null unless all three are set and numeric (prod only). */
export function brevoFromEnv(read: (key: string) => string | undefined, siteUrl: string): BrevoOptions | null {
  const apiKey = read("BREVO_API_KEY")?.trim();
  const listId = Number(read("BREVO_LIST_ID"));
  const templateId = Number(read("BREVO_DOI_TEMPLATE_ID"));
  if (!apiKey || !Number.isInteger(listId) || listId <= 0 || !Number.isInteger(templateId) || templateId <= 0)
    return null;
  return { apiKey, listId, templateId, redirectUrl: `${siteUrl.replace(/\/+$/, "")}/waitlist/confirmed` };
}

/** Brevo's double opt-in endpoint: the contact is added to the list once they click the emailed link. */
export async function brevoDoubleOptIn(
  options: BrevoOptions,
  email: string,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  const response = await fetchImpl("https://api.brevo.com/v3/contacts/doubleOptinConfirmation", {
    method: "POST",
    headers: { "api-key": options.apiKey, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      email,
      includeListIds: [options.listId],
      templateId: options.templateId,
      redirectionUrl: options.redirectUrl,
    }),
    signal: AbortSignal.timeout(8000),
  });
  // Brevo answers 201 for a new contact and 204 when it already exists; the message is never logged with the key.
  if (!response.ok) throw new Error(`Brevo double opt-in failed with status ${response.status}`);
}

/** At most `limit` hits per `windowMs` per key. In memory, so per Lambda container: a brake, not a guarantee. */
export function createRateLimiter(limit: number, windowMs: number, now: () => number = Date.now) {
  const hits = new Map<string, number[]>();
  return function allow(key: string): boolean {
    const t = now();
    const recent = (hits.get(key) ?? []).filter((at) => t - at < windowMs);
    if (recent.length >= limit) {
      hits.set(key, recent);
      return false;
    }
    recent.push(t);
    hits.set(key, recent);
    if (hits.size > 5000) for (const [k, v] of hits) if (v.every((at) => t - at >= windowMs)) hits.delete(k);
    return true;
  };
}

export interface SignUpInput {
  email?: unknown;
  /** The honeypot: a field real visitors never see. Anything in it is a bot. */
  website?: unknown;
  source?: unknown;
}

export interface SignUpDeps {
  store: WaitlistStore;
  brevo: BrevoOptions | null;
  allow: (key: string) => boolean;
  ip: string;
  fetchImpl?: typeof fetch;
  log?: (message: string) => void;
}

/**
 * Handles one sign-up: honeypot (answered as a success, nothing stored), per-IP limit, email check, insert, then
 * on prod the Brevo double opt-in. A Brevo failure is logged and the sign-up still counts (the row is stored).
 */
export async function signUp(input: SignUpInput, deps: SignUpDeps): Promise<void> {
  if (typeof input.website === "string" && input.website.trim() !== "") return;
  if (!deps.allow(deps.ip)) throw tooManyRequests();
  const email = normalizeEmail(typeof input.email === "string" ? input.email : "");
  const problem = validateEmail(email);
  if (problem) throw badRequest(problem);
  const source = typeof input.source === "string" && input.source.trim() ? input.source.trim().slice(0, 100) : null;
  const added = await deps.store.add(email, source);
  if (!added || !deps.brevo) return;
  try {
    await brevoDoubleOptIn(deps.brevo, email, deps.fetchImpl);
  } catch (error) {
    (deps.log ?? console.warn)(`[waitlist] ${error instanceof Error ? error.message : "Brevo call failed"}`);
  }
}
