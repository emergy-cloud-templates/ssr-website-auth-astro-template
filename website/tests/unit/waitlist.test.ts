import { describe, expect, it, vi } from "vitest";

import { HttpError } from "../../src/lib/api-route";
import {
  brevoFromEnv,
  createRateLimiter,
  memoryWaitlistStore,
  postgresWaitlistStore,
  signUp,
  type BrevoOptions,
} from "../../src/lib/waitlist";

const brevo: BrevoOptions = {
  apiKey: "SENTINEL_BREVO_KEY",
  listId: 7,
  templateId: 3,
  redirectUrl: "https://x.test/waitlist/confirmed",
};

function deps(over: Partial<Parameters<typeof signUp>[1]> = {}) {
  const store = memoryWaitlistStore();
  const fetchImpl = vi.fn(async () => new Response(null, { status: 201 }));
  return { store, fetchImpl, d: { store, brevo: null, allow: () => true, ip: "1.1.1.1", fetchImpl, ...over } };
}

describe("signUp", () => {
  it("stores a normalized email and sends nothing without Brevo keys (dev, staging)", async () => {
    const { store, fetchImpl, d } = deps();
    await signUp({ email: "  Ada@Example.COM ", source: "home" }, d);
    expect(store.emails()).toEqual(["ada@example.com"]);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("ignores a filled honeypot: success, nothing stored, nothing sent", async () => {
    const { store, fetchImpl, d } = deps({ brevo });
    await signUp({ email: "bot@example.com", website: "http://spam" }, d);
    expect(store.emails()).toEqual([]);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("refuses over the limit with 429, and an invalid email with 400", async () => {
    const allow = createRateLimiter(5, 10 * 60_000);
    const { d } = deps({ allow });
    for (let i = 0; i < 5; i++) await signUp({ email: `a${i}@example.com` }, d);
    await expect(signUp({ email: "late@example.com" }, d)).rejects.toMatchObject({ status: 429 });
    const fresh = deps().d;
    await expect(signUp({ email: "nope" }, fresh)).rejects.toBeInstanceOf(HttpError);
  });

  it("calls Brevo's double opt-in for a new email on prod, once, with the key in the header only", async () => {
    const { fetchImpl, d } = deps({ brevo });
    await signUp({ email: "a@example.com" }, d);
    await signUp({ email: "a@example.com" }, d);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.brevo.com/v3/contacts/doubleOptinConfirmation");
    expect((init.headers as Record<string, string>)["api-key"]).toBe("SENTINEL_BREVO_KEY");
    expect(JSON.parse(init.body as string)).toEqual({
      email: "a@example.com",
      includeListIds: [7],
      templateId: 3,
      redirectionUrl: "https://x.test/waitlist/confirmed",
    });
    expect(init.body).not.toContain("SENTINEL_BREVO_KEY");
  });

  it("keeps the sign-up when Brevo fails, and never logs the key", async () => {
    const log = vi.fn();
    const fetchImpl = vi.fn(async () => new Response("SENTINEL_BREVO_KEY", { status: 500 }));
    const { store, d } = deps({ brevo, fetchImpl, log });
    await signUp({ email: "a@example.com" }, d);
    expect(store.emails()).toEqual(["a@example.com"]);
    expect(log).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(log.mock.calls)).not.toContain("SENTINEL_BREVO_KEY");
  });
});

describe("brevoFromEnv", () => {
  const env = { BREVO_API_KEY: "k", BREVO_LIST_ID: "12", BREVO_DOI_TEMPLATE_ID: "4" };
  it("needs all three keys, numeric ids", () => {
    expect(brevoFromEnv((k) => (env as Record<string, string>)[k], "https://s.test/")).toEqual({
      apiKey: "k",
      listId: 12,
      templateId: 4,
      redirectUrl: "https://s.test/waitlist/confirmed",
    });
    expect(brevoFromEnv(() => undefined, "https://s.test")).toBeNull();
    expect(brevoFromEnv((k) => ({ ...env, BREVO_LIST_ID: "abc" })[k as keyof typeof env], "https://s.test")).toBeNull();
  });
});

describe("createRateLimiter", () => {
  it("lets keys in again after the window", () => {
    let t = 0;
    const allow = createRateLimiter(2, 1000, () => t);
    expect([allow("a"), allow("a"), allow("a"), allow("b")]).toEqual([true, true, false, true]);
    t = 1500;
    expect(allow("a")).toBe(true);
  });
});

describe("postgresWaitlistStore", () => {
  it("inserts with on conflict do nothing and reports whether a row was added", async () => {
    const calls: string[] = [];
    const rowsFor = [[{ id: 1 }], []];
    const sql = ((strings: TemplateStringsArray) => {
      calls.push(strings.join("?"));
      return Promise.resolve(rowsFor.shift());
    }) as never;
    const store = postgresWaitlistStore(sql);
    expect(await store.add("a@example.com", null)).toBe(true);
    expect(await store.add("a@example.com", null)).toBe(false);
    expect(calls[0]).toContain("on conflict (email) do nothing");
  });
});
