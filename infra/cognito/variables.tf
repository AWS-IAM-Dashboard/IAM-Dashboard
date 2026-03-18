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

variable "test_user_email" {
  description = "Email address for the seeded testUser account"
  type        = string
}

variable "cognito_domain_prefix" {
  description = "Hosted UI domain prefix for the Cognito user pool"
  type        = string
}

variable "seed_user_password" {
  description = "Shared permanent password for seeded Cognito users"
  type        = string
  default     = "Admin123!"
  sensitive   = true
}

variable "callback_urls" {
  description = "OAuth callback URLs for the Cognito app client"
  type        = list(string)
  default     = ["http://localhost:3001/callback"]
}

variable "logout_urls" {
  description = "OAuth logout URLs for the Cognito app client"
  type        = list(string)
  default     = ["http://localhost:3001/logout"]
}
