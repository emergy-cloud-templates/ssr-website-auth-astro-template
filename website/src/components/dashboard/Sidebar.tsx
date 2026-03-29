import { useStore } from '@nanostores/preact';
import { $mobileMenuOpen, closeMobileMenu } from '../../stores/sidebar';
import { IconHome, IconSettings, IconX } from '../icons';

interface SidebarProps {
  currentPath: string;
  collapsed: boolean;
  /** After false → true, width/transform transitions run (avoids animating SSR → stored state). */
  sidebarTransitionEnabled: boolean;
}

interface NavItem {
  name: string;
  href: string;
  icon: 'home' | 'settings';
}

const navItems: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: 'home' },
  { name: 'Settings', href: '/account', icon: 'settings' },
];

const icons = {
  home: IconHome,
  settings: IconSettings,
};

export function Sidebar({ currentPath, collapsed, sidebarTransitionEnabled }: SidebarProps) {
  const mobileOpen = useStore($mobileMenuOpen);

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return currentPath === '/dashboard' || currentPath === '/dashboard/';
    }
    return currentPath.startsWith(href);
  };

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          class="lg:hidden fixed inset-0 z-40 bg-gray-900/50 backdrop-blur-sm cursor-pointer"
          onClick={closeMobileMenu}
        />
      )}

      {/* Sidebar */}
      <aside
        class={`fixed inset-y-0 left-0 z-50 flex flex-col bg-white border-r border-gray-200 ease-in-out
          ${sidebarTransitionEnabled
            ? 'duration-300 max-lg:transition-transform lg:transition-[width] lg:duration-300'
            : 'max-lg:transition-none lg:transition-none'}
          ${mobileOpen ? 'max-lg:translate-x-0' : 'max-lg:-translate-x-full'}
          lg:translate-x-0
          ${collapsed ? 'lg:w-20' : 'lg:w-64'}
          w-64
        `}
      >
        {/* Logo */}
        <div class="flex items-center h-16 px-4 border-b border-gray-200">
          <a href="/dashboard" class="flex items-center gap-2 cursor-pointer">
            <div class="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <span class="text-white font-bold text-sm">U</span>
            </div>
            {!collapsed && <span class="text-xl font-bold text-gray-900">Template</span>}
          </a>
          
          {/* Mobile close button */}
          <button
            type="button"
            class="lg:hidden ml-auto p-1 rounded-md text-gray-400 hover:text-gray-600 cursor-pointer"
            onClick={closeMobileMenu}
          >
            <IconX class="h-6 w-6" />
          </button>
        </div>

        {/* Navigation */}
        <nav class="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const active = isActive(item.href);
            const IconComponent = icons[item.icon];
            return (
              <a
                key={item.href}
                href={item.href}
                onClick={closeMobileMenu}
                class={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer
                  ${active
                    ? 'bg-indigo-50 text-indigo-600'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  }
                  ${collapsed ? 'justify-center' : ''}
                `}
                title={collapsed ? item.name : undefined}
              >
                <IconComponent class={`h-5 w-5 flex-shrink-0 ${active ? 'text-indigo-600' : 'text-gray-400'}`} />
                {!collapsed && <span>{item.name}</span>}
              </a>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
