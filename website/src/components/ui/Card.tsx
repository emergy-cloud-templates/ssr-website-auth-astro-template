// Adapted from /common/legos/preact/ui-primitives@2.0.0 (dvk-common c651346). Owned by this project.
// Origin: app.upmatch.io - website/src/components/ui/Card.tsx. Lego ui-primitives; adapt per project, see README.md.
import type { ComponentChildren } from "preact";

interface CardProps {
  children: ComponentChildren;
  className?: string;
  title?: string;
  subtitle?: string;
  /** Optional content rendered on the right of the header (buttons, menu, …). */
  actions?: ComponentChildren;
  /** Body padding. Use "none" for flush content like full-bleed tables. */
  padding?: "none" | "md";
}

export function Card({ children, className = "", title, subtitle, actions, padding = "md" }: CardProps) {
  const hasHeader = Boolean(title || subtitle || actions);
  return (
    <div
      className={`bg-surface-raised rounded-[var(--radius-card)] shadow-card border border-line-subtle ${className}`}
    >
      {hasHeader && (
        <div className="flex items-start justify-between gap-3 px-6 py-4 border-b border-line-subtle">
          <div>
            {title && <h3 className="text-lg font-semibold text-content">{title}</h3>}
            {subtitle && <p className="mt-1 text-sm text-content-muted">{subtitle}</p>}
          </div>
          {actions && <div className="flex flex-none items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={padding === "none" ? "" : "p-6"}>{children}</div>
    </div>
  );
}
