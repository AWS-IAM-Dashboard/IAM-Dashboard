output "s3_bucket_name" {
  description = "Name of the S3 bucket"
  value       = aws_s3_bucket.frontend.bucket
}

output "s3_bucket_arn" {
  description = "ARN of the S3 bucket"
  value       = aws_s3_bucket.frontend.arn
}

output "s3_bucket_domain_name" {
  description = "Domain name of the S3 bucket"
  value       = aws_s3_bucket.frontend.bucket_domain_name
}

output "s3_bucket_website_endpoint" {
  description = "Website endpoint for the S3 bucket (if static hosting is enabled)"
  value       = aws_s3_bucket_website_configuration.frontend.website_endpoint
}

output "s3_logging_bucket_name" {
  description = "Name of the S3 access logging bucket"
  value       = aws_s3_bucket.frontend_logs.bucket
}

output "s3_logging_bucket_arn" {
  description = "ARN of the S3 access logging bucket"
  value       = aws_s3_bucket.frontend_logs.arn
}
