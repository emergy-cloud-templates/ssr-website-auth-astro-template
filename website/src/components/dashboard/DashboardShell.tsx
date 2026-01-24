import { useStore } from '@nanostores/preact';
import { $sidebarCollapsed } from '../../stores/sidebar';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

interface DashboardShellProps {
  email: string;
  name: string;
  title?: string;
  currentPath: string;
  children: preact.ComponentChildren;
}

export function DashboardShell({ email, name, title, currentPath, children }: DashboardShellProps) {
  const collapsed = useStore($sidebarCollapsed);

  return (
    <div class="min-h-screen bg-gray-50">
      <Sidebar currentPath={currentPath} />
      
      <div class={`transition-all duration-300 ${collapsed ? 'lg:pl-20' : 'lg:pl-64'}`}>
        <Header email={email} name={name} title={title} />
        
        <main class="p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
