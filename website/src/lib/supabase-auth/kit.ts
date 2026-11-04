// Adapted from /common/legos/node/supabase-auth@1.0.0 (dvk-common d587e16). Owned by this project.
// The one entry point a project calls (glue/auth.ts): configuration, the provider per request, the middleware
// and the route handlers, wired once. Lego supabase-auth; adapt per project, see README.md.
import { resolveAuthConfig, type AuthConfig, type EnvReader } from "./config.ts";
import { astroCookieJar, type AstroCookiesLike } from "./cookies.ts";
import { createAuthHandlers, siteOrigin, type AuthHandlerOptions, type AuthRules } from "./handlers.ts";
import { openDatabase } from "./local/db.ts";
import { createLocalAuth } from "./local/provider.ts";
import { createAuthMiddleware, type AuthMiddlewareOptions, type MiddlewareContext } from "./middleware.ts";
import { DEFAULT_AUTH_ROUTES, type AuthRoutes } from "./rules.ts";
import { createSupabaseAuth, type SupabaseFactories } from "./supabase.ts";
import type { AuthService } from "./types.ts";

export interface AuthKitOptions {
  /** Reads a configuration value at request time: `(key) => getSecret(key)` from astro:env/server. */
  env: EnvReader;
  /** `{ createServerClient, createClient }` from @supabase/ssr and @supabase/supabase-js. */
  supabase: SupabaseFactories;
  /** The auth-forms validation module: `import * as rules from "~/components/auth-forms/validation"`. */
  rules: AuthRules;
  /** Product name in the local provider's email subjects. */
  appName?: string;
  /** Overrides of DEFAULT_AUTH_ROUTES (protected pages, home, sign-in page). */
  routes?: Partial<AuthRoutes>;
  enrichUser?: AuthMiddlewareOptions<MiddlewareContext>["enrichUser"];
  onDeleteAccount?: AuthHandlerOptions["onDeleteAccount"];
  deleteConfirmWord?: string;
  afterSignOut?: string;
  log?(message: string, error: unknown): void;
}

export function createAuthKit(options: AuthKitOptions) {
  const routes: AuthRoutes = { ...DEFAULT_AUTH_ROUTES, ...options.routes };
  const config = (): AuthConfig => resolveAuthConfig(options.env);

  /** The auth backend for one request, picked from the configuration (Supabase, or the local SQLite one). */
  const createAuth = (context: { request: Request; cookies: AstroCookiesLike; url: URL }): AuthService => {
    const cfg = config();
    const jar = astroCookieJar(context.request, context.cookies);
    const secureCookies = context.url.protocol === "https:";
    if (cfg.provider === "supabase" && cfg.supabase)
      return createSupabaseAuth(cfg.supabase, jar, secureCookies, options.supabase);
    return createLocalAuth({
      db: openDatabase(cfg.local.dbPath),
      cookies: jar,
      secureCookies,
      requireEmailConfirmation: cfg.local.requireEmailConfirmation,
      appName: options.appName,
    });
  };

  return {
    config,
    routes,
    createAuth,
    /** Astro middleware: `export const onRequest = auth.middleware` (or first in `sequence`). */
    middleware: createAuthMiddleware<MiddlewareContext>({
      createAuth,
      routes,
      enrichUser: options.enrichUser,
      log: options.log,
    }),
    /** The API route handlers; each page file under pages/ calls one. */
    handlers: createAuthHandlers({
      rules: options.rules,
      routes,
      config,
      deleteConfirmWord: options.deleteConfirmWord,
      onDeleteAccount: options.onDeleteAccount,
      afterSignOut: options.afterSignOut,
      log: options.log,
    }),
    /** Origin for links in emails: SITE_URL when set, else the request's. */
    siteOrigin: (url: URL) => siteOrigin(url, config()),
  };
}

export type AuthKit = ReturnType<typeof createAuthKit>;
