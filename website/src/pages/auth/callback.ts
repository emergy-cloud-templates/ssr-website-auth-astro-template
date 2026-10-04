import type { APIRoute } from "astro";

import { AuthError } from "~/lib/auth";
import { HOME_FOR_USERS, SIGN_IN } from "~/lib/routes";
import { safeRedirectPath } from "~/lib/validation";

/**
 * Landing page for emailed links (account confirmation, password reset).
 * Supports both Supabase flows (PKCE `code`, or `token_hash` + `type`) and the
 * local provider's links, then forwards to `next`.
 */
export const GET: APIRoute = async ({ url, locals, redirect }) => {
  const params = url.searchParams;
  const next = safeRedirectPath(params.get("next"), HOME_FOR_USERS);

  // Supabase reports expired or reused links with ?error=...&error_code=...
  if (params.has("error") || params.has("error_code")) {
    return redirect(`${SIGN_IN}?error=link_expired`, 303);
  }

  try {
    await locals.auth.verifyCallback({
      code: params.get("code") ?? undefined,
      tokenHash: params.get("token_hash") ?? undefined,
      type: params.get("type") ?? undefined,
    });
    return redirect(next, 303);
  } catch (error) {
    if (!(error instanceof AuthError)) console.error("[auth/callback]", error);
    return redirect(`${SIGN_IN}?error=link_expired`, 303);
  }
};
