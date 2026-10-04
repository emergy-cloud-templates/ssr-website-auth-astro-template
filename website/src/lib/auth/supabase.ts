import { createServerClient } from "@supabase/ssr";
import { createClient, type AuthError as SupabaseAuthError, type EmailOtpType, type User } from "@supabase/supabase-js";

import type { SupabaseConfig } from "../config";
import {
  AuthError,
  type AuthService,
  type AuthUser,
  type CallbackParams,
  type CookieJar,
  type SignUpInput,
  RECOVERY_WINDOW_MS,
} from "./types";

const OTP_TYPES: readonly EmailOtpType[] = ["signup", "invite", "magiclink", "recovery", "email_change", "email"];

function toAuthUser(user: User): AuthUser {
  const name = user.user_metadata?.name;
  return {
    id: user.id,
    email: user.email ?? "",
    name: typeof name === "string" ? name : "",
    createdAt: user.created_at,
  };
}

/** Maps Supabase errors onto the app's small, user-facing vocabulary. */
function toAuthError(error: SupabaseAuthError, fallback: AuthError["code"] = "unexpected"): AuthError {
  if (error.status === 429 || error.code === "over_request_rate_limit" || error.code === "over_email_send_rate_limit") {
    return new AuthError("rate_limited");
  }
  switch (error.code) {
    case "invalid_credentials":
      return new AuthError("invalid_credentials");
    case "email_not_confirmed":
      return new AuthError("email_not_confirmed");
    case "weak_password":
      return new AuthError("weak_password", error.message);
    case "same_password":
      return new AuthError("same_password");
    case "session_not_found":
    case "session_expired":
    case "refresh_token_not_found":
    case "user_not_found":
      return new AuthError("not_authenticated");
    case "otp_expired":
    case "flow_state_expired":
    case "flow_state_not_found":
    case "bad_code_verifier":
    case "bad_jwt":
      return new AuthError("invalid_token");
  }
  if (error.name === "AuthSessionMissingError") return new AuthError("not_authenticated");
  console.error("[auth:supabase]", error.status, error.code ?? error.name, error.message);
  return new AuthError(fallback);
}

/**
 * Supabase Auth bound to one request. Sessions live in httpOnly cookies
 * managed by @supabase/ssr (PKCE flow); the browser never talks to Supabase.
 */
export function createSupabaseAuth(config: SupabaseConfig, jar: CookieJar, secureCookies: boolean): AuthService {
  const client = createServerClient(config.url, config.publishableKey, {
    cookies: {
      getAll: () => jar.getAll(),
      setAll: (cookies) => {
        for (const { name, value, options } of cookies) {
          jar.set(name, value, {
            ...options,
            path: "/",
            sameSite: "lax",
            // No browser-side Supabase client reads these, so keep them away from JS.
            httpOnly: true,
            secure: secureCookies,
          });
        }
      },
    },
  });

  let currentUser: Promise<AuthUser | null> | undefined;

  const getUser = () => {
    // getUser() validates the access token with Supabase (and refreshes it
    // when expired). Without a session cookie it returns early, no network.
    currentUser ??= client.auth
      .getUser()
      .then(({ data, error }) => (error || !data.user ? null : toAuthUser(data.user)));
    return currentUser;
  };

  const requireUser = async () => {
    const user = await getUser();
    if (!user) throw new AuthError("not_authenticated");
    return user;
  };

  return {
    provider: "supabase",
    supabase: client,
    getUser,

    async signIn(email, password) {
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw toAuthError(error);
      const user = toAuthUser(data.user);
      currentUser = Promise.resolve(user);
      return user;
    },

    async signUp({ email, password, name }: SignUpInput, emailRedirectTo) {
      const { data, error } = await client.auth.signUp({
        email,
        password,
        options: { data: { name }, emailRedirectTo },
      });
      // "user_already_exists" is folded into a generic failure so the form
      // cannot be used to discover which emails have an account.
      if (error) throw toAuthError(error, error.code === "weak_password" ? "weak_password" : "signup_failed");
      return { signedIn: Boolean(data.session) };
    },

    async signOut() {
      await client.auth.signOut({ scope: "local" });
      currentUser = Promise.resolve(null);
    },

    async requestPasswordReset(email, redirectTo) {
      const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) throw toAuthError(error);
    },

    async verifyCallback({ code, tokenHash, type }: CallbackParams) {
      if (code) {
        const { error } = await client.auth.exchangeCodeForSession(code);
        if (error) throw toAuthError(error, "invalid_token");
      } else if (tokenHash && OTP_TYPES.includes(type as EmailOtpType)) {
        const { error } = await client.auth.verifyOtp({ token_hash: tokenHash, type: type as EmailOtpType });
        if (error) throw toAuthError(error, "invalid_token");
      } else {
        throw new AuthError("invalid_token");
      }
      currentUser = undefined;
    },

    async verifyPassword(password) {
      const user = await requireUser();
      const { error } = await client.auth.signInWithPassword({ email: user.email, password });
      if (!error) return true;
      if (error.code === "invalid_credentials") return false;
      throw toAuthError(error);
    },

    async isRecoverySession() {
      // getClaims() verifies the access token. Its `amr` claim lists how the
      // session was authenticated; a session from an emailed link has a
      // non-password entry (otp / recovery / magiclink...) as its latest one.
      const { data, error } = await client.auth.getClaims();
      if (error || !data) return false;
      const amr = data.claims.amr;
      if (!Array.isArray(amr) || amr.length === 0) return false;
      const latest = amr
        .map((entry) => (typeof entry === "string" ? { method: entry, timestamp: 0 } : entry))
        .reduce((a, b) => (b.timestamp > a.timestamp ? b : a));
      return latest.method !== "password" && Date.now() - latest.timestamp * 1000 < RECOVERY_WINDOW_MS;
    },

    async updatePassword(password) {
      await requireUser();
      const { error } = await client.auth.updateUser({ password });
      if (error) throw toAuthError(error);
    },

    async updateProfile({ name }) {
      await requireUser();
      const { data, error } = await client.auth.updateUser({ data: { name } });
      if (error) throw toAuthError(error);
      const user = toAuthUser(data.user);
      currentUser = Promise.resolve(user);
      return user;
    },

    async deleteAccount() {
      const user = await requireUser();
      if (!config.secretKey) {
        throw new AuthError("not_configured", "Set SUPABASE_SECRET_KEY on the server to enable account deletion.");
      }
      const admin = createClient(config.url, config.secretKey, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      });
      const { error } = await admin.auth.admin.deleteUser(user.id);
      if (error) throw toAuthError(error);

      // The session now points at a deleted user: drop it locally. signOut()
      // tolerates the 401/404 Supabase answers for a user that no longer exists.
      await client.auth.signOut({ scope: "local" }).catch(() => undefined);
      for (const { name } of jar.getAll()) {
        if (name.startsWith("sb-")) jar.delete(name, { path: "/" });
      }
      currentUser = Promise.resolve(null);
    },
  };
}
