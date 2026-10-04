import type { APIRoute } from "astro";

import { errorResponse, field, json, jsonError, readForm } from "~/lib/http";
import { validatePassword } from "~/lib/validation";

/** Sets a new password after following a reset link (the link signed the user in). */
export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.user) return jsonError("Your reset link has expired. Please request a new one.", 401);
  // A signed-in session alone is not enough: it must come from a fresh reset
  // link. Otherwise the password changes through account settings, which
  // asks for the current one.
  if (!(await locals.auth.isRecoverySession())) {
    return jsonError("Your reset link has expired. Please request a new one.", 403);
  }

  const form = await readForm(request);
  if (!form) return jsonError("Invalid request.", 400);

  const password = field(form, "password");
  const passwordError = validatePassword(password);
  if (passwordError) return jsonError(passwordError, 400);

  try {
    await locals.auth.updatePassword(password);
    return json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
};
