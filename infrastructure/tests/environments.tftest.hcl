# Offline tests for the environment and domain rules: `terraform test`.
# Mock providers mean no AWS credentials and nothing created.

mock_provider "aws" {
  mock_data "aws_region" {
    defaults = {
      region = "us-east-1"
    }
  }
  mock_resource "aws_cloudfront_distribution" {
    defaults = {
      domain_name = "d111111abcdef8.cloudfront.net"
      arn         = "arn:aws:cloudfront::123456789012:distribution/EDFDVBD6EXAMPLE"
    }
  }
  mock_resource "aws_iam_role" {
    defaults = {
      arn = "arn:aws:iam::123456789012:role/example"
    }
  }
  mock_resource "aws_lambda_layer_version" {
    defaults = {
      arn = "arn:aws:lambda:us-east-1:123456789012:layer:example:1"
    }
  }
  mock_resource "aws_lambda_function" {
    defaults = {
      invoke_arn = "arn:aws:apigateway:us-east-1:lambda:path/2015-03-31/functions/arn:aws:lambda:us-east-1:123456789012:function:example/invocations"
    }
  }
  mock_resource "aws_api_gateway_rest_api" {
    defaults = {
      execution_arn = "arn:aws:execute-api:us-east-1:123456789012:abc123"
    }
  }
}
mock_provider "random" {}
mock_provider "archive" {}

variables {
  aws_account_number = "123456789012"
  project_id         = "example-project"
}

run "default_envs_skip_staging" {
  command = plan

  assert {
    condition     = length(module.website_dev) == 1 && length(module.website_prod) == 1
    error_message = "dev and prod should be created by default"
  }
  assert {
    condition     = length(module.website_staging) == 0
    error_message = "staging must not be created unless listed in envs"
  }
}

run "all_envs" {
  command = plan
  variables {
    envs = "dev, staging ,prod"
  }

  assert {
    condition     = length(module.website_staging) == 1
    error_message = "staging should be created when listed in envs"
  }
}

run "invalid_env_is_rejected" {
  command = plan
  variables {
    envs = "dev,qa"
  }
  expect_failures = [var.envs]
}

run "no_domain_without_certificate" {
  command = plan
  variables {
    base_domain = "example.com"
  }

  assert {
    condition     = local.sites.prod.hostname == "" && local.sites.dev.hostname == ""
    error_message = "a hostname without a certificate must not be attached"
  }
}

run "derived_hostnames_and_apex_redirect" {
  command = plan
  variables {
    envs                = "dev,staging,prod"
    base_domain         = "example.com"
    aws_website_acm_arn = "arn:aws:acm:us-east-1:123456789012:certificate/11111111-2222-3333-4444-555555555555"
  }

  assert {
    condition     = local.sites.prod.hostname == "www.example.com" && local.sites.prod.redirect_apex
    error_message = "prod should use www.<base> and redirect the apex"
  }
  assert {
    condition     = local.sites.dev.hostname == "dev.example.com" && !local.sites.dev.redirect_apex
    error_message = "dev should use dev.<base> without apex redirect"
  }
  assert {
    condition     = local.sites.staging.hostname == "staging.example.com"
    error_message = "staging should use staging.<base>"
  }
}

run "explicit_hostname_wins" {
  command = plan
  variables {
    hostname_prod            = "app.example.org"
    base_domain_prod         = "example.org"
    aws_website_acm_arn_prod = "arn:aws:acm:us-east-1:123456789012:certificate/11111111-2222-3333-4444-555555555555"
  }

  assert {
    condition     = local.sites.prod.hostname == "app.example.org" && !local.sites.prod.redirect_apex
    error_message = "hostname_prod should be used as-is, without apex redirect"
  }
  assert {
    condition     = local.sites.dev.hostname == ""
    error_message = "dev has no certificate, so no custom domain"
  }
}
