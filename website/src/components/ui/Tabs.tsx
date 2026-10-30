// Adapted from /common/legos/preact/ui-primitives@2.0.0 (dvk-common c651346). Owned by this project.
// Origin: app.upmatch.io - website/src/components/ui/Tabs.tsx. Lego ui-primitives; adapt per project, see README.md.
import type { ComponentChildren } from "preact";

interface TabItem {
  id: string;
  label: ComponentChildren;
  disabled?: boolean;
}

interface TabsProps {
  tabs: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  class?: string;
}

/**
 * Generic controlled tab bar for in-page section switching.
 * Note: route-driven admin navigation (e.g. the per-user tab bar) is navigation,
 * not this primitive - keep using links/stores for those.
 */
export function Tabs({ tabs, activeId, onChange, class: className = "" }: TabsProps) {
  return (
    <div role="tablist" class={`flex items-center gap-1 border-b border-line ${className}`}>
      {tabs.map((tab) => {
        const active = tab.id === activeId;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            disabled={tab.disabled}
            onClick={() => onChange(tab.id)}
            class={`relative -mb-px cursor-pointer rounded-t-md px-3.5 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed ${
              active
                ? "border-b-2 border-primary text-primary"
                : "border-b-2 border-transparent text-content-muted hover:text-content"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
