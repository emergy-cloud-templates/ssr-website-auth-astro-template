import { defineMiddleware } from "astro:middleware";
import { createServerClient } from "./lib/supabase";
import "dotenv/config";

const protectedRoutes = ["/account", "/dashboard"];
const authRoutes = ["/auth/signin", "/auth/signup", "/auth/reset-password"];

export const onRequest = defineMiddleware(
  async ({ url, cookies, redirect, locals, request }, next) => {
    // Skip API routes
    if (url.pathname.startsWith('/api/')) {
      return next();
    }

    try {
      const supabase = createServerClient(cookies, request.headers);

      // This will refresh the session if needed
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error) {
        console.log('Auth error:', error.message);
      }

      locals.user = error ? null : user;

      const isProtectedRoute = protectedRoutes.some((route) =>
        url.pathname.startsWith(route),
      );
      const isAuthRoute = authRoutes.some((route) =>
        url.pathname.startsWith(route),
      );

      console.log('Path:', url.pathname, 'User:', locals.user?.email || 'none');

      if (isProtectedRoute && !locals.user) {
        return redirect("/auth/signin");
      }

      if (isAuthRoute && locals.user) {
        return redirect("/account");
      }
    } catch (e) {
      console.error("Middleware error:", e);
      locals.user = null;
    }

    return next();
  },
);
