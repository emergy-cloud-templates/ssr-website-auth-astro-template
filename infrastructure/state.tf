# Get the current region
data "aws_region" "current" {}

# Get the current account id
data "aws_canonical_user_id" "current" {}
data "aws_caller_identity" "current" {}

# Set the AWS Provider to assume the role to the env account
provider "aws" {
  region = "us-east-1"
}

# Config performed with CLI
terraform {
  backend "s3" {}
}
