import type { AstroCookies } from "astro";

import { getConfig, type AppConfig } from "../config";
import { openDatabase } from "./local/db";
import { createLocalAuth } from "./local/provider";
import { createSupabaseAuth } from "./supabase";
import type { AuthService, CookieJar } from "./types";

export { AuthError } from "./types";
export type { AuthService, AuthUser } from "./types";

function parseCookieHeader(header: string | null): { name: string; value: string }[] {
  if (!header) return [];
  return header
    .split(";")
    .map((part) => {
      const index = part.indexOf("=");
      if (index === -1) return null;
      const name = part.slice(0, index).trim();
      const raw = part.slice(index + 1).trim();
      let value = raw;
      try {
        value = decodeURIComponent(raw);
      } catch {
        // Keep the raw value when it is not valid percent-encoding.
      }
      return name ? { name, value } : null;
    })
    .filter((cookie): cookie is { name: string; value: string } => cookie !== null);
}

/** Adapts Astro's cookie API to the provider-neutral CookieJar. */
export function astroCookieJar(request: Request, cookies: AstroCookies): CookieJar {
  return {
    getAll: () => parseCookieHeader(request.headers.get("cookie")),
    get: (name) => cookies.get(name)?.value,
    set: (name, value, options) => cookies.set(name, value, options),
    delete: (name, options) => cookies.delete(name, options),
  };
}

interface AuthContext {
  request: Request;
  cookies: AstroCookies;
  url: URL;
}

/** The auth backend for one request, picked from the environment (see `resolveConfig`). */
export function createAuth({ request, cookies, url }: AuthContext, config: AppConfig = getConfig()): AuthService {
  const jar = astroCookieJar(request, cookies);
  const secureCookies = url.protocol === "https:";

  if (config.authProvider === "supabase" && config.supabase) {
    return createSupabaseAuth(config.supabase, jar, secureCookies);
  }
  return createLocalAuth({
    db: openDatabase(config.local.dbPath),
    cookies: jar,
    secureCookies,
    requireEmailConfirmation: config.local.requireEmailConfirmation,
  });
}

/** Origin used to build links in emails: SITE_URL when set, else the request origin. */
export function siteOrigin(url: URL, config: AppConfig = getConfig()): string {
  return config.siteUrl ?? url.origin;
}
