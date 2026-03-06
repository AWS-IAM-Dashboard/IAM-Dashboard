output "user_pool_id" {
  value = aws_cognito_user_pool.iam_dashboard_pool.id
}

output "client_id" {
  value = aws_cognito_user_pool_client.dashboard_client.id
}

output "aws_region" {
  value = var.aws_region
}

output "cognito_domain_prefix" {
  value = aws_cognito_user_pool_domain.main.domain
}

output "cognito_base_url" {
  value = "https://${aws_cognito_user_pool_domain.main.domain}.auth.${var.aws_region}.amazoncognito.com"
}