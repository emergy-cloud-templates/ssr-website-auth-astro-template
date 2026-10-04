import type { APIRoute } from "astro";

import { errorResponse, field, json, jsonError, readForm } from "~/lib/http";
import { HOME_FOR_USERS } from "~/lib/routes";
import { normalizeEmail, safeRedirectPath, validateEmail } from "~/lib/validation";

export const POST: APIRoute = async ({ request, locals }) => {
  const form = await readForm(request);
  if (!form) return jsonError("Invalid request.", 400);

  const email = normalizeEmail(field(form, "email"));
  const password = field(form, "password");
  if (!email || !password) return jsonError("Email and password are required.", 400);
  const emailError = validateEmail(email);
  if (emailError) return jsonError(emailError, 400);

  try {
    await locals.auth.signIn(email, password);
    return json({ ok: true, redirectTo: safeRedirectPath(field(form, "redirectTo"), HOME_FOR_USERS) });
  } catch (error) {
    return errorResponse(error);
  }
};
