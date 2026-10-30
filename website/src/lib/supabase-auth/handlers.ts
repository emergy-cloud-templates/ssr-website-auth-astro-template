// Adapted from /common/legos/node/supabase-auth@1.0.0 (dvk-common d587e16). Owned by this project.
// Origin: ssr-website-auth-astro-template - website/src/pages/api/{auth,account}/*.ts and pages/auth/callback.ts
// (ff4d19d); Google sign-in from recapify.app (6ab8a9b). Lego supabase-auth; adapt per project, see README.md.
//
// The API routes the auth-forms lego posts to, as functions: the page files (pages/) are one line each, so these
// are tested here without Astro. Each reads `locals.auth` and `locals.user` (set by the middleware), validates
// with the same rules as the forms, and answers the contract in auth-forms' README.
import { field, json, jsonError, readForm } from "../api-route/http.ts";
import type { AuthConfig } from "./config.ts";
import { authErrorResponse } from "./errors.ts";
import type { AuthRoutes } from "./rules.ts";
import { AuthError, type AuthService, type AuthUser, type OAuthProvider } from "./types.ts";

/** The validation module of the auth-forms lego (`~/components/auth-forms/validation`), shared with the forms. */
export interface AuthRules {
  normalizeEmail(raw: string): string;
  validateEmail(email: string): string | null;
  validatePassword(password: string): string | null;
  sanitizeName(raw: string): string;
  validateName(name: string): string | null;
  safeRedirectPath(raw: string | null | undefined, fallback: string): string;
}

/** The parts of Astro's APIContext the handlers use (structural). */
export interface HandlerContext {
  request: Request;
  url: URL;
  locals: object;
  redirect(path: string, status?: number): Response;
}

export interface AuthHandlerOptions {
  rules: AuthRules;
  routes: AuthRoutes;
  config(): AuthConfig;
  /** The word the delete form asks for (auth-forms DeleteAccountForm `confirmWord`, default "DELETE"). */
  deleteConfirmWord?: string;
  /** Delete the app's own data for this user before the auth account goes (rows, files, a Stripe customer). */
  onDeleteAccount?(user: AuthUser): Promise<void>;
  /** Where signing out lands (default "/"). */
  afterSignOut?: string;
  log?(message: string, error: unknown): void;
}

/** Origin for links in emails: SITE_URL when set, else the request's own. */
export function siteOrigin(url: URL, config: AuthConfig): string {
  return config.siteUrl ?? url.origin;
}

const SESSION_EXPIRED = "Your session has expired. Please sign in again.";
const RESET_EXPIRED = "Your reset link has expired. Please request a new one.";

export function createAuthHandlers(o: AuthHandlerOptions) {
  const { rules, routes } = o;
  const log = o.log ?? ((message: string, error: unknown) => console.error(message, error));
  const fail = (error: unknown) => authErrorResponse(error, log);
  const locals = (c: HandlerContext) => c.locals as { auth: AuthService; user: AuthUser | null };
  const callbackUrl = (c: HandlerContext, next: string) =>
    `${siteOrigin(c.url, o.config())}/auth/callback?next=${encodeURIComponent(next)}`;
  const confirmWord = o.deleteConfirmWord ?? "DELETE";

  return {
    /** POST email, password, redirectTo? -> { ok, redirectTo } */
    async signIn(c: HandlerContext): Promise<Response> {
      const form = await readForm(c.request);
      if (!form) return jsonError("Invalid request.", 400);
      const email = rules.normalizeEmail(field(form, "email"));
      const password = field(form, "password");
      if (!email || !password) return jsonError("Email and password are required.", 400);
      const emailError = rules.validateEmail(email);
      if (emailError) return jsonError(emailError, 400);
      try {
        await locals(c).auth.signIn(email, password);
        return json({ ok: true, redirectTo: rules.safeRedirectPath(field(form, "redirectTo"), routes.home) });
      } catch (error) {
        return fail(error);
      }
    },

    /** POST name, email, password, confirmPassword?, redirectTo? -> { ok, signedIn, redirectTo } */
    async signUp(c: HandlerContext): Promise<Response> {
      const form = await readForm(c.request);
      if (!form) return jsonError("Invalid request.", 400);
      const name = rules.sanitizeName(field(form, "name"));
      const email = rules.normalizeEmail(field(form, "email"));
      const password = field(form, "password");
      const invalid = rules.validateName(name) ?? rules.validateEmail(email) ?? rules.validatePassword(password);
      if (invalid) return jsonError(invalid, 400);
      const confirm = form.get("confirmPassword");
      if (typeof confirm === "string" && confirm !== password) return jsonError("Passwords do not match.", 400);
      const next = rules.safeRedirectPath(field(form, "redirectTo"), routes.home);
      try {
        const { signedIn } = await locals(c).auth.signUp({ email, password, name }, callbackUrl(c, next));
        return json({ ok: true, signedIn, redirectTo: next });
      } catch (error) {
        return fail(error);
      }
    },

    /** POST -> 303 to afterSignOut, whatever happens (signing out must always work for the user). */
    async signOut(c: HandlerContext): Promise<Response> {
      try {
        await locals(c).auth.signOut();
      } catch (error) {
        log("[auth] sign out failed", error);
      }
      return c.redirect(o.afterSignOut ?? "/", 303);
    },

    /** POST email -> { ok } always: never says whether the account exists (rate limiting is surfaced). */
    async resetPassword(c: HandlerContext): Promise<Response> {
      const form = await readForm(c.request);
      if (!form) return jsonError("Invalid request.", 400);
      const email = rules.normalizeEmail(field(form, "email"));
      const emailError = rules.validateEmail(email);
      if (emailError) return jsonError(emailError, 400);
      try {
        await locals(c).auth.requestPasswordReset(email, callbackUrl(c, routes.recovery[0] ?? "/auth/update-password"));
      } catch (error) {
        if (error instanceof AuthError && error.code === "rate_limited") return fail(error);
        log("[auth] password reset failed", error);
      }
      return json({ ok: true });
    },

    /** POST password, confirmPassword? -> { ok }; only from the session a fresh reset link created. */
    async updatePassword(c: HandlerContext): Promise<Response> {
      const { auth, user } = locals(c);
      if (!user) return jsonError(RESET_EXPIRED, 401);
      // A signed-in session alone is not enough: it must come from a fresh reset link. Otherwise the password
      // changes through account settings, which asks for the current one.
      if (!(await auth.isRecoverySession())) return jsonError(RESET_EXPIRED, 403);
      const form = await readForm(c.request);
      if (!form) return jsonError("Invalid request.", 400);
      const password = field(form, "password");
      const passwordError = rules.validatePassword(password);
      if (passwordError) return jsonError(passwordError, 400);
      const confirm = form.get("confirmPassword");
      if (typeof confirm === "string" && confirm !== password) return jsonError("Passwords do not match.", 400);
      try {
        await auth.updatePassword(password);
        return json({ ok: true });
      } catch (error) {
        return fail(error);
      }
    },

    /** POST name -> { ok, user: { name } } */
    async updateProfile(c: HandlerContext): Promise<Response> {
      const { auth, user } = locals(c);
      if (!user) return jsonError(SESSION_EXPIRED, 401);
      const form = await readForm(c.request);
      if (!form) return jsonError("Invalid request.", 400);
      const name = rules.sanitizeName(field(form, "name"));
      const nameError = rules.validateName(name);
      if (nameError) return jsonError(nameError, 400);
      try {
        const updated = await auth.updateProfile({ name });
        return json({ ok: true, user: { name: updated.name } });
      } catch (error) {
        return fail(error);
      }
    },

    /** POST currentPassword, newPassword, confirmPassword? -> { ok } */
    async changePassword(c: HandlerContext): Promise<Response> {
      const { auth, user } = locals(c);
      if (!user) return jsonError(SESSION_EXPIRED, 401);
      const form = await readForm(c.request);
      if (!form) return jsonError("Invalid request.", 400);
      const currentPassword = field(form, "currentPassword");
      const newPassword = field(form, "newPassword");
      if (!currentPassword || !newPassword) return jsonError("All fields are required.", 400);
      const passwordError = rules.validatePassword(newPassword);
      if (passwordError) return jsonError(passwordError, 400);
      const confirm = form.get("confirmPassword");
      if (typeof confirm === "string" && confirm !== newPassword) return jsonError("Passwords do not match.", 400);
      if (currentPassword === newPassword)
        return jsonError("Your new password must be different from the current one.", 400);
      try {
        if (!(await auth.verifyPassword(currentPassword))) return jsonError("Current password is incorrect.", 400);
        await auth.updatePassword(newPassword);
        return json({ ok: true });
      } catch (error) {
        return fail(error);
      }
    },

    /** POST confirmation, password -> { ok }; the app's own data goes first (onDeleteAccount). */
    async deleteAccount(c: HandlerContext): Promise<Response> {
      const { auth, user } = locals(c);
      if (!user) return jsonError(SESSION_EXPIRED, 401);
      const form = await readForm(c.request);
      if (!form) return jsonError("Invalid request.", 400);
      if (field(form, "confirmation") !== confirmWord) return jsonError(`Please type ${confirmWord} to confirm.`, 400);
      const password = field(form, "password");
      if (!password) return jsonError("Password is required.", 400);
      try {
        if (!(await auth.verifyPassword(password))) return jsonError("Password is incorrect.", 400);
        await o.onDeleteAccount?.(user);
        await auth.deleteAccount();
        return json({ ok: true });
      } catch (error) {
        return fail(error);
      }
    },

    /** GET /auth/callback: emailed links (confirmation, recovery) and OAuth returns -> 303 to `next`. */
    async callback(c: HandlerContext): Promise<Response> {
      const params = c.url.searchParams;
      const next = rules.safeRedirectPath(params.get("next"), routes.home);
      // Supabase reports expired or reused links with ?error=...&error_code=...
      if (params.has("error") || params.has("error_code"))
        return c.redirect(`${routes.signIn}?error=link_expired`, 303);
      try {
        await locals(c).auth.verifyCallback({
          code: params.get("code") ?? undefined,
          tokenHash: params.get("token_hash") ?? undefined,
          type: params.get("type") ?? undefined,
        });
        return c.redirect(next, 303);
      } catch (error) {
        if (!(error instanceof AuthError)) log("[auth] callback failed", error);
        return c.redirect(`${routes.signIn}?error=link_expired`, 303);
      }
    },

    /** GET /api/auth/google?redirectTo= -> 302 to Google (through Supabase), or to the local stand-in. */
    async oauthStart(c: HandlerContext, provider: OAuthProvider = "google"): Promise<Response> {
      const unavailable = `${routes.signIn}?error=${provider}_unavailable`;
      if (!o.config().googleSignIn) return c.redirect(unavailable, 302);
      const next = rules.safeRedirectPath(c.url.searchParams.get("redirectTo"), routes.home);
      try {
        return c.redirect(await locals(c).auth.oauthUrl(provider, callbackUrl(c, next)), 302);
      } catch (error) {
        if (!(error instanceof AuthError)) log("[auth] oauth start failed", error);
        return c.redirect(unavailable, 302);
      }
    },

    /** POST email, name?, redirectTo? -> { ok, redirectTo }: local provider only (404 otherwise). */
    async oauthDemo(c: HandlerContext, provider: OAuthProvider = "google"): Promise<Response> {
      const { auth } = locals(c);
      if (!auth.signInWithDemoOAuth) return jsonError("Not found.", 404);
      const form = await readForm(c.request);
      if (!form) return jsonError("Invalid request.", 400);
      const email = rules.normalizeEmail(field(form, "email"));
      const invalid = rules.validateEmail(email);
      if (invalid) return jsonError(invalid, 400);
      const name = rules.sanitizeName(field(form, "name")) || email.split("@")[0]!;
      try {
        await auth.signInWithDemoOAuth(provider, email, name);
        return json({ ok: true, redirectTo: rules.safeRedirectPath(field(form, "redirectTo"), routes.home) });
      } catch (error) {
        return fail(error);
      }
    },
  };
}

export type AuthHandlers = ReturnType<typeof createAuthHandlers>;
