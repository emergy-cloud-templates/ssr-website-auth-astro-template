// Adapted from /common/legos/node/supabase-auth@1.0.0 (dvk-common d587e16). Owned by this project.
// Origin: ssr-website-auth-astro-template - website/src/lib/http.ts (ff4d19d). Lego supabase-auth; adapt per
// project, see README.md.
import { jsonError } from "../api-route/http.ts";
import { AuthError, type AuthErrorCode } from "./types.ts";

/** The status and the text the user sees for each expected auth failure. Never more detail than this. */
export const AUTH_ERROR_MESSAGES: Record<AuthErrorCode, [status: number, message: string]> = {
  invalid_credentials: [401, "Invalid email or password."],
  email_not_confirmed: [403, "Please confirm your email address first. Check your inbox for the link."],
  not_authenticated: [401, "Your session has expired. Please sign in again."],
  invalid_token: [400, "This link is invalid or has expired. Please request a new one."],
  weak_password: [400, "This password is too weak. Please choose a stronger one."],
  same_password: [400, "Your new password must be different from the current one."],
  signup_failed: [400, "Unable to create an account with these details. Please try again."],
  rate_limited: [429, "Too many attempts. Please wait a moment and try again."],
  not_configured: [501, "This feature is not configured on the server."],
  unexpected: [500, "An unexpected error occurred. Please try again."],
};

/** Any thrown value as a safe JSON error: an AuthError keeps its code's text, anything else is logged. */
export function authErrorResponse(
  error: unknown,
  log: (message: string, error: unknown) => void = console.error,
): Response {
  if (error instanceof AuthError) {
    const [status, message] = AUTH_ERROR_MESSAGES[error.code];
    return jsonError(message, status);
  }
  log("[auth] unexpected error", error);
  const [status, message] = AUTH_ERROR_MESSAGES.unexpected;
  return jsonError(message, status);
}
