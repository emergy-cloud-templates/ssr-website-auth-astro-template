// Adapted from /common/legos/preact/ui-primitives@2.0.0 (dvk-common c651346). Owned by this project.
// Origin: app.upmatch.io - website/src/components/ui/Input.tsx. Lego ui-primitives; adapt per project, see README.md.
import type { ComponentChildren, JSX } from "preact";
import { useFieldId } from "./fieldId";

type FieldSize = "sm" | "md" | "lg";

const sizeStyles: Record<FieldSize, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
  lg: "px-4 py-3 text-base",
};

const fieldBase =
  "block w-full rounded-[var(--radius-input)] border border-line bg-surface-raised text-content shadow-sm transition-colors placeholder:text-content-light focus:outline-none focus:border-primary focus:ring-2 focus:ring-focus/20 disabled:bg-surface-sunken disabled:cursor-not-allowed";

function FieldLabel({ id, label }: { id: string; label: string }) {
  return (
    <label htmlFor={id} className="mb-1 block text-sm font-medium text-content-secondary">
      {label}
    </label>
  );
}

function FieldHelp({ id, error, hint }: { id: string; error?: string; hint?: string }) {
  if (error) {
    return (
      <p id={`${id}-error`} role="alert" className="mt-1 text-sm text-status-error-content">
        {error}
      </p>
    );
  }
  if (hint) {
    return <p className="mt-1 text-xs text-content-muted">{hint}</p>;
  }
  return null;
}

interface InputProps extends Omit<JSX.IntrinsicElements["input"], "size"> {
  label?: string;
  error?: string;
  hint?: string;
  id?: string;
  size?: FieldSize;
}

export function Input({ label, error, hint, id: idProp, size = "md", className = "", ...props }: InputProps) {
  const generatedId = useFieldId();
  const id = idProp ?? generatedId;
  return (
    <div className="w-full">
      {label && <FieldLabel id={id} label={label} />}
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`${fieldBase} ${error ? "border-status-error focus:border-status-error focus:ring-status-error/20" : ""} ${sizeStyles[size]} ${className}`}
        {...props}
      />
      <FieldHelp id={id} error={error} hint={hint} />
    </div>
  );
}

const CHEVRON =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236B7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3E%3C/svg%3E\")";

interface SelectProps extends Omit<JSX.IntrinsicElements["select"], "size"> {
  label?: string;
  error?: string;
  hint?: string;
  id?: string;
  size?: FieldSize;
  /** Convenience option list. Omit and pass `<option>` children for groups / custom markup. */
  options?: { value: string; label: string }[];
  children?: ComponentChildren;
}

export function Select({
  label,
  error,
  hint,
  id: idProp,
  options,
  children,
  size = "md",
  className = "",
  ...props
}: SelectProps) {
  const generatedId = useFieldId();
  const id = idProp ?? generatedId;
  return (
    <div className="w-full">
      {label && <FieldLabel id={id} label={label} />}
      <select
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        style={{
          appearance: "none",
          backgroundImage: CHEVRON,
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 0.75rem center",
          backgroundSize: "1.25rem",
        }}
        className={`${fieldBase} pr-10 ${error ? "border-status-error" : ""} ${sizeStyles[size]} ${className}`}
        {...props}
      >
        {options
          ? options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))
          : children}
      </select>
      <FieldHelp id={id} error={error} hint={hint} />
    </div>
  );
}

type TextareaProps = JSX.IntrinsicElements["textarea"] & {
  label?: string;
  error?: string;
  hint?: string;
  id?: string;
};

export function Textarea({ label, error, hint, id: idProp, className = "", ...props }: TextareaProps) {
  const generatedId = useFieldId();
  const id = idProp ?? generatedId;
  return (
    <div className="w-full">
      {label && <FieldLabel id={id} label={label} />}
      <textarea
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`${fieldBase} px-4 py-2 text-sm ${error ? "border-status-error focus:border-status-error focus:ring-status-error/20" : ""} ${className}`}
        {...props}
      />
      <FieldHelp id={id} error={error} hint={hint} />
    </div>
  );
}
