// Adapted from /common/legos/preact/ui-primitives@2.0.0 (dvk-common c651346). Owned by this project.
// Origin: app.upmatch.io - website/src/components/ui/IconButton.tsx. Lego ui-primitives; adapt per project, see README.md.
import { forwardRef } from "preact/compat";
import type { ComponentChildren, JSX } from "preact";

type IconButtonVariant = "ghost" | "subtle" | "danger" | "inverse";
type IconButtonSize = "sm" | "md" | "lg";

interface IconButtonProps extends Omit<JSX.IntrinsicElements["button"], "size" | "loading"> {
  children: ComponentChildren;
  /** Accessible label - required, since the button has no visible text. */
  label: string;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  type?: "button" | "submit";
  disabled?: boolean;
}

const variantStyles: Record<IconButtonVariant, string> = {
  ghost: "text-content-muted hover:text-content hover:bg-content/5 focus-visible:ring-focus",
  subtle: "text-content-light hover:text-content-secondary hover:bg-content/5 focus-visible:ring-focus",
  danger: "text-status-error hover:bg-status-error-bg focus-visible:ring-status-error",
  // On the brand gradient (header, sidebar); a toggle with aria-pressed turns on-primary (white) when on.
  inverse:
    "border border-on-primary/30 bg-on-primary/10 text-on-primary hover:bg-on-primary/20 focus-visible:ring-on-primary/70 aria-pressed:border-on-primary aria-pressed:bg-on-primary aria-pressed:text-primary aria-pressed:hover:bg-on-primary/90",
};

const sizeStyles: Record<IconButtonSize, string> = {
  sm: "h-7 w-7 text-base",
  md: "h-9 w-9 text-lg",
  lg: "h-10 w-10 text-xl",
};

/** Icon-only button (close, menu, kebab, …). One style for every iconographic control.
 *  Forwards `ref` to the underlying <button> (e.g. modal close-button focus). */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { children, label, variant = "ghost", size = "md", type = "button", class: className = "", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      class={`cursor-pointer inline-flex items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
});
