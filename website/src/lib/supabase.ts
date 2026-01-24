import { createBrowserClient, createServerClient as createSSRServerClient, parseCookieHeader, serializeCookieHeader } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { AstroCookies } from 'astro';
import "dotenv/config";

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.PUBLIC_SUPABASE_ANON_KEY!;

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
            secure: process.env.ENV === 'prod',
            httpOnly: true,
            sameSite: 'lax',
            ...options,
          });
        }
      },
    },
  });
}
