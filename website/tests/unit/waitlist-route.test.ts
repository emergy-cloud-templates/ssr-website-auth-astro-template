import type { APIContext } from "astro";
import { describe, expect, it, vi } from "vitest";

// Same as auth-wiring.test.ts: astro:env reads the environment through the adapter at runtime.
vi.mock("astro:env/server", () => ({ getSecret: (key: string) => process.env[key] }));

import { POST } from "../../src/pages/api/waitlist";
import { getDb } from "../../src/lib/db";

function call(body: Record<string, string>, ip = "9.9.9.9") {
  const url = new URL("http://localhost:4321/api/waitlist");
  const request = new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": `1.2.3.4, ${ip}` },
    body: JSON.stringify(body),
  });
  return (POST as unknown as (c: unknown) => Promise<Response>)({
    request,
    url,
    params: {},
    cookies: {},
    locals: {},
  } as unknown as APIContext);
}

describe("POST /api/waitlist", () => {
  it("accepts a sign-up on the in-memory store (no DATABASE_URL) and answers { ok: true }", async () => {
    const response = await call({ email: "route@example.com", website: "" });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
  });

  it("answers 400 for a bad email and 429 after five from one address", async () => {
    expect((await call({ email: "bad" }, "8.8.8.1")).status).toBe(400);
    for (let i = 0; i < 4; i++) await call({ email: `r${i}@example.com` }, "8.8.8.2");
    expect((await call({ email: "r9@example.com" }, "8.8.8.2")).status).toBe(200);
    expect((await call({ email: "r10@example.com" }, "8.8.8.2")).status).toBe(429);
  });
});

describe("getDb", () => {
  it("is null without DATABASE_URL and one reused connection with it", async () => {
    expect(getDb(() => undefined)).toBeNull();
    const url = "postgres://u:p@127.0.0.1:1/db";
    const a = getDb(() => url);
    expect(a).not.toBeNull();
    expect(getDb(() => url)).toBe(a);
    await a!.end({ timeout: 1 });
  });
});
