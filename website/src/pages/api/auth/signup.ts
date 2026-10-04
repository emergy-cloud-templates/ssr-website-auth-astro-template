import type { APIRoute } from "astro";

import { siteOrigin } from "~/lib/auth";
import { errorResponse, field, json, jsonError, readForm } from "~/lib/http";
import { HOME_FOR_USERS } from "~/lib/routes";
import { normalizeEmail, sanitizeName, validateEmail, validateName, validatePassword } from "~/lib/validation";

export const POST: APIRoute = async ({ request, url, locals }) => {
  const form = await readForm(request);
  if (!form) return jsonError("Invalid request.", 400);

  const name = sanitizeName(field(form, "name"));
  const email = normalizeEmail(field(form, "email"));
  const password = field(form, "password");

  const invalid = validateName(name) ?? validateEmail(email) ?? validatePassword(password);
  if (invalid) return jsonError(invalid, 400);

  try {
    const emailRedirectTo = `${siteOrigin(url)}/auth/callback?next=${encodeURIComponent(HOME_FOR_USERS)}`;
    const { signedIn } = await locals.auth.signUp({ email, password, name }, emailRedirectTo);
    return json({ ok: true, signedIn, redirectTo: HOME_FOR_USERS });
  } catch (error) {
    return errorResponse(error);
  }
};
