import { useEffect, useRef, useState } from "preact/hooks";

import { IconChevronDown, IconHome, IconLogout, IconUser } from "../icons";

interface ProfileDropdownProps {
  email: string;
  name: string;
}

export function initials(name: string, email: string): string {
  const fromName = name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("");
  return (fromName || email).slice(0, 2).toUpperCase();
}

export function ProfileDropdown({ email, name }: ProfileDropdownProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const itemClass = "flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors";

  return (
    <div class="relative" ref={containerRef}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls="profile-menu"
        aria-label="Account menu"
        class="flex items-center gap-3 rounded-lg p-1.5 transition-colors hover:bg-gray-100"
      >
        <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-sm font-semibold text-white">
          {initials(name, email)}
        </span>
        <span class="hidden min-w-0 text-left sm:block">
          <span class="block max-w-[150px] truncate text-sm font-medium text-gray-900">{name || "User"}</span>
          <span class="block max-w-[150px] truncate text-xs text-gray-600">{email}</span>
        </span>
        <IconChevronDown
          class={`hidden h-4 w-4 text-gray-500 transition-transform duration-200 sm:block ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          id="profile-menu"
          class="absolute right-0 z-50 mt-2 w-56 rounded-lg bg-white py-1 shadow-lg ring-1 shadow-gray-900/5 ring-gray-950/10"
        >
          <div class="border-b border-gray-100 px-4 py-3 sm:hidden">
            <p class="truncate text-sm font-medium text-gray-900">{name || "User"}</p>
            <p class="truncate text-xs text-gray-600">{email}</p>
          </div>
          <a href="/account" class={`${itemClass} text-gray-700 hover:bg-gray-50`}>
            <IconUser class="h-5 w-5 text-gray-500" />
            Account settings
          </a>
          <a href="/dashboard" class={`${itemClass} text-gray-700 hover:bg-gray-50`}>
            <IconHome class="h-5 w-5 text-gray-500" />
            Dashboard
          </a>
          <div class="my-1 border-t border-gray-100" />
          <form action="/api/auth/signout" method="post">
            <button type="submit" class={`${itemClass} text-red-700 hover:bg-red-50`}>
              <IconLogout class="h-5 w-5 text-red-600" />
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
