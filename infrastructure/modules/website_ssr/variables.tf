variable "env_config" {
  description = "Environment-specific configuration"
  type = object({
    environment = string
    base_domain = string
    project_id  = string
  })

  validation {
    condition     = contains(["dev", "staging", "prod"], var.env_config.environment)
    error_message = "environment must be one of: dev, staging, prod."
  }
}

variable "lambda_layer_arn" {
  description = "Layer for the server side rendering lambda"
  type        = string
  default     = ""
}

variable "lambda_role_arn" {
  description = "Role for the server side rendering lambda"
  type        = string
  default     = ""
}

variable "lambda_zip_path" {
  description = "Path to the zip file for the server side rendering lambda"
  type        = string
  default     = ""
}

variable "acm_certificate_arn" {
  description = "ARN of the ACM certificate in us-east-1 for CloudFront. Leave empty to skip custom domain."
  type        = string
  default     = ""
  validation {
    condition     = var.acm_certificate_arn == "" || can(regex("^arn:aws:acm:us-east-1:[0-9]{12}:certificate/.+$", var.acm_certificate_arn))
    error_message = "CloudFront requires an ACM cert in us-east-1. Provide an ARN like arn:aws:acm:us-east-1:ACCOUNT_ID:certificate/UUID."
  }
}

variable "price_class" {
  description = "CloudFront price class."
  type        = string
  default     = "PriceClass_100"
}


data "aws_region" "current" {}

# Get the current account id
data "aws_canonical_user_id" "current" {}
data "aws_caller_identity" "current" {}