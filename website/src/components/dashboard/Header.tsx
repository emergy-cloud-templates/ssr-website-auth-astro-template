import { toggleSidebar, toggleMobileMenu } from '../../stores/sidebar';
import { ProfileDropdown } from './ProfileDropdown';
import { IconMenu, IconPanelLeftClose, IconPanelLeftOpen } from '../icons';

interface HeaderProps {
  email: string;
  name: string;
  title?: string;
  collapsed: boolean;
}

export function Header({ email, name, title, collapsed }: HeaderProps) {
  return (
    <header class="sticky top-0 z-30 bg-white border-b border-gray-200">
      <div class="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
        {/* Left side */}
        <div class="flex items-center gap-4">
          {/* Mobile menu button */}
          <button
            type="button"
            class="lg:hidden p-2 -ml-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 cursor-pointer"
            onClick={toggleMobileMenu}
          >
            <IconMenu class="h-6 w-6" />
          </button>

          {/* Desktop collapse button */}
          <button
            type="button"
            onClick={toggleSidebar}
            class="hidden lg:flex p-2 -ml-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 cursor-pointer"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <IconPanelLeftOpen class="h-5 w-5" />
            ) : (
              <IconPanelLeftClose class="h-5 w-5" />
            )}
          </button>

          {title && (
            <h1 class="text-lg font-semibold text-gray-900">{title}</h1>
          )}
        </div>

        {/* Right side - Profile dropdown */}
        <div class="flex items-center gap-4">
          <ProfileDropdown email={email} name={name} />
        </div>
      </div>
    </header>
  );
}
