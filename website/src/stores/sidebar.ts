import { atom } from "nanostores";

const STORAGE_KEY = "sidebar-collapsed";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
const isBrowser = typeof window !== "undefined";

/**
 * Desktop sidebar state. The server renders from the `sidebar-collapsed`
 * cookie (no flash on load); the browser keeps the cookie and localStorage in
 * sync after hydration.
 */
export const $sidebarCollapsed = atom<boolean>(false);

/** Mobile drawer state (never persisted). */
export const $mobileMenuOpen = atom<boolean>(false);

function persist(collapsed: boolean): void {
  if (!isBrowser) return;
  try {
    localStorage.setItem(STORAGE_KEY, String(collapsed));
  } catch {
    // Storage can be unavailable (private mode, blocked site data); the cookie still works.
  }
  document.cookie = `${STORAGE_KEY}=${collapsed}; Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}

export function syncSidebarCollapsedFromStorage(): void {
  if (!isBrowser) return;
  let saved: string | null = null;
  try {
    saved = localStorage.getItem(STORAGE_KEY);
  } catch {
    // Fall back to the cookie the server rendered with.
  }
  const collapsed = saved === null ? document.cookie.includes(`${STORAGE_KEY}=true`) : saved === "true";
  $sidebarCollapsed.set(collapsed);
  persist(collapsed);
}

export function toggleSidebar(): void {
  const collapsed = !$sidebarCollapsed.get();
  $sidebarCollapsed.set(collapsed);
  persist(collapsed);
}

export function toggleMobileMenu(): void {
  $mobileMenuOpen.set(!$mobileMenuOpen.get());
}

export function closeMobileMenu(): void {
  $mobileMenuOpen.set(false);
}
