output "url" {
  description = "Public URL: the custom hostname when configured, else the CloudFront domain."
  value       = local.public_url
}

output "bucket_name" {
  description = "S3 bucket holding the static assets."
  value       = aws_s3_bucket.website.bucket
}

output "distribution_id" {
  description = "CloudFront distribution ID."
  value       = aws_cloudfront_distribution.cdn.id
}

output "distribution_domain_name" {
  description = "CloudFront domain name (target for DNS records)."
  value       = aws_cloudfront_distribution.cdn.domain_name
}

output "aliases" {
  description = "Custom hostnames served by the distribution."
  value       = aws_cloudfront_distribution.cdn.aliases
}

output "function_name" {
  description = "SSR Lambda function name."
  value       = aws_lambda_function.website_ssr.function_name
}
