// Loads this environment's runtime configuration at cold start: the project's own secret in AWS Secrets
// Manager, then the platform config (an SSM SecureString the emergy.cloud platform delivers).
// Bundled to loadSecrets.cjs by `pnpm prepare:aws` and called by lambda.js before the Astro app is imported.
// Adapted from /common/legos/node/astro-ssr-lambda@2.0.0 (dvk-common e1830c4), then extended here with the
// platform config (see .legos.json). Change the lego, then pull it here with update-lego.
import { GetSecretValueCommand, SecretsManagerClient } from "@aws-sdk/client-secrets-manager";
import { GetParameterCommand, SSMClient } from "@aws-sdk/client-ssm";

let pending: Promise<void> | null = null;

/**
 * Copies every key of the JSON secret named by `APP_SECRETS_ID` (set by Terraform, e.g. "prod/my-project"), then
 * every key of the JSON SecureString parameter named by `PLATFORM_CONFIG_PARAM` (e.g. "/emergy/<project-id>/prod"),
 * into `process.env`.
 *
 * - No-op when `ENV=local`, or when neither variable is set.
 * - Never overwrites a variable that is already set, so values Terraform puts on the function (ENV, APP_SECRETS_ID,
 *   ORIGIN_VERIFY_SECRET) win, then the project's own secret, then the platform config.
 * - Fail-soft: a missing, unreadable or malformed secret or parameter is logged and the app boots with the
 *   environment it has (and reports what is missing). A missing own secret is fine when the platform config exists.
 * - Runs once per Lambda container; warm invocations reuse the result.
 */
export function loadSecrets(): Promise<void> {
  pending ??= load();
  return pending;
}

/** Resets the once-per-container cache (tests only). */
export function resetLoadSecretsForTests(): void {
  pending = null;
}

async function load(): Promise<void> {
  if (process.env.ENV === "local") return;
  const own = await readOwnSecret(process.env.APP_SECRETS_ID);
  const platform = await readPlatformConfig(process.env.PLATFORM_CONFIG_PARAM);
  // Own secret first: it wins over the platform config.
  for (const data of [own, platform]) merge(data);
}

function merge(data: Record<string, unknown> | null): void {
  if (!data) return;
  for (const [key, value] of Object.entries(data)) {
    if (value == null || process.env[key] !== undefined) continue;
    process.env[key] = typeof value === "string" ? value : JSON.stringify(value);
  }
}

function parseObject(raw: string): Record<string, unknown> {
  const data: unknown = JSON.parse(raw);
  if (data === null || typeof data !== "object" || Array.isArray(data)) throw new Error("not a JSON object");
  return data as Record<string, unknown>;
}

async function readOwnSecret(secretId: string | undefined): Promise<Record<string, unknown> | null> {
  if (!secretId) return null;
  try {
    const { SecretString } = await new SecretsManagerClient({}).send(new GetSecretValueCommand({ SecretId: secretId }));
    return SecretString ? parseObject(SecretString) : null;
  } catch (error) {
    console.warn(
      `[loadSecrets] Could not load secret "${secretId}", continuing with the existing environment:`,
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}

async function readPlatformConfig(name: string | undefined): Promise<Record<string, unknown> | null> {
  if (!name) return null;
  try {
    const { Parameter } = await new SSMClient({}).send(new GetParameterCommand({ Name: name, WithDecryption: true }));
    return Parameter?.Value ? parseObject(Parameter.Value) : null;
  } catch (error) {
    // Messages name the parameter, never its value.
    console.warn(
      `[loadSecrets] Could not load platform config "${name}", continuing without it:`,
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}
