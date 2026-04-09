output "user_pool_id" {
  description = "Cognito User Pool ID"
  value       = aws_cognito_user_pool.this.id
}

output "user_pool_arn" {
  description = "Cognito User Pool ARN"
  value       = aws_cognito_user_pool.this.arn
}

output "app_client_id" {
  description = "Cognito User Pool App Client ID"
  value       = aws_cognito_user_pool_client.spa.id
}

output "issuer_url" {
  description = "OIDC issuer URL for the Cognito User Pool"
  value       = "https://cognito-idp.${var.aws_region}.amazonaws.com/${aws_cognito_user_pool.this.id}"
}

output "hosted_ui_domain" {
  description = "Hosted UI domain for the Cognito User Pool"
  value       = "${aws_cognito_user_pool_domain.this.domain}.auth.${var.aws_region}.amazoncognito.com"
}

output "admin_group_name" {
  description = "Admin Cognito group name"
  value       = aws_cognito_user_group.admin.name
}
