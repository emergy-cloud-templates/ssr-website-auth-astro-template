// Adapted from /common/legos/preact/app-shell@2.0.0 (dvk-common 61a5d51). Owned by this project.
// Origin: www.boulot.ai - website/src/components/layout/AppHeader.tsx (AccountMenu), the ProfileDropdown of the
// auth template, recapify, emergy and upmatch. Lego app-shell.
//
// The account menu: initials, name and email, the account links, and "Sign out" (a POST form, so it works without
// JavaScript and is not a GET a link preview could trigger).
import { useEffect, useRef, useState } from "preact/hooks";
import { Icon, type IconName } from "./icons";

export interface ProfileMenuItem {
  label: string;
  href: string;
  icon?: IconName;
}

export interface ProfileMenuLabels {
  /** Accessible name of the button. */
  menu: (who: string) => string;
  signOut: string;
}

export const defaultProfileMenuLabels: ProfileMenuLabels = {
  menu: (who) => `Account menu for ${who}`,
  signOut: "Sign out",
};

export interface ProfileMenuProps {
  user: { name?: string | null; email: string };
  items?: ProfileMenuItem[];
  /** The sign-out route (supabase-auth: POST /api/auth/signout). */
  signOutAction?: string;
  /** The button sits on the shell (the header's shell variant) rather than on a plain surface. */
  onShell?: boolean;
  icons?: Record<string, string>;
  labels?: Partial<ProfileMenuLabels>;
}

export function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]!.toUpperCase())
      .join("") || "?"
  );
}

export function ProfileMenu({
  user,
  items = [{ label: "Account settings", href: "/account", icon: "cog" }],
  signOutAction = "/api/auth/signout",
  onShell = true,
  icons,
  labels: overrides,
}: ProfileMenuProps) {
  const labels = { ...defaultProfileMenuLabels, ...overrides };
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const name = user.name?.trim() || user.email.split("@")[0] || user.email;

  const menuItems = () => [...(root.current?.querySelectorAll<HTMLElement>("[role=menuitem]") ?? [])];
  const close = (focusButton: boolean) => {
    setOpen(false);
    if (focusButton) button.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    menuItems()[0]?.focus();
    const onDown = (e: MouseEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // On the button: arrows open the menu. In the menu: arrows move, Escape closes back to the button.
  const onButtonKeyDown = (e: KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setOpen(true);
    } else if (e.key === "Escape" && open) {
      e.preventDefault();
      close(true);
    }
  };
  const onMenuKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape" || e.key === "Tab") {
      if (e.key === "Escape") e.preventDefault();
      close(e.key === "Escape");
      return;
    }
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const list = menuItems();
    const at = list.indexOf(document.activeElement as HTMLElement);
    const next = e.key === "ArrowDown" ? (at + 1) % list.length : (at - 1 + list.length) % list.length;
    list[next]?.focus();
  };

  const trigger = onShell
    ? "text-on-shell hover:bg-shell-hover focus-visible:ring-shell-focus"
    : "text-content hover:bg-surface-subtle focus-visible:ring-focus";
  const avatar = onShell
    ? "bg-shell-active text-on-shell ring-1 ring-shell-line"
    : "bg-primary-soft text-primary-soft-content";
  const row =
    "flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors focus-visible:outline-none";

  return (
    <div class="relative" ref={root}>
      <button
        ref={button}
        type="button"
        onClick={() => setOpen((v) => !v)}
        onKeyDown={onButtonKeyDown}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={labels.menu(user.email)}
        class={`flex cursor-pointer items-center gap-2.5 rounded-pill p-1 pr-2 transition-colors focus-visible:outline-none focus-visible:ring-2 ${trigger}`}
      >
        <span
          class={`flex h-9 w-9 flex-none items-center justify-center rounded-full text-sm font-semibold ${avatar}`}
          aria-hidden="true"
        >
          {initials(name)}
        </span>
        <span class="hidden max-w-[140px] truncate text-sm font-medium sm:block">{name}</span>
        <Icon
          name="chevron-down"
          class={`hidden h-4 w-4 opacity-70 transition-transform sm:block ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div
          role="menu"
          aria-label={name}
          tabIndex={-1}
          onKeyDown={onMenuKeyDown}
          class="absolute right-0 z-50 mt-2 w-60 rounded-card border border-line bg-surface-raised py-2 shadow-card-hover"
        >
          <div class="border-b border-line-subtle px-4 py-3">
            <p class="truncate text-sm font-medium text-content">{name}</p>
            <p class="truncate text-xs text-content-muted">{user.email}</p>
          </div>
          {items.map((item) => (
            <a
              key={item.href}
              href={item.href}
              role="menuitem"
              tabIndex={-1}
              class={`${row} text-content-secondary hover:bg-surface-subtle focus-visible:bg-surface-subtle`}
            >
              {item.icon && <Icon name={item.icon} icons={icons} class="h-5 w-5 text-content-muted" />}
              {item.label}
            </a>
          ))}
          <div class="my-1 border-t border-line-subtle" />
          <form method="post" action={signOutAction}>
            <button
              type="submit"
              role="menuitem"
              tabIndex={-1}
              class={`${row} cursor-pointer text-status-error-content hover:bg-status-error-bg focus-visible:bg-status-error-bg`}
            >
              <Icon name="logout" class="h-5 w-5" />
              {labels.signOut}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
