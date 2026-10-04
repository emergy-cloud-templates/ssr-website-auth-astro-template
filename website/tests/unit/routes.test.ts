import { describe, expect, it } from "vitest";

import { matchesRoute, redirectFor } from "~/lib/routes";

const at = (path: string) => new URL(path, "https://example.com");

describe("matchesRoute", () => {
  it("matches the route and its children only", () => {
    expect(matchesRoute("/account", "/account")).toBe(true);
    expect(matchesRoute("/account/", "/account")).toBe(true);
    expect(matchesRoute("/account/security", "/account")).toBe(true);
    expect(matchesRoute("/accounting", "/account")).toBe(false);
  });
});

describe("redirectFor", () => {
  it("sends signed-out visitors of protected pages to sign-in, remembering the page", () => {
    expect(redirectFor(at("/dashboard?tab=1"), false)).toBe("/auth/signin?redirectTo=%2Fdashboard%3Ftab%3D1");
    expect(redirectFor(at("/account/"), false)).toBe("/auth/signin?redirectTo=%2Faccount%2F");
  });

  it("lets signed-in users through to protected pages", () => {
    expect(redirectFor(at("/dashboard"), true)).toBeNull();
  });

  it("sends signed-in users away from guest-only pages", () => {
    expect(redirectFor(at("/auth/signin"), true)).toBe("/dashboard");
    expect(redirectFor(at("/auth/signup"), true)).toBe("/dashboard");
    expect(redirectFor(at("/auth/reset-password"), true)).toBe("/dashboard");
  });

  it("requires a session for the update-password page", () => {
    expect(redirectFor(at("/auth/update-password"), false)).toBe("/auth/signin?error=link_expired");
    expect(redirectFor(at("/auth/update-password"), true)).toBeNull();
  });

  it("leaves public pages alone", () => {
    for (const path of ["/", "/accounting", "/auth/callback", "/api/auth/signin"]) {
      expect(redirectFor(at(path), false)).toBeNull();
      expect(redirectFor(at(path), true)).toBeNull();
    }
  });
});
