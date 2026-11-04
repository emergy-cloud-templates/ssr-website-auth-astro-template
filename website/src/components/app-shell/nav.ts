// Adapted from /common/legos/preact/app-shell@2.0.0 (dvk-common 61a5d51). Owned by this project.
// Origin: www.boulot.ai - website/src/components/layout/nav.ts. Lego app-shell.
//
// The navigation model the sidebar renders. Plain data (no functions), so an Astro page can pass it to the island
// as props: which entry is active comes from `match` and `also`, not from a callback.
import type { IconName } from "./icons";

export interface NavLeaf {
  label: string;
  href: string;
  /** A name from ICONS (icons.tsx), or one the project adds through the sidebar's `icons` prop. */
  icon?: IconName;
  /** "prefix" (default): active on href and below it; "exact": only on href. */
  match?: "prefix" | "exact";
  /** Other paths (and what is below them) that also mark this entry active. */
  also?: string[];
  /** Hidden unless the sidebar gets `isLocal` (development-only tools). */
  devOnly?: boolean;
  /** A count or a short word after the label ("3", "New"). */
  badge?: string | number;
}

/** A collapsible category: a top-level entry with children on a rail. */
export interface NavGroup {
  key: string;
  label: string;
  icon?: IconName;
  children: NavLeaf[];
}

export type NavEntry = NavLeaf | NavGroup;

export const isNavGroup = (entry: NavEntry): entry is NavGroup => "children" in entry;

const under = (path: string, href: string) =>
  path === href || path === `${href}/` || path.startsWith(`${href.replace(/\/$/, "")}/`);

/** Whether `path` (the current pathname) is this entry's page. */
export function isActive(item: NavLeaf, path: string): boolean {
  if (item.match === "exact") {
    if (path === item.href || path === `${item.href}/`) return true;
  } else if (under(path, item.href)) {
    return true;
  }
  return (item.also ?? []).some((p) => under(path, p));
}

/** Entries without the devOnly ones (unless isLocal), and categories left empty by that. */
export function visibleEntries(entries: NavEntry[], isLocal: boolean): NavEntry[] {
  const shown = (leaf: NavLeaf) => !leaf.devOnly || isLocal;
  return entries
    .map((e) => (isNavGroup(e) ? { ...e, children: e.children.filter(shown) } : e))
    .filter((e) => (isNavGroup(e) ? e.children.length > 0 : shown(e)));
}
