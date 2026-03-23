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

variable "cognito_domain_prefix" {
  description = "Hosted UI domain prefix for the Cognito user pool"
  type        = string
  default     = "iam-dashboard-project-test"
}

variable "callback_urls" {
  description = "OAuth callback URLs for the Cognito app client"
  type        = list(string)
}

variable "logout_urls" {
  description = "OAuth logout URLs for the Cognito app client"
  type        = list(string)
}
