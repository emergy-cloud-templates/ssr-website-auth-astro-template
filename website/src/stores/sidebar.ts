import { atom } from 'nanostores';

const isBrowser = typeof window !== 'undefined';

const STORAGE_KEY = 'sidebar-collapsed';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** Default false; SSR uses cookie prop, client syncs from localStorage in layout effect. */
export const $sidebarCollapsed = atom<boolean>(false);

function persistSidebarCollapsed(collapsed: boolean): void {
  if (!isBrowser) return;
  localStorage.setItem(STORAGE_KEY, String(collapsed));
  document.cookie = `${STORAGE_KEY}=${collapsed}; Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}

export function syncSidebarCollapsedFromStorage(): void {
  if (!isBrowser) return;
  const saved = localStorage.getItem(STORAGE_KEY);
  const collapsed = saved === 'true';
  $sidebarCollapsed.set(collapsed);
  persistSidebarCollapsed(collapsed);
}

export const toggleSidebar = () => {
  const newValue = !$sidebarCollapsed.get();
  $sidebarCollapsed.set(newValue);
  persistSidebarCollapsed(newValue);
};

export const $mobileMenuOpen = atom<boolean>(false);

export const toggleMobileMenu = () => {
  $mobileMenuOpen.set(!$mobileMenuOpen.get());
};

export const closeMobileMenu = () => {
  $mobileMenuOpen.set(false);
};
