# One AWS Secrets Manager secret per environment holds ALL runtime
# configuration as a single JSON object, e.g.
#   { "PUBLIC_SUPABASE_URL": "...", "PUBLIC_SUPABASE_PUBLISHABLE_KEY": "...",
#     "SUPABASE_SECRET_KEY": "..." }
# The SSR Lambda reads it at cold start (APP_SECRETS_ID, see lambda.tf).
#
# The secret is deliberately NOT managed by Terraform, so its values never
# land in the Terraform state. Create it once per environment, named
# "<env>/<project_id>", before the first deploy (see docs/deployment.md).
