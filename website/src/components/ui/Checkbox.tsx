// Adapted from /common/legos/preact/ui-primitives@2.0.0 (dvk-common c651346). Owned by this project.
// Origin: app.upmatch.io - website/src/components/ui/Checkbox.tsx. Lego ui-primitives; adapt per project, see README.md.
import type { JSX } from "preact";
import { useFieldId } from "./fieldId";

interface CheckboxProps extends Omit<JSX.IntrinsicElements["input"], "size" | "label" | "type"> {
  label?: string;
  description?: string;
  id?: string;
  /** Control tap-target / label sizing. Defaults to "md". */
  size?: "md" | "lg";
}

/** Styled checkbox with an optional label/description. Replaces raw `<input type="checkbox">`. */
export function Checkbox({
  label,
  description,
  id: idProp,
  class: className = "",
  size = "md",
  ...props
}: CheckboxProps) {
  const generatedId = useFieldId();
  const id = idProp ?? generatedId;
  const lg = size === "lg";
  return (
    <div class={`flex items-start ${lg ? "gap-3" : "gap-2.5"}`}>
      <input
        id={id}
        type="checkbox"
        class={`mt-0.5 shrink-0 rounded border-line-strong accent-primary cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed ${lg ? "h-5 w-5" : "h-4 w-4"} ${className}`}
        {...props}
      />
      {(label || description) && (
        <label htmlFor={id} class="select-none cursor-pointer">
          {label && <span class={`font-medium text-content ${lg ? "text-[15px]" : "text-sm"}`}>{label}</span>}
          {description && <span class="block text-xs text-content-muted">{description}</span>}
        </label>
      )}
    </div>
  );
}
