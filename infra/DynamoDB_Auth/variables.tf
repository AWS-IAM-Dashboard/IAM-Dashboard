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
