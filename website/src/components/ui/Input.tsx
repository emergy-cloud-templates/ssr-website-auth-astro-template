import type { InputHTMLAttributes } from "preact";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  /** Helper text under the field, linked with aria-describedby. */
  hint?: string;
}

export function Input({ id, label, hint, class: className = "", ...props }: InputProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  return (
    <div>
      <label for={id} class="block text-sm leading-6 font-medium text-gray-900">
        {label}
      </label>
      <input
        id={id}
        aria-describedby={hintId}
        {...props}
        class={`mt-2 block w-full rounded-md border-0 px-3 py-1.5 text-gray-900 shadow-sm ring-1 ring-gray-300 ring-inset placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-600 focus:ring-inset disabled:bg-gray-50 disabled:text-gray-500 sm:text-sm sm:leading-6 ${className}`}
      />
      {hint && (
        <p id={hintId} class="mt-2 text-xs text-gray-600">
          {hint}
        </p>
      )}
    </div>
  );
}
