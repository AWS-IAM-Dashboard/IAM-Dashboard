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
  description = "List of allowed CORS origins (no wildcards). Override via root module var.allowed_urls."
  type        = list(string)
  default = [
    "http://localhost:3001",
    "https://d33ytnxd7i6mo9.cloudfront.net",
    "http://localhost:5173",
    "http://localhost:5001",
  ]
}

variable "cors_allowed_methods" {
  description = "List of allowed CORS methods"
  type        = list(string)
  default     = ["GET", "POST", "DELETE", "OPTIONS"]
}

variable "cors_allowed_headers" {
  description = "Allowed request headers for CORS"
  type        = list(string)
  default     = ["Content-Type", "Authorization", "X-Requested-With"]
}

# Stage default_route_settings apply to individual scan routes (POST /scan/* except /scan/full).
variable "throttling_burst_limit" {
  description = "Burst limit (concurrent bucket) for individual scan routes; steady rate is throttling_rate_limit RPS."
  type        = number
  default     = 50
}

variable "throttling_rate_limit" {
  description = "Steady-state requests per second for individual scan routes (POST /scan/* except /scan/full)."
  type        = number
  default     = 25
}

variable "throttling_scan_full_burst_limit" {
  description = "Burst limit for POST /scan/full (runs all scanners; kept low to reduce abuse and cost)."
  type        = number
  default     = 10
}

variable "throttling_scan_full_rate_limit" {
  description = "Steady-state RPS for POST /scan/full."
  type        = number
  default     = 5
}

variable "throttling_auth_burst_limit" {
  description = "Burst limit for auth routes (login/logout/session)."
  type        = number
  default     = 70
}

variable "throttling_auth_rate_limit" {
  description = "Steady-state RPS for auth routes."
  type        = number
  default     = 35
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


variable "account_mgmt_lambda_function_name" {
  description = "Function name of the account management Lambda"
  type        = string
}

variable "account_mgmt_lambda_invoke_arn" {
  description = "Invoke ARN of the account management Lambda"
  type        = string
}
