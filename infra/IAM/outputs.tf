output "role_arn" {
  description = "ARN of the cross-account scan role"
  value       = aws_iam_role.scan_role.arn
}

output "role_name" {
  description = "Name of the cross-account scan role"
  value       = aws_iam_role.scan_role.name
}
