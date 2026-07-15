// Reusable across projects. Origin: app.upmatch.io website/src/lib/loadSecrets.ts.
// Lives in the app at src/lib/loadSecrets.ts; `prepare:aws` bundles it to
// loadSecrets.cjs next to lambda.js. Only needed when secrets are enabled
// (USE_SECRETS = true in lambda.js). See /common/api/astro-ssr-lambda/README.md.
import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";

/**
 * Loads the environment's secret JSON from AWS Secrets Manager and copies each
 * key into `process.env` BEFORE any app module reads config.
 *
 * The secret id comes from `APP_SECRETS_ID` (e.g. "prod/app.upmatch.io"), set
 * by Terraform on each Lambda. Locally (`ENV=local`) or when `APP_SECRETS_ID`
 * is unset, this is a no-op so dotenv/.env keeps working.
 *
 * Must run before the app bundle is imported — `lib/supabase.ts` reads
 * `PUBLIC_SUPABASE_URL` at module top-level — so the SSR shim and worker entry
 * both `await loadSecrets()` and then dynamically import the app.
 *
 * Existing `process.env` values are never overwritten, so non-secret vars that
 * Terraform still injects (SQS urls, ENV, APP_SECRETS_ID, STOP_* flags) win.
 *
 * Fetching is fail-soft: if the secret is missing or unreadable (e.g. the secret
 * doesn't exist yet, or access is denied), we log and continue rather than
 * crashing the Lambda. The same build then runs with or without a secret,
 * falling back to whatever is already in `process.env`.
 */
let pending: Promise<void> | null = null;

export function loadSecrets(): Promise<void> {
  pending ??= load();
  return pending;
}

async function load(): Promise<void> {
  const secretId = process.env.APP_SECRETS_ID;
  if (process.env.ENV === "local" || !secretId) return;

  let secretString: string | undefined;
  try {
    const client = new SecretsManagerClient({});
    const res = await client.send(
      new GetSecretValueCommand({ SecretId: secretId }),
    );
    secretString = res.SecretString;
  } catch (err) {
    console.warn(
      `[loadSecrets] Could not load secret "${secretId}", continuing with existing env:`,
      err instanceof Error ? err.message : err,
    );
    return;
  }
  if (!secretString) return;

  const data = JSON.parse(secretString) as Record<string, unknown>;
  for (const [key, value] of Object.entries(data)) {
    if (value == null || process.env[key] !== undefined) continue;
    process.env[key] = typeof value === "string" ? value : String(value);
  }
}
