import { createBrowserClient, createServerClient as createSSRServerClient, parseCookieHeader } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { AstroCookies } from 'astro';

// Browser bundle: import.meta.env.PUBLIC_* is inlined by Vite at build time
// (.env is not applied to process.env on the client).
// Server (Lambda): the SSR build is produced WITHOUT a .env, so the inlined
// value is undefined there - fall back to process.env, which loadSecrets()
// hydrates from AWS Secrets Manager before this module is imported.
const supabaseUrl =
  import.meta.env.PUBLIC_SUPABASE_URL ??
  (typeof process !== 'undefined' ? process.env.PUBLIC_SUPABASE_URL : undefined);
const supabaseAnonKey =
  import.meta.env.PUBLIC_SUPABASE_ANON_KEY ??
  (typeof process !== 'undefined' ? process.env.PUBLIC_SUPABASE_ANON_KEY : undefined);

// Simple client for basic operations (legacy export)
export const supabase = createSupabaseClient(supabaseUrl, supabaseAnonKey);

// Client-side Supabase client (for use in browser/Preact components)
export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

// Server-side Supabase client (for use in API routes and middleware)
export function createServerClient(cookies: AstroCookies, requestHeaders?: Headers) {
  return createSSRServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        // Try to parse from cookie header if available
        if (requestHeaders) {
          const cookieHeader = requestHeaders.get('cookie');
          if (cookieHeader) {
            return parseCookieHeader(cookieHeader);
          }
        }
        
        // Fallback: manually get known cookie patterns
        const allCookies: { name: string; value: string }[] = [];
        const projectRef = supabaseUrl.match(/https:\/\/([^.]+)/)?.[1];
        
        // Check for chunked auth token cookies (0-9)
        for (let i = 0; i < 10; i++) {
          const name = `sb-${projectRef}-auth-token.${i}`;
          const cookie = cookies.get(name);
          if (cookie?.value) {
            allCookies.push({ name, value: cookie.value });
          }
        }
        
        // Check for single auth token cookie
        const singleTokenName = `sb-${projectRef}-auth-token`;
        const singleToken = cookies.get(singleTokenName);
        if (singleToken?.value) {
          allCookies.push({ name: singleTokenName, value: singleToken.value });
        }

        return allCookies;
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          cookies.set(name, value, {
            path: '/',
            secure: import.meta.env.PROD,
            httpOnly: true,
            sameSite: 'lax',
            ...options,
          });
        }
      },
    },
  });
}
