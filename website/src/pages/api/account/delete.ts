import type { APIRoute } from "astro";

import { errorResponse, field, json, jsonError, readForm } from "~/lib/http";

export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.user) return jsonError("Your session has expired. Please sign in again.", 401);

  const form = await readForm(request);
  if (!form) return jsonError("Invalid request.", 400);

  if (field(form, "confirmation") !== "DELETE") return jsonError("Please type DELETE to confirm.", 400);
  const password = field(form, "password");
  if (!password) return jsonError("Password is required.", 400);

  try {
    if (!(await locals.auth.verifyPassword(password))) return jsonError("Password is incorrect.", 400);
    // Delete your own application data for this user here, before the
    // auth account disappears (see docs/customization.md).
    await locals.auth.deleteAccount();
    return json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
};
