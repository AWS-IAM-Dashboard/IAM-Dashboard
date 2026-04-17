variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "prod"
}

variable "project_name" {
  description = "Project name for tagging"
  type        = string
  default     = "IAMDash"
}

variable "lambda_function_name" {
  description = "Name of the account management Lambda function"
  type        = string
  default     = "iam-dashboard-account-mgmt"
}

variable "lambda_role_name" {
  description = "Name of the IAM execution role for the account management Lambda"
  type        = string
  default     = "iam-dashboard-account-mgmt-role"
}

variable "lambda_runtime" {
  description = "Lambda runtime"
  type        = string
  default     = "python3.13"
}

variable "lambda_architecture" {
  description = "Lambda architecture (arm64 or x86_64)"
  type        = string
  default     = "arm64"
  validation {
    condition     = contains(["arm64", "x86_64"], var.lambda_architecture)
    error_message = "Lambda architecture must be either 'arm64' or 'x86_64'."
  }
}

variable "lambda_timeout" {
  description = "Lambda function timeout in seconds"
  type        = number
  default     = 30
}

variable "lambda_memory_size" {
  description = "Lambda function memory size in MB"
  type        = number
  default     = 256
}

variable "lambda_zip_file" {
  description = "Path to Lambda deployment package ZIP file (leave empty to build from source)"
  type        = string
  default     = ""
}

variable "lambda_kms_key_arn" {
  description = "ARN of the KMS key used to encrypt Lambda environment variables"
  type        = string
}

variable "lambda_reserved_concurrency" {
  description = "Reserved concurrency limit for the Lambda function (null = use account unreserved pool)"
  type        = number
  default     = null
  validation {
    condition     = var.lambda_reserved_concurrency == null || var.lambda_reserved_concurrency >= 1
    error_message = "lambda_reserved_concurrency must be null or a number >= 1."
  }
}

variable "enable_xray_tracing" {
  description = "Enable AWS X-Ray tracing for the Lambda function"
  type        = bool
  default     = true
}

variable "accounts_table_name" {
  description = "Name of the DynamoDB accounts table"
  type        = string
  default     = "iam-dashboard-accounts"
}

variable "accounts_table_arn" {
  description = "ARN of the DynamoDB accounts table"
  type        = string
}

variable "session_table_name" {
  description = "Name of the DynamoDB auth sessions table"
  type        = string
}

variable "session_table_arn" {
  description = "ARN of the DynamoDB auth sessions table"
  type        = string
}

variable "cross_account_role_name" {
  description = "Name of the cross-account IAM role to assume in member accounts"
  type        = string
  default     = "iam-dashboard-scan-role"
}

variable "cross_account_role_arn_pattern" {
  description = "Resource ARN pattern for sts:AssumeRole permission"
  type        = string
  default     = "arn:aws:iam::*:role/iam-dashboard-scan-role"
}
