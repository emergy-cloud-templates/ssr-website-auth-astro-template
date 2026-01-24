output "bucket_name" {
  value       = aws_s3_bucket.website.bucket
  description = "S3 bucket for the website origin"
}

output "distribution_id" {
  value       = aws_cloudfront_distribution.cdn.id
  description = "CloudFront distribution ID"
}

output "distribution_domain_name" {
  value       = aws_cloudfront_distribution.cdn.domain_name
  description = "CloudFront distribution domain name"
}

output "https_url" {
  value       = "https://${aws_cloudfront_distribution.cdn.domain_name}"
  description = "Convenient HTTPS URL for the distribution"
}

output "aliases" {
  value       = aws_cloudfront_distribution.cdn.aliases
  description = "Configured aliases (if any)"
}

output "api_gateway_id" {
  value       = aws_api_gateway_rest_api.website_ssr.id
  description = "API Gateway Deployment ID"

}
