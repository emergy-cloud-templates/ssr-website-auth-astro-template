// Adapted from /common/legos/preact/ui-primitives@2.0.0 (dvk-common c651346). Owned by this project.
// Origin: app.upmatch.io - website/src/components/ui/Badge.tsx. Lego ui-primitives; adapt per project, see README.md.
import type { ComponentChildren, JSX } from "preact";

/** `primary` and `accent` follow the theme; `purple` and `pink` are their 1.x names, kept as aliases. */
export type BadgeVariant =
  "success" | "error" | "warning" | "info" | "neutral" | "primary" | "accent" | "pink" | "purple";

interface BadgeProps extends Omit<JSX.IntrinsicElements["span"], "class"> {
  variant?: BadgeVariant;
  children?: ComponentChildren;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  success: "bg-status-success-bg text-status-success-content",
  error: "bg-status-error-bg text-status-error-content",
  warning: "bg-status-warning-bg text-status-warning-content",
  info: "bg-status-info-bg text-status-info-content",
  neutral: "bg-surface-sunken text-content-secondary",
  primary: "bg-primary-soft text-primary-soft-content",
  accent: "bg-accent-soft text-accent-soft-content",
  pink: "bg-accent-soft text-accent-soft-content",
  purple: "bg-primary-soft text-primary-soft-content",
};

export function Badge({ variant = "neutral", children, className = "", ...rest }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.6875rem] font-semibold capitalize tracking-wide ${variantStyles[variant]} ${className}`}
      {...rest}
    >
      {children}
    </span>
  );
}
