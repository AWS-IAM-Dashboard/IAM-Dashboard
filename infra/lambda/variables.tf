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

variable "lambda_role_name" {
  description = "Name of the IAM role for Lambda function"
  type        = string
  default     = "iam-dashboard-lambda-role"
}

variable "lambda_function_name" {
  description = "Name of the Lambda function"
  type        = string
  default     = "iam-dashboard-scanner"
}

variable "lambda_runtime" {
  description = "Lambda runtime (e.g., python3.13, python3.9)"
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
  default     = 300
}

variable "lambda_memory_size" {
  description = "Lambda function memory size in MB"
  type        = number
  default     = 512
}

variable "lambda_zip_file" {
  description = "Path to Lambda deployment package ZIP file (leave empty for placeholder)"
  type        = string
  default     = ""
}

variable "lambda_environment_variables" {
  description = "Additional environment variables for Lambda function"
  type        = map(string)
  default     = {}
}

variable "lambda_kms_key_arn" {
  description = "ARN of the shared/root KMS CMK used to encrypt Lambda environment variables"
  type        = string
}

variable "enable_xray_tracing" {
  description = "Enable AWS X-Ray tracing for the Lambda function"
  type        = bool
  default     = true
}

variable "lambda_reserved_concurrency" {
  description = "Reserved concurrency limit for the Lambda function to control scaling/cost"
  type        = number
  default     = 5
}

variable "dynamodb_table_name" {
  description = "Name of the DynamoDB table for scan results"
  type        = string
  default     = "iam-dashboard-scan-results"
}

variable "s3_bucket_name" {
  description = "Name of the S3 bucket for scan results"
  type        = string
  default     = "iam-dashboard-project"
}

