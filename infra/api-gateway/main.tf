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

# CloudWatch log group for API Gateway access logs
resource "aws_cloudwatch_log_group" "apigw_access" {
  name              = "/aws/apigwv2/${var.api_gateway_name}/${var.stage_name}/access"
  retention_in_days = 365
  kms_key_id        = var.log_kms_key_arn

  tags = {
    Name      = "${var.api_gateway_name}-${var.stage_name}-access-logs"
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

  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.apigw_access.arn
    format = jsonencode({
      requestId      = "$context.requestId"
      ip             = "$context.identity.sourceIp"
      requestTime    = "$context.requestTime"
      httpMethod     = "$context.httpMethod"
      routeKey       = "$context.routeKey"
      status         = "$context.status"
      protocol       = "$context.protocol"
      responseLength = "$context.responseLength"
      userAgent      = "$context.identity.userAgent"
    })
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
  api_id                 = aws_apigatewayv2_api.api.id
  integration_type       = "AWS_PROXY"
  integration_uri        = data.aws_lambda_function.scanner.invoke_arn
  integration_method     = "POST"
  payload_format_version = "2.0"
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
  api_id             = aws_apigatewayv2_api.api.id
  route_key          = "POST /scan/security-hub"
  authorization_type = var.route_authorization_type
  target             = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

resource "aws_apigatewayv2_route" "guardduty" {
  api_id             = aws_apigatewayv2_api.api.id
  route_key          = "POST /scan/guardduty"
  authorization_type = var.route_authorization_type
  target             = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

resource "aws_apigatewayv2_route" "config" {
  api_id             = aws_apigatewayv2_api.api.id
  route_key          = "POST /scan/config"
  authorization_type = var.route_authorization_type
  target             = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

resource "aws_apigatewayv2_route" "inspector" {
  api_id             = aws_apigatewayv2_api.api.id
  route_key          = "POST /scan/inspector"
  authorization_type = var.route_authorization_type
  target             = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

resource "aws_apigatewayv2_route" "macie" {
  api_id             = aws_apigatewayv2_api.api.id
  route_key          = "POST /scan/macie"
  authorization_type = var.route_authorization_type
  target             = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

resource "aws_apigatewayv2_route" "iam" {
  api_id             = aws_apigatewayv2_api.api.id
  route_key          = "POST /scan/iam"
  authorization_type = var.route_authorization_type
  target             = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

resource "aws_apigatewayv2_route" "ec2" {
  api_id             = aws_apigatewayv2_api.api.id
  route_key          = "POST /scan/ec2"
  authorization_type = var.route_authorization_type
  target             = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

resource "aws_apigatewayv2_route" "s3" {
  api_id             = aws_apigatewayv2_api.api.id
  route_key          = "POST /scan/s3"
  authorization_type = var.route_authorization_type
  target             = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

resource "aws_apigatewayv2_route" "full" {
  api_id             = aws_apigatewayv2_api.api.id
  route_key          = "POST /scan/full"
  authorization_type = var.route_authorization_type
  target             = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

