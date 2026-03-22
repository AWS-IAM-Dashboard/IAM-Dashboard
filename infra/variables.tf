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

variable "test_user_email" {
  description = "Email address for the seeded Cognito testUser account"
  type        = string
  default     = "ajant001@fiu.edu"
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

variable "cloudfront_web_acl_id" {
  description = "Optional WAF Web ACL ARN for CloudFront"
  type        = string
  default     = null
}

variable "cognito_user_pool_name" {
  description = "Cognito User Pool name"
  type        = string
  default     = "iam-dashboard-user-pool"
}

variable "cognito_domain" {
  description = "Cognito Hosted UI domain prefix (globally unique)"
  type        = string
  default     = "iam-dashboard-auth"
}

variable "cognito_callback_urls" {
  description = "Allowed OAuth callback URLs for Cognito app client"
  type        = list(string)
  default     = ["http://localhost:3001/", "https://d33ytnxd7i6mo9.cloudfront.net/"]
}

variable "cognito_logout_urls" {
  description = "Allowed sign-out URLs for Cognito app client"
  type        = list(string)
  default     = ["http://localhost:3001/", "https://d33ytnxd7i6mo9.cloudfront.net/"]
}

variable "test_s3_endpoint" {
  description = "S3 endpoint for test s3 bucket"
  type        = string
  default     = "http://test-562559071105-us-east-1-an.s3-website-us-east-1.amazonaws.com"
}


