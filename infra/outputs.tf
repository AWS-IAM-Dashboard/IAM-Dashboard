output "s3_bucket_name" {
  description = "S3 bucket name for frontend"
  value       = module.s3.s3_bucket_name
}

output "lambda_function_name" {
  description = "Lambda function name"
  value       = module.lambda.lambda_function_name
}

output "dynamodb_table_name" {
  description = "DynamoDB table name"
  value       = module.dynamodb.dynamodb_table_name
}

output "api_gateway_id" {
  description = "API Gateway ID"
  value       = module.api_gateway.api_gateway_id
}

output "health_check_url" {
  description = "Public /health URL surfaced for the deploy-verification GitHub Actions step (D13)"
  value       = module.api_gateway.health_check_url
}

output "github_actions_role_arn" {
  description = "GitHub Actions IAM role ARN"
  value       = module.github_actions.github_actions_role_arn
}

output "cognito_user_pool_id" {
  description = "Cognito User Pool ID"
  value       = module.cognito.user_pool_id
}

output "cognito_app_client_id" {
  description = "Cognito User Pool App Client ID"
  value       = module.cognito.app_client_id
}

output "cognito_issuer_url" {
  description = "Cognito issuer URL"
  value       = module.cognito.issuer_url
}

output "cognito_hosted_ui_domain" {
  description = "Cognito Hosted UI domain"
  value       = module.cognito.hosted_ui_domain
}

