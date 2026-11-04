// Adapted from /common/legos/node/supabase-auth@1.0.0 (dvk-common d587e16). Owned by this project.
// Origin: ssr-website-auth-astro-template - website/src/middleware.ts (ff4d19d). Lego supabase-auth; adapt per
// project, see README.md.
import type { AstroCookiesLike } from "./cookies.ts";
import { DEFAULT_AUTH_ROUTES, redirectFor, type AuthRoutes } from "./rules.ts";
import type { AuthService, AuthUser } from "./types.ts";

/** The parts of Astro's middleware context this uses (structural, so no Astro types are needed). */
export interface MiddlewareContext {
  url: URL;
  request: Request;
  cookies: AstroCookiesLike;
  locals: object;
  redirect(path: string, status?: number): Response;
}

export interface AuthMiddlewareOptions<C extends MiddlewareContext> {
  createAuth(context: C): AuthService;
  routes?: AuthRoutes;
  /**
   * Once per request, after the session is read: add what the app knows about the user (a role from its own
   * table, a plan), or return another user (an admin viewing as someone). A throw keeps the plain user (logged).
   */
  enrichUser?(user: AuthUser, args: { auth: AuthService; context: C }): AuthUser | null | Promise<AuthUser | null>;
  log?(message: string, error: unknown): void;
}

/**
 * Runs before every server-rendered page and API route:
 * 1. binds the auth backend to this request (`locals.auth`),
 * 2. resolves the signed-in user (`locals.user`), refreshing the session, then `enrichUser`,
 * 3. applies the route access rules (`routes`),
 * 4. marks personalized responses and every API answer as uncacheable.
 * Use it as `onRequest`, or first in `sequence(auth.middleware, yours)`.
 */
export function createAuthMiddleware<C extends MiddlewareContext>(options: AuthMiddlewareOptions<C>) {
  const routes = options.routes ?? DEFAULT_AUTH_ROUTES;
  const log = options.log ?? ((message: string, error: unknown) => console.error(message, error));

  return async (context: C, next: () => Promise<Response>): Promise<Response> => {
    const locals = context.locals as { auth: AuthService; user: AuthUser | null };
    locals.auth = options.createAuth(context);
    let user = await locals.auth.getUser().catch((error: unknown) => {
      // An auth outage degrades to "signed out", it does not take the site down.
      log("[auth] could not resolve the current user", error);
      return null;
    });
    if (user && options.enrichUser) {
      try {
        user = await options.enrichUser(user, { auth: locals.auth, context });
      } catch (error) {
        log("[auth] enrichUser failed; using the session user as is", error);
      }
    }
    locals.user = user;

    const target = redirectFor(context.url, Boolean(user), routes);
    if (target) return context.redirect(target, 302);

    const response = await next();
    if (user || context.url.pathname.startsWith("/api/")) {
      // Never let a CDN or shared cache store a page rendered for one user.
      try {
        response.headers.set("cache-control", "private, no-store");
      } catch {
        // Some responses (Response.redirect) have immutable headers.
      }
    }
    return response;
  };
}
