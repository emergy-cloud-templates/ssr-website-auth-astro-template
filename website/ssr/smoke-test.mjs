#!/usr/bin/env node
// Smoke test for the packaged Lambda bundle (`pnpm test:ssr`).
//
// Copies ssr_dist/ to a temporary directory OUTSIDE the project, so Node
// cannot fall back to website/node_modules: this proves the zip that gets
// deployed is self-contained. Then invokes the handler with API Gateway
// events and a bare `{}` context (nodejs24.x has no context.succeed/fail).
import assert from "node:assert/strict";
import { cpSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const bundle = fileURLToPath(new URL("../ssr_dist", import.meta.url));
const workDir = mkdtempSync(join(tmpdir(), "ssr-smoke-"));
cpSync(bundle, workDir, { recursive: true });

// Run against a throwaway local auth database, whatever the shell has set.
process.env.AUTH_PROVIDER = "local";
process.env.LOCAL_AUTH_DB_PATH = join(workDir, "smoke.sqlite");
delete process.env.APP_SECRETS_ID;
process.env.ORIGIN_VERIFY_SECRET = "smoke-secret";

const { handler } = await import(pathToFileURL(join(workDir, "lambda.js")).href);

const viewerHost = "www.example.com";
const event = (overrides = {}) => ({
  httpMethod: "GET",
  path: "/",
  multiValueHeaders: {
    host: ["abc123.execute-api.us-east-1.amazonaws.com"],
    "x-viewer-host": [viewerHost],
    "x-forwarded-proto": ["https"],
    "x-origin-verify": ["smoke-secret"],
  },
  multiValueQueryStringParameters: null,
  body: null,
  isBase64Encoded: false,
  requestContext: { identity: { sourceIp: "203.0.113.10" } },
  ...overrides,
});

const checks = [];
async function check(name, fn) {
  try {
    await fn();
    checks.push(`  ok   ${name}`);
  } catch (error) {
    checks.push(`  FAIL ${name}\n       ${error.message}`);
    process.exitCode = 1;
  }
}

await check("GET / renders the home page", async () => {
  const result = await handler(event(), {});
  assert.equal(result.statusCode, 200);
  assert.match(result.body, /<html/);
});

await check("requests without the CloudFront secret are rejected", async () => {
  const headers = { ...event().multiValueHeaders };
  delete headers["x-origin-verify"];
  const result = await handler(event({ multiValueHeaders: headers }), {});
  assert.equal(result.statusCode, 403);
});

await check("protected pages redirect to sign-in", async () => {
  const result = await handler(event({ path: "/dashboard" }), {});
  assert.equal(result.statusCode, 302);
  assert.match(result.multiValueHeaders.location[0], /^\/auth\/signin\?redirectTo=%2Fdashboard/);
});

await check("a same-origin form POST passes the CSRF check and sets a session cookie", async () => {
  const signup = new URLSearchParams({ name: "Smoke Test", email: "smoke@example.com", password: "Sm0ke-test-pw" });
  const result = await handler(
    event({
      httpMethod: "POST",
      path: "/api/auth/signup",
      multiValueHeaders: {
        ...event().multiValueHeaders,
        origin: [`https://${viewerHost}`],
        "content-type": ["application/x-www-form-urlencoded"],
      },
      body: Buffer.from(signup.toString()).toString("base64"),
      isBase64Encoded: true,
    }),
    {},
  );
  assert.equal(result.statusCode, 200, result.body);
  const cookies = result.multiValueHeaders["set-cookie"] ?? [];
  assert.ok(
    cookies.some((cookie) => cookie.startsWith("local_session=") && /HttpOnly/i.test(cookie) && /Secure/i.test(cookie)),
  );
});

await check("a cross-origin form POST is rejected", async () => {
  const result = await handler(
    event({
      httpMethod: "POST",
      path: "/api/auth/signin",
      multiValueHeaders: {
        ...event().multiValueHeaders,
        origin: ["https://evil.example"],
        "content-type": ["application/x-www-form-urlencoded"],
      },
      body: "email=a%40b.co&password=x",
    }),
    {},
  );
  assert.equal(result.statusCode, 403);
});

await check("unknown pages return the 404 page", async () => {
  const result = await handler(event({ path: "/does-not-exist" }), {});
  assert.equal(result.statusCode, 404);
  assert.match(result.body, /Page not found/);
});

console.log(`Lambda bundle smoke test (${workDir})\n${checks.join("\n")}`);
rmSync(workDir, { recursive: true, force: true });
