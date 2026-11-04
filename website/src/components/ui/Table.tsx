// Adapted from /common/legos/preact/ui-primitives@2.0.0 (dvk-common c651346). Owned by this project.
// Origin: app.upmatch.io - website/src/components/ui/Table.tsx, scroller fix from www.boulot.ai. Lego ui-primitives;
// adapt per project, see README.md.
import { createContext } from "preact";
import { useContext, useEffect, useRef, useState } from "preact/hooks";
import type { ComponentChildren, JSX } from "preact";

const DensityContext = createContext(false);

interface TableProps {
  children: ComponentChildren;
  className?: string;
  /** Denser padding for data-heavy admin lists (replaces `.table-compact`). */
  compact?: boolean;
  /**
   * Names the table for keyboard users. When set and the table is wider than
   * its container (a phone), the scrolling wrapper becomes a focusable, named
   * region so the arrow keys can scroll it; a table with no link or button
   * inside is otherwise out of reach (Axe: scrollable-region-focusable).
   */
  label?: string;
}

export function Table({ children, className = "", compact = false, label }: TableProps) {
  const wrapper = useRef<HTMLDivElement>(null);
  const [scrolls, setScrolls] = useState(false);

  useEffect(() => {
    const node = wrapper.current;
    if (!label || !node || typeof ResizeObserver === "undefined") return;
    const check = () => setScrolls(node.scrollWidth > node.clientWidth + 1);
    check();
    const observer = new ResizeObserver(check);
    observer.observe(node);
    // The table can widen (new rows, longer values) without its wrapper resizing.
    if (node.firstElementChild) observer.observe(node.firstElementChild);
    return () => observer.disconnect();
  }, [label]);

  const focusable = Boolean(label) && scrolls;
  return (
    <DensityContext.Provider value={compact}>
      <div
        ref={wrapper}
        className={`overflow-x-auto ${focusable ? "focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus" : ""} ${className}`}
        role={focusable ? "region" : undefined}
        aria-label={focusable ? label : undefined}
        tabIndex={focusable ? 0 : undefined}
      >
        <table className="min-w-full border-collapse">{children}</table>
      </div>
    </DensityContext.Provider>
  );
}

export function TableHead({ children, className = "", ...rest }: JSX.IntrinsicElements["thead"]) {
  return (
    <thead className={`bg-surface-subtle ${className ?? ""}`} {...rest}>
      {children}
    </thead>
  );
}

export function TableBody({ children, ...rest }: JSX.IntrinsicElements["tbody"]) {
  return <tbody {...rest}>{children}</tbody>;
}

type TableRowProps = Omit<JSX.IntrinsicElements["tr"], "onClick"> & {
  onClick?: (e: MouseEvent | KeyboardEvent) => void;
};

/** A click or key press that belongs to a control inside the row, not to the row itself. */
const INTERACTIVE = "a, button, input, select, textarea, label, [role=button], [role=checkbox], [role=menuitem]";
const fromInnerControl = (e: Event) =>
  e.target !== e.currentTarget && Boolean((e.target as HTMLElement | null)?.closest?.(INTERACTIVE));

export function TableRow({ children, onClick, className = "", ...rest }: TableRowProps) {
  if (!onClick) {
    return (
      <tr className={`border-b border-line-subtle last:border-0 ${className}`} {...rest}>
        {children}
      </tr>
    );
  }
  const handleClick = (e: MouseEvent) => {
    if (fromInnerControl(e)) return;
    onClick(e);
  };
  // Only the focused row reacts: Enter or Space on a button inside the row stays that button's.
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.target !== e.currentTarget) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick(e);
    }
  };
  return (
    <tr
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      className={`cursor-pointer border-b border-line-subtle transition-colors last:border-0 hover:bg-surface-subtle focus-visible:bg-surface-subtle focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus ${className}`}
      {...rest}
    >
      {children}
    </tr>
  );
}

export function TableHeader({ children, className = "", ...rest }: JSX.IntrinsicElements["th"]) {
  const compact = useContext(DensityContext);
  const pad = compact ? "px-3.5 py-2.5" : "px-4 py-3";
  return (
    <th
      scope="col"
      className={`${pad} border-b border-line-subtle text-left text-[0.6875rem] font-semibold uppercase tracking-wider text-content-muted ${className}`}
      {...rest}
    >
      {children}
    </th>
  );
}

export function TableCell({ children, className = "", ...rest }: JSX.IntrinsicElements["td"]) {
  const compact = useContext(DensityContext);
  const pad = compact ? "px-3.5 py-2.5" : "px-4 py-4";
  return (
    <td className={`${pad} text-sm text-content ${className}`} {...rest}>
      {children}
    </td>
  );
}
