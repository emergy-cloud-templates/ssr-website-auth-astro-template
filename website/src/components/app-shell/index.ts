// Adapted from /common/legos/preact/app-shell@2.0.0 (dvk-common 61a5d51). Owned by this project.
// Barrel: import from "~/components/app-shell". Lego app-shell. (AppShell.astro is imported by its path.)
export { AppSidebar, defaultSidebarLabels } from "./AppSidebar";
export type { AppSidebarLabels, AppSidebarProps } from "./AppSidebar";
export { AppHeader, defaultHeaderLabels } from "./AppHeader";
export type { AppHeaderLabels, AppHeaderProps } from "./AppHeader";
export { ProfileMenu, defaultProfileMenuLabels, initials } from "./ProfileMenu";
export type { ProfileMenuItem, ProfileMenuLabels, ProfileMenuProps } from "./ProfileMenu";
export { ICONS, Icon } from "./icons";
export type { IconName } from "./icons";
export { isActive, isNavGroup, visibleEntries } from "./nav";
export type { NavEntry, NavGroup, NavLeaf } from "./nav";
export {
  $mobileMenuOpen,
  $sidebarCollapsed,
  SHELL_PREPAINT_SCRIPT,
  closeMobileMenu,
  openMobileMenu,
  syncSidebarCollapsed,
  toggleMobileMenu,
  toggleSidebar,
} from "./stores";
export { $adminUserNav, clearAdminUserNav, setAdminUserNav } from "./viewingUser";
export type { AdminUserNavSection, AdminUserNavState } from "./viewingUser";
