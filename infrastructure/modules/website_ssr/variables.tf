variable "environment" {
  type        = string
  description = "Environment name: dev, staging or prod."

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "environment must be one of: dev, staging, prod."
  }
}

variable "project_id" {
  type        = string
  description = "Project identifier used in every resource name."
}

variable "hostname" {
  type        = string
  default     = ""
  description = "Custom hostname served by CloudFront (e.g. www.example.com). Empty = CloudFront domain only."
}

variable "acm_certificate_arn" {
  type        = string
  default     = ""
  description = "ACM certificate in us-east-1 covering hostname (and apex_host when redirect_apex is true)."

  validation {
    condition     = var.acm_certificate_arn == "" || can(regex("^arn:aws:acm:us-east-1:[0-9]{12}:certificate/.+$", var.acm_certificate_arn))
    error_message = "CloudFront requires an ACM certificate in us-east-1 (arn:aws:acm:us-east-1:ACCOUNT_ID:certificate/UUID)."
  }
}

variable "redirect_apex" {
  type        = bool
  default     = false
  description = "Also serve apex_host and redirect it (301) to hostname."
}

variable "apex_host" {
  type        = string
  default     = ""
  description = "Apex domain redirected to hostname when redirect_apex is true."
}

variable "lambda_layer_arn" {
  type        = string
  description = "Lambda layer attached to the SSR function."
}

variable "lambda_role_arn" {
  type        = string
  description = "Execution role of the SSR function."
}

variable "lambda_zip_path" {
  type        = string
  description = "Initial code package of the SSR function."
}

variable "lambda_memory_size" {
  type    = number
  default = 512
}

variable "log_retention_days" {
  type    = number
  default = 30
}

variable "price_class" {
  type    = string
  default = "PriceClass_100"
}
