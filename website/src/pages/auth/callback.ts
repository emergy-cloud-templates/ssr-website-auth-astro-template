// Adapted from /common/legos/node/supabase-auth@1.0.0 (dvk-common d587e16), pages/auth/callback.ts. Owned by this project.
import type { APIRoute } from "astro";
import { auth } from "~/lib/auth";

export const GET: APIRoute = (context) => auth.handlers.callback(context);
