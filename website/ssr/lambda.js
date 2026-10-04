// AWS Lambda entry point for the Astro SSR build (handler: "lambda.handler").
// Adapted from /common/api/astro-ssr-lambda (origin: app.upmatch.io).
// `pnpm prepare:aws` copies this file, shim.js and the Astro server build into
// ssr_dist/, which is zipped and deployed. See docs/architecture.md.
import { createRequire } from "node:module";

import { createRequest, createResponse, isFromTrustedOrigin, normalizeHeaders } from "./shim.js";

// true  -> load the "<env>/<project_id>" Secrets Manager JSON into process.env
//          before the app boots (needs loadSecrets.cjs in the bundle).
// false -> boot straight from the Lambda environment variables.
const USE_SECRETS = true;

// loadSecrets is bundled as CommonJS: the AWS SDK calls require() for Node
// built-ins, which throws "Dynamic require not supported" inside ESM.
const require = createRequire(import.meta.url);

// Secrets first, THEN the app: the import is deferred so configuration read
// at module load already sees them. Resolved once per container.
const ssrReady = (USE_SECRETS ? require("./loadSecrets.cjs").loadSecrets() : Promise.resolve()).then(
  () => import("./dist/server/entry.mjs"),
);

function log(entry) {
  console.log(JSON.stringify({ ...entry, timestamp: new Date().toISOString() }));
}

export const handler = async (event) => {
  const startTime = Date.now();

  if (!isFromTrustedOrigin(normalizeHeaders(event), process.env.ORIGIN_VERIFY_SECRET)) {
    log({ method: event.httpMethod, url: event.path, statusCode: 403, reason: "origin-verify" });
    return { statusCode: 403, headers: { "content-type": "text/plain" }, body: "Forbidden" };
  }

  const { handler: ssrHandler } = await ssrReady;
  const request = createRequest(event);
  const { response, result } = createResponse(event);
  try {
    await ssrHandler(request, response);
    // end() may fire after the handler resolves (streamed bodies): the
    // promise covers both orders.
    const apiGatewayResult = await result;
    log({
      method: event.httpMethod,
      url: event.path,
      statusCode: apiGatewayResult.statusCode,
      duration: Date.now() - startTime,
    });
    return apiGatewayResult;
  } catch (error) {
    log({
      method: event.httpMethod,
      url: event.path,
      hasError: true,
      message: error instanceof Error ? error.message : String(error),
      duration: Date.now() - startTime,
    });
    throw error;
  }
};
