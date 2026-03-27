# Checkov Results

Source: `checkov-results.json`

## terraform

- Checkov version: 3.1.25
- Passed: 118
- Failed: 5
- Skipped: 1
- Parsing errors: 0
- Resources: 52

| Check ID | File Path | Check Name |
| --- | --- | --- |
| CKV_AWS_300 | /bootstrap/main.tf | Ensure S3 lifecycle configuration sets period for aborting failed uploads |
| CKV_AWS_28 | /bootstrap/main.tf | Ensure Dynamodb point in time recovery (backup) is enabled |
| CKV_AWS_119 | /bootstrap/main.tf | Ensure DynamoDB Tables are encrypted using a KMS Customer Managed CMK |
| CKV2_AWS_6 | /bootstrap/main.tf | Ensure that S3 bucket has a Public Access block |
| CKV_AWS_18 | /bootstrap/main.tf | Ensure the S3 bucket has access logging enabled |

## Missing Sections

- Section not found: `dockerfile`
