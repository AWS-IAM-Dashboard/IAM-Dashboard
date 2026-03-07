# CloudFront distribution for IAM Dashboard frontend (S3 static site).
# Serves the React SPA with default root object and SPA-friendly error responses.

resource "aws_cloudfront_distribution" "iam_dashboard" {
  origin {
    domain_name = var.s3_website_endpoint
    origin_id   = "iam-dashboard-s3-website-${var.project_name}"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "http-only"
      origin_ssl_protocols   = ["TLSv1.2"]
      origin_read_timeout    = 30
      origin_keepalive_timeout = 5
    }
  }

  enabled             = true
  is_ipv6_enabled     = true
  http_version        = "http2"
  price_class         = "PriceClass_All"
  default_root_object = "index.html"

  # Optional WAF (set in tfvars or leave null)
  web_acl_id = var.web_acl_id

  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "iam-dashboard-s3-website-${var.project_name}"
    compress               = true
    viewer_protocol_policy = "redirect-to-https"
    cache_policy_id        = "658327ea-f89d-4fab-a63d-7e88639e58f6"
  }

  # SPA routing: 403/404 from S3 → serve index.html so client-side router can handle the path
  custom_error_response {
    error_code            = 403
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 10
  }

  custom_error_response {
    error_code            = 404
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 10
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  tags = {
    Name        = "${var.project_name}-distribution"
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "terraform"
  }
}
