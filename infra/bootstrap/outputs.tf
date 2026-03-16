output "state_bucket_name" {
  description = "Name of the S3 bucket to use as Terraform backend bucket"
  value       = aws_s3_bucket.terraform_state.id
}

output "state_bucket_arn" {
  description = "ARN of the Terraform state S3 bucket"
  value       = aws_s3_bucket.terraform_state.arn
}

output "lock_table_name" {
  description = "Name of the DynamoDB table to use for backend dynamodb_table"
  value       = aws_dynamodb_table.terraform_lock.name
}
