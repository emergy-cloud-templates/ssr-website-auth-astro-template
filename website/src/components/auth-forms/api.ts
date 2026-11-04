// Adapted from /common/legos/preact/auth-forms@1.0.0 (dvk-common 8a62bd5). Owned by this project.
// Origin: ssr-website-auth-astro-template - website/src/lib/client/api.ts and useFormAction.ts (ff4d19d).
// Lego auth-forms: POST a form to an API route and keep the form's loading and error state.
import { useState } from "preact/hooks";

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string };

/**
 * POSTs a form to one of the app's API routes and normalizes the answer. Handles non-JSON replies (a proxy error
 * page, Astro's CSRF 403) and network failures, so forms only ever deal with a message.
 */
export async function postForm<T = Record<string, unknown>>(url: string, body: FormData): Promise<ApiResult<T>> {
  let response: Response;
  try {
    response = await fetch(url, { method: "POST", body, credentials: "same-origin" });
  } catch {
    return { ok: false, error: "Network error. Check your connection and try again." };
  }

  let data: unknown = null;
  if (response.headers.get("content-type")?.includes("application/json")) {
    data = await response.json().catch(() => null);
  }
  if (response.ok) return { ok: true, data: (data ?? {}) as T };

  const message =
    data && typeof data === "object" && "error" in data && typeof data.error === "string"
      ? data.error
      : "An unexpected error occurred. Please try again.";
  return { ok: false, error: message };
}

interface Options<T> {
  /** Called at the start of every submit, e.g. to clear a previous success message. */
  onStart?: () => void;
  /** Client-side check before sending; return a message to block the submit. */
  validate?: (form: FormData) => string | null;
  onSuccess: (data: T, form: HTMLFormElement) => void;
}

/** Submit handler + loading/error state shared by every form. */
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

/** The new-password check of the sign-up, update and change forms: same as confirmation, then the policy. */
export function checkNewPassword(
  form: FormData,
  field: string,
  mismatch: string,
  rules: (password: string) => string | null,
): string | null {
  const password = String(form.get(field) ?? "");
  if (password !== form.get("confirmPassword")) return mismatch;
  return rules(password);
}
