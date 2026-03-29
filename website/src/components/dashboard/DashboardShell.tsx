import { useLayoutEffect, useState } from 'preact/hooks';
import { useStore } from '@nanostores/preact';
import { $sidebarCollapsed, syncSidebarCollapsedFromStorage } from '../../stores/sidebar';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

interface DashboardShellProps {
  email: string;
  name: string;
  title?: string;
  currentPath: string;
  /** From SSR cookie so first paint matches saved preference (no expand→collapse flicker). */
  initialSidebarCollapsed?: boolean;
  children: preact.ComponentChildren;
}

type ShellPhase = 'ssr' | 'synced' | 'interactive';

export function DashboardShell({
  email,
  name,
  title,
  currentPath,
  initialSidebarCollapsed = false,
  children,
}: DashboardShellProps) {
  const storeCollapsed = useStore($sidebarCollapsed);
  const [phase, setPhase] = useState<ShellPhase>('ssr');

  const collapsed = phase === 'ssr' ? initialSidebarCollapsed : storeCollapsed;
  const sidebarTransitionEnabled = phase === 'interactive';

  useLayoutEffect(() => {
    syncSidebarCollapsedFromStorage();
    setPhase('synced');
  }, []);

  useLayoutEffect(() => {
    if (phase !== 'synced') return;
    const id = requestAnimationFrame(() => {
      setPhase('interactive');
    });
    return () => cancelAnimationFrame(id);
  }, [phase]);

  return (
    <div class="min-h-screen bg-gray-50">
      <Sidebar
        currentPath={currentPath}
        collapsed={collapsed}
        sidebarTransitionEnabled={sidebarTransitionEnabled}
      />

      <div
        class={`${sidebarTransitionEnabled ? 'lg:transition-[padding-left] lg:duration-300 lg:ease-in-out' : ''} ${collapsed ? 'lg:pl-20' : 'lg:pl-64'}`}
      >
        <Header email={email} name={name} title={title} collapsed={collapsed} />
        
        <main class="p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
