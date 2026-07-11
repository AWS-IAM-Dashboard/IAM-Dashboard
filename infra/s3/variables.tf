variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "dev"
}

variable "project_name" {
  description = "Project name for tagging"
  type        = string
  default     = "IAMDash"
}

variable "block_public_access" {
  description = "Block public access to S3 bucket (set to false for static site hosting)"
  type        = bool
  default     = false
}

variable "s3_bucket_name" {
  description = "Name of the S3 bucket for static hosting"
  type        = string
  default     = "iam-dashboard-project"
}

variable "enable_static_hosting" {
  description = "Enable static website hosting for the S3 bucket"
  type        = bool
  default     = true
}

variable "s3_kms_key_arn" {
  description = "ARN of shared/root KMS CMK for S3 default encryption"
  type        = string
}

variable "s3_logging_bucket_name" {
  description = "Name of the S3 bucket for storing access logs"
  type        = string
}

variable "scan_notification_lambda_arn" {
  description = "ARN of the SES notification Lambda invoked for matching scan-result objects"
  type        = string
}

variable "scan_notification_prefix" {
  description = "S3 key prefix filter for scan-result notification objects"
  type        = string
}
