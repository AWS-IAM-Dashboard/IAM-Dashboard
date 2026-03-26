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

variable "api_name" {
  description = "Name of the standalone auth HTTP API"
  type        = string
  default     = "iam-dashboard-auth-api"
}

variable "stage_name" {
  description = "Stage name for the standalone auth HTTP API"
  type        = string
  default     = "v1"
}

variable "cors_allowed_origins" {
  description = "Allowed browser origins for the auth API"
  type        = list(string)
  default = [
    "http://localhost:3001",
    "http://localhost:5173",
    "http://localhost:5000",
    "https://d33ytnxd7i6mo9.cloudfront.net"
  ]
}

variable "cors_allowed_methods" {
  description = "Allowed HTTP methods for CORS"
  type        = list(string)
  default     = ["GET", "POST", "OPTIONS"]
}

variable "cors_allowed_headers" {
  description = "Allowed request headers for CORS"
  type        = list(string)
  default     = ["Content-Type", "Authorization", "X-Requested-With"]
}
