import { useState, useEffect, useRef } from 'preact/hooks';
import { IconUser, IconHome, IconLogout, IconChevronDown } from '../icons';

interface ProfileDropdownProps {
  email: string;
  name: string;
}

export function ProfileDropdown({ email, name }: ProfileDropdownProps) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const initials = name
    ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : email.slice(0, 2).toUpperCase();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  return (
    <div class="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        class="flex items-center gap-3 p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
      >
        <div class="w-9 h-9 bg-indigo-600 rounded-full flex items-center justify-center">
          <span class="text-white font-semibold text-sm">{initials}</span>
        </div>
        <div class="hidden sm:block text-left">
          <p class="text-sm font-medium text-gray-900 truncate max-w-[150px]">{name || 'User'}</p>
          <p class="text-xs text-gray-500 truncate max-w-[150px]">{email}</p>
        </div>
        <IconChevronDown class={`hidden sm:block h-4 w-4 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown menu */}
      {open && (
        <div class="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 py-1 z-50">
          {/* User info (mobile) */}
          <div class="sm:hidden px-4 py-3 border-b border-gray-100">
            <p class="text-sm font-medium text-gray-900 truncate">{name || 'User'}</p>
            <p class="text-xs text-gray-500 truncate">{email}</p>
          </div>

          <a
            href="/account"
            class="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
            onClick={() => setOpen(false)}
          >
            <IconUser class="h-5 w-5 text-gray-400" />
            Account Settings
          </a>

          <a
            href="/dashboard"
            class="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
            onClick={() => setOpen(false)}
          >
            <IconHome class="h-5 w-5 text-gray-400" />
            Dashboard
          </a>

          <div class="border-t border-gray-100 my-1"></div>

          <form action="/api/auth/signout" method="POST" class="w-full">
            <button
              type="submit"
              class="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
            >
              <IconLogout class="h-5 w-5 text-red-500" />
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
