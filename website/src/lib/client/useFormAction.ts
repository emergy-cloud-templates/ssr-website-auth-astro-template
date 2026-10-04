import { useState } from "preact/hooks";

import { postForm } from "./api";

interface Options<T> {
  /** Called at the start of every submit, e.g. to clear a previous success message. */
  onStart?: () => void;
  /** Client-side check before sending; return a message to block the submit. */
  validate?: (form: FormData) => string | null;
  onSuccess: (data: T, form: HTMLFormElement) => void;
}

/** Submit handler + loading/error state shared by every form in the app. */
export function useFormAction<T = Record<string, unknown>>(url: string, { onStart, validate, onSuccess }: Options<T>) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: SubmitEvent) => {
    event.preventDefault();
    if (loading) return;
    const form = event.currentTarget as HTMLFormElement;
    const body = new FormData(form);
    onStart?.();

    const invalid = validate?.(body) ?? null;
    setError(invalid);
    if (invalid) return;

    setLoading(true);
    const result = await postForm<T>(url, body);
    setLoading(false);
    if (result.ok) onSuccess(result.data, form);
    else setError(result.error);
  };

  return { loading, error, setError, onSubmit };
}
