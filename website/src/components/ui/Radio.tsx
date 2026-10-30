// Adapted from /common/legos/preact/ui-primitives@2.0.0 (dvk-common c651346). Owned by this project.
// Origin: app.upmatch.io - website/src/components/ui/Radio.tsx. Lego ui-primitives; adapt per project, see README.md.
import { useFieldId } from "./fieldId";

interface RadioOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

interface RadioGroupProps {
  name?: string;
  value: string;
  options: RadioOption[];
  onChange: (value: string) => void;
  legend?: string;
  class?: string;
}

/** Styled single-choice radio group. Replaces raw `<input type="radio">` clusters. */
export function RadioGroup({
  name: nameProp,
  value,
  options,
  onChange,
  legend,
  class: className = "",
}: RadioGroupProps) {
  const generatedName = useFieldId();
  const name = nameProp ?? generatedName;
  return (
    <fieldset class={`flex flex-col gap-2 ${className}`}>
      {legend && <legend class="mb-1 text-sm font-medium text-content">{legend}</legend>}
      {options.map((opt) => {
        const id = `${name}-${opt.value}`;
        return (
          <label
            key={opt.value}
            htmlFor={id}
            class={`flex items-start gap-2.5 ${opt.disabled ? "opacity-50" : "cursor-pointer"}`}
          >
            <input
              id={id}
              type="radio"
              name={name}
              value={opt.value}
              checked={value === opt.value}
              disabled={opt.disabled}
              onChange={() => onChange(opt.value)}
              class="mt-0.5 h-4 w-4 border-line-strong accent-primary cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-1"
            />
            <span class="select-none">
              <span class="text-sm font-medium text-content">{opt.label}</span>
              {opt.description && <span class="block text-xs text-content-muted">{opt.description}</span>}
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}
