// Adapted from /common/legos/preact/app-shell@2.0.0 (dvk-common 61a5d51). Owned by this project.
// Origin: www.boulot.ai - website/src/stores/adminUserNav.ts. Lego app-shell.
import { atom } from "nanostores";
import type { IconName } from "./icons";

/**
 * Bridge between a detail island and the sidebar, which are separate islands
 * and cannot call each other: while an admin is viewing a user, that user's
 * sections render in the LEFT SIDEBAR, in a "Viewing user" card of their own,
 * instead of as in-page tabs. The island owns the state; the sidebar renders
 * it and calls `onSelect`.
 */
export interface AdminUserNavSection {
  id: string;
  label: string;
  icon?: IconName;
}

export interface AdminUserNavState {
  /** Card heading: the user's display name, or their email when they have none. */
  title: string;
  /** Second line under the title (the email when the title is a name). */
  subtitle?: string;
  sections: AdminUserNavSection[];
  activeSection: string;
  onSelect: (id: string) => void;
}

export const $adminUserNav = atom<AdminUserNavState | null>(null);

export const setAdminUserNav = (state: AdminUserNavState) => $adminUserNav.set(state);
export const clearAdminUserNav = () => $adminUserNav.set(null);
