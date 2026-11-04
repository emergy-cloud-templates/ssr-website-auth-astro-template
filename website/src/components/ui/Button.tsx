// Adapted from /common/legos/preact/ui-primitives@2.0.0 (dvk-common c651346). Owned by this project.
// Origin: app.upmatch.io - website/src/components/ui/Button.tsx. Lego ui-primitives; adapt per project, see README.md.
import { forwardRef } from "preact/compat";
import type { ComponentChildren, JSX, Ref } from "preact";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "success" | "gradient";
type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends Omit<JSX.IntrinsicElements["button"], "loading" | "size" | "class" | "type"> {
  children: ComponentChildren;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  disabled?: boolean;
  /** When set, renders a button-styled `<a>` instead of a `<button>`. */
  href?: string;
  /** Anchor attributes, applied when `href` is set. */
  target?: string;
  rel?: string;
  download?: boolean | string;
  type?: "button" | "submit" | "reset";
  class?: string;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: "bg-primary text-on-primary hover:bg-primary-hover focus-visible:ring-focus",
  secondary:
    "bg-surface-raised border border-line text-content-secondary hover:border-line-strong hover:text-content focus-visible:ring-focus",
  outline: "bg-transparent border border-accent text-accent hover:bg-accent-soft focus-visible:ring-accent",
  ghost: "bg-transparent text-content-muted hover:text-content focus-visible:ring-focus",
  danger: "bg-status-error text-on-status hover:opacity-90 focus-visible:ring-status-error",
  success: "bg-status-success text-on-status hover:opacity-90 focus-visible:ring-status-success",
  gradient: "bg-gradient-brand text-on-primary hover:opacity-90 hover:-translate-y-px focus-visible:ring-focus",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-3.5 py-2 text-sm",
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-2.5 text-sm",
};

const baseClass =
  "cursor-pointer inline-flex items-center justify-center gap-1.5 whitespace-nowrap font-medium rounded-lg transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2";

function LoadingGlyph() {
  return (
    <svg aria-hidden="true" class="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

/**
 * The one button. Variants cover every styled call-to-action in the app.
 * Pass `href` to render a button-styled link instead of a `<button>`.
 * Accepts every native `<button>` attribute (onClick, disabled, type, aria-*, …).
 * Forwards `ref` to the underlying `<button>`/`<a>`.
 */
export const Button = forwardRef<HTMLButtonElement | HTMLAnchorElement, ButtonProps>(function Button(
  {
    children,
    variant = "primary",
    size = "md",
    loading = false,
    fullWidth = false,
    href,
    type = "button",
    disabled,
    class: className = "",
    ...rest
  },
  ref,
) {
  const classes = `${baseClass} ${variantStyles[variant]} ${sizeStyles[size]} ${fullWidth ? "w-full" : ""} ${className}`;

  if (href !== undefined) {
    return (
      <a
        ref={ref as Ref<HTMLAnchorElement>}
        href={href}
        class={classes}
        aria-disabled={disabled || undefined}
        {...(rest as JSX.IntrinsicElements["a"])}
      >
        {loading && <LoadingGlyph />}
        {children}
      </a>
    );
  }

  return (
    <button ref={ref as Ref<HTMLButtonElement>} type={type} disabled={disabled || loading} class={classes} {...rest}>
      {loading && <LoadingGlyph />}
      {children}
    </button>
  );
});
