// Adapted from /common/legos/node/supabase-auth@1.0.0 (dvk-common d587e16). Owned by this project.
// Origin: ssr-website-auth-astro-template - website/src/lib/config.ts (ff4d19d); AUTH_GOOGLE from recapify.app.
// Lego supabase-auth; adapt per project, see README.md.
import type { AuthProviderName } from "./types.ts";

export interface SupabaseConfig {
  url: string;
  /** Publishable (or legacy anon) key. Safe to expose, but only used server-side here. */
  publishableKey: string;
  /** Secret (or legacy service_role) key. Only needed for account deletion. */
  secretKey?: string;
}

export interface LocalAuthConfig {
  /** SQLite file used by the local provider. */
  dbPath: string;
  /** When true, new accounts must click the emailed link before signing in. */
  requireEmailConfirmation: boolean;
}

export interface AuthConfig {
  provider: AuthProviderName;
  supabase: SupabaseConfig | null;
  local: LocalAuthConfig;
  /** Canonical public origin used in emailed links. Falls back to the request origin. */
  siteUrl?: string;
  /** "Continue with Google": always with the local provider (an offline stand-in), AUTH_GOOGLE=true for Supabase. */
  googleSignIn: boolean;
}

export class ConfigError extends Error {
  override name = "ConfigError";
}

export type EnvReader = (key: string) => string | undefined;

const DEFAULT_LOCAL_DB_PATH = ".data/local-auth.sqlite";
const truthy = (v: string | undefined) => ["1", "true", "yes"].includes(v?.toLowerCase() ?? "");

/**
 * The auth configuration from environment variables (key names in README.md). Read at request time, not inlined
 * at build time, so one build runs locally from `.env` and on Lambda from Secrets Manager (astro-ssr-lambda).
 */
export function resolveAuthConfig(read: EnvReader): AuthConfig {
  const get = (key: string) => {
    const value = read(key)?.trim();
    return value ? value : undefined;
  };

  const url = get("PUBLIC_SUPABASE_URL");
  const publishableKey = get("PUBLIC_SUPABASE_PUBLISHABLE_KEY") ?? get("PUBLIC_SUPABASE_ANON_KEY");
  const secretKey = get("SUPABASE_SECRET_KEY") ?? get("SUPABASE_SERVICE_ROLE_KEY");
  const supabase = url && publishableKey ? { url, publishableKey, secretKey } : null;

  const requested = get("AUTH_PROVIDER")?.toLowerCase();
  if (requested && requested !== "supabase" && requested !== "local") {
    throw new ConfigError(`AUTH_PROVIDER must be "supabase" or "local", got "${requested}".`);
  }
  const provider: AuthProviderName = (requested as AuthProviderName | undefined) ?? (supabase ? "supabase" : "local");

  if (provider === "supabase" && !supabase) {
    throw new ConfigError(
      'AUTH_PROVIDER is "supabase" but PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_PUBLISHABLE_KEY (or PUBLIC_SUPABASE_ANON_KEY) are not both set.',
    );
  }
  if (provider === "local" && get("AWS_LAMBDA_FUNCTION_NAME")) {
    // The local provider stores users in a SQLite file. On Lambda that file lives in an ephemeral, per-instance
    // /tmp: accounts would silently vanish.
    throw new ConfigError(
      "The local auth provider is for development only and cannot run on AWS Lambda. Add PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_PUBLISHABLE_KEY to this environment's secret.",
    );
  }

  const siteUrl = get("SITE_URL");
  if (siteUrl && !URL.canParse(siteUrl)) throw new ConfigError(`SITE_URL must be an absolute URL, got "${siteUrl}".`);

  return {
    provider,
    supabase,
    local: {
      dbPath: get("LOCAL_AUTH_DB_PATH") ?? DEFAULT_LOCAL_DB_PATH,
      requireEmailConfirmation: truthy(get("LOCAL_AUTH_REQUIRE_EMAIL_CONFIRMATION")),
    },
    siteUrl: siteUrl ? new URL(siteUrl).origin : undefined,
    googleSignIn: provider === "local" || truthy(get("AUTH_GOOGLE")),
  };
}
