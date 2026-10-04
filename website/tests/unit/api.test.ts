import type { APIContext } from "astro";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthError, type AuthService, type AuthUser } from "~/lib/auth/types";
import { POST as changePassword } from "~/pages/api/account/change-password";
import { POST as deleteAccount } from "~/pages/api/account/delete";
import { POST as updateProfile } from "~/pages/api/account/update-profile";
import { POST as resetPassword } from "~/pages/api/auth/reset-password";
import { POST as signIn } from "~/pages/api/auth/signin";
import { POST as signOut } from "~/pages/api/auth/signout";
import { POST as signUp } from "~/pages/api/auth/signup";
import { POST as updatePassword } from "~/pages/api/auth/update-password";
import { GET as callback } from "~/pages/auth/callback";

import { formRequest } from "./helpers";

const user: AuthUser = { id: "u1", email: "ann@example.com", name: "Ann", createdAt: "2026-01-01T00:00:00Z" };

function fakeAuth(): { [K in keyof AuthService]: ReturnType<typeof vi.fn> } & AuthService {
  return {
    provider: "local",
    getUser: vi.fn(async () => user),
    signIn: vi.fn(async () => user),
    signUp: vi.fn(async () => ({ signedIn: true })),
    signOut: vi.fn(async () => undefined),
    requestPasswordReset: vi.fn(async () => undefined),
    verifyCallback: vi.fn(async () => undefined),
    verifyPassword: vi.fn(async () => true),
    updatePassword: vi.fn(async () => undefined),
    isRecoverySession: vi.fn(async () => true),
    updateProfile: vi.fn(async ({ name }: { name: string }) => ({ ...user, name })),
    deleteAccount: vi.fn(async () => undefined),
  } as never;
}

let auth: ReturnType<typeof fakeAuth>;

function context(request: Request, signedIn = true): APIContext {
  return {
    request,
    url: new URL(request.url),
    locals: { auth, user: signedIn ? user : null },
    redirect: (location: string, status = 302) => new Response(null, { status, headers: { location } }),
  } as unknown as APIContext;
}

const post = (path: string, fields: Record<string, string>) => formRequest(`https://example.com${path}`, fields);
const body = async (response: Response) => response.json() as Promise<Record<string, unknown>>;

beforeEach(() => {
  auth = fakeAuth();
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("POST /api/auth/signin", () => {
  it("signs in with a normalized email and a safe redirect", async () => {
    const response = await signIn(
      context(post("/api/auth/signin", { email: " Ann@Example.com ", password: "pw", redirectTo: "/account" }), false),
    );
    expect(response.status).toBe(200);
    expect(await body(response)).toEqual({ ok: true, redirectTo: "/account" });
    expect(auth.signIn).toHaveBeenCalledWith("ann@example.com", "pw");
  });

  it("never redirects off-site", async () => {
    const response = await signIn(
      context(post("/api/auth/signin", { email: "a@b.co", password: "pw", redirectTo: "//evil.com" }), false),
    );
    expect((await body(response)).redirectTo).toBe("/dashboard");
  });

  it("validates input before calling the provider", async () => {
    expect((await signIn(context(post("/api/auth/signin", { email: "", password: "" }), false))).status).toBe(400);
    expect((await signIn(context(post("/api/auth/signin", { email: "nope", password: "pw" }), false))).status).toBe(
      400,
    );
    expect(auth.signIn).not.toHaveBeenCalled();
  });

  it("rejects a non-form body", async () => {
    const request = new Request("https://example.com/api/auth/signin", { method: "POST", body: "{}" });
    expect((await signIn(context(request, false))).status).toBe(400);
  });

  it("returns a generic message for bad credentials", async () => {
    auth.signIn.mockRejectedValueOnce(new AuthError("invalid_credentials"));
    const response = await signIn(context(post("/api/auth/signin", { email: "a@b.co", password: "pw" }), false));
    expect(response.status).toBe(401);
    expect(await body(response)).toEqual({ error: "Invalid email or password." });
  });

  it("hides unexpected errors", async () => {
    auth.signIn.mockRejectedValueOnce(new Error("database exploded at 10.0.0.3"));
    const response = await signIn(context(post("/api/auth/signin", { email: "a@b.co", password: "pw" }), false));
    expect(response.status).toBe(500);
    expect(JSON.stringify(await body(response))).not.toContain("10.0.0.3");
  });
});

describe("POST /api/auth/signup", () => {
  const valid = { name: "  Ann   Lee ", email: "ANN@example.com", password: "Correct1horse" };

  it("creates the account with a sanitized name and a callback link", async () => {
    const response = await signUp(context(post("/api/auth/signup", valid), false));
    expect(response.status).toBe(200);
    expect(await body(response)).toEqual({ ok: true, signedIn: true, redirectTo: "/dashboard" });
    expect(auth.signUp).toHaveBeenCalledWith(
      { email: "ann@example.com", password: "Correct1horse", name: "Ann Lee" },
      "https://example.com/auth/callback?next=%2Fdashboard",
    );
  });

  it.each([
    [{ ...valid, name: "" }, "Name is required"],
    [{ ...valid, email: "bad" }, "valid email"],
    [{ ...valid, password: "weak" }, "at least 8"],
  ])("rejects invalid input %#", async (fields, message) => {
    const response = await signUp(context(post("/api/auth/signup", fields), false));
    expect(response.status).toBe(400);
    expect(String((await body(response)).error)).toContain(message);
  });
});

describe("POST /api/auth/signout", () => {
  it("signs out and redirects home, even if the provider fails", async () => {
    auth.signOut.mockRejectedValueOnce(new Error("network"));
    const response = await signOut(context(post("/api/auth/signout", {})));
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("/");
  });
});

describe("POST /api/auth/reset-password", () => {
  it("always answers ok, so it cannot be used to probe for accounts", async () => {
    auth.requestPasswordReset.mockRejectedValueOnce(new AuthError("unexpected"));
    const response = await resetPassword(context(post("/api/auth/reset-password", { email: "a@b.co" }), false));
    expect(response.status).toBe(200);
    expect(auth.requestPasswordReset).toHaveBeenCalledWith(
      "a@b.co",
      "https://example.com/auth/callback?next=%2Fauth%2Fupdate-password",
    );
  });

  it("surfaces rate limiting", async () => {
    auth.requestPasswordReset.mockRejectedValueOnce(new AuthError("rate_limited"));
    const response = await resetPassword(context(post("/api/auth/reset-password", { email: "a@b.co" }), false));
    expect(response.status).toBe(429);
  });
});

describe("POST /api/auth/update-password", () => {
  it("requires the session created by the reset link", async () => {
    const response = await updatePassword(
      context(post("/api/auth/update-password", { password: "Correct1horse" }), false),
    );
    expect(response.status).toBe(401);
  });

  it("refuses sessions that did not come from a fresh reset link", async () => {
    auth.isRecoverySession.mockResolvedValueOnce(false);
    const response = await updatePassword(context(post("/api/auth/update-password", { password: "Correct1horse" })));
    expect(response.status).toBe(403);
    expect(auth.updatePassword).not.toHaveBeenCalled();
  });

  it("enforces the password policy", async () => {
    const response = await updatePassword(context(post("/api/auth/update-password", { password: "weak" })));
    expect(response.status).toBe(400);
    expect(auth.updatePassword).not.toHaveBeenCalled();
  });

  it("updates the password", async () => {
    const response = await updatePassword(context(post("/api/auth/update-password", { password: "Correct1horse" })));
    expect(response.status).toBe(200);
    expect(auth.updatePassword).toHaveBeenCalledWith("Correct1horse");
  });
});

describe("account routes", () => {
  it("require a signed-in user", async () => {
    for (const route of [updateProfile, changePassword, deleteAccount]) {
      expect((await route(context(post("/api/account/x", {}), false))).status).toBe(401);
    }
  });

  it("update the profile name", async () => {
    const response = await updateProfile(context(post("/api/account/update-profile", { name: " Ann  Smith " })));
    expect(await body(response)).toEqual({ ok: true, user: { name: "Ann Smith" } });
  });

  it("change the password only with the right current password", async () => {
    auth.verifyPassword.mockResolvedValueOnce(false);
    const wrong = await changePassword(
      context(post("/api/account/change-password", { currentPassword: "old", newPassword: "Correct1horse" })),
    );
    expect(wrong.status).toBe(400);
    expect(auth.updatePassword).not.toHaveBeenCalled();

    const ok = await changePassword(
      context(post("/api/account/change-password", { currentPassword: "old", newPassword: "Correct1horse" })),
    );
    expect(ok.status).toBe(200);
    expect(auth.updatePassword).toHaveBeenCalledWith("Correct1horse");
  });

  it("refuse reusing the same password", async () => {
    const response = await changePassword(
      context(post("/api/account/change-password", { currentPassword: "Correct1horse", newPassword: "Correct1horse" })),
    );
    expect(response.status).toBe(400);
  });

  it("delete the account only after typing DELETE and the password", async () => {
    expect(
      (await deleteAccount(context(post("/api/account/delete", { confirmation: "delete", password: "pw" })))).status,
    ).toBe(400);
    auth.verifyPassword.mockResolvedValueOnce(false);
    expect(
      (await deleteAccount(context(post("/api/account/delete", { confirmation: "DELETE", password: "pw" })))).status,
    ).toBe(400);
    expect(auth.deleteAccount).not.toHaveBeenCalled();

    expect(
      (await deleteAccount(context(post("/api/account/delete", { confirmation: "DELETE", password: "pw" })))).status,
    ).toBe(200);
    expect(auth.deleteAccount).toHaveBeenCalled();
  });

  it("explain when account deletion is not configured", async () => {
    auth.deleteAccount.mockRejectedValueOnce(new AuthError("not_configured"));
    const response = await deleteAccount(
      context(post("/api/account/delete", { confirmation: "DELETE", password: "pw" })),
    );
    expect(response.status).toBe(501);
  });
});

describe("GET /auth/callback", () => {
  const get = (query: string) => new Request(`https://example.com/auth/callback${query}`);

  it("verifies the link and continues to a safe next page", async () => {
    const response = await callback(context(get("?token_hash=t&type=recovery&next=%2Fauth%2Fupdate-password"), false));
    expect(auth.verifyCallback).toHaveBeenCalledWith({ code: undefined, tokenHash: "t", type: "recovery" });
    expect(response.headers.get("location")).toBe("/auth/update-password");
  });

  it("ignores off-site next targets", async () => {
    const response = await callback(context(get("?code=c&next=https%3A%2F%2Fevil.com"), false));
    expect(response.headers.get("location")).toBe("/dashboard");
  });

  it("sends invalid or expired links back to sign-in", async () => {
    auth.verifyCallback.mockRejectedValueOnce(new AuthError("invalid_token"));
    const response = await callback(context(get("?code=old"), false));
    expect(response.headers.get("location")).toBe("/auth/signin?error=link_expired");

    const supabaseError = await callback(context(get("?error=access_denied&error_code=otp_expired"), false));
    expect(supabaseError.headers.get("location")).toBe("/auth/signin?error=link_expired");
  });
});
