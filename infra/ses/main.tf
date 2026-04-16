resource "aws_ses_email_identity" "sender" {
  email = var.sender_email
}

resource "aws_ses_email_identity" "recipient" {
  email = var.recipient_email
}

# SES sandbox accounts can only send between verified identities. Terraform can
# declare these identities, but mailbox owners must still click the AWS
# verification emails before delivery will succeed.