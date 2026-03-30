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
  description = "Name of the DynamoDB table for auth sessions"
  type        = string
  default     = "iam-dashboard-auth-sessions-test"
}

variable "dynamodb_kms_key_arn" {
  description = "KMS key for server side encryption"
  type        = string
}

variable "enable_point_in_time_recovery" {
  description = "Enable point-in-time recovery for DynamoDB table"
  type        = bool
  default     = true
}