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

# API Gateway REST API
resource "aws_apigatewayv2_api" "api" {
  name          = var.api_gateway_name
  description   = "REST API for IAM Dashboard security scanning"
  protocol_type = "HTTP"
  version       = "1.0"

  cors_configuration {
    allow_origins = var.cors_allowed_origins
    allow_methods = var.cors_allowed_methods
    allow_headers = var.cors_allowed_headers
    max_age       = 3600
  }

  tags = {
    Name      = var.api_gateway_name
    Project   = var.project_name
    Env       = var.environment
    ManagedBy = "terraform"
  }
}

# Default stage
resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.api.id
  name        = var.stage_name
  auto_deploy = true

  default_route_settings {
    throttling_burst_limit = var.throttling_burst_limit
    throttling_rate_limit  = var.throttling_rate_limit
  }

  tags = {
    Name      = "${var.api_gateway_name}-${var.stage_name}"
    Project   = var.project_name
    Env       = var.environment
    ManagedBy = "terraform"
  }
}

# Data source to get Lambda function
data "aws_lambda_function" "scanner" {
  function_name = "iam-dashboard-scanner"
}

# Lambda integration
resource "aws_apigatewayv2_integration" "lambda" {
  api_id           = aws_apigatewayv2_api.api.id
  integration_type = "AWS_PROXY"
  integration_uri  = data.aws_lambda_function.scanner.invoke_arn
  integration_method = "POST"
  payload_format_version = "2.0"
}

# Cognito JWT authorizer - required for protected scan endpoints
resource "aws_apigatewayv2_authorizer" "cognito_jwt" {
  api_id           = aws_apigatewayv2_api.api.id
  name             = "iam-dashboard-cognito-jwt"
  authorizer_type  = "JWT"
  identity_sources = ["$request.header.Authorization"]

  jwt_configuration {
    issuer   = "https://cognito-idp.${var.aws_region}.amazonaws.com/${split("/", var.cognito_user_pool_arn)[length(split("/", var.cognito_user_pool_arn)) - 1]}"
    audience = [var.cognito_user_pool_client_id]
  }
}

# Permission for API Gateway to invoke Lambda
resource "aws_lambda_permission" "api_gateway" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = data.aws_lambda_function.scanner.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.api.execution_arn}/*/*"
}

# Routes for all 9 security scan endpoints
resource "aws_apigatewayv2_route" "security_hub" {
  api_id    = aws_apigatewayv2_api.api.id
  route_key = "POST /scan/security-hub"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"

  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito_jwt.id
}

resource "aws_apigatewayv2_route" "guardduty" {
  api_id    = aws_apigatewayv2_api.api.id
  route_key = "POST /scan/guardduty"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"

  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito_jwt.id
}

resource "aws_apigatewayv2_route" "config" {
  api_id    = aws_apigatewayv2_api.api.id
  route_key = "POST /scan/config"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"

  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito_jwt.id
}

resource "aws_apigatewayv2_route" "inspector" {
  api_id    = aws_apigatewayv2_api.api.id
  route_key = "POST /scan/inspector"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"

  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito_jwt.id
}

resource "aws_apigatewayv2_route" "macie" {
  api_id    = aws_apigatewayv2_api.api.id
  route_key = "POST /scan/macie"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"

  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito_jwt.id
}

resource "aws_apigatewayv2_route" "iam" {
  api_id    = aws_apigatewayv2_api.api.id
  route_key = "POST /scan/iam"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"

  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito_jwt.id
}

resource "aws_apigatewayv2_route" "ec2" {
  api_id    = aws_apigatewayv2_api.api.id
  route_key = "POST /scan/ec2"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"

  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito_jwt.id
}

resource "aws_apigatewayv2_route" "s3" {
  api_id    = aws_apigatewayv2_api.api.id
  route_key = "POST /scan/s3"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"

  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito_jwt.id
}

resource "aws_apigatewayv2_route" "full" {
  api_id    = aws_apigatewayv2_api.api.id
  route_key = "POST /scan/full"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"

  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito_jwt.id
}

