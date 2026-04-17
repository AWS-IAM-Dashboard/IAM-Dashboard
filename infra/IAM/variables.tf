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

variable "role_name" {
  description = "Name of the cross-account scan role"
  type        = string
  default     = "iam-dashboard-scan-role"
}

variable "main_account_id" {
  description = "AWS account ID where the scanner Lambda execution role lives"
  type        = string
}

variable "account_management_lambda_role_name" {
  description = "Name of the Account Management lambda function"
  type        = string
  default     = "iam-dashboard-account-mgmt-role"
}

variable "scanner_lambda_role_name" {
  description = "Name of the scanner Lambda execution role in the main account"
  type        = string
  default     = "iam-dashboard-lambda-role"
}
