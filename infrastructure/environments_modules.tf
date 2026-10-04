# One full website stack (S3 + CloudFront + API Gateway + Lambda) per enabled
# environment. `count` follows var.envs, so disabled environments cost nothing.

module "website_dev" {
  count  = contains(local.enabled_envs, "dev") ? 1 : 0
  source = "./modules/website_ssr"

  environment         = "dev"
  project_id          = var.project_id
  hostname            = local.sites.dev.hostname
  acm_certificate_arn = local.sites.dev.acm_arn
  redirect_apex       = local.sites.dev.redirect_apex
  apex_host           = local.sites.dev.apex_host
  lambda_layer_arn    = aws_lambda_layer_version.lambda_layer_website_ssr.arn
  lambda_role_arn     = aws_iam_role.lambda_exec_website_ssr.arn
  lambda_zip_path     = data.archive_file.lambda_website_ssr_zip.output_path
  lambda_memory_size  = var.lambda_memory_size
  log_retention_days  = var.log_retention_days
  price_class         = var.price_class
}

module "website_staging" {
  count  = contains(local.enabled_envs, "staging") ? 1 : 0
  source = "./modules/website_ssr"

  environment         = "staging"
  project_id          = var.project_id
  hostname            = local.sites.staging.hostname
  acm_certificate_arn = local.sites.staging.acm_arn
  redirect_apex       = local.sites.staging.redirect_apex
  apex_host           = local.sites.staging.apex_host
  lambda_layer_arn    = aws_lambda_layer_version.lambda_layer_website_ssr.arn
  lambda_role_arn     = aws_iam_role.lambda_exec_website_ssr.arn
  lambda_zip_path     = data.archive_file.lambda_website_ssr_zip.output_path
  lambda_memory_size  = var.lambda_memory_size
  log_retention_days  = var.log_retention_days
  price_class         = var.price_class
}

module "website_prod" {
  count  = contains(local.enabled_envs, "prod") ? 1 : 0
  source = "./modules/website_ssr"

  environment         = "prod"
  project_id          = var.project_id
  hostname            = local.sites.prod.hostname
  acm_certificate_arn = local.sites.prod.acm_arn
  redirect_apex       = local.sites.prod.redirect_apex
  apex_host           = local.sites.prod.apex_host
  lambda_layer_arn    = aws_lambda_layer_version.lambda_layer_website_ssr.arn
  lambda_role_arn     = aws_iam_role.lambda_exec_website_ssr.arn
  lambda_zip_path     = data.archive_file.lambda_website_ssr_zip.output_path
  lambda_memory_size  = var.lambda_memory_size
  log_retention_days  = var.log_retention_days
  price_class         = var.price_class
}

# Stacks created before environments became optional had no `count`: keep
# them (instead of destroying and recreating them) under their new address.
moved {
  from = module.website_dev
  to   = module.website_dev[0]
}
moved {
  from = module.website_staging
  to   = module.website_staging[0]
}
moved {
  from = module.website_prod
  to   = module.website_prod[0]
}
