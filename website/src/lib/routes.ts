/** Pages that require a signed-in user. Add your own app sections here. */
export const PROTECTED_ROUTES = ["/dashboard", "/account"];

/** Pages only for signed-out visitors; signed-in users are sent to the dashboard. */
export const GUEST_ONLY_ROUTES = ["/auth/signin", "/auth/signup", "/auth/reset-password"];

/** Reached from a password-reset email, which signs the user in first. */
export const RECOVERY_ROUTES = ["/auth/update-password"];

export const HOME_FOR_USERS = "/dashboard";
export const SIGN_IN = "/auth/signin";

/** True for `route` itself and anything below it, but not `/accounting` for `/account`. */
export function matchesRoute(pathname: string, route: string): boolean {
  return pathname === route || pathname.startsWith(`${route}/`);
}

const matchesAny = (pathname: string, routes: string[]) => routes.some((route) => matchesRoute(pathname, route));

/**
 * Where to send a request instead of rendering it, or null to render it.
 * Pure function so the access rules are unit-tested without a server.
 */
export function redirectFor(url: URL, signedIn: boolean): string | null {
  const { pathname, search } = url;
  if (!signedIn && matchesAny(pathname, PROTECTED_ROUTES)) {
    return `${SIGN_IN}?redirectTo=${encodeURIComponent(pathname + search)}`;
  }
  if (!signedIn && matchesAny(pathname, RECOVERY_ROUTES)) {
    return `${SIGN_IN}?error=link_expired`;
  }
  if (signedIn && matchesAny(pathname, GUEST_ONLY_ROUTES)) {
    return HOME_FOR_USERS;
  }
  return null;
}
