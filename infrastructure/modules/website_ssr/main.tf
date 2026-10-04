data "aws_region" "current" {}
data "aws_caller_identity" "current" {}

locals {
  name             = "${var.project_id}-${var.environment}"
  use_custom_host  = var.hostname != "" && var.acm_certificate_arn != ""
  redirect_apex    = local.use_custom_host && var.redirect_apex && var.apex_host != ""
  aliases          = local.use_custom_host ? (local.redirect_apex ? [var.hostname, var.apex_host] : [var.hostname]) : []
  s3_origin_id     = "s3-origin-${aws_s3_bucket.website.id}"
  public_url       = local.use_custom_host ? "https://${var.hostname}" : "https://${aws_cloudfront_distribution.cdn.domain_name}"
  tags             = { env = var.environment, projectId = var.project_id }
  managed_cache_id = "658327ea-f89d-4fab-a63d-7e88639e58f6" # AWS managed "CachingOptimized"
  stage_name       = "prod"                                 # API Gateway stage (one per API, one API per env)

  # Paths served straight from the S3 bucket (Astro's dist/client).
  # Everything else is rendered by the Lambda.
  static_paths = ["/_astro/*", "/favicon.*", "/robots.txt", "/sitemap*", "/ads.txt", "/version.txt", "/~partytown/*"]

  content_security_policy = join(" ", [
    "default-src 'self';",
    "script-src 'self' 'unsafe-inline';",
    "style-src 'self' 'unsafe-inline';",
    "img-src 'self' data: https:;",
    "font-src 'self' data:;",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co;",
    "object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self';",
  ])
}

# -----------------------------------------------------------------------------
# Static assets: private bucket, readable only by this CloudFront distribution
# -----------------------------------------------------------------------------
resource "aws_s3_bucket" "website" {
  bucket        = "${local.name}-website"
  force_destroy = true
  tags          = merge(local.tags, { Name = "${var.project_id} ${var.environment} website" })
}

resource "aws_s3_bucket_public_access_block" "website" {
  bucket                  = aws_s3_bucket.website.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_cloudfront_origin_access_control" "oac" {
  name                              = "${local.name}-oac"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_s3_bucket_policy" "allow_cloudfront_oac" {
  bucket = aws_s3_bucket.website.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "AllowCloudFrontServicePrincipalReadOnly"
      Effect    = "Allow"
      Principal = { Service = "cloudfront.amazonaws.com" }
      Action    = ["s3:GetObject"]
      Resource  = "${aws_s3_bucket.website.arn}/*"
      Condition = { StringEquals = { "AWS:SourceArn" = aws_cloudfront_distribution.cdn.arn } }
    }]
  })
}

# -----------------------------------------------------------------------------
# Shared secret between CloudFront and the Lambda: requests that do not come
# through CloudFront (someone calling the execute-api URL directly) get a 403.
# -----------------------------------------------------------------------------
resource "random_password" "origin_verify" {
  length  = 48
  special = false
}

# -----------------------------------------------------------------------------
# Viewer-request function, on every behavior:
#  - copies the viewer's Host into X-Viewer-Host (API Gateway needs its own
#    Host; ssr/shim.js restores the public one so Astro's CSRF check and
#    emailed links use the real domain),
#  - when enabled, redirects the apex domain to the www hostname.
# -----------------------------------------------------------------------------
resource "aws_cloudfront_function" "viewer_request" {
  name    = "${local.name}-viewer-request"
  runtime = "cloudfront-js-2.0"
  comment = "Forward viewer host${local.redirect_apex ? ", redirect ${var.apex_host} to ${var.hostname}" : ""}"
  publish = true

  code = <<-EOT
  function handler(event) {
    var request = event.request;
    var host = request.headers.host.value;
    %{if local.redirect_apex~}
    if (host === "${var.apex_host}") {
      var query = request.querystring || {};
      var parts = [];
      for (var key in query) {
        var entry = query[key];
        if (entry.multiValue) {
          for (var i = 0; i < entry.multiValue.length; i++) parts.push(key + "=" + entry.multiValue[i].value);
        } else {
          parts.push(key + "=" + entry.value);
        }
      }
      return {
        statusCode: 301,
        statusDescription: "Moved Permanently",
        headers: { location: { value: "https://${var.hostname}" + request.uri + (parts.length ? "?" + parts.join("&") : "") } }
      };
    }
    %{endif~}
    request.headers["x-viewer-host"] = { value: host };
    return request;
  }
  EOT
}

# -----------------------------------------------------------------------------
# Caching
# -----------------------------------------------------------------------------
# SSR responses are NOT cached unless the page opts in with a Cache-Control
# header (default_ttl = 0). Cookies and query strings reach the Lambda.
resource "aws_cloudfront_cache_policy" "website_ssr" {
  name        = "${local.name}-website_ssr"
  default_ttl = 0
  max_ttl     = 31536000
  min_ttl     = 0

  parameters_in_cache_key_and_forwarded_to_origin {
    enable_accept_encoding_brotli = true
    enable_accept_encoding_gzip   = true

    cookies_config {
      cookie_behavior = "all"
    }
    headers_config {
      header_behavior = "whitelist"
      headers {
        items = ["Origin", "X-Viewer-Host"]
      }
    }
    query_strings_config {
      query_string_behavior = "all"
    }
  }
}

# HTML / SSR responses: security headers. Pages decide their own Cache-Control.
resource "aws_cloudfront_response_headers_policy" "html_secure" {
  name = "${local.name}-html-secure"

  security_headers_config {
    content_security_policy {
      override                = true
      content_security_policy = local.content_security_policy
    }
    strict_transport_security {
      override                   = true
      access_control_max_age_sec = var.environment == "prod" ? 31536000 : 300
      include_subdomains         = true
      preload                    = var.environment == "prod"
    }
    content_type_options {
      override = true
    }
    referrer_policy {
      override        = true
      referrer_policy = "strict-origin-when-cross-origin"
    }
    frame_options {
      override     = true
      frame_option = "DENY"
    }
  }

  custom_headers_config {
    items {
      header   = "Permissions-Policy"
      value    = "camera=(), microphone=(), geolocation=(), payment=()"
      override = true
    }
    items {
      header   = "Cross-Origin-Opener-Policy"
      value    = "same-origin"
      override = true
    }
    items {
      # Only applied when the page did not set its own Cache-Control.
      header   = "Cache-Control"
      value    = "no-cache"
      override = false
    }
  }
}

# Static assets: same security headers, long browser cache (/_astro/* files
# are content-hashed, so a new build never reuses a URL).
resource "aws_cloudfront_response_headers_policy" "assets_secure" {
  name = "${local.name}-assets-secure"

  security_headers_config {
    content_security_policy {
      override                = true
      content_security_policy = local.content_security_policy
    }
    strict_transport_security {
      override                   = true
      access_control_max_age_sec = var.environment == "prod" ? 31536000 : 300
      include_subdomains         = true
      preload                    = var.environment == "prod"
    }
    content_type_options {
      override = true
    }
    referrer_policy {
      override        = true
      referrer_policy = "strict-origin-when-cross-origin"
    }
    frame_options {
      override     = true
      frame_option = "DENY"
    }
  }

  custom_headers_config {
    items {
      header   = "Permissions-Policy"
      value    = "camera=(), microphone=(), geolocation=(), payment=()"
      override = true
    }
    items {
      header   = "Cross-Origin-Opener-Policy"
      value    = "same-origin"
      override = true
    }
    items {
      header   = "Cache-Control"
      value    = "public, max-age=31536000, immutable"
      override = true
    }
  }
}

# -----------------------------------------------------------------------------
# CloudFront distribution
# -----------------------------------------------------------------------------
resource "aws_cloudfront_distribution" "cdn" {
  enabled         = true
  is_ipv6_enabled = true
  comment         = "${var.project_id} ${var.environment} website CDN"
  price_class     = var.price_class
  aliases         = local.aliases
  # Wait until every edge location has the new configuration: the Lambda's
  # ORIGIN_VERIFY_SECRET is only updated afterwards (see lambda.tf), so
  # requests never reach it without the matching header.
  wait_for_deployment = true
  tags                = local.tags

  origin {
    origin_id                = local.s3_origin_id
    domain_name              = aws_s3_bucket.website.bucket_regional_domain_name
    origin_access_control_id = aws_cloudfront_origin_access_control.oac.id
  }

  origin {
    origin_id   = aws_api_gateway_rest_api.website_ssr.id
    domain_name = "${aws_api_gateway_rest_api.website_ssr.id}.execute-api.${data.aws_region.current.region}.amazonaws.com"
    # Built from the API id (not the stage) so the distribution does not
    # depend on the Lambda, which must be updated after it.
    origin_path = "/${local.stage_name}"

    custom_header {
      name  = "x-origin-verify"
      value = random_password.origin_verify.result
    }

    custom_origin_config {
      http_port                = 80
      https_port               = 443
      origin_protocol_policy   = "https-only"
      origin_ssl_protocols     = ["TLSv1.2"]
      origin_keepalive_timeout = 5
      origin_read_timeout      = 30
    }
  }

  dynamic "ordered_cache_behavior" {
    for_each = local.static_paths
    content {
      path_pattern               = ordered_cache_behavior.value
      allowed_methods            = ["GET", "HEAD", "OPTIONS"]
      cached_methods             = ["GET", "HEAD"]
      target_origin_id           = local.s3_origin_id
      cache_policy_id            = local.managed_cache_id
      response_headers_policy_id = aws_cloudfront_response_headers_policy.assets_secure.id
      compress                   = true
      viewer_protocol_policy     = "redirect-to-https"

      function_association {
        event_type   = "viewer-request"
        function_arn = aws_cloudfront_function.viewer_request.arn
      }
    }
  }

  default_cache_behavior {
    allowed_methods            = ["GET", "HEAD", "OPTIONS", "POST", "PUT", "PATCH", "DELETE"]
    cached_methods             = ["GET", "HEAD"]
    target_origin_id           = aws_api_gateway_rest_api.website_ssr.id
    cache_policy_id            = aws_cloudfront_cache_policy.website_ssr.id
    response_headers_policy_id = aws_cloudfront_response_headers_policy.html_secure.id
    compress                   = true
    viewer_protocol_policy     = "redirect-to-https"

    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.viewer_request.arn
    }
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn            = local.use_custom_host ? var.acm_certificate_arn : null
    ssl_support_method             = local.use_custom_host ? "sni-only" : null
    minimum_protocol_version       = local.use_custom_host ? "TLSv1.2_2021" : null
    cloudfront_default_certificate = !local.use_custom_host
  }
}
