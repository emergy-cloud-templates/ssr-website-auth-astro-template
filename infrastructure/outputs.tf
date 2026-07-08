
output "dev_cdn_url" { value = module.website_dev.https_url }
output "staging_cdn_url" { value = module.website_staging.https_url }
output "prod_cdn_url" { value = module.website_prod.https_url }