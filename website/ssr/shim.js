// API Gateway (REST, Lambda proxy integration) <-> Node request/response shim
// for Astro's @astrojs/node adapter in "middleware" mode.
// Adapted from the canonical shim in /common/api/astro-ssr-lambda (origin:
// app.upmatch.io). Pure functions, unit-tested in tests/unit/shim.test.ts.
import { timingSafeEqual } from "node:crypto";
import { Readable } from "node:stream";

/**
 * @typedef {object} ApiGatewayEvent  API Gateway REST proxy event (the fields used here)
 * @property {string} httpMethod
 * @property {string} [path]
 * @property {Record<string, string | undefined> | null} [headers]
 * @property {Record<string, string[] | undefined> | null} [multiValueHeaders]
 * @property {Record<string, string | undefined> | null} [queryStringParameters]
 * @property {Record<string, string[] | undefined> | null} [multiValueQueryStringParameters]
 * @property {string | null} [body]
 * @property {boolean} [isBase64Encoded]
 * @property {{ identity?: { sourceIp?: string } }} [requestContext]
 */

/** Header CloudFront adds to every origin request (see infrastructure/modules/website_ssr). */
export const ORIGIN_VERIFY_HEADER = "x-origin-verify";
/** Header CloudFront's viewer-request function sets to the public host the browser used. */
export const VIEWER_HOST_HEADER = "x-viewer-host";

/**
 * Lowercases header names like Node does. Prefers multiValueHeaders so
 * repeated headers survive; single values collapse to strings because Astro
 * reads e.g. `req.headers.host` as a string.
 * @param {ApiGatewayEvent} event
 */
export function normalizeHeaders(event) {
  /** @type {Record<string, string | string[]>} */
  const headers = {};
  const source =
    event.multiValueHeaders && Object.keys(event.multiValueHeaders).length > 0
      ? event.multiValueHeaders
      : event.headers || {};
  for (const [name, value] of Object.entries(source)) {
    if (value === undefined || value === null) continue;
    const values = Array.isArray(value) ? value : [value];
    headers[name.toLowerCase()] = values.length === 1 ? values[0] : values;
  }
  return headers;
}

function buildUrl(event) {
  const params = new URLSearchParams();
  if (event.multiValueQueryStringParameters) {
    for (const [key, values] of Object.entries(event.multiValueQueryStringParameters)) {
      for (const value of values ?? []) params.append(key, value);
    }
  } else if (event.queryStringParameters) {
    for (const [key, value] of Object.entries(event.queryStringParameters)) {
      if (value != null) params.append(key, value);
    }
  }
  const query = params.toString();
  return `${event.path || "/"}${query ? `?${query}` : ""}`;
}

/**
 * True when the request carries the secret CloudFront adds, or when no secret
 * is configured. Blocks direct calls to the public execute-api URL, which
 * would otherwise bypass CloudFront's security headers and host handling.
 */
export function isFromTrustedOrigin(headers, secret) {
  if (!secret) return true;
  const received = headers[ORIGIN_VERIFY_HEADER];
  if (typeof received !== "string") return false;
  const a = Buffer.from(received);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Builds the Node IncomingMessage-like object Astro's middleware handler
 * expects: a readable stream (Astro attaches listeners and reads the body
 * from it) with `method`, `url` (path + query), lowercase `headers` and a
 * `socket` whose `encrypted` flag selects http/https.
 * (A WHATWG Request breaks Astro's createRequestFromNodeRequest: the full URL
 * is concatenated onto the host, every path resolves to "/" and headers,
 * cookies included, are dropped.)
 */
export function createRequest(event) {
  const headers = normalizeHeaders(event);

  // CloudFront talks to API Gateway with Host = the execute-api domain. Its
  // viewer-request function copies the public host to X-Viewer-Host; put it
  // back so Astro builds the public URL. Without this, the CSRF origin check
  // rejects every form POST (Origin: https://www.example.com vs
  // https://<id>.execute-api...) and emailed links point at API Gateway.
  delete headers[ORIGIN_VERIFY_HEADER];
  const viewerHost = headers[VIEWER_HOST_HEADER];
  if (typeof viewerHost === "string" && viewerHost) headers.host = viewerHost;

  const body = event.body ? Buffer.from(event.body, event.isBase64Encoded ? "base64" : "utf8") : undefined;
  const forwardedProto = typeof headers["x-forwarded-proto"] === "string" ? headers["x-forwarded-proto"] : "https";

  // The body is ONLY exposed as stream data, never as a `body` property:
  // older Astro versions serialized a Buffer `req.body` as JSON
  // (`{"type":"Buffer","data":[...]}`), breaking every form post.
  return Object.assign(Readable.from(body ? [body] : []), {
    method: event.httpMethod,
    url: buildUrl(event),
    headers,
    socket: {
      encrypted: forwardedProto.split(",")[0].trim() !== "http",
      remoteAddress: event.requestContext?.identity?.sourceIp,
    },
  });
}

const TEXT_CONTENT_TYPE = /^(?:text\/|application\/(?:json|javascript|xml|.*\+json|.*\+xml)|image\/svg\+xml)/i;

/**
 * Returns a fake Node ServerResponse plus a promise resolving to the API
 * Gateway result once end() fires. The handler RETURNS that result: the
 * nodejs24.x runtime removed context.succeed()/fail().
 */
export function createResponse(event) {
  let finished = false;
  const chunks = [];
  const responseHeaders = {};
  let resolveResult;
  let rejectResult;
  const result = new Promise((resolve, reject) => {
    resolveResult = resolve;
    rejectResult = reject;
  });

  const response = {
    statusCode: 200,
    statusMessage: "",
    headersSent: false,
    // Read by Astro's writeResponse when it logs stream errors.
    req: { url: event.path },

    // writeHead(status[, statusMessage][, headers])
    writeHead(status, arg2, arg3) {
      if (this.headersSent) return this;
      this.statusCode = status;
      const headers = typeof arg2 === "object" && arg2 !== null ? arg2 : arg3;
      for (const [name, value] of Object.entries(headers ?? {})) {
        responseHeaders[name.toLowerCase()] = value;
      }
      this.headersSent = true;
      return this;
    },

    setHeader(name, value) {
      responseHeaders[name.toLowerCase()] = value;
      return this;
    },

    write(chunk, encodingOrCallback, callback) {
      chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : Buffer.from(chunk));
      const done = typeof encodingOrCallback === "function" ? encodingOrCallback : callback;
      if (typeof done === "function") done();
      return true;
    },

    on() {
      return this;
    },
    once() {
      return this;
    },
    off() {
      return this;
    },
    removeListener() {
      return this;
    },

    destroy(error) {
      if (!finished) {
        finished = true;
        rejectResult(error || new Error("Response destroyed before completion"));
      }
      return this;
    },

    end(chunk, encodingOrCallback, callback) {
      try {
        if (chunk && typeof chunk !== "function") this.write(chunk);
        if (!finished) {
          finished = true;
          this.headersSent = true;
          // Binary bodies (images, fonts, downloads) go back base64-encoded:
          // toString() would decode them as UTF-8 and corrupt every invalid
          // byte. API Gateway decodes them (binary_media_types = ["*/*"]).
          const raw = Buffer.concat(chunks);
          const contentType = String(responseHeaders["content-type"] ?? "");
          const isText = contentType === "" || TEXT_CONTENT_TYPE.test(contentType);
          // multiValueHeaders keeps several Set-Cookie headers apart; a plain
          // map would join them into one broken, comma-separated cookie.
          const multiValueHeaders = {};
          for (const [name, value] of Object.entries(responseHeaders)) {
            multiValueHeaders[name] = Array.isArray(value) ? value.map(String) : [String(value)];
          }
          resolveResult({
            statusCode: this.statusCode,
            multiValueHeaders,
            body: isText ? raw.toString("utf8") : raw.toString("base64"),
            isBase64Encoded: !isText,
          });
        }
        const done =
          typeof chunk === "function"
            ? chunk
            : typeof encodingOrCallback === "function"
              ? encodingOrCallback
              : callback;
        if (typeof done === "function") done();
      } catch (error) {
        rejectResult(error);
      }
      return this;
    },
  };

  return { response, result };
}
