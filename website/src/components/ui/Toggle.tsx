// Adapted from /common/legos/preact/ui-primitives@2.0.0 (dvk-common c651346). Owned by this project.
// Origin: app.upmatch.io - website/src/components/ui/Toggle.tsx. Lego ui-primitives; adapt per project, see README.md.
import { useFieldId } from "./fieldId";

type ToggleSize = "sm" | "md";

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  size?: ToggleSize;
  /** Optional label shown to the right of the switch. */
  label?: string;
  /** Optional secondary description under the label. */
  description?: string;
  /** Accessible label, used when no visible `label` is provided. */
  "aria-label"?: string;
  id?: string;
  class?: string;
}

const trackSize: Record<ToggleSize, string> = {
  sm: "h-5 w-9",
  md: "h-6 w-11",
};
const knobSize: Record<ToggleSize, string> = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
};
const knobOn: Record<ToggleSize, string> = {
  sm: "translate-x-4",
  md: "translate-x-5",
};

/** The one switch. Replaces every hand-rolled toggle (`.toggle-btn`, `.auf-toggle`, ad-hoc `role="switch"`). */
export function Toggle({
  checked,
  onChange,
  disabled = false,
  size = "md",
  label,
  description,
  id,
  class: className = "",
  ...aria
}: ToggleProps) {
  // The visible label sits NEXT to the switch, not inside it: without these the
  // button has no accessible name at all ("switch, on") and no description.
  // Fix from www.boulot.ai (knowledge/gotchas/ui-primitives-a11y-defects.md).
  const uid = useFieldId();
  const controlId = id ?? `${uid}-switch`;
  const labelId = label ? `${uid}-label` : undefined;
  const descriptionId = description ? `${uid}-description` : undefined;
  const control = (
    <button
      type="button"
      role="switch"
      id={controlId}
      aria-checked={checked}
      aria-label={!label ? aria["aria-label"] : undefined}
      aria-labelledby={labelId}
      aria-describedby={descriptionId}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      class={`relative inline-flex flex-none items-center rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${trackSize[size]} ${checked ? "bg-status-success" : "bg-line-strong"} ${className}`}
    >
      <span
        class={`inline-block transform rounded-full bg-surface-raised shadow transition-transform duration-200 ${knobSize[size]} ${checked ? knobOn[size] : "translate-x-0.5"}`}
      />
    </button>
  );

  if (!label && !description) return control;

  return (
    <div class={`flex items-center gap-3 ${disabled ? "opacity-60" : ""}`}>
      {control}
      {/* A real <label> for the switch: clicking the text toggles it, no extra handler or tab stop. */}
      <label htmlFor={controlId} class={disabled ? "" : "cursor-pointer"}>
        {label && (
          <span id={labelId} class="block text-sm font-medium text-content">
            {label}
          </span>
        )}
        {description && (
          <span id={descriptionId} class="block text-xs text-content-muted">
            {description}
          </span>
        )}
      </label>
    </div>
  );
}
