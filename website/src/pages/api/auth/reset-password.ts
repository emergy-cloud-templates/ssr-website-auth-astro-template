import type { APIRoute } from "astro";

import { AuthError, siteOrigin } from "~/lib/auth";
import { errorResponse, field, json, jsonError, readForm } from "~/lib/http";
import { normalizeEmail, validateEmail } from "~/lib/validation";

export const POST: APIRoute = async ({ request, url, locals }) => {
  const form = await readForm(request);
  if (!form) return jsonError("Invalid request.", 400);

  const email = normalizeEmail(field(form, "email"));
  const emailError = validateEmail(email);
  if (emailError) return jsonError(emailError, 400);

  try {
    const redirectTo = `${siteOrigin(url)}/auth/callback?next=${encodeURIComponent("/auth/update-password")}`;
    await locals.auth.requestPasswordReset(email, redirectTo);
  } catch (error) {
    // Only rate limiting is surfaced: anything else would hint at whether
    // the account exists.
    if (error instanceof AuthError && error.code === "rate_limited") return errorResponse(error);
    console.error("[reset-password]", error);
  }
  return json({ ok: true });
};
