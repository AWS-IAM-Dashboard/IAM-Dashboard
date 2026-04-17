# ── Scan Results Table outputs ────────────────────────────────────────────────

output "dynamodb_table_name" {
  description = "Name of the scan results DynamoDB table"
  value       = aws_dynamodb_table.scan_results.name
}

output "dynamodb_table_arn" {
  description = "ARN of the scan results DynamoDB table"
  value       = aws_dynamodb_table.scan_results.arn
}

output "dynamodb_table_id" {
  description = "ID of the scan results DynamoDB table"
  value       = aws_dynamodb_table.scan_results.id
}

# ── Registered Accounts Table outputs ────────────────────────────────────────

output "accounts_table_name" {
  description = "Name of the registered accounts DynamoDB table"
  value       = aws_dynamodb_table.accounts.name
}

output "accounts_table_arn" {
  description = "ARN of the registered accounts DynamoDB table"
  value       = aws_dynamodb_table.accounts.arn
}

