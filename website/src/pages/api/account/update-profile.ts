import type { APIRoute } from "astro";

import { errorResponse, field, json, jsonError, readForm } from "~/lib/http";
import { sanitizeName, validateName } from "~/lib/validation";

export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.user) return jsonError("Your session has expired. Please sign in again.", 401);

  const form = await readForm(request);
  if (!form) return jsonError("Invalid request.", 400);

  const name = sanitizeName(field(form, "name"));
  const nameError = validateName(name);
  if (nameError) return jsonError(nameError, 400);

  try {
    const user = await locals.auth.updateProfile({ name });
    return json({ ok: true, user: { name: user.name } });
  } catch (error) {
    return errorResponse(error);
  }
};
