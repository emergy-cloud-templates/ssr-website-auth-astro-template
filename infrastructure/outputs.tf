# The Update Infrastructure workflow reads "<env>_cdn_url" to publish each
# environment's URL on its GitHub Deployment. Keep these names.
output "dev_cdn_url" {
  description = "Public URL of the dev environment (null when disabled)."
  value       = try(module.website_dev[0].url, null)
}

output "staging_cdn_url" {
  description = "Public URL of the staging environment (null when disabled)."
  value       = try(module.website_staging[0].url, null)
}

output "prod_cdn_url" {
  description = "Public URL of the prod environment (null when disabled)."
  value       = try(module.website_prod[0].url, null)
}

output "cloudfront_domains" {
  description = "CloudFront domain per environment: point your DNS records (CNAME / alias) here."
  value = {
    for env, m in {
      dev     = module.website_dev
      staging = module.website_staging
      prod    = module.website_prod
    } : env => m[0].distribution_domain_name if length(m) > 0
  }
}

output "artifacts_bucket" {
  description = "Bucket the Build workflow uploads artifacts to."
  value       = aws_s3_bucket.artifacts.bucket
}
