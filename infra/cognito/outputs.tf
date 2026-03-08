output "user_pool_id" {
  description = "Cognito User Pool ID"
  value       = aws_cognito_user_pool.iam_dashboard_pool.id
}

output "client_id" {
  description = "Cognito App Client ID"
  value       = aws_cognito_user_pool_client.dashboard_client.id
}

output "domain" {
  description = "Cognito Hosted UI domain prefix"
  value       = aws_cognito_user_pool_domain.main.domain
}
