// Adapted from /common/legos/node/supabase-auth@1.0.0 (dvk-common d587e16). Owned by this project.
// Barrel: import from "~/lib/supabase-auth". Lego supabase-auth; adapt per project, see README.md.
export { createAuthKit } from "./kit.ts";
export type { AuthKit, AuthKitOptions } from "./kit.ts";
export { ConfigError, resolveAuthConfig } from "./config.ts";
export type { AuthConfig, EnvReader, LocalAuthConfig, SupabaseConfig } from "./config.ts";
export { createAuthHandlers, siteOrigin } from "./handlers.ts";
export type { AuthHandlers, AuthHandlerOptions, AuthRules, HandlerContext } from "./handlers.ts";
export { createAuthMiddleware } from "./middleware.ts";
export type { AuthMiddlewareOptions, MiddlewareContext } from "./middleware.ts";
export { DEFAULT_AUTH_ROUTES, matchesRoute, redirectFor } from "./rules.ts";
export type { AuthRoutes } from "./rules.ts";
export { AUTH_ERROR_MESSAGES, authErrorResponse } from "./errors.ts";
export { astroCookieJar, parseCookieHeader } from "./cookies.ts";
export type { AstroCookiesLike } from "./cookies.ts";
export { createSupabaseAuth, toAuthUser } from "./supabase.ts";
export type { SupabaseFactories } from "./supabase.ts";
export { createLocalAuth, SESSION_COOKIE } from "./local/provider.ts";
export type { LocalAuthOptions } from "./local/provider.ts";
export { createDatabase, openDatabase } from "./local/db.ts";
export { AuthError, RECOVERY_WINDOW_MS } from "./types.ts";
export type {
  AuthErrorCode,
  AuthProviderName,
  AuthService,
  AuthUser,
  CallbackParams,
  CookieJar,
  CookieOptions,
  OAuthProvider,
  OutboxEmail,
  SignUpInput,
  SignUpResult,
} from "./types.ts";
