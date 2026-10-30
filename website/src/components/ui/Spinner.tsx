// Adapted from /common/legos/preact/ui-primitives@2.0.0 (dvk-common c651346). Owned by this project.
// Origin: app.upmatch.io - website/src/components/ui/Spinner.tsx. Lego ui-primitives; adapt per project, see README.md.
type SpinnerSize = "sm" | "md" | "lg";

interface SpinnerProps {
  size?: SpinnerSize;
  /** Optional visible label; otherwise an sr-only "Loading…" is announced. */
  label?: string;
  class?: string;
}

const sizeStyles: Record<SpinnerSize, string> = {
  sm: "h-4 w-4 border-2",
  md: "h-6 w-6 border-2",
  lg: "h-8 w-8 border-[3px]",
};

/** Canonical loading spinner. Replaces the `.spinner` CSS class and `admin/LoadingSpinner`. */
export function Spinner({ size = "md", label, class: className = "" }: SpinnerProps) {
  return (
    <div role="status" class={`inline-flex items-center gap-2 ${className}`}>
      <span class={`inline-block animate-spin rounded-full border-line border-t-accent ${sizeStyles[size]}`} />
      {label ? <span class="text-sm text-content-muted">{label}</span> : <span class="sr-only">Loading…</span>}
    </div>
  );
}

interface LoadingBlockProps {
  label?: string;
  class?: string;
}

/** Centered spinner + label for empty/loading panels (drop-in for the old `LoadingSpinner`). */
export function LoadingBlock({ label = "Loading…", class: className = "" }: LoadingBlockProps) {
  return (
    <div class={`flex flex-col items-center justify-center gap-3 py-16 text-content-muted ${className}`}>
      <Spinner size="md" />
      <span class="text-sm">{label}</span>
    </div>
  );
}
