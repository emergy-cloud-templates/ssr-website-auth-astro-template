// Adapted from /common/legos/preact/app-shell@2.0.0 (dvk-common 61a5d51). Owned by this project.
// Origin: www.boulot.ai - website/src/components/layout/AppHeader.tsx and app.upmatch.io - AppHeader.tsx (the admin
// user picker sits in `actions`). Lego app-shell.
//
// The top bar: the phone menu button, the desktop "hide navigation" toggle, the brand when the sidebar is hidden,
// an optional title, the host's actions (an admin user picker, notifications) and the account menu.
import { useStore } from "@nanostores/preact";
import type { ComponentChildren } from "preact";
import { useEffect } from "preact/hooks";
import { Icon } from "./icons";
import { ProfileMenu, type ProfileMenuItem, type ProfileMenuLabels } from "./ProfileMenu";
import { $mobileMenuOpen, $sidebarCollapsed, syncSidebarCollapsed, toggleMobileMenu, toggleSidebar } from "./stores";

export interface AppHeaderLabels {
  openMenu: string;
  showNavigation: string;
  hideNavigation: string;
}

export const defaultHeaderLabels: AppHeaderLabels = {
  openMenu: "Open menu",
  showNavigation: "Show navigation",
  hideNavigation: "Hide navigation",
};

export interface AppHeaderProps {
  /** Shown on phones and while the sidebar is collapsed on desktop (shell.css: .header-logo). */
  brand?: { name: string; href?: string; logoSrc?: string };
  title?: string;
  subtitle?: string;
  /** The signed-in user; no account menu without one. */
  user?: { name?: string | null; email: string } | null;
  accountItems?: ProfileMenuItem[];
  signOutAction?: string;
  /** Right side, before the account menu: an admin user picker, a notification bell. */
  actions?: ComponentChildren;
  /** "shell": the bar wears the shell's surface (brand gradient, navy...); "plain": a raised surface with a line. */
  variant?: "shell" | "plain";
  icons?: Record<string, string>;
  labels?: Partial<AppHeaderLabels> & { profile?: Partial<ProfileMenuLabels> };
}

export function AppHeader({
  brand,
  title,
  subtitle,
  user,
  accountItems,
  signOutAction,
  actions,
  variant = "shell",
  icons,
  labels: overrides,
}: AppHeaderProps) {
  const labels = { ...defaultHeaderLabels, ...overrides };
  const collapsed = useStore($sidebarCollapsed);
  const mobileOpen = useStore($mobileMenuOpen);
  useEffect(syncSidebarCollapsed, []);
  const onShell = variant === "shell";
  const bar = onShell
    ? "border-b border-shell-line bg-shell-surface text-on-shell"
    : "border-b border-line bg-surface-raised text-content";
  // No display class here: each button says when it shows (a shared inline-flex would beat `hidden` on phones).
  const iconButton = `h-10 w-10 cursor-pointer items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 ${
    onShell
      ? "text-on-shell-muted hover:bg-shell-hover hover:text-on-shell focus-visible:ring-shell-focus"
      : "text-content-muted hover:bg-surface-subtle hover:text-content focus-visible:ring-focus"
  }`;

  return (
    <header class={`sticky top-0 z-30 ${bar}`}>
      <div class="flex h-16 items-center gap-3 px-4 sm:px-6">
        <button
          type="button"
          class={`-ml-2 inline-flex lg:hidden ${iconButton}`}
          onClick={toggleMobileMenu}
          aria-controls="app-sidebar"
          aria-expanded={mobileOpen}
          aria-label={labels.openMenu}
        >
          <Icon name="menu" class="h-6 w-6" />
        </button>
        <button
          type="button"
          class={`-ml-2 hidden lg:inline-flex ${iconButton}`}
          onClick={toggleSidebar}
          aria-controls="app-sidebar"
          aria-expanded={!collapsed}
          aria-label={collapsed ? labels.showNavigation : labels.hideNavigation}
        >
          <Icon name="panel" class="h-5 w-5" />
        </button>
        {brand && (
          <a href={brand.href ?? "/"} class="header-logo items-center gap-2 font-bold tracking-tight">
            {brand.logoSrc ? (
              <img src={brand.logoSrc} alt={brand.name} class="h-7 w-auto" />
            ) : (
              <span class="text-lg">{brand.name}</span>
            )}
          </a>
        )}
        {title && (
          <div class="min-w-0">
            <p class="truncate text-base font-semibold">{title}</p>
            {subtitle && (
              <p class={`truncate text-xs ${onShell ? "text-on-shell-muted" : "text-content-muted"}`}>{subtitle}</p>
            )}
          </div>
        )}
        <div class="ml-auto flex items-center gap-2">
          {actions}
          {user && (
            <ProfileMenu
              user={user}
              items={accountItems}
              signOutAction={signOutAction}
              onShell={onShell}
              icons={icons}
              labels={overrides?.profile}
            />
          )}
        </div>
      </div>
    </header>
  );
}
