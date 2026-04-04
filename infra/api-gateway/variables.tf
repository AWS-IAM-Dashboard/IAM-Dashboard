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

variable "api_gateway_name" {
  description = "Name of the API Gateway"
  type        = string
  default     = "iam-dashboard-api"
}

variable "stage_name" {
  description = "API Gateway stage name"
  type        = string
  default     = "v1"
}

variable "auth_lambda_function_name" {
  description = "Function name of the auth Lambda (looked up via data source)"
  type        = string
}

variable "scanner_lambda_function_name" {
  description = "Function name of the scanner Lambda (looked up via data source)"
  type        = string
}

variable "cors_allowed_origins" {
  description = "List of allowed CORS origins"
  type        = list(string)
}

variable "cors_allowed_methods" {
  description = "List of allowed CORS methods"
  type        = list(string)
  default     = ["GET", "POST", "OPTIONS"]
}

variable "cors_allowed_headers" {
  description = "Allowed request headers for CORS"
  type        = list(string)
  default     = ["Content-Type", "Authorization", "X-Requested-With"]
}

variable "throttling_burst_limit" {
  description = "API Gateway throttling burst limit"
  type        = number
  default     = 100
}

variable "throttling_rate_limit" {
  description = "API Gateway throttling rate limit"
  type        = number
  default     = 50
}

variable "lambda_function_arn" {
  description = "ARN of the Lambda function to integrate (optional, placeholder for now)"
  type        = string
  default     = ""
}

variable "kms_key_arn" {
  description = "KMS key ARN used to encrypt CloudWatch Log Groups."
  type        = string
}

variable "route_authorization_type" {
  description = "Authorization type for API Gateway routes. Defaults to NONE for backend-managed session auth."
  type        = string
  default     = "NONE"
  validation {
    condition     = contains(["NONE", "JWT", "AWS_IAM", "CUSTOM"], var.route_authorization_type)
    error_message = "route_authorization_type must be one of NONE, JWT, AWS_IAM, CUSTOM."
  }
}

variable "cognito_issuer_url" {
  description = "Cognito OIDC issuer URL used for the (legacy/optional) JWT authorizer."
  type        = string
  default     = ""
}

variable "cognito_app_client_id" {
  description = "Cognito app client ID (audience) used for the (legacy/optional) JWT authorizer."
  type        = string
  default     = ""
}

