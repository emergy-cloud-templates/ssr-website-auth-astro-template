export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string };

/**
 * POSTs a form to one of the app's API routes and normalizes the answer.
 * Handles non-JSON replies (a proxy error page, Astro's CSRF 403) and
 * network failures, so forms only ever deal with a message.
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
