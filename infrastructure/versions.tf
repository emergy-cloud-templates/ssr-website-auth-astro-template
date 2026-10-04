terraform {
  # 1.10+ for S3-native state locking (`use_lockfile`, see the workflows).
  required_version = ">= 1.10"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.7"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }

  # Configured at `terraform init` time (-backend-config=...), see readme.md.
  backend "s3" {}
}

provider "aws" {
  region = var.aws_region
  # No default_tags: tagging resource types that were untagged before (IAM
  # roles, API Gateway, ...) needs extra actions the deploy role may not have.
}

data "aws_region" "current" {}
data "aws_caller_identity" "current" {}
