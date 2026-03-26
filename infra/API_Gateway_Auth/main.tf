terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

resource "aws_apigatewayv2_api" "auth" {
  name          = var.api_name
  protocol_type = "HTTP"
  description   = "Standalone auth-focused API Gateway scaffold for future BFF session auth flows"

  cors_configuration {
    allow_origins     = var.cors_allowed_origins
    allow_methods     = var.cors_allowed_methods
    allow_headers     = var.cors_allowed_headers
    allow_credentials = true
    max_age           = 3600
  }

  tags = {
    Name      = var.api_name
    Project   = var.project_name
    Env       = var.environment
    ManagedBy = "terraform"
  }
}

resource "aws_apigatewayv2_stage" "auth" {
  api_id      = aws_apigatewayv2_api.auth.id
  name        = var.stage_name
  auto_deploy = true

  tags = {
    Name      = "${var.api_name}-${var.stage_name}"
    Project   = var.project_name
    Env       = var.environment
    ManagedBy = "terraform"
  }
}

resource "aws_apigatewayv2_route" "auth_login" {
  api_id    = aws_apigatewayv2_api.auth.id
  route_key = "POST /auth/login"
}

resource "aws_apigatewayv2_route" "auth_logout" {
  api_id    = aws_apigatewayv2_api.auth.id
  route_key = "POST /auth/logout"
}

resource "aws_apigatewayv2_route" "auth_session" {
  api_id    = aws_apigatewayv2_api.auth.id
  route_key = "GET /auth/session"
}
