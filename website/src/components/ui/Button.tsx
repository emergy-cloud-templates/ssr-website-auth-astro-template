import type { ButtonHTMLAttributes } from "preact";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger";
  loading?: boolean;
  /** Stretch to the container width (default for auth forms). */
  block?: boolean;
}

const VARIANTS: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary: "bg-indigo-600 text-white hover:bg-indigo-500 focus-visible:outline-indigo-600",
  secondary: "bg-white text-gray-900 ring-1 ring-gray-300 ring-inset hover:bg-gray-50 focus-visible:outline-gray-600",
  danger: "bg-red-600 text-white hover:bg-red-500 focus-visible:outline-red-600",
};

export function Button({
  variant = "primary",
  loading = false,
  block = true,
  disabled,
  children,
  class: className = "",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      type={type}
      disabled={loading || Boolean(disabled)}
      aria-busy={loading || undefined}
      class={`inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm leading-6 font-semibold shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${block ? "w-full" : ""} ${VARIANTS[variant]} ${className}`}
    >
      {loading && (
        <svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24" aria-hidden="true">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  );
}
