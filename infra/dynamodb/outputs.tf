output "dynamodb_table_name" {
  description = "Name of the DynamoDB table"
  value       = aws_dynamodb_table.scan_results.name
}

output "dynamodb_table_arn" {
  description = "ARN of the DynamoDB table"
  value       = aws_dynamodb_table.scan_results.arn
}

output "dynamodb_table_id" {
  description = "ID of the DynamoDB table"
  value       = aws_dynamodb_table.scan_results.id
}

output "remediation_jobs_table_name" {
  description = "Name of the DynamoDB table for remediation jobs"
  value       = aws_dynamodb_table.remediation_jobs.name
}

output "remediation_idempotency_table_name" {
  description = "Name of the DynamoDB table for remediation idempotency keys"
  value       = aws_dynamodb_table.remediation_idempotency.name
}

