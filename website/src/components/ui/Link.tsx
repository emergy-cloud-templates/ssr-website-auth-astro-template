// Adapted from /common/legos/preact/ui-primitives@2.0.0 (dvk-common c651346). Owned by this project.
// Origin: app.upmatch.io - website/src/components/ui/Link.tsx. Lego ui-primitives; adapt per project, see README.md.
import type { ComponentChildren, JSX } from "preact";

type LinkVariant = "default" | "muted" | "subtle";

interface LinkProps extends Omit<JSX.IntrinsicElements["a"], "class" | "href"> {
  children: ComponentChildren;
  href: string;
  variant?: LinkVariant;
  class?: string;
}

const variantStyles: Record<LinkVariant, string> = {
  default: "text-link hover:text-link-hover hover:underline",
  muted: "text-content-secondary hover:text-content hover:underline",
  subtle: "text-content-muted hover:text-content-secondary",
};

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-1 rounded-sm";

/** Canonical text link. For a link styled as a button, use `<Button href=… />`. */
export function Link({ children, href, variant = "default", class: className = "", ...props }: LinkProps) {
  return (
    <a
      href={href}
      class={`inline-flex items-center gap-1 font-medium transition-colors ${focusRing} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </a>
  );
}

interface BackLinkProps extends Omit<JSX.IntrinsicElements["a"], "class" | "href"> {
  href: string;
  children?: ComponentChildren;
  class?: string;
}

/** A back-arrow navigation link (replaces ad-hoc `.back-link` styles). */
export function BackLink({ href, children = "Back", class: className = "", ...props }: BackLinkProps) {
  return (
    <a
      href={href}
      class={`inline-flex items-center gap-1.5 text-sm font-medium text-content-muted hover:text-content transition-colors ${focusRing} ${className}`}
      {...props}
    >
      <svg aria-hidden="true" class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
      </svg>
      {children}
    </a>
  );
}
