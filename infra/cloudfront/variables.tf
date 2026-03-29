variable "aws_region" {
  description = "AWS region"
  type        = string
}

variable "environment" {
  description = "Environment name (e.g. prod, dev)"
  type        = string
}

variable "project_name" {
  description = "Project name for resource naming"
  type        = string
}

variable "s3_website_endpoint" {
  description = "S3 website endpoint (e.g. bucket.s3-website-region.amazonaws.com) used as CloudFront origin"
  type        = string
}

variable "web_acl_id" {
  description = "Optional WAF Web ACL ARN to associate with the distribution"
  type        = string
}