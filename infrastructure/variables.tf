# -----------------------------------------------------------------------------
# Required
# -----------------------------------------------------------------------------
variable "aws_account_number" {
  type        = string
  description = "AWS account ID the stack is deployed to (12 digits)."

  validation {
    condition     = can(regex("^[0-9]{12}$", var.aws_account_number))
    error_message = "aws_account_number must be a 12-digit AWS account ID."
  }
}

variable "project_id" {
  type        = string
  description = "Unique, lowercase project identifier. Prefixes every resource name (buckets, functions, secrets)."

  validation {
    condition     = can(regex("^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$", var.project_id))
    error_message = "project_id must be 3-40 characters of lowercase letters, digits and hyphens (it is used in bucket, IAM role and function names, which have length limits)."
  }
}

# -----------------------------------------------------------------------------
# Environments
# -----------------------------------------------------------------------------
variable "envs" {
  type        = string
  default     = "dev,prod"
  description = "Comma-separated environments to create, a subset of: dev, staging, prod. Matches the ENVS repository variable the workflows use."

  validation {
    condition = trimspace(var.envs) != "" && length([
      for e in split(",", var.envs) : trimspace(e)
      if !contains(["dev", "staging", "prod"], trimspace(e))
    ]) == 0
    error_message = "envs must be a non-empty comma-separated subset of: dev, staging, prod."
  }
}

variable "aws_region" {
  type        = string
  default     = "us-east-1"
  description = "Region for the Lambda, API Gateway and buckets. CloudFront certificates always live in us-east-1."
}

# -----------------------------------------------------------------------------
# Custom domains (all optional: leave empty to use the *.cloudfront.net URLs)
#
# Per environment, the hostname is chosen in this order:
#   1. hostname_<env>                  exact hostname, e.g. "app.example.com"
#   2. base_domain_<env> / base_domain derived: dev.<base>, staging.<base>,
#                                      and www.<base> (+ <base> redirect) for prod
# A custom domain is only attached when a matching ACM certificate ARN
# (aws_website_acm_arn_<env> or aws_website_acm_arn, in us-east-1) is set.
# -----------------------------------------------------------------------------
variable "base_domain" {
  type        = string
  default     = ""
  description = "Apex domain shared by all environments, e.g. example.com."
}

variable "aws_website_acm_arn" {
  type        = string
  default     = ""
  description = "ACM certificate ARN (us-east-1) covering the hostnames of every environment."
}

variable "base_domain_dev" {
  type    = string
  default = ""
}
variable "base_domain_staging" {
  type    = string
  default = ""
}
variable "base_domain_prod" {
  type    = string
  default = ""
}

variable "aws_website_acm_arn_dev" {
  type    = string
  default = ""
}
variable "aws_website_acm_arn_staging" {
  type    = string
  default = ""
}
variable "aws_website_acm_arn_prod" {
  type    = string
  default = ""
}

variable "hostname_dev" {
  type    = string
  default = ""
}
variable "hostname_staging" {
  type    = string
  default = ""
}
variable "hostname_prod" {
  type    = string
  default = ""
}

# -----------------------------------------------------------------------------
# Tuning
# -----------------------------------------------------------------------------
variable "lambda_memory_size" {
  type        = number
  default     = 512
  description = "SSR Lambda memory in MB. More memory also means more CPU and faster cold starts."
}

variable "log_retention_days" {
  type        = number
  default     = 30
  description = "How long the SSR Lambda logs are kept in CloudWatch."
}

variable "price_class" {
  type        = string
  default     = "PriceClass_100"
  description = "CloudFront price class (PriceClass_100 = North America + Europe edge locations)."
}

# Runtime secrets (Supabase URL/keys, ...) are NOT Terraform variables.
# Each environment reads one AWS Secrets Manager JSON secret named
# "<env>/<project_id>" at Lambda cold start. Required keys are listed in
# required-secret-keys.txt. Terraform never sees the values.
