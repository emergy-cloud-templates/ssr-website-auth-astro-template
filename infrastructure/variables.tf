# Envionments setup
variable "aws_account_number" {
  type        = string
  description = "AWS Account Number"
}
variable "project_id" {
  type        = string
  description = "Project ID"
}
variable "base_domain" {
  type        = string
  description = "Project ID"
}
variable "aws_website_acm_arn" {
  type        = string
  description = "Project ID"
}

# Runtime secrets (e.g. Supabase URL/keys) are NOT Terraform variables.
# Each environment reads one AWS Secrets Manager JSON secret named
# "<env>/<project_id>" at Lambda cold start (see modules/website_ssr/secrets.tf).
# Manage the secret values out-of-band; Terraform only injects the secret id.