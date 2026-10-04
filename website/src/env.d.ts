/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    /** Auth backend bound to the current request (Supabase or local). */
    auth: import("./lib/auth/types").AuthService;
    /** The signed-in user, or null. Set by src/middleware.ts. */
    user: import("./lib/auth/types").AuthUser | null;
  }
}
