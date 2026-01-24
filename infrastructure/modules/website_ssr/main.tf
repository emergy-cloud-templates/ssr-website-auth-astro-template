locals {
  # Should we attach a custom domain?
  use_custom_domain = var.env_config.base_domain != "" && var.acm_certificate_arn != ""

  # What hostname(s) should be used per environment?
  # dev -> dev.base_domain
  # staging -> staging.base_domain
  # prod -> www.base_domain (+ apex redirect)
  primary_host = var.env_config.environment == "prod" ? (
    var.env_config.base_domain == "" ? "" : "www.${var.env_config.base_domain}"
  ) : (
    var.env_config.base_domain == "" ? "" : "${var.env_config.environment}.${var.env_config.base_domain}"
  )

  apex_host      = var.env_config.base_domain
  include_apex   = var.env_config.environment == "prod" && local.use_custom_domain
  aliases        = local.use_custom_domain ? (
    local.include_apex ? [local.primary_host, local.apex_host] : [local.primary_host]
  ) : []

  # Only prod needs the apex -> www redirect function
  enable_apex_redirect = var.env_config.environment == "prod" && local.use_custom_domain
}

resource "aws_s3_bucket" "website" {
  bucket        = "${var.env_config.project_id}-${var.env_config.environment}-website"
  force_destroy = true
  tags = {
    Name       = "${var.env_config.project_id} ${var.env_config.environment} website"
    env        = var.env_config.environment
    projectId  = var.env_config.project_id
  }
}

resource "aws_s3_bucket_public_access_block" "website" {
  bucket                  = aws_s3_bucket.website.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_cloudfront_origin_access_control" "oac" {
  name                              = "${var.env_config.project_id}-${var.env_config.environment}-oac"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_distribution" "cdn" {
  enabled             = true
  comment             = "${var.env_config.project_id} ${var.env_config.environment} website CDN"
  default_root_object = ""
  wait_for_deployment = false
  origin {
    origin_id                = "s3-origin-${aws_s3_bucket.website.id}"
    domain_name              = aws_s3_bucket.website.bucket_regional_domain_name
    origin_access_control_id = aws_cloudfront_origin_access_control.oac.id

    # s3_origin_config {
    #   origin_access_identity = ""
    #  }
  }


  origin {
    domain_name = replace(replace(aws_api_gateway_stage.website_ssr.invoke_url, "https://", ""), "/prod", "")
    origin_id   = aws_api_gateway_rest_api.website_ssr.id

    origin_path = "/prod"
    custom_origin_config {
      http_port                = "80"
      https_port               = "443"
      origin_protocol_policy   = "https-only"
      origin_ssl_protocols     = ["TLSv1.2", "TLSv1.1"]
      origin_keepalive_timeout = 5
      origin_read_timeout      = 30
    }
  }


  ordered_cache_behavior {
    path_pattern     = "/public/*"
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "s3-origin-${aws_s3_bucket.website.id}"

    cache_policy_id = "658327ea-f89d-4fab-a63d-7e88639e58f6"
    response_headers_policy_id = aws_cloudfront_response_headers_policy.assets_secure.id

    compress               = true
    viewer_protocol_policy = "redirect-to-https"

    dynamic "function_association" {
      for_each = local.enable_apex_redirect ? [1] : []
      content {
        event_type   = "viewer-request"
        function_arn = aws_cloudfront_function.apex_to_www[0].arn
      }
    }
  }

  ordered_cache_behavior {
    path_pattern     = "/robots.txt"
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "s3-origin-${aws_s3_bucket.website.id}"

    cache_policy_id = "658327ea-f89d-4fab-a63d-7e88639e58f6"
    response_headers_policy_id = aws_cloudfront_response_headers_policy.assets_secure.id


    compress               = true
    viewer_protocol_policy = "redirect-to-https"

    dynamic "function_association" {
      for_each = local.enable_apex_redirect ? [1] : []
      content {
        event_type   = "viewer-request"
        function_arn = aws_cloudfront_function.apex_to_www[0].arn
      }
    }
  }
  ordered_cache_behavior {
    path_pattern     = "/ads.txt"
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "s3-origin-${aws_s3_bucket.website.id}"

    cache_policy_id = "658327ea-f89d-4fab-a63d-7e88639e58f6"
    response_headers_policy_id = aws_cloudfront_response_headers_policy.assets_secure.id

    compress               = true
    viewer_protocol_policy = "redirect-to-https"

    dynamic "function_association" {
      for_each = local.enable_apex_redirect ? [1] : []
      content {
        event_type   = "viewer-request"
        function_arn = aws_cloudfront_function.apex_to_www[0].arn
      }
    }
  }
  ordered_cache_behavior {
    path_pattern     = "/sitemap*"
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "s3-origin-${aws_s3_bucket.website.id}"

    cache_policy_id = "658327ea-f89d-4fab-a63d-7e88639e58f6"
    response_headers_policy_id = aws_cloudfront_response_headers_policy.assets_secure.id

    compress               = true
    viewer_protocol_policy = "redirect-to-https"

    dynamic "function_association" {
      for_each = local.enable_apex_redirect ? [1] : []
      content {
        event_type   = "viewer-request"
        function_arn = aws_cloudfront_function.apex_to_www[0].arn
      }
    }
  }

  ordered_cache_behavior {
    path_pattern     = "/version.txt"
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "s3-origin-${aws_s3_bucket.website.id}"

    cache_policy_id = "658327ea-f89d-4fab-a63d-7e88639e58f6"
    response_headers_policy_id = aws_cloudfront_response_headers_policy.assets_secure.id

    compress               = true
    viewer_protocol_policy = "redirect-to-https"

    dynamic "function_association" {
      for_each = local.enable_apex_redirect ? [1] : []
      content {
        event_type   = "viewer-request"
        function_arn = aws_cloudfront_function.apex_to_www[0].arn
      }
    }
  }
  ordered_cache_behavior {
    path_pattern     = "/_astro/*"
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "s3-origin-${aws_s3_bucket.website.id}"

    cache_policy_id = "658327ea-f89d-4fab-a63d-7e88639e58f6"

    compress               = true
    viewer_protocol_policy = "redirect-to-https"
    response_headers_policy_id = aws_cloudfront_response_headers_policy.assets_secure.id

    dynamic "function_association" {
      for_each = local.enable_apex_redirect ? [1] : []
      content {
        event_type   = "viewer-request"
        function_arn = aws_cloudfront_function.apex_to_www[0].arn
      }
    }
  }
  ordered_cache_behavior {
    path_pattern     = "/favicon.*"
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "s3-origin-${aws_s3_bucket.website.id}"

    cache_policy_id = "658327ea-f89d-4fab-a63d-7e88639e58f6"
    response_headers_policy_id = aws_cloudfront_response_headers_policy.assets_secure.id

    compress               = true
    viewer_protocol_policy = "redirect-to-https"

    dynamic "function_association" {
      for_each = local.enable_apex_redirect ? [1] : []
      content {
        event_type   = "viewer-request"
        function_arn = aws_cloudfront_function.apex_to_www[0].arn
      }
    }
  }
  ordered_cache_behavior {
    path_pattern     = "/~partytow*"
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "s3-origin-${aws_s3_bucket.website.id}"

    cache_policy_id = "658327ea-f89d-4fab-a63d-7e88639e58f6"
    response_headers_policy_id = aws_cloudfront_response_headers_policy.assets_secure.id

    compress               = true
    viewer_protocol_policy = "redirect-to-https"

    dynamic "function_association" {
      for_each = local.enable_apex_redirect ? [1] : []
      content {
        event_type   = "viewer-request"
        function_arn = aws_cloudfront_function.apex_to_www[0].arn
      }
    }
  }

  is_ipv6_enabled     = true

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS", "POST", "PUT", "PATCH", "DELETE"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = aws_api_gateway_rest_api.website_ssr.id
    cache_policy_id  = aws_cloudfront_cache_policy.website_ssr.id
    response_headers_policy_id = aws_cloudfront_response_headers_policy.html_secure.id

    min_ttl                = 0
    compress               = true
    viewer_protocol_policy = "redirect-to-https"

    dynamic "function_association" {
      for_each = local.enable_apex_redirect ? [1] : []
      content {
        event_type   = "viewer-request"
        function_arn = aws_cloudfront_function.apex_to_www[0].arn
      }
    }
  }
  custom_error_response {
    error_code            = 404
    response_code         = 404
    response_page_path    = "/404.html"
    error_caching_min_ttl = 60
  }

  price_class = var.price_class

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  aliases = local.aliases

  viewer_certificate {
    acm_certificate_arn            = local.use_custom_domain ? var.acm_certificate_arn : null
    ssl_support_method             = local.use_custom_domain ? "sni-only" : null
    minimum_protocol_version       = local.use_custom_domain ? "TLSv1.2_2021" : null
    cloudfront_default_certificate = local.use_custom_domain ? false : true
  }

  tags = {
    env       = var.env_config.environment
    projectId = var.env_config.project_id
  }
}

resource "aws_s3_bucket_policy" "allow_cloudfront_oac" {
  bucket = aws_s3_bucket.website.id
  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Sid       : "AllowCloudFrontServicePrincipalReadOnly",
        Effect    : "Allow",
        Principal : { Service: "cloudfront.amazonaws.com" },
        Action    : ["s3:GetObject"],
        Resource  : "${aws_s3_bucket.website.arn}/*",
        Condition : {
          StringEquals : {
            "AWS:SourceArn" : aws_cloudfront_distribution.cdn.arn
          }
        }
      }
    ]
  })
}

# Only in prod: apex -> www redirect
resource "aws_cloudfront_function" "apex_to_www" {
  count   = local.enable_apex_redirect ? 1 : 0
  name    = "${var.env_config.project_id}-${var.env_config.environment}-apex-to-www"
  runtime = "cloudfront-js-1.0"
  comment = "Redirect apex ${local.apex_host} -> ${local.primary_host}"
  publish = true

  code = <<-EOT
  function handler(event) {
    var req  = event.request;
    var host = req.headers.host.value;

    if (host === "${local.apex_host}") {
      var q = req.querystring || {};
      var ks = Object.keys(q);
      var qs = ks.length ? ("?" + ks.map(function(k){ return k + "=" + q[k].value; }).join("&")) : "";
      return {
        statusCode: 301,
        statusDescription: "Moved Permanently",
        headers: { "location": { value: "https://${local.primary_host}" + req.uri + qs } }
      };
    }
    return req;
  }
  EOT
}



resource "aws_cloudfront_cache_policy" "website_ssr" {
  name = "${var.env_config.project_id}-${var.env_config.environment}-website_ssr"

  default_ttl = 86400
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
        items = ["Origin", "Authorization", "Referer"]
        # items = ["Origin", "Authorization", "Referer", "User-Agent"]
      }
    }
    query_strings_config {
      query_string_behavior = "all"
    }
  }
}

# HTML/SSR: no-cache + security headers
resource "aws_cloudfront_response_headers_policy" "html_secure" {
  name = "${var.env_config.project_id}-${var.env_config.environment}-html-secure"

  security_headers_config {
    content_security_policy {
      override = true
      # Updated CSP to support Astro SSR with inline scripts and Supabase authentication
      content_security_policy = "default-src 'self'; script-src 'self' 'unsafe-inline' https://*.supabase.co; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.supabase.co wss://*.supabase.co; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self';"
    }

    strict_transport_security {
      override                   = true
      access_control_max_age_sec = var.env_config.environment == "prod" ? 31536000 : 300
      include_subdomains         = true
      preload                    = var.env_config.environment == "prod" ? true : false
    }

    content_type_options { override = true }

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
      value    = "no-cache"
      override = true
    }
  }
}

# Assets: long cache + same security headers
resource "aws_cloudfront_response_headers_policy" "assets_secure" {
  name = "${var.env_config.project_id}-${var.env_config.environment}-assets-secure"

  security_headers_config {
    content_security_policy {
      override = true
      # Updated CSP to support Astro SSR with inline scripts and Supabase authentication
      content_security_policy = "default-src 'self'; script-src 'self' 'unsafe-inline' https://*.supabase.co; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.supabase.co wss://*.supabase.co; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self';"
    }
    strict_transport_security {
      override                   = true
      access_control_max_age_sec = var.env_config.environment == "prod" ? 31536000 : 300
      include_subdomains         = true
      preload                    = var.env_config.environment == "prod" ? true : false
    }
    content_type_options { override = true }
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