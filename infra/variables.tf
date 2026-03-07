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
  default     = ["http://localhost:5173/", "https://d33ytnxd7i6mo9.cloudfront.net/"]
}

variable "cognito_logout_urls" {
  description = "Allowed sign-out URLs for Cognito app client"
  type        = list(string)
  default     = ["http://localhost:5173/", "https://d33ytnxd7i6mo9.cloudfront.net/"]
}

