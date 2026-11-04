// Adapted from /common/legos/node/supabase-auth@1.0.0 (dvk-common d587e16). Owned by this project.
// Origin: ssr-website-auth-astro-template - website/src/lib/auth/index.ts (ff4d19d). Lego supabase-auth; adapt
// per project, see README.md.
import type { CookieJar, CookieOptions } from "./types.ts";

/** The part of Astro's `cookies` a provider uses (structural, so no Astro types are needed). */
export interface AstroCookiesLike {
  get(name: string): { value: string } | undefined;
  set(name: string, value: string, options?: CookieOptions): void;
  delete(name: string, options?: Pick<CookieOptions, "path" | "domain">): void;
}

export function parseCookieHeader(header: string | null): { name: string; value: string }[] {
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
export function astroCookieJar(request: Request, cookies: AstroCookiesLike): CookieJar {
  return {
    getAll: () => parseCookieHeader(request.headers.get("cookie")),
    get: (name) => cookies.get(name)?.value,
    set: (name, value, options) => cookies.set(name, value, options),
    delete: (name, options) => cookies.delete(name, options),
  };
}
