output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID (for cache invalidation in CI/CD)"
  value       = aws_cloudfront_distribution.iam_dashboard.id
}

output "cloudfront_domain_name" {
  description = "CloudFront distribution domain name (e.g. d1234abcd.cloudfront.net)"
  value       = aws_cloudfront_distribution.iam_dashboard.domain_name
}

output "cloudfront_hosted_zone_id" {
  description = "CloudFront hosted zone ID (for Route53 alias if needed)"
  value       = aws_cloudfront_distribution.iam_dashboard.hosted_zone_id
}

output "cloudfront_url" {
  description = "Full CloudFront URL for the frontend"
  value       = "https://${aws_cloudfront_distribution.iam_dashboard.domain_name}"
}
