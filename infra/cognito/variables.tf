variable "aws_region" {
  description = "The AWS region to deploy the User Pool"
  type        = string
  default     = "us-east-1"
}

variable "user_pool_name" {
  type    = string
  default = "iam-dashboard-user-pool"
}

variable "cognito_domain" {
  description = "A unique prefix for login UI"
  type        = string
  default     = "iam-dashboard-auth-scanner" 
}

variable "callback_urls" {
  description = "Allowed callback URLs for the Cognito User Pool Client"
  type        = list(string)
}

# variable "logout_urls" {
# description = "Allowed logout URLs for the Cognito User Pool Client"
# type        = list(string)
#}