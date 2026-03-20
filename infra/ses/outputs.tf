output "sender_email" {
  description = "Verified SES sender email configured for scan notifications"
  value       = aws_ses_email_identity.sender.email
}

output "recipient_email" {
  description = "Verified SES recipient email configured for scan notifications"
  value       = aws_ses_email_identity.recipient.email
}
