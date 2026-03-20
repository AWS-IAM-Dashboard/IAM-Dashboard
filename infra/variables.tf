variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "prod"
}

variable "project_name" {
  description = "Project name for tagging"
  type        = string
  default     = "IAMDash"
}

variable "github_repo_owner" {
  description = "GitHub repository owner"
  type        = string
  default     = "wakeensito"
}

variable "github_repo_name" {
  description = "GitHub repository name"
  type        = string
  default     = "IAM-Dashboard"
}

variable "s3_bucket_name" {
  description = "S3 bucket name for frontend static hosting"
  type        = string
  default     = "iam-dashboard-project"
}

variable "scan_results_s3_bucket_name" {
  description = "S3 bucket name for scan results storage"
  type        = string
  default     = "iam-dashboard-scan-results"
}

variable "scan_notification_prefix" {
  description = "S3 object prefix used for SES notification filtering"
  type        = string
  default     = "scan-result/prod"
}

variable "dynamodb_table_name" {
  description = "DynamoDB table name for scan results"
  type        = string
  default     = "iam-dashboard-scan-results"
}

variable "lambda_function_name" {
  description = "Lambda function name"
  type        = string
  default     = "iam-dashboard-scanner"
}

# Existing KMS key: alias or key ID. Use so Terraform does not create a key (CI has no kms:CreateKey).
# IMPORTANT: Do not hard-code real key IDs or aliases in code; set per-environment via
# TF_VAR_kms_key_id, terraform.tfvars (not committed), or CI environment/secrets.
variable "kms_key_id" {
  description = "ID or alias of the existing KMS key (e.g. alias/iamdash-prod-logs)"
  type        = string
  default     = ""
  validation {
    condition     = length(var.kms_key_id) > 0
    error_message = "kms_key_id must be set via TF_VAR_kms_key_id, terraform.tfvars, or environment-specific configuration."
  }
}

