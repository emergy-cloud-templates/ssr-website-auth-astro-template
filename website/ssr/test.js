import { handler } from "./lambda-local.js";

// Bare context on purpose: nodejs24.x removed context.succeed/fail, so the
// test must fail if the shim ever reaches for them again. The invocation
// result is whatever the async handler returns.
const event = {
  httpMethod: "GET",
  path: "/",
  headers: {},
  queryStringParameters: {},
  requestContext: {},
};

const result = await handler(event, {});
if (result?.statusCode !== 200 || !result.body) {
  console.error("Shim smoke test failed, got:", result?.statusCode);
  process.exit(1);
}
console.log("Generated HTML for the index page:", result.body);
