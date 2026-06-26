// Local test entry: reuse the real Lambda shim so test:ssr exercises the
// exact request/response conversion that runs in AWS.
export { handler } from './lambda.js';
