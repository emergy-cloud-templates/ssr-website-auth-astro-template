import type { APIContext } from "astro";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getUser = vi.fn();
vi.mock("~/lib/auth", () => ({ createAuth: () => ({ provider: "local", getUser }) }));

const { onRequest } = await import("~/middleware");

function run(path: string) {
  const url = new URL(path, "https://example.com");
  const locals = {} as App.Locals;
  const ctx = {
    url,
    locals,
    request: new Request(url),
    redirect: (location: string, status = 302) => new Response(null, { status, headers: { location } }),
  } as unknown as APIContext;
  const next = vi.fn(async () => new Response("page"));
  return { locals, next, response: onRequest(ctx, next) as Promise<Response> };
}

const ann = { id: "u1", email: "ann@example.com", name: "Ann", createdAt: "" };

describe("middleware", () => {
  beforeEach(() => {
    getUser.mockReset();
  });

  it("exposes the user and renders public pages", async () => {
    getUser.mockResolvedValue(ann);
    const { locals, next, response } = run("/");
    const res = await response;
    expect(locals.user).toEqual(ann);
    expect(next).toHaveBeenCalled();
    expect(res.headers.get("cache-control")).toBe("private, no-store");
  });

  it("leaves anonymous public pages cacheable", async () => {
    getUser.mockResolvedValue(null);
    const res = await run("/").response;
    expect(res.headers.get("cache-control")).toBeNull();
  });

  it("redirects anonymous visitors away from protected pages", async () => {
    getUser.mockResolvedValue(null);
    const { next, response } = run("/dashboard");
    const res = await response;
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("/auth/signin?redirectTo=%2Fdashboard");
    expect(next).not.toHaveBeenCalled();
  });

  it("treats an auth outage as signed out instead of failing the request", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    getUser.mockRejectedValue(new Error("Supabase unreachable"));
    const { locals, response } = run("/");
    expect((await response).status).toBe(200);
    expect(locals.user).toBeNull();
  });

  it("marks API responses as uncacheable", async () => {
    getUser.mockResolvedValue(null);
    const res = await run("/api/auth/signin").response;
    expect(res.headers.get("cache-control")).toBe("private, no-store");
  });
});
