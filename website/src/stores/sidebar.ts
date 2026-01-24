import { atom } from 'nanostores';

const isBrowser = typeof window !== 'undefined';

// Initialize from localStorage if available
const getInitialState = (): boolean => {
  if (isBrowser) {
    const saved = localStorage.getItem('sidebar-collapsed');
    return saved === 'true';
  }
  return false;
};

export const $sidebarCollapsed = atom<boolean>(getInitialState());

export const toggleSidebar = () => {
  const newValue = !$sidebarCollapsed.get();
  $sidebarCollapsed.set(newValue);
  if (isBrowser) {
    localStorage.setItem('sidebar-collapsed', String(newValue));
  }
};

export const $mobileMenuOpen = atom<boolean>(false);

export const toggleMobileMenu = () => {
  $mobileMenuOpen.set(!$mobileMenuOpen.get());
};

export const closeMobileMenu = () => {
  $mobileMenuOpen.set(false);
};
