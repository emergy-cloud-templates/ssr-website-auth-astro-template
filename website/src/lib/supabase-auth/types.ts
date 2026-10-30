// Adapted from /common/legos/node/supabase-auth@1.0.0 (dvk-common d587e16). Owned by this project.
// Origin: ssr-website-auth-astro-template - website/src/lib/auth/types.ts (ff4d19d); OAuth and the local
// Google stand-in from recapify.app (6ab8a9b). Lego supabase-auth; adapt per project, see README.md.
import type { SupabaseClient } from "@supabase/supabase-js";

export type AuthProviderName = "supabase" | "local";
export type OAuthProvider = "google";

/** The provider-independent user the pages and API routes work with. */
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  /** Supabase `app_metadata.role` (only the server can set it); a project with its own roles sets them in `enrichUser`. */
  role?: string;
}

export type AuthErrorCode =
  | "invalid_credentials"
  | "email_not_confirmed"
  | "not_authenticated"
  | "invalid_token"
  | "weak_password"
  | "same_password"
  | "signup_failed"
  | "rate_limited"
  | "not_configured"
  | "unexpected";

/** How long after following a reset link the password can be set without the current one. */
export const RECOVERY_WINDOW_MS = 15 * 60 * 1000;

/** Expected, user-facing auth failures. Anything else is a bug or an outage. */
export class AuthError extends Error {
  override name = "AuthError";
  readonly code: AuthErrorCode;

  constructor(code: AuthErrorCode, message: string = code) {
    super(message);
    this.code = code;
  }
}

export interface SignUpInput {
  email: string;
  password: string;
  name: string;
}

export interface SignUpResult {
  /** True when the user is signed in right away (no email confirmation required). */
  signedIn: boolean;
}

/** Query parameters an emailed or OAuth link brings back to /auth/callback. */
export interface CallbackParams {
  /** PKCE code (Supabase default flow, OAuth). */
  code?: string;
  /** One-time token (Supabase token-hash flow, and the local provider). */
  tokenHash?: string;
  type?: string;
}

/** A message the local provider "sent". Listed by `readOutbox` (a /dev/mailbox page). */
export interface OutboxEmail {
  id: number;
  to: string;
  subject: string;
  body: string;
  link: string | null;
  createdAt: string;
}

/**
 * Everything the app needs from an auth backend, bound to one request (its cookies). Implemented by the Supabase
 * provider and the local SQLite provider.
 */
export interface AuthService {
  readonly provider: AuthProviderName;
  /** The signed-in user, or null. Refreshes the session when needed. Cached per request. */
  getUser(): Promise<AuthUser | null>;
  signIn(email: string, password: string): Promise<AuthUser>;
  signUp(input: SignUpInput, emailRedirectTo: string): Promise<SignUpResult>;
  signOut(): Promise<void>;
  /** Sends a reset link to `email` if an account exists. Never reveals whether it does. */
  requestPasswordReset(email: string, redirectTo: string): Promise<void>;
  /** Turns an emailed or OAuth link (confirmation, recovery, sign in) into a session. */
  verifyCallback(params: CallbackParams): Promise<void>;
  /** Re-checks the signed-in user's password (before sensitive changes). */
  verifyPassword(password: string): Promise<boolean>;
  updatePassword(password: string): Promise<void>;
  /**
   * True when the current session was created by an emailed link (password reset) in the last
   * RECOVERY_WINDOW_MS. Only such sessions may set a new password without the current one.
   */
  isRecoverySession(): Promise<boolean>;
  updateProfile(profile: { name: string }): Promise<AuthUser>;
  deleteAccount(): Promise<void>;
  /** Where to send the visitor to sign in with an OAuth provider; they come back to `callbackUrl`. */
  oauthUrl(provider: OAuthProvider, callbackUrl: string): Promise<string>;
  /** Local provider only: the offline stand-in for the OAuth consent screen (signs in, creating the account). */
  signInWithDemoOAuth?(provider: OAuthProvider, email: string, name: string): Promise<AuthUser>;
  /** Local provider only: messages it would have emailed. */
  readOutbox?(limit?: number): OutboxEmail[];
  /**
   * Supabase provider only: the request's Supabase client, signed in as the current user, for your own tables
   * (row level security applies). Reuse it instead of creating a second client.
   */
  readonly supabase?: SupabaseClient;
}

export interface CookieOptions {
  path?: string;
  domain?: string;
  maxAge?: number;
  expires?: Date;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: "lax" | "strict" | "none" | boolean;
}

/** Minimal cookie access a provider needs, decoupled from Astro for testing. */
export interface CookieJar {
  getAll(): { name: string; value: string }[];
  get(name: string): string | undefined;
  set(name: string, value: string, options: CookieOptions): void;
  delete(name: string, options?: Pick<CookieOptions, "path" | "domain">): void;
}
