import { AuthError } from "./auth/types";

const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

export function jsonError(message: string, status: number): Response {
  return json({ error: message }, status);
}

/** Reads a form body; null when the body is missing or not form-encoded. */
export async function readForm(request: Request): Promise<FormData | null> {
  try {
    return await request.formData();
  } catch {
    return null;
  }
}

/** A text field from a form, "" when absent or a file. */
export function field(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
}

const MESSAGES: Record<AuthError["code"], [status: number, message: string]> = {
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

/** Turns any thrown value into a safe JSON error response; never leaks internals. */
export function errorResponse(error: unknown): Response {
  if (error instanceof AuthError) {
    const [status, message] = MESSAGES[error.code];
    return jsonError(message, status);
  }
  console.error("[api] unexpected error", error);
  const [status, message] = MESSAGES.unexpected;
  return jsonError(message, status);
}
