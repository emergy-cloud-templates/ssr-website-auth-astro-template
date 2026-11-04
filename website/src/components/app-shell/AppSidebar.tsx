// Adapted from /common/legos/preact/app-shell@2.0.0 (dvk-common 61a5d51). Owned by this project.
// Origin: www.boulot.ai - website/src/components/layout/AppSidebar.tsx (design first built in app.upmatch.io).
// Lego app-shell.
//
// The dashboard's left sidebar: the user's links, an admin section with collapsible categories, a "viewing user"
// card while an admin inspects someone, a drawer on phones. Every colour is a shell token (theme.css), so the
// same sidebar is a brand gradient in upmatch, navy in storeai and white in the auth template.
import { useStore } from "@nanostores/preact";
import type { ComponentChildren } from "preact";
import { useEffect, useState } from "preact/hooks";
import { Icon } from "./icons";
import { isActive, isNavGroup, visibleEntries, type NavEntry, type NavGroup, type NavLeaf } from "./nav";
import { $mobileMenuOpen, closeMobileMenu } from "./stores";
import { $adminUserNav, type AdminUserNavState } from "./viewingUser";

export interface AppSidebarLabels {
  main: string;
  admin: string;
  adminBadge: string;
  closeMenu: string;
  viewingUser: string;
  closeViewingUser: string;
}

export const defaultSidebarLabels: AppSidebarLabels = {
  main: "Main",
  admin: "Admin",
  adminBadge: "Admin",
  closeMenu: "Close menu",
  viewingUser: "Viewing user",
  closeViewingUser: "Close this user and go back to all users",
};

export interface AppSidebarProps {
  /** Astro.url.pathname: decides the active entry. */
  currentPath: string;
  brand: { name: string; href?: string; logoSrc?: string };
  /** The user's links, at the top. */
  nav: NavEntry[];
  /** The admin section, shown when `isAdmin`. */
  adminNav?: NavEntry[];
  isAdmin?: boolean;
  /** Development runtime: shows the devOnly entries. */
  isLocal?: boolean;
  /** Extra glyphs (name -> 24x24 path) for the nav's `icon` names. */
  icons?: Record<string, string>;
  /** Where the "viewing user" card closes back to. */
  adminUsersHref?: string;
  /** The admin pages where an island publishes the "viewing user" card, so the categories fold on first paint. */
  adminUserPath?: RegExp;
  /** Bottom of the sidebar (a plan badge, a help link). */
  footer?: ComponentChildren;
  /** False hides the footer: Astro hands an island an empty slot as a value, so AppShell.astro says whether it has one. */
  showFooter?: boolean;
  labels?: Partial<AppSidebarLabels>;
}

/** "top" rows sit on the sidebar itself; "sub" rows sit on a rail or in the user card. */
type RowLevel = "top" | "sub";
const ICON_SIZE: Record<RowLevel, string> = { top: "h-5 w-5", sub: "h-4 w-4" };
// Inset, so the scrolling nav never clips it; shell-focus, because the brand focus colour may be the shell's own.
const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-shell-focus";
const EYEBROW = "font-semibold uppercase tracking-wider";

// One builder for every row, link or button, so the two can never drift apart.
const rowClass = (level: RowLevel, active: boolean) =>
  [
    `flex w-full min-w-0 cursor-pointer items-center text-left text-sm transition-colors ${FOCUS_RING}`,
    level === "top"
      ? "gap-3 rounded-lg px-3 py-2.5 font-semibold"
      : `gap-2.5 rounded-md px-3 py-2 ${active ? "font-semibold" : "font-medium"}`,
    active
      ? "bg-shell-active text-on-shell-active ring-1 ring-inset ring-shell-line"
      : "text-on-shell hover:bg-shell-hover",
  ].join(" ");

// The rail drops from the centre of the category icon and child icons line up under the category label:
// 22 = row padding 12 + half a 20px icon; 22 + 1 (rail) + 9 + 12 (child padding) = 44 = where the label starts.
const RAIL = "ml-[22px] mt-1 space-y-0.5 border-l border-shell-line pl-[9px]";

function Chevron({ expanded }: { expanded: boolean }) {
  return (
    <svg
      class={`h-4 w-4 flex-none transition-transform ${expanded ? "rotate-90" : ""}`}
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <path d="M7 5l5 5-5 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  );
}

function Badge({ value }: { value: string | number }) {
  return <span class="rounded-pill bg-shell-active px-2 py-0.5 text-[11px] font-semibold text-on-shell">{value}</span>;
}

function NavLink({
  item,
  level,
  path,
  icons,
  onNavigate,
}: {
  item: NavLeaf;
  level: RowLevel;
  path: string;
  icons?: Record<string, string>;
  onNavigate: () => void;
}) {
  const active = isActive(item, path);
  return (
    <a href={item.href} onClick={onNavigate} aria-current={active ? "page" : undefined} class={rowClass(level, active)}>
      {item.icon && <Icon name={item.icon} icons={icons} class={ICON_SIZE[level]} />}
      <span class="min-w-0 flex-1 truncate">{item.label}</span>
      {item.badge !== undefined && <Badge value={item.badge} />}
    </a>
  );
}

function NavCategory(props: {
  group: NavGroup;
  path: string;
  expanded: boolean;
  icons?: Record<string, string>;
  onToggle: () => void;
  onNavigate: () => void;
}) {
  const { group, path, expanded, icons, onToggle, onNavigate } = props;
  const panelId = `nav-group-${group.key}`;
  // Folded over the current page, the category wears the active look itself, so the sidebar never loses track
  // of where you are.
  const marksCurrent = !expanded && group.children.some((c) => isActive(c, path));
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        // Only while the panel exists: a dangling id reference fails a11y audits.
        aria-controls={expanded ? panelId : undefined}
        class={rowClass("top", marksCurrent)}
      >
        {group.icon && <Icon name={group.icon} icons={icons} class={ICON_SIZE.top} />}
        <span class="min-w-0 flex-1 truncate">{group.label}</span>
        <Chevron expanded={expanded} />
      </button>
      {expanded && (
        <div id={panelId} class={RAIL}>
          {group.children.map((item) => (
            <NavLink key={item.href} item={item} level="sub" path={path} icons={icons} onNavigate={onNavigate} />
          ))}
        </div>
      )}
    </div>
  );
}

function NavList({
  entries,
  path,
  icons,
  isOpen,
  onToggle,
  onNavigate,
}: {
  entries: NavEntry[];
  path: string;
  icons?: Record<string, string>;
  isOpen: (g: NavGroup) => boolean;
  onToggle: (g: NavGroup) => void;
  onNavigate: () => void;
}) {
  return (
    <>
      {entries.map((entry) =>
        isNavGroup(entry) ? (
          <NavCategory
            key={entry.key}
            group={entry}
            path={path}
            icons={icons}
            expanded={isOpen(entry)}
            onToggle={() => onToggle(entry)}
            onNavigate={onNavigate}
          />
        ) : (
          <NavLink key={entry.href} item={entry} level="top" path={path} icons={icons} onNavigate={onNavigate} />
        ),
      )}
    </>
  );
}

/** The user an admin is inspecting, in a card of their own: its sections read as "this user". */
function ViewingUserCard({
  nav,
  closeHref,
  labels,
  icons,
  onNavigate,
}: {
  nav: AdminUserNavState;
  closeHref: string;
  labels: AppSidebarLabels;
  icons?: Record<string, string>;
  onNavigate: () => void;
}) {
  return (
    <section
      aria-label={`${labels.viewingUser}: ${nav.title}`}
      class="mb-3 rounded-lg bg-shell-sunken p-1.5 ring-1 ring-inset ring-shell-line"
    >
      <div class="relative mb-1.5 flex items-start gap-2.5 border-b border-shell-line px-2 pb-2.5 pt-1.5">
        <span
          class="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-on-shell text-sm font-bold text-shell"
          aria-hidden="true"
        >
          {nav.title.trim().charAt(0).toUpperCase() || "?"}
        </span>
        <div class="min-w-0 flex-1">
          <p class={`pr-7 text-[10px] text-on-shell-muted ${EYEBROW}`}>{labels.viewingUser}</p>
          <p class="truncate pr-7 text-sm font-semibold text-on-shell" title={nav.title}>
            {nav.title}
          </p>
          {nav.subtitle && (
            <p class="truncate text-xs text-on-shell-muted" title={nav.subtitle}>
              {nav.subtitle}
            </p>
          )}
        </div>
        <a
          href={closeHref}
          onClick={onNavigate}
          title={labels.closeViewingUser}
          aria-label={labels.closeViewingUser}
          class={`absolute right-1 top-1 rounded-md p-1 text-on-shell-muted transition-colors hover:bg-shell-hover hover:text-on-shell ${FOCUS_RING}`}
        >
          <Icon name="close" class="h-4 w-4" />
        </a>
      </div>
      <div class="space-y-0.5">
        {nav.sections.map((sec) => {
          const active = nav.activeSection === sec.id;
          return (
            <button
              key={sec.id}
              type="button"
              onClick={() => {
                nav.onSelect(sec.id);
                onNavigate();
              }}
              aria-current={active ? "true" : undefined}
              class={rowClass("sub", active)}
            >
              <Icon name={sec.icon ?? "squares"} icons={icons} class={ICON_SIZE.sub} />
              <span class="min-w-0 flex-1 truncate">{sec.label}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export function AppSidebar({
  currentPath: path,
  brand,
  nav,
  adminNav = [],
  isAdmin = false,
  isLocal = false,
  icons,
  adminUsersHref = "/admin/users",
  adminUserPath = /^\/admin\/users\/[^/]+\/?$/,
  footer,
  showFooter = true,
  labels: labelOverrides,
}: AppSidebarProps) {
  const labels = { ...defaultSidebarLabels, ...labelOverrides };
  const mobileOpen = useStore($mobileMenuOpen);
  const userNav = useStore($adminUserNav);

  // While an admin inspects a user, the categories fold (all but the one holding the current page) so the card
  // and the global admin pages do not blur into one long list.
  const viewingUser = isAdmin && (userNav !== null || adminUserPath.test(path));
  // Categories start expanded; one toggled by hand keeps that choice.
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const isOpen = (g: NavGroup) => openGroups[g.key] ?? (viewingUser ? g.children.some((c) => isActive(c, path)) : true);
  const toggle = (g: NavGroup) => setOpenGroups((prev) => ({ ...prev, [g.key]: !isOpen(g) }));

  // Mobile drawer: close on Escape, lock the page scroll while open.
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMobileMenu();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const onNavigate = () => closeMobileMenu();
  const userEntries = visibleEntries(nav, isLocal);
  const adminEntries = isAdmin ? visibleEntries(adminNav, isLocal) : [];

  return (
    <>
      {mobileOpen && (
        <div
          class="fixed inset-0 z-40 bg-overlay backdrop-blur-sm lg:hidden"
          onClick={closeMobileMenu}
          aria-hidden="true"
        />
      )}
      <aside
        id="app-sidebar"
        class={`bg-shell-surface fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-shell-line shadow-xl ${mobileOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
        aria-label="Sidebar"
      >
        <div class="flex h-16 flex-none items-center justify-between gap-3 border-b border-shell-line px-4">
          <a href={brand.href ?? "/"} class={`inline-flex items-center gap-2.5 rounded-sm ${FOCUS_RING}`}>
            {brand.logoSrc ? (
              <img src={brand.logoSrc} alt={brand.name} class="h-8 w-auto" />
            ) : (
              <span class="inline-flex items-center px-1 py-1.5 text-lg font-bold tracking-tight text-on-shell">
                {brand.name}
              </span>
            )}
            {isAdmin && (
              <span class="hidden rounded-pill bg-shell-active px-2 py-0.5 text-[10px] font-semibold text-on-shell ring-1 ring-shell-line sm:inline-block">
                {labels.adminBadge}
              </span>
            )}
          </a>
          <button
            type="button"
            aria-label={labels.closeMenu}
            class={`inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-on-shell-muted transition-colors hover:bg-shell-hover hover:text-on-shell lg:hidden ${FOCUS_RING}`}
            onClick={closeMobileMenu}
          >
            <Icon name="close" class="h-5 w-5" />
          </button>
        </div>

        <nav aria-label={labels.main} class="flex-1 overflow-y-auto overscroll-contain p-3">
          {isAdmin && userNav && (
            <ViewingUserCard
              nav={userNav}
              closeHref={adminUsersHref}
              labels={labels}
              icons={icons}
              onNavigate={onNavigate}
            />
          )}
          <div class="space-y-1">
            <NavList
              entries={userEntries}
              path={path}
              icons={icons}
              isOpen={isOpen}
              onToggle={toggle}
              onNavigate={onNavigate}
            />
          </div>
          {adminEntries.length > 0 && (
            <div role="group" aria-labelledby="nav-admin-label" class="mt-3 space-y-1 border-t border-shell-line pt-3">
              <p id="nav-admin-label" class={`px-3 pb-1 text-[11px] text-on-shell-muted ${EYEBROW}`}>
                {labels.admin}
              </p>
              <NavList
                entries={adminEntries}
                path={path}
                icons={icons}
                isOpen={isOpen}
                onToggle={toggle}
                onNavigate={onNavigate}
              />
            </div>
          )}
        </nav>
        {footer && showFooter && (
          <div class="flex-none border-t border-shell-line p-3 text-sm text-on-shell-muted">{footer}</div>
        )}
      </aside>
    </>
  );
}
