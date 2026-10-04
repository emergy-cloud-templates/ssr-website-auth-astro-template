import type { APIRoute } from "astro";

import { errorResponse, field, json, jsonError, readForm } from "~/lib/http";
import { validatePassword } from "~/lib/validation";

export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.user) return jsonError("Your session has expired. Please sign in again.", 401);

  const form = await readForm(request);
  if (!form) return jsonError("Invalid request.", 400);

  const currentPassword = field(form, "currentPassword");
  const newPassword = field(form, "newPassword");
  if (!currentPassword || !newPassword) return jsonError("All fields are required.", 400);
  const passwordError = validatePassword(newPassword);
  if (passwordError) return jsonError(passwordError, 400);
  if (currentPassword === newPassword) {
    return jsonError("Your new password must be different from the current one.", 400);
  }

  try {
    if (!(await locals.auth.verifyPassword(currentPassword))) {
      return jsonError("Current password is incorrect.", 400);
    }
    await locals.auth.updatePassword(newPassword);
    return json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
};
