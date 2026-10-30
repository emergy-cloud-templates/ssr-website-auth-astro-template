// Adapted from /common/legos/node/api-route@1.0.0 (dvk-common 33220c4). Owned by this project.
// Origin: app.upmatch.io - website/src/utils/apiAuth.ts (responses) and ssr-website-auth-astro-template -
// website/src/lib/http.ts (form helpers). Lego api-route; adapt per project, see README.md.

const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
};

/** A JSON response. API answers are never cached by a CDN or a shared cache. */
export function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...JSON_HEADERS, ...headers } });
}

/** The one error shape every route answers: `{ "error": "message" }`, plus optional fields. */
export function jsonError(message: string, status: number, extra: Record<string, unknown> = {}): Response {
  return json({ ...extra, error: message }, status);
}

/**
 * An expected failure a handler throws: the route wrapper answers it as `jsonError(message, status)`.
 * `expose` (default: status below 500) says whether the message is safe to show; a hidden one becomes the
 * route's generic message and is logged instead.
 */
export class HttpError extends Error {
  override name = "HttpError";
  readonly status: number;
  readonly expose: boolean;
  readonly code: string | undefined;
  readonly details: Record<string, unknown> | undefined;

  constructor(
    status: number,
    message: string,
    options: { expose?: boolean; code?: string; details?: Record<string, unknown> } = {},
  ) {
    super(message);
    this.status = status;
    this.expose = options.expose ?? status < 500;
    this.code = options.code;
    this.details = options.details;
  }
}

export const badRequest = (message = "Invalid request.", details?: Record<string, unknown>) =>
  new HttpError(400, message, { details });
export const unauthorized = (message = "Authentication required.") => new HttpError(401, message);
export const forbidden = (message = "You do not have access to this.") => new HttpError(403, message);
export const notFound = (message = "Not found.") => new HttpError(404, message);
export const conflict = (message: string) => new HttpError(409, message);
export const tooManyRequests = (message = "Too many attempts. Please wait a moment and try again.") =>
  new HttpError(429, message);

/** The response for an HttpError: its message and status, its code and details when set. */
export function httpErrorResponse(error: HttpError, fallbackMessage: string): Response {
  const extra: Record<string, unknown> = { ...error.details };
  if (error.code) extra.code = error.code;
  return jsonError(error.expose ? error.message : fallbackMessage, error.status, extra);
}

/** A form body (multipart or urlencoded), or null when the body is missing or not a form. */
export async function readForm(request: Request): Promise<FormData | null> {
  try {
    return await request.formData();
  } catch {
    return null;
  }
}

/** A text field of a form: "" when absent or a file. */
export function field(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
}

/** A JSON body; throws a 400 HttpError when it is missing or not JSON. */
export async function readJson(request: Request): Promise<unknown> {
  const text = await request.text().catch(() => "");
  if (!text.trim()) throw badRequest("A JSON body is required.");
  try {
    return JSON.parse(text);
  } catch {
    throw badRequest("The body is not valid JSON.");
  }
}

/**
 * The body as a plain object, whatever the client sent: JSON, or a form (each field once; a repeated field
 * becomes an array). Throws a 400 HttpError for anything else.
 */
export async function readBody(request: Request): Promise<unknown> {
  const type = request.headers.get("content-type") ?? "";
  if (type.includes("application/json")) return readJson(request);
  if (type.includes("multipart/form-data") || type.includes("application/x-www-form-urlencoded")) {
    const form = await readForm(request);
    if (!form) throw badRequest("The form body could not be read.");
    const out: Record<string, unknown> = {};
    for (const key of new Set(form.keys())) {
      const values = form.getAll(key).filter((v): v is string => typeof v === "string");
      out[key] = values.length > 1 ? values : (values[0] ?? "");
    }
    return out;
  }
  throw badRequest("Send JSON or a form.");
}
