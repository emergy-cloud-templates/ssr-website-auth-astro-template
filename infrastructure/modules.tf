# Define all your environment configs in one place
locals {
  environments = {
    prod = {
      environment              = "prod"
      base_domain              = var.base_domain
      project_id               = var.project_id
      public_supabase_url      = var.prod_supabase_url
      public_supabase_anon_key = var.prod_supabase_anon_key
      # Add any other env-specific variables here
      # custom_setting     = "prod-value"
    }
    dev = {
      environment              = "dev"
      base_domain              = var.base_domain
      project_id               = var.project_id
      public_supabase_url      = var.dev_supabase_url
      public_supabase_anon_key = var.dev_supabase_anon_key
      # custom_setting     = "dev-value"
    }
    staging = {
      environment              = "staging"
      base_domain              = var.base_domain
      project_id               = var.project_id
      public_supabase_url      = var.staging_supabase_url
      public_supabase_anon_key = var.staging_supabase_anon_key
      # custom_setting     = "staging-value"
    }
  }
}


# -------------------------
# PROD (www.example.com with apex redirect)
# -------------------------
module "website_prod" {
  source              = "./modules/website_ssr"
  env_config          = local.environments["prod"]
  lambda_layer_arn    = aws_lambda_layer_version.lambda_layer_website_ssr.arn
  lambda_role_arn     = aws_iam_role.lambda_exec_website_ssr.arn
  lambda_zip_path     = data.archive_file.lambda_website_ssr_zip.output_path
  acm_certificate_arn = var.aws_website_acm_arn
}

module "website_dev" {
  source              = "./modules/website_ssr"
  env_config          = local.environments["dev"]
  lambda_layer_arn    = aws_lambda_layer_version.lambda_layer_website_ssr.arn
  lambda_role_arn     = aws_iam_role.lambda_exec_website_ssr.arn
  lambda_zip_path     = data.archive_file.lambda_website_ssr_zip.output_path
  acm_certificate_arn = var.aws_website_acm_arn
}

module "website_staging" {
  source              = "./modules/website_ssr"
  env_config          = local.environments["staging"]
  lambda_layer_arn    = aws_lambda_layer_version.lambda_layer_website_ssr.arn
  lambda_role_arn     = aws_iam_role.lambda_exec_website_ssr.arn
  lambda_zip_path     = data.archive_file.lambda_website_ssr_zip.output_path
  acm_certificate_arn = var.aws_website_acm_arn
}
