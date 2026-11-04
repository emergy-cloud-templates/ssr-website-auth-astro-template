// Adapted from /common/legos/node/supabase-auth@1.0.0 (dvk-common d587e16). Owned by this project.
// Origin: ssr-website-auth-astro-template - website/src/lib/routes.ts (ff4d19d). Lego supabase-auth; adapt per
// project, see README.md.

/** Which pages need a session, which are for signed-out visitors only, and where people land. */
export interface AuthRoutes {
  /** Pages that require a signed-in user (and everything below them). */
  protected: string[];
  /** Pages only for signed-out visitors; signed-in users go to `home`. */
  guestOnly: string[];
  /** Reached from a password-reset email, which signs the user in first. */
  recovery: string[];
  /** Where signed-in users land. */
  home: string;
  /** The sign-in page. */
  signIn: string;
}

export const DEFAULT_AUTH_ROUTES: AuthRoutes = {
  protected: ["/dashboard", "/account"],
  guestOnly: ["/auth/signin", "/auth/signup", "/auth/reset-password"],
  recovery: ["/auth/update-password"],
  home: "/dashboard",
  signIn: "/auth/signin",
};

/** True for `route` itself and anything below it, but not `/accounting` for `/account`. */
export function matchesRoute(pathname: string, route: string): boolean {
  return pathname === route || pathname.startsWith(`${route}/`);
}

const matchesAny = (pathname: string, routes: string[]) => routes.some((route) => matchesRoute(pathname, route));

/** Where to send a request instead of rendering it, or null to render it. Pure, so the rules are unit-tested. */
export function redirectFor(url: URL, signedIn: boolean, routes: AuthRoutes = DEFAULT_AUTH_ROUTES): string | null {
  const { pathname, search } = url;
  if (!signedIn && matchesAny(pathname, routes.protected)) {
    return `${routes.signIn}?redirectTo=${encodeURIComponent(pathname + search)}`;
  }
  if (!signedIn && matchesAny(pathname, routes.recovery)) return `${routes.signIn}?error=link_expired`;
  if (signedIn && matchesAny(pathname, routes.guestOnly)) return routes.home;
  return null;
}
