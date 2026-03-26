output "dynamodb_table_name" {
  description = "Name of the auth session DynamoDB table"
  value       = aws_dynamodb_table.auth_sessions.name
}

output "dynamodb_table_arn" {
  description = "ARN of the auth session DynamoDB table"
  value       = aws_dynamodb_table.auth_sessions.arn
}

output "dynamodb_table_id" {
  description = "ID of the auth session DynamoDB table"
  value       = aws_dynamodb_table.auth_sessions.id
}

output "username_index_name" {
  description = "Name of the username Global Secondary Index"
  value       = "username-index"
}
