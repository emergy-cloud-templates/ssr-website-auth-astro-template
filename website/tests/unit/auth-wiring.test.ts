import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { APIContext } from "astro";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The auth logic, providers and routes are the supabase-auth lego's, tested in the library (dvk-common). This test
 * checks this app's wiring: src/lib/auth.ts, the middleware and the route files, end to end on the local provider.
 */
const dir = mkdtempSync(join(tmpdir(), "auth-wiring-"));
// astro:env reads the environment through the adapter at runtime; under Vitest it would ignore stubbed values and
// fall back to the dev database (.data/), so the test reads process.env itself.
vi.mock("astro:env/server", () => ({ getSecret: (key: string) => process.env[key] }));
// Per test: the Vitest config unstubs the environment after each one.
beforeEach(() => {
  vi.stubEnv("AUTH_PROVIDER", "local");
  vi.stubEnv("LOCAL_AUTH_DB_PATH", join(dir, "auth.sqlite"));
});
afterAll(() => rmSync(dir, { recursive: true, force: true }));

/** A browser: cookies that follow Set-Cookie, and Astro-like contexts per request. */
function browser() {
  const jar = new Map<string, string>();
  return (method: string, path: string, fields?: Record<string, string>) => {
    const url = new URL(path, "http://localhost:4321");
    const body = fields ? new FormData() : undefined;
    for (const [k, v] of Object.entries(fields ?? {})) body!.set(k, v);
    const cookie = [...jar].map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("; ");
    return {
      url,
      request: new Request(url, { method, body, headers: { cookie } }),
      locals: {} as App.Locals,
      cookies: {
        get: (name: string) => (jar.has(name) ? { value: jar.get(name)! } : undefined),
        set: (name: string, value: string, options?: { expires?: Date; maxAge?: number }) => {
          const gone =
            value === "" || options?.maxAge === 0 || (options?.expires && options.expires.getTime() < Date.now());
          if (gone) jar.delete(name);
          else jar.set(name, value);
        },
        delete: (name: string) => void jar.delete(name),
      },
      redirect: (location: string, status = 302) => new Response(null, { status, headers: { location } }),
    } as unknown as APIContext;
  };
}

describe("auth wiring", () => {
  it("signs up through the route file, reaches the dashboard through the middleware, signs out", async () => {
    const { onRequest } = await import("~/middleware");
    const { POST: signUp } = await import("~/pages/api/auth/signup");
    const { POST: signOut } = await import("~/pages/api/auth/signout");
    const page = async (ctx: APIContext, next: () => Promise<Response> = async () => new Response("page")) =>
      (await onRequest(ctx, next)) as Response;
    const ann = browser();

    const blocked = await page(ann("GET", "/dashboard"));
    expect(blocked.headers.get("location")).toBe("/auth/signin?redirectTo=%2Fdashboard");

    const signUpCtx = ann("POST", "/api/auth/signup", {
      name: "Ann",
      email: "ann@example.com",
      password: "Correct1horse",
      confirmPassword: "Correct1horse",
    });
    const created = await page(signUpCtx, async () => signUp(signUpCtx) as Promise<Response>);
    expect(await created.json()).toEqual({ ok: true, signedIn: true, redirectTo: "/dashboard" });

    const dashboard = ann("GET", "/dashboard");
    expect((await page(dashboard)).status).toBe(200);
    expect(dashboard.locals.user?.email).toBe("ann@example.com");

    const outCtx = ann("POST", "/api/auth/signout", {});
    const out = await page(outCtx, async () => signOut(outCtx) as Promise<Response>);
    expect(out.status).toBe(303);
    expect((await page(ann("GET", "/dashboard"))).status).toBe(302);
  });

  it("answers the forms' contract: a generic message for bad credentials", async () => {
    const { onRequest } = await import("~/middleware");
    const { POST: signIn } = await import("~/pages/api/auth/signin");
    const ctx = browser()("POST", "/api/auth/signin", { email: "nobody@example.com", password: "Wrong1password" });
    const response = (await onRequest(ctx, async () => signIn(ctx) as Promise<Response>)) as Response;
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Invalid email or password." });
  });
});
