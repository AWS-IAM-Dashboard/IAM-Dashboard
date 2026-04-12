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

output "iam_findings_table_name" {
  description = "Name of the IAM findings DynamoDB table"
  value       = aws_dynamodb_table.iam_findings.name
}

output "iam_findings_table_arn" {
  description = "ARN of the IAM findings DynamoDB table"
  value       = aws_dynamodb_table.iam_findings.arn
}

