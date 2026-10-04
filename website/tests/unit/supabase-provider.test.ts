import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthError } from "~/lib/auth/types";

import { MemoryCookieJar } from "./helpers";

// A scriptable stand-in for the Supabase client returned by @supabase/ssr.
const auth = {
  getUser: vi.fn(),
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  exchangeCodeForSession: vi.fn(),
  verifyOtp: vi.fn(),
  updateUser: vi.fn(),
  getClaims: vi.fn(),
};
const admin = { deleteUser: vi.fn() };
let cookieAdapter: { setAll: (cookies: { name: string; value: string; options: object }[]) => void } | undefined;

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn((_url: string, _key: string, options: { cookies: typeof cookieAdapter }) => {
    cookieAdapter = options.cookies;
    return { auth };
  }),
}));
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({ auth: { admin } })),
}));

const { createSupabaseAuth } = await import("~/lib/auth/supabase");

const sbUser = {
  id: "u1",
  email: "ann@example.com",
  created_at: "2026-01-01T00:00:00Z",
  user_metadata: { name: "Ann" },
};
const sbError = (code: string, status = 400) => Object.assign(new Error(code), { code, status, name: "AuthApiError" });
const config = { url: "https://abc.supabase.co", publishableKey: "pk" };

const code = (promise: Promise<unknown>) =>
  promise.then(
    () => "resolved",
    (error: unknown) => (error instanceof AuthError ? error.code : error),
  );

describe("Supabase auth provider", () => {
  let jar: MemoryCookieJar;
  beforeEach(() => {
    vi.clearAllMocks();
    jar = new MemoryCookieJar();
    auth.getUser.mockResolvedValue({ data: { user: sbUser }, error: null });
    auth.signOut.mockResolvedValue({ error: null });
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  it("maps the Supabase user and caches it per request", async () => {
    const service = createSupabaseAuth(config, jar, true);
    expect(await service.getUser()).toEqual({
      id: "u1",
      email: "ann@example.com",
      name: "Ann",
      createdAt: "2026-01-01T00:00:00Z",
    });
    await service.getUser();
    expect(auth.getUser).toHaveBeenCalledTimes(1);
  });

  it("treats a missing or invalid session as signed out", async () => {
    auth.getUser.mockResolvedValue({ data: { user: null }, error: sbError("session_not_found", 403) });
    expect(await createSupabaseAuth(config, jar, true).getUser()).toBeNull();
  });

  it("forces httpOnly, secure, lax cookies whatever Supabase asks for", () => {
    createSupabaseAuth(config, jar, true);
    cookieAdapter!.setAll([
      { name: "sb-abc-auth-token", value: "v", options: { httpOnly: false, sameSite: "none", maxAge: 100 } },
    ]);
    expect(jar.store.get("sb-abc-auth-token")?.options).toMatchObject({
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 100,
    });
  });

  it("maps sign-in errors to the app vocabulary", async () => {
    const service = createSupabaseAuth(config, jar, true);
    auth.signInWithPassword.mockResolvedValueOnce({ data: {}, error: sbError("invalid_credentials") });
    expect(await code(service.signIn("ann@example.com", "x"))).toBe("invalid_credentials");
    auth.signInWithPassword.mockResolvedValueOnce({ data: {}, error: sbError("email_not_confirmed") });
    expect(await code(service.signIn("ann@example.com", "x"))).toBe("email_not_confirmed");
    auth.signInWithPassword.mockResolvedValueOnce({ data: {}, error: sbError("over_request_rate_limit", 429) });
    expect(await code(service.signIn("ann@example.com", "x"))).toBe("rate_limited");
  });

  it("reports whether sign-up started a session and hides existing accounts", async () => {
    const service = createSupabaseAuth(config, jar, true);
    auth.signUp.mockResolvedValueOnce({ data: { user: sbUser, session: null }, error: null });
    expect(await service.signUp({ email: "a@b.co", password: "p", name: "Ann" }, "https://x/cb")).toEqual({
      signedIn: false,
    });
    expect(auth.signUp).toHaveBeenCalledWith({
      email: "a@b.co",
      password: "p",
      options: { data: { name: "Ann" }, emailRedirectTo: "https://x/cb" },
    });

    auth.signUp.mockResolvedValueOnce({ data: { user: sbUser, session: {} }, error: null });
    expect(await service.signUp({ email: "a@b.co", password: "p", name: "Ann" }, "https://x/cb")).toEqual({
      signedIn: true,
    });

    auth.signUp.mockResolvedValueOnce({ data: {}, error: sbError("user_already_exists", 422) });
    expect(await code(service.signUp({ email: "a@b.co", password: "p", name: "Ann" }, "https://x/cb"))).toBe(
      "signup_failed",
    );
  });

  it("handles both callback flows and rejects anything else", async () => {
    const service = createSupabaseAuth(config, jar, true);
    auth.exchangeCodeForSession.mockResolvedValueOnce({ error: null });
    await service.verifyCallback({ code: "pkce-code" });
    expect(auth.exchangeCodeForSession).toHaveBeenCalledWith("pkce-code");

    auth.verifyOtp.mockResolvedValueOnce({ error: null });
    await service.verifyCallback({ tokenHash: "th", type: "recovery" });
    expect(auth.verifyOtp).toHaveBeenCalledWith({ token_hash: "th", type: "recovery" });

    expect(await code(service.verifyCallback({ tokenHash: "th", type: "bogus" }))).toBe("invalid_token");
    expect(await code(service.verifyCallback({}))).toBe("invalid_token");
    auth.exchangeCodeForSession.mockResolvedValueOnce({ error: sbError("flow_state_expired") });
    expect(await code(service.verifyCallback({ code: "old" }))).toBe("invalid_token");
  });

  it("verifies the current password against the signed-in email", async () => {
    const service = createSupabaseAuth(config, jar, true);
    auth.signInWithPassword.mockResolvedValueOnce({ data: { user: sbUser }, error: null });
    expect(await service.verifyPassword("right")).toBe(true);
    expect(auth.signInWithPassword).toHaveBeenCalledWith({ email: "ann@example.com", password: "right" });
    auth.signInWithPassword.mockResolvedValueOnce({ data: {}, error: sbError("invalid_credentials") });
    expect(await service.verifyPassword("wrong")).toBe(false);
  });

  it("maps password update errors", async () => {
    const service = createSupabaseAuth(config, jar, true);
    auth.updateUser.mockResolvedValueOnce({ data: {}, error: sbError("same_password", 422) });
    expect(await code(service.updatePassword("p"))).toBe("same_password");
  });

  it("recognizes a fresh session created by an emailed link", async () => {
    const service = createSupabaseAuth(config, jar, true);
    const now = Math.floor(Date.now() / 1000);
    const claims = (amr: unknown) => ({ data: { claims: { amr } }, error: null });

    auth.getClaims.mockResolvedValueOnce(claims([{ method: "otp", timestamp: now - 60 }]));
    expect(await service.isRecoverySession()).toBe(true);

    auth.getClaims.mockResolvedValueOnce(
      claims([
        { method: "otp", timestamp: now - 600 },
        { method: "password", timestamp: now - 60 },
      ]),
    );
    expect(await service.isRecoverySession()).toBe(false);

    auth.getClaims.mockResolvedValueOnce(claims([{ method: "recovery", timestamp: now - 3600 }]));
    expect(await service.isRecoverySession()).toBe(false);

    auth.getClaims.mockResolvedValueOnce({ data: null, error: sbError("session_not_found") });
    expect(await service.isRecoverySession()).toBe(false);
  });

  it("needs the secret key to delete an account", async () => {
    expect(await code(createSupabaseAuth(config, jar, true).deleteAccount())).toBe("not_configured");
    expect(admin.deleteUser).not.toHaveBeenCalled();
  });

  it("deletes the user with the admin API and clears the session cookies", async () => {
    jar.set("sb-abc-auth-token", "v", {});
    jar.set("sb-abc-auth-token.0", "v", {});
    jar.set("sidebar-collapsed", "true", {});
    admin.deleteUser.mockResolvedValueOnce({ error: null });

    const service = createSupabaseAuth({ ...config, secretKey: "sk" }, jar, true);
    await service.deleteAccount();

    expect(admin.deleteUser).toHaveBeenCalledWith("u1");
    expect(jar.getAll().map((c) => c.name)).toEqual(["sidebar-collapsed"]);
    expect(await service.getUser()).toBeNull();
  });
});
