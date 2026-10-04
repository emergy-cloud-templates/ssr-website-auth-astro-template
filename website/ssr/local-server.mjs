#!/usr/bin/env node
// Serves the PACKAGED Lambda bundle (ssr_dist/) locally, the way AWS does:
//   - files that exist in dist/client are served as static assets (S3 role),
//   - everything else becomes an API Gateway REST proxy event for
//     ssr_dist/lambda.js (Lambda role), with the headers CloudFront's
//     viewer-request function adds (x-viewer-host) and a Host header that
//     does NOT match the site, exactly like API Gateway sees it.
// Used by `pnpm preview` and the end-to-end tests, so they exercise the same
// code path as production.
//
//   PORT=4322 node ssr/local-server.mjs
import { existsSync, readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const clientDir = join(root, "dist", "client");
const lambdaPath = join(root, "ssr_dist", "lambda.js");
const port = Number(process.env.PORT ?? 4322);
const host = process.env.HOST ?? "127.0.0.1";

if (!existsSync(lambdaPath)) {
  console.error("ssr_dist/lambda.js not found: run `pnpm build && pnpm prepare:aws` first.");
  process.exit(1);
}
const { handler } = await import(lambdaPath);

const CONTENT_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
};

function staticFile(pathname) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  const file = normalize(join(clientDir, decoded));
  if (!file.startsWith(clientDir + sep)) return null;
  return existsSync(file) && statSync(file).isFile() ? file : null;
}

function toEvent(req, url, body) {
  const multiValueHeaders = {};
  for (const [name, values] of Object.entries(req.headersDistinct)) multiValueHeaders[name] = values;
  // What CloudFront's viewer-request function and API Gateway do:
  multiValueHeaders["x-viewer-host"] = [req.headers.host ?? `${host}:${port}`];
  multiValueHeaders["x-forwarded-proto"] = ["http"];
  multiValueHeaders.host = ["local-api-gateway.invalid"];
  if (process.env.ORIGIN_VERIFY_SECRET) multiValueHeaders["x-origin-verify"] = [process.env.ORIGIN_VERIFY_SECRET];

  const multiValueQueryStringParameters = {};
  for (const key of new Set(url.searchParams.keys())) {
    multiValueQueryStringParameters[key] = url.searchParams.getAll(key);
  }
  return {
    httpMethod: req.method,
    path: url.pathname,
    multiValueHeaders,
    multiValueQueryStringParameters: url.search ? multiValueQueryStringParameters : null,
    body: body.length ? body.toString("base64") : null,
    isBase64Encoded: body.length > 0,
    requestContext: { identity: { sourceIp: req.socket.remoteAddress } },
  };
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
  try {
    const file = (req.method === "GET" || req.method === "HEAD") && staticFile(url.pathname);
    if (file) {
      res.writeHead(200, {
        "content-type": CONTENT_TYPES[extname(file)] ?? "application/octet-stream",
        "cache-control": url.pathname.startsWith("/_astro/") ? "public, max-age=31536000, immutable" : "no-cache",
      });
      res.end(req.method === "HEAD" ? undefined : readFileSync(file));
      return;
    }

    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const result = await handler(toEvent(req, url, Buffer.concat(chunks)), {});
    res.writeHead(result.statusCode, result.multiValueHeaders ?? result.headers ?? {});
    res.end(result.body ? Buffer.from(result.body, result.isBase64Encoded ? "base64" : "utf8") : undefined);
  } catch (error) {
    console.error(error);
    if (!res.headersSent) res.writeHead(502, { "content-type": "text/plain" });
    res.end("Bad gateway (Lambda threw, see logs)");
  }
});

server.listen(port, host, () => {
  console.log(`Lambda bundle served at http://${host}:${port}`);
});
