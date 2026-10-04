# -----------------------------------------------------------------------------
# One-time account bootstrap (run once per AWS account, from your machine):
#   - an S3 bucket for the main stack's Terraform state,
#   - GitHub Actions OIDC trust + a role the workflows assume (no AWS keys
#     stored in GitHub).
#
#   cd infrastructure/bootstrap
#   terraform init && terraform apply \
#     -var project_id=my-project -var github_repository=my-org/my-repo
#
# State for THIS folder stays local (terraform.tfstate, gitignored): it only
# holds three small resources. Keep the file, or re-import if you lose it.
# Not needed when the emergy platform manages the account for you.
# -----------------------------------------------------------------------------
terraform {
  required_version = ">= 1.10"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "project_id" {
  type        = string
  description = "Same project_id as the main stack."
}

variable "github_repository" {
  type        = string
  description = "GitHub repository allowed to deploy, as owner/name."

  validation {
    condition     = can(regex("^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$", var.github_repository))
    error_message = "github_repository must look like owner/name."
  }
}

variable "create_oidc_provider" {
  type        = bool
  default     = true
  description = "Set to false if the account already has the token.actions.githubusercontent.com OIDC provider."
}

variable "role_policy_arns" {
  type        = list(string)
  default     = ["arn:aws:iam::aws:policy/AdministratorAccess"]
  description = "Policies for the deploy role. Terraform creates IAM roles, buckets, CloudFront, API Gateway and Lambda; narrow this down for production accounts."
}

data "aws_caller_identity" "current" {}

resource "aws_s3_bucket" "terraform_state" {
  bucket = "${var.project_id}-tfstate-${data.aws_caller_identity.current.account_id}"

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_s3_bucket_versioning" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_public_access_block" "terraform_state" {
  bucket                  = aws_s3_bucket.terraform_state.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_iam_openid_connect_provider" "github" {
  count          = var.create_oidc_provider ? 1 : 0
  url            = "https://token.actions.githubusercontent.com"
  client_id_list = ["sts.amazonaws.com"]
}

locals {
  oidc_provider_arn = var.create_oidc_provider ? aws_iam_openid_connect_provider.github[0].arn : "arn:aws:iam::${data.aws_caller_identity.current.account_id}:oidc-provider/token.actions.githubusercontent.com"
}

resource "aws_iam_role" "github_deploy" {
  name = "${var.project_id}-github-deploy"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Federated = local.oidc_provider_arn }
      Action    = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = { "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com" }
        # Any branch, PR or environment of this repository only.
        StringLike = { "token.actions.githubusercontent.com:sub" = "repo:${var.github_repository}:*" }
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "github_deploy" {
  for_each   = toset(var.role_policy_arns)
  role       = aws_iam_role.github_deploy.name
  policy_arn = each.value
}

output "github_repository_variables" {
  description = "Set these as GitHub repository variables (Settings > Secrets and variables > Actions > Variables)."
  value = {
    PROJECT_ID               = var.project_id
    AWS_ACCOUNT_ID           = data.aws_caller_identity.current.account_id
    AWS_REGION               = var.aws_region
    AWS_INFRA_ROLE_TO_ASSUME = aws_iam_role.github_deploy.arn
    TF_BACKEND_BUCKET        = aws_s3_bucket.terraform_state.bucket
    TF_STATE_KEY_PREFIX      = var.project_id
    ENVS                     = "dev,prod"
  }
}
