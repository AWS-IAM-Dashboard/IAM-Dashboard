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

variable "github_actions_role_name" {
  description = "Name of the IAM role for GitHub Actions (must match existing role if importing)"
  type        = string
  default     = "iam-dashboard-deployer-prod"
}

variable "github_repo_owner" {
  description = "GitHub repository owner (username or organization)"
  type        = string
  default     = "wakeensito"
}

variable "github_repo_name" {
  description = "GitHub repository name"
  type        = string
  default     = "IAM-Dashboard"
}

variable "frontend_s3_bucket_name" {
  description = "S3 bucket name for frontend static hosting"
  type        = string
  default     = "iam-dashboard-frontend"
}

variable "scan_results_s3_bucket_name" {
  description = "S3 bucket name for scan results storage"
  type        = string
  default     = "iam-dashboard-scan-results"
}

variable "lambda_function_name" {
  description = "Lambda function name for deployment"
  type        = string
  default     = "iam-dashboard-scanner"
}

variable "dynamodb_table_name" {
  description = "DynamoDB table name for scan results"
  type        = string
  default     = "iam-dashboard-scan-results"
}

variable "terraform_state_bucket" {
  description = "S3 bucket name for Terraform state (optional)"
  type        = string
  default     = ""
}

variable "terraform_state_lock_table" {
  description = "DynamoDB table name for Terraform state locking (optional)"
  type        = string
  default     = ""
}

