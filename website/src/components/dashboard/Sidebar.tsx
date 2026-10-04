import { useStore } from "@nanostores/preact";

import { siteConfig } from "../../config/site";
import { matchesRoute } from "../../lib/routes";
import { $mobileMenuOpen, closeMobileMenu } from "../../stores/sidebar";
import { IconHome, IconSettings, IconX } from "../icons";

interface SidebarProps {
  currentPath: string;
  collapsed: boolean;
  /** Off until hydration settles, so the stored state is applied without an animation. */
  sidebarTransitionEnabled: boolean;
}

/** Sidebar navigation. Add your app's sections here (and to PROTECTED_ROUTES). */
const NAV_ITEMS = [
  { name: "Dashboard", href: "/dashboard", Icon: IconHome },
  { name: "Settings", href: "/account", Icon: IconSettings },
];

export function Sidebar({ currentPath, collapsed, sidebarTransitionEnabled }: SidebarProps) {
  const mobileOpen = useStore($mobileMenuOpen);

  return (
    <>
      {mobileOpen && (
        <div
          class="fixed inset-0 z-40 bg-gray-900/50 backdrop-blur-sm lg:hidden"
          onClick={closeMobileMenu}
          aria-hidden="true"
        />
      )}

      <aside
        class={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-gray-200 bg-white ease-in-out lg:translate-x-0 ${
          sidebarTransitionEnabled
            ? "duration-300 max-lg:transition-transform lg:transition-[width]"
            : "transition-none"
        } ${mobileOpen ? "max-lg:translate-x-0" : "max-lg:-translate-x-full"} ${collapsed ? "lg:w-20" : "lg:w-64"}`}
      >
        <div class="flex h-16 items-center border-b border-gray-200 px-4">
          <a href="/dashboard" class="flex items-center gap-2">
            <span
              class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white"
              aria-hidden="true"
            >
              {siteConfig.name.charAt(0)}
            </span>
            <span class={`text-xl font-bold text-gray-900 ${collapsed ? "lg:sr-only" : ""}`}>{siteConfig.name}</span>
          </a>
          <button
            type="button"
            class="ml-auto rounded-md p-1 text-gray-500 hover:text-gray-700 lg:hidden"
            onClick={closeMobileMenu}
            aria-label="Close navigation"
          >
            <IconX class="h-6 w-6" />
          </button>
        </div>

        <nav class="flex-1 space-y-1 overflow-y-auto px-3 py-4" aria-label="Main">
          {NAV_ITEMS.map(({ name, href, Icon }) => {
            const active = matchesRoute(currentPath, href);
            return (
              <a
                key={href}
                href={href}
                onClick={closeMobileMenu}
                aria-current={active ? "page" : undefined}
                title={collapsed ? name : undefined}
                class={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  active ? "bg-indigo-50 text-indigo-700" : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                } ${collapsed ? "lg:justify-center" : ""}`}
              >
                <Icon class={`h-5 w-5 shrink-0 ${active ? "text-indigo-600" : "text-gray-500"}`} />
                <span class={collapsed ? "lg:sr-only" : ""}>{name}</span>
              </a>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
