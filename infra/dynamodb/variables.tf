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

variable "dynamodb_table_name" {
  description = "Name of the DynamoDB table for scan results"
  type        = string
  default     = "iam-dashboard-scan-results"
}

variable "enable_scanner_type_index" {
  description = "Enable Global Secondary Index for scanner_type-based queries"
  type        = bool
  default     = false
}

variable "enable_point_in_time_recovery" {
  description = "Enable point-in-time recovery for DynamoDB table"
  type        = bool
  default     = true
}

variable "dynamodb_kms_key_arn" {
  description = "ARN of the shared/root KMS CMK to use for DynamoDB table encryption"
  type        = string
}

