// Adapted from /common/legos/node/supabase-auth@1.0.0 (dvk-common d587e16), pages/api/auth/reset-password.ts. Owned by this project.
import type { APIRoute } from "astro";
import { auth } from "~/lib/auth";

export const POST: APIRoute = (context) => auth.handlers.resetPassword(context);
