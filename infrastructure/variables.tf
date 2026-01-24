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


# Supabase - Production
variable "prod_supabase_url" {
  type        = string
  description = "Supabase URL for production environment"
}
variable "prod_supabase_anon_key" {
  type        = string
  description = "Supabase anonymous key for production environment"
  sensitive   = true
}

# Supabase - Development
variable "dev_supabase_url" {
  type        = string
  description = "Supabase URL for development environment"
}
variable "dev_supabase_anon_key" {
  type        = string
  description = "Supabase anonymous key for development environment"
  sensitive   = true
}

# Supabase - Staging
variable "staging_supabase_url" {
  type        = string
  description = "Supabase URL for staging environment"
}
variable "staging_supabase_anon_key" {
  type        = string
  description = "Supabase anonymous key for staging environment"
  sensitive   = true
}