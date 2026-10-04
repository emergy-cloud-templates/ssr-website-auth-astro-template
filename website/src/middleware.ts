import { defineMiddleware } from "astro:middleware";

import { createAuth } from "./lib/auth";
import { redirectFor } from "./lib/routes";

/**
 * Runs before every server-rendered page and API route:
 * 1. binds the auth backend to this request (`locals.auth`),
 * 2. resolves the signed-in user (`locals.user`), refreshing the session,
 * 3. applies the route access rules from `lib/routes.ts`,
 * 4. marks personalized responses as uncacheable.
 */
export const onRequest = defineMiddleware(async (context, next) => {
  const { locals, url } = context;

  locals.auth = createAuth(context);
  locals.user = await locals.auth.getUser().catch((error: unknown) => {
    // An auth outage should degrade to "signed out", not take the site down.
    console.error("[middleware] could not resolve the current user", error);
    return null;
  });

  const target = redirectFor(url, Boolean(locals.user));
  if (target) return context.redirect(target, 302);

  const response = await next();
  if (locals.user || url.pathname.startsWith("/api/")) {
    // Never let a CDN or shared cache store a page rendered for one user.
    try {
      response.headers.set("cache-control", "private, no-store");
    } catch {
      // Some responses (e.g. Response.redirect) have immutable headers.
    }
  }
  return response;
});
