# One AWS Secrets Manager secret per environment holds ALL runtime secrets as
# a single JSON blob (e.g. PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY).
# The SSR Lambda fetches it once at cold start (ssr/lambda.js -> loadSecrets)
# and copies every key into process.env. Terraform never sees the values -
# it only injects the secret id below; manage the values out-of-band.
#
# The secret itself is NOT managed by this Terraform: create it per env as
# "<env>/<project_id>" (e.g. "prod/example-project") before deploying.
locals {
  app_secrets_id = "${var.env_config.environment}/${var.env_config.project_id}"
}
