// Adapted from /common/legos/preact/app-shell@2.0.0 (dvk-common 61a5d51). Owned by this project.
// Origin: www.boulot.ai - website/src/stores/sidebar.ts (the same file in upmatch, recapify, emergy and the auth
// template). Lego app-shell.
//
// Shell state shared by the islands (sidebar, header, menu button): the mobile drawer and the desktop collapse.
// The collapse is remembered in localStorage and mirrored on <html data-sidebar-collapsed>, which shell.css reads,
// so the layout's inline script can restore it before the first paint (no flash, no slide).
import { atom } from "nanostores";

const isBrowser = typeof window !== "undefined";
const KEY = "sidebar-collapsed";

function readCollapsed(): boolean {
  if (!isBrowser) return false;
  try {
    return localStorage.getItem(KEY) === "true";
  } catch {
    return false; // storage blocked (private mode, sandboxed frame)
  }
}

function writeCollapsed(value: boolean) {
  if (!isBrowser) return;
  document.documentElement.dataset.sidebarCollapsed = String(value);
  try {
    localStorage.setItem(KEY, String(value));
  } catch {
    // The choice lasts for this page only.
  }
}

// false on the server and on the client's first render, so hydration matches the server's HTML; the islands call
// syncSidebarCollapsed() once mounted (the layout is already right before paint: <html data-sidebar-collapsed>).
export const $sidebarCollapsed = atom<boolean>(false);

/** Reads the remembered collapse after hydration (AppHeader calls it on mount). */
export function syncSidebarCollapsed() {
  const saved = readCollapsed();
  if ($sidebarCollapsed.get() !== saved) $sidebarCollapsed.set(saved);
}
export const $mobileMenuOpen = atom<boolean>(false);

export function toggleSidebar() {
  const next = !$sidebarCollapsed.get();
  $sidebarCollapsed.set(next);
  writeCollapsed(next);
}
export const openMobileMenu = () => $mobileMenuOpen.set(true);
export const closeMobileMenu = () => $mobileMenuOpen.set(false);
export const toggleMobileMenu = () => $mobileMenuOpen.set(!$mobileMenuOpen.get());

/** The inline script the layout runs in <head>: restores the collapse before paint, then allows transitions. */
export const SHELL_PREPAINT_SCRIPT = `try{if(localStorage.getItem("${KEY}")==="true")document.documentElement.dataset.sidebarCollapsed="true"}catch(e){}requestAnimationFrame(function(){requestAnimationFrame(function(){document.documentElement.classList.add("sidebar-ready")})})`;
