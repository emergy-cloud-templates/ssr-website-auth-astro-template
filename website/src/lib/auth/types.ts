import type { SupabaseClient } from "@supabase/supabase-js";

import type { AuthProviderName } from "../config";

/** The provider-independent user shape the pages and API routes work with. */
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  createdAt: string;
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

/** Expected, user-facing auth failures. Anything else is a bug or an outage. */
/** How long after following a reset link the password can be set without the current one. */
export const RECOVERY_WINDOW_MS = 15 * 60 * 1000;

export class AuthError extends Error {
  override name = "AuthError";
  constructor(
    readonly code: AuthErrorCode,
    message: string = code,
  ) {
    super(message);
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

/** Query parameters an emailed link brings back to /auth/callback. */
export interface CallbackParams {
  /** PKCE code (Supabase default flow). */
  code?: string;
  /** One-time token (Supabase token-hash flow, and the local provider). */
  tokenHash?: string;
  type?: string;
}

/** A message the local provider "sent". Shown at /dev/mailbox. */
export interface OutboxEmail {
  id: number;
  to: string;
  subject: string;
  body: string;
  link: string | null;
  createdAt: string;
}

/**
 * Everything the app needs from an auth backend, bound to one request (its
 * cookies). Implemented by the Supabase provider and the local SQLite provider.
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
  /** Turns an emailed link (confirmation or recovery) into a session. */
  verifyCallback(params: CallbackParams): Promise<void>;
  /** Re-checks the signed-in user's password (before sensitive changes). */
  verifyPassword(password: string): Promise<boolean>;
  updatePassword(password: string): Promise<void>;
  /**
   * True when the current session was created by an emailed link (password
   * reset) in the last RECOVERY_WINDOW_MS. Only such sessions may set a new
   * password without the current one: a stolen or left-open session cannot.
   */
  isRecoverySession(): Promise<boolean>;
  updateProfile(profile: { name: string }): Promise<AuthUser>;
  deleteAccount(): Promise<void>;
  /** Local provider only: messages it would have emailed. */
  readOutbox?(limit?: number): OutboxEmail[];
  /**
   * Supabase provider only: the request's Supabase client, signed in as the
   * current user, for your own tables (row level security applies).
   * Reuse it instead of creating a second client, so the session is
   * refreshed only once per request.
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
