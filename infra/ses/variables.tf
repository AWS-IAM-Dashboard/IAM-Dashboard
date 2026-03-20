variable "aws_region" {
  description = "AWS region for SES resources"
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

variable "sender_email" {
  description = "SES sender identity for sandbox-mode scan notifications"
  type        = string
  default     = "jport081@fiu.edu"
}

variable "recipient_email" {
  description = "SES recipient identity for sandbox-mode scan notifications"
  type        = string
  default     = "jport081@fiu.edu"
}
