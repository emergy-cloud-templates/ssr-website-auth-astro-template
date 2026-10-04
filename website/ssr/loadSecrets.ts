// Loads this environment's runtime configuration from AWS Secrets Manager.
// Bundled to loadSecrets.cjs by `pnpm prepare:aws` and called by lambda.js
// before the Astro app is imported. Adapted from /common/api/astro-ssr-lambda
// (origin: app.upmatch.io).
import { GetSecretValueCommand, SecretsManagerClient } from "@aws-sdk/client-secrets-manager";

let pending: Promise<void> | null = null;

/**
 * Copies every key of the JSON secret named by `APP_SECRETS_ID` (set by
 * Terraform, e.g. "prod/my-project") into `process.env`.
 *
 * - No-op when `APP_SECRETS_ID` is unset or `ENV=local`.
 * - Never overwrites a variable that is already set, so values Terraform puts
 *   on the function (ENV, APP_SECRETS_ID, ORIGIN_VERIFY_SECRET) win.
 * - Fail-soft: a missing, unreadable or malformed secret is logged and the
 *   app boots with the environment it has (and reports what is missing).
 * - Runs once per Lambda container; warm invocations reuse the result.
 */
export function loadSecrets(): Promise<void> {
  pending ??= load();
  return pending;
}

async function load(): Promise<void> {
  const secretId = process.env.APP_SECRETS_ID;
  if (process.env.ENV === "local" || !secretId) return;

  let data: Record<string, unknown>;
  try {
    const { SecretString } = await new SecretsManagerClient({}).send(new GetSecretValueCommand({ SecretId: secretId }));
    if (!SecretString) return;
    data = JSON.parse(SecretString) as Record<string, unknown>;
  } catch (error) {
    console.warn(
      `[loadSecrets] Could not load secret "${secretId}", continuing with the existing environment:`,
      error instanceof Error ? error.message : error,
    );
    return;
  }

  for (const [key, value] of Object.entries(data)) {
    if (value == null || process.env[key] !== undefined) continue;
    process.env[key] = typeof value === "string" ? value : JSON.stringify(value);
  }
}
