output "github_actions_role_arn" {
  description = "ARN of the IAM role for GitHub Actions"
  value       = aws_iam_role.github_actions_deployer.arn
}

output "github_actions_deployer_role_arn" {
  description = "ARN of the GitHub Actions deployer IAM role"
  value       = aws_iam_role.github_actions_deployer.arn
}

output "github_actions_role_name" {
  description = "Name of the IAM role for GitHub Actions"
  value       = aws_iam_role.github_actions_deployer.name
}

output "oidc_provider_arn" {
  description = "ARN of the OIDC provider for GitHub Actions"
  value       = local.oidc_provider_arn
}

output "oidc_provider_url" {
  description = "URL of the OIDC provider"
  value       = "https://token.actions.githubusercontent.com"
}

