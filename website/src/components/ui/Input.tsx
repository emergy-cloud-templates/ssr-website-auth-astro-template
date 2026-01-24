import type { JSX } from 'preact';

interface InputProps extends JSX.HTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export function Input({ label, error, id, ...props }: InputProps) {
  return (
    <div>
      <label htmlFor={id} class="block text-sm font-medium leading-6 text-gray-900">
        {label}
      </label>
      <div class="mt-2">
        <input
          id={id}
          {...props}
          class={`block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ${
            error ? 'ring-red-300' : 'ring-gray-300'
          } placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6`}
        />
      </div>
      {error && <p class="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
