// Reusable AWS Lambda SSR adapter for Astro (@astrojs/node in `middleware`
// mode) behind API Gateway. Origin: app.upmatch.io `website/ssr/lambda.js`.
// Pairs with `loadSecrets.ts` (bundled to `loadSecrets.cjs` by the project's
// `prepare:aws` script). See README.md in /common/api/astro-ssr-lambda.
import { createRequire } from 'node:module';

// Secrets toggle — the ONLY line that changes per project.
//   true  → load AWS Secrets Manager values into process.env before the app
//           boots. `loadSecrets.cjs` MUST be in the bundle (`prepare:aws`
//           bundles src/lib/loadSecrets.ts → loadSecrets.cjs).
//   false → boot straight from process.env / .env; loadSecrets is neither
//           required nor referenced (safe to ship without loadSecrets.cjs).
const USE_SECRETS = true;

// loadSecrets is bundled to CommonJS (loadSecrets.cjs): the AWS SDK calls
// require() for node built-ins, which throws "Dynamic require not supported"
// in an ESM bundle. Load the CJS bundle via createRequire so it runs with a
// real require(), the same way the worker bundle does.
const require = createRequire(import.meta.url);

// Load secrets (when enabled) THEN import the Astro server bundle. The import
// is deferred (not a static top-level import) because dist/server reads its
// public config (e.g. PUBLIC_SUPABASE_URL/ANON_KEY) at module load time —
// those must be in process.env first. Resolves once per container; cached for
// warm invocations.
const ssrReady = (USE_SECRETS
  ? require('./loadSecrets.cjs').loadSecrets()
  : Promise.resolve()
).then(() => import('./dist/server/entry.mjs'));

// @astrojs/node's middleware handler expects a Node IncomingMessage-like
// request: `url` must be the path (+ query), `headers` a plain object with
// lowercase keys, and `socket.encrypted` drives the http/https protocol.
// (Passing a WHATWG Request breaks Astro 6's createRequestFromNodeRequest:
// the full URL concatenated onto the host fails to parse, so every request
// resolved to "/" and all headers — including cookies — were dropped.)
function createRequest(event) {
  // Lowercase header keys like Node does. Prefer multiValueHeaders so
  // repeated headers survive; collapse single-value arrays to strings
  // (Astro reads req.headers.host as a string).
  const headers = {};
  const source = event.multiValueHeaders && Object.keys(event.multiValueHeaders).length > 0
    ? event.multiValueHeaders
    : event.headers || {};
  for (const [name, value] of Object.entries(source)) {
    if (value === undefined || value === null) continue;
    const values = Array.isArray(value) ? value : [value];
    headers[name.toLowerCase()] = values.length === 1 ? values[0] : values;
  }

  let url = event.path || '/';
  if (event.queryStringParameters) {
    const queryString = new URLSearchParams(event.queryStringParameters).toString();
    if (queryString) url += `?${queryString}`;
  }

  const body = event.body
    ? Buffer.from(event.body, event.isBase64Encoded ? 'base64' : 'utf-8')
    : undefined;

  return {
    method: event.httpMethod,
    url,
    headers,
    body, // Buffer: consumed directly by Astro's makeRequestBody
    // encrypted=true → Astro builds an https:// URL
    socket: {
      encrypted: true,
      remoteAddress: event.requestContext?.identity?.sourceIp,
    },
    // Fallback body source when `body` is undefined (Astro iterates the
    // request itself for non-GET methods without a body).
    async *[Symbol.asyncIterator]() {
      if (body) yield body;
    },
  };
}

function createResponse(event, context) {
  let finished = false;
  const bodyChunks = [];
  let responseHeaders = {};

  const response = {
    statusCode: 200,
    statusMessage: '',
    headersSent: false,
    bodyChunks,
    // Accessed by Astro's writeResponse when logging stream errors
    req: { url: event.path },

    // writeHead(status[, statusMessage][, headers])
    writeHead(status, arg2, arg3) {
      if (this.headersSent) return this;
      this.statusCode = status;
      const newHeaders = typeof arg2 === 'object' && arg2 !== null ? arg2 : arg3;
      if (newHeaders) {
        for (const [header, value] of Object.entries(newHeaders)) {
          responseHeaders[header.toLowerCase()] = value;
        }
      }
      this.headersSent = true;
      return this;
    },

    write(chunk, callback) {
      bodyChunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
      if (typeof callback === 'function') callback();
      return true;
    },

    on() { return this; },
    off() { return this; },
    removeListener() { return this; },

    destroy(error) {
      if (!finished) {
        finished = true;
        context.fail(error || new Error('Response destroyed before completion'));
      }
      return this;
    },

    end(chunk, callback) {
      try {
        if (chunk) this.write(chunk);
        if (!finished) {
          finished = true;
          this.headersSent = true;
          this._body = Buffer.concat(bodyChunks).toString();
          // multiValueHeaders so multiple Set-Cookie headers survive
          // (Astro emits them as an array; a plain headers map would
          // collapse them into one comma-joined — broken — cookie).
          const multiValueHeaders = {};
          for (const [header, value] of Object.entries(responseHeaders)) {
            multiValueHeaders[header] = Array.isArray(value) ? value : [String(value)];
          }
          context.succeed({
            statusCode: this.statusCode,
            multiValueHeaders,
            body: this._body,
          });
        }
        if (typeof callback === 'function') callback();
      } catch (e) {
        context.fail(e);
      }
      return this;
    },
  };

  return response;
}

export const handler = async (event, context) => {
  const startTime = Date.now();

  const { handler: ssrHandler } = await ssrReady;
  const request = createRequest(event);
  const response = createResponse(event, context);
  try {
    await ssrHandler(request, response);
    console.log(
      JSON.stringify({
        method: event.httpMethod,
        url: event.path,
        statusCode: response.statusCode,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      })
    );
    return response;
  } catch (error) {
    console.log(
      JSON.stringify({
        method: event.httpMethod,
        url: event.path,
        hasError: true,
        message: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      })
    );
    context.fail(error);
  }
};
