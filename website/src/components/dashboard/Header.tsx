import { toggleMobileMenu, toggleSidebar } from "../../stores/sidebar";
import { IconMenu, IconPanelLeftClose, IconPanelLeftOpen } from "../icons";
import { ProfileDropdown } from "./ProfileDropdown";

interface HeaderProps {
  email: string;
  name: string;
  title?: string;
  collapsed: boolean;
}

export function Header({ email, name, title, collapsed }: HeaderProps) {
  return (
    <header class="sticky top-0 z-30 border-b border-gray-200 bg-white">
      <div class="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <div class="flex min-w-0 items-center gap-4">
          <button
            type="button"
            class="-ml-2 rounded-md p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900 lg:hidden"
            onClick={toggleMobileMenu}
            aria-label="Open navigation"
          >
            <IconMenu class="h-6 w-6" />
          </button>

          <button
            type="button"
            onClick={toggleSidebar}
            class="-ml-2 hidden rounded-md p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900 lg:flex"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <IconPanelLeftOpen class="h-5 w-5" /> : <IconPanelLeftClose class="h-5 w-5" />}
          </button>

          {title && <h1 class="truncate text-lg font-semibold text-gray-900">{title}</h1>}
        </div>

        <ProfileDropdown email={email} name={name} />
      </div>
    </header>
  );
}
