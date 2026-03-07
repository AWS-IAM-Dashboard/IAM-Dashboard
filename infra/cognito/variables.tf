variable "aws_region" {
  description = "AWS region"
  type        = string
}

variable "user_pool_name" {
  description = "Cognito User Pool name"
  type        = string
}

variable "cognito_domain" {
  description = "Cognito Hosted UI domain prefix (must be globally unique)"
  type        = string
}

variable "callback_urls" {
  description = "Allowed OAuth callback URLs"
  type        = list(string)
}

variable "logout_urls" {
  description = "Allowed sign-out URLs"
  type        = list(string)
  default     = []
}
