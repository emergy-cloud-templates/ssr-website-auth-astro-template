// Adapted from /common/legos/preact/ui-primitives@2.0.0 (dvk-common c651346). Owned by this project.
// Origin: app.upmatch.io - website/src/components/ui/StatusDot.tsx. Lego ui-primitives; adapt per project, see README.md.
type StatusDotVariant = "success" | "error" | "warning" | "info" | "neutral";

const variantStyles: Record<StatusDotVariant, string> = {
  success: "bg-status-success",
  error: "bg-status-error",
  warning: "bg-status-warning",
  info: "bg-status-info",
  neutral: "bg-content-light",
};

/** Small colored status indicator dot. Replaces the `.status-dot-*` classes. */
export function StatusDot({
  variant = "neutral",
  class: className = "",
}: {
  variant?: StatusDotVariant;
  class?: string;
}) {
  return <span class={`inline-block h-2.5 w-2.5 rounded-full ${variantStyles[variant]} ${className}`} />;
}
