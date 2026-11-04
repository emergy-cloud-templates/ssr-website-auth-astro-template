import { sequence } from "astro:middleware";

import { auth } from "~/lib/auth";

/**
 * Runs before every server-rendered page and API route: binds the auth backend to the request (`locals.auth`),
 * resolves the signed-in user (`locals.user`), applies the route access rules and marks personalized responses as
 * uncacheable (the supabase-auth lego's middleware). Add your own middleware after it in the sequence.
 */
export const onRequest = sequence(auth.middleware);
