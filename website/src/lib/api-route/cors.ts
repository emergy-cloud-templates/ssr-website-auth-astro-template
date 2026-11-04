// Adapted from /common/legos/node/api-route@1.0.0 (dvk-common 33220c4). Owned by this project.
// Origin: app.storeai.dev - website/src/lib/api/cors.ts (headers, preflight) and app.upmatch.io -
// website/src/utils/cors.ts (the Chrome extension origin). Lego api-route; adapt per project, see README.md.
//
// CORS for the few routes another origin calls (a marketing site, a browser extension). Allowed origins are
// echoed back, never "*"; credentials stay off unless asked, so cross-origin calls authenticate with a token.

export interface CorsOptions {
  /** Exact origins, patterns, or a predicate. Read at request time, so it may read the environment. */
  origins: ReadonlyArray<string | RegExp> | ((origin: string) => boolean);
  methods?: readonly string[];
  headers?: readonly string[];
  /** Seconds a browser may cache the preflight (default 86400). */
  maxAge?: number;
  /** Send Access-Control-Allow-Credentials: true (cookies cross-origin). Off by default. */
  credentials?: boolean;
}

export interface Cors {
  /** The CORS headers for this request, or null when its origin is not allowed (or it has none). */
  headersFor(request: Request): Record<string, string> | null;
  /** An OPTIONS handler: 204 with the headers, or 403 for an origin that is not allowed. */
  preflight(request: Request): Response;
  /** The response with the CORS headers added when the origin is allowed. */
  apply(request: Request, response: Response): Response;
}

export function createCors(options: CorsOptions): Cors {
  const allowed = (origin: string) =>
    typeof options.origins === "function"
      ? options.origins(origin)
      : options.origins.some((o) => (typeof o === "string" ? o === origin : o.test(origin)));

  const headersFor = (request: Request): Record<string, string> | null => {
    const origin = request.headers.get("origin");
    if (!origin || !allowed(origin)) return null;
    const headers: Record<string, string> = {
      "access-control-allow-origin": origin,
      "access-control-allow-methods": (options.methods ?? ["GET", "POST", "OPTIONS"]).join(", "),
      "access-control-allow-headers": (options.headers ?? ["Content-Type", "Authorization"]).join(", "),
      "access-control-max-age": String(options.maxAge ?? 86400),
      vary: "Origin",
    };
    if (options.credentials) headers["access-control-allow-credentials"] = "true";
    return headers;
  };

  return {
    headersFor,
    preflight(request) {
      const headers = headersFor(request);
      return headers ? new Response(null, { status: 204, headers }) : new Response(null, { status: 403 });
    },
    apply(request, response) {
      const headers = headersFor(request);
      if (!headers) return response;
      try {
        for (const [k, v] of Object.entries(headers)) response.headers.set(k, v);
        return response;
      } catch {
        // Some responses (Response.redirect) have immutable headers: copy them.
        const copy = new Headers(response.headers);
        for (const [k, v] of Object.entries(headers)) copy.set(k, v);
        return new Response(response.body, { status: response.status, statusText: response.statusText, headers: copy });
      }
    },
  };
}

/** The local dev origins (http://localhost:<port>, 127.0.0.1), for an `origins` list in development only. */
export const LOCAL_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
/** Any Chrome extension (pin your own id in production: `chrome-extension://<id>`). */
export const CHROME_EXTENSION_ORIGIN = /^chrome-extension:\/\/[a-p]{32}$/;
