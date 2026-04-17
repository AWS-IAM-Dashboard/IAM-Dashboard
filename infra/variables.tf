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

variable "cognito_domain_prefix" {
  description = "Hosted UI domain prefix for the Cognito user pool"
  type        = string
  default     = "iam-dashboard-project-test"
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

variable "cognito_user_pool_name" {
  description = "Cognito User Pool name"
  type        = string
  default     = "iam-dashboard-user-pool"
}

variable "cognito_allowed_urls" {
  description = "Allowed OAuth callback URLs for Cognito app client"
  type        = list(string)
  default     = ["http://localhost:3001/", "https://d33ytnxd7i6mo9.cloudfront.net/", "http://localhost:5173/", "http://localhost:5001/"]
}

variable "allowed_urls" {
  description = "Browser origins allowed for CORS on API Gateway (scanner + auth HTTP APIs) and scanner Lambda responses. Must match SPA URLs (scheme + host + port, no path). Align with cognito_allowed_urls for the same deployments."
  type        = list(string)
  default     = ["http://localhost:3001", "https://d33ytnxd7i6mo9.cloudfront.net", "http://localhost:5173", "http://localhost:5001"]
}

variable "test_s3_endpoint" {
  description = "S3 endpoint for test s3 bucket"
  type        = string
  default     = "test-562559071105-us-east-1-an.s3-website-us-east-1.amazonaws.com"
}

variable "prod_s3_endpoint" {
  description = "S3 endpoint for production S3 bucket"
  type        = string
  default     = "iam-dashboard-project.s3-website-us-east-1.amazonaws.com"
}

variable "auth_lambda_function_name" {
  description = "Name of the existing Authentication Lambda function to look up"
  type        = string
  default     = "test-BFF"
}

variable "accounts_table_name" {
  description = "Name of the DynamoDB table that stores registered AWS accounts for multi-account scanning."
  type        = string
  default     = "iam-dashboard-accounts"
}

variable "account_mgmt_lambda_function_name" {
  description = "Name of the account management Lambda function"
  type        = string
  default     = "iam-dashboard-account-mgmt"
}

variable "account_mgmt_lambda_role_name" {
  description = "Name of the IAM execution role for the account management Lambda"
  type        = string
  default     = "iam-dashboard-account-mgmt-role"
}

variable "cross_account_role_name" {
  description = "Name of the cross-account IAM role to assume in member accounts"
  type        = string
  default     = "iam-dashboard-scan-role"
}

variable "cross_account_role_arn_pattern" {
  description = "Resource ARN pattern for sts:AssumeRole on cross-account scan roles"
  type        = string
  default     = "arn:aws:iam::*:role/iam-dashboard-scan-role"
}


variable "main_account_id" {
  description = "AWS account ID where the scanner and account-management Lambdas run."
  type        = string
  sensitive   = true
}
