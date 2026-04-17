# MailHog and SES Architecture

## Current state

The current implemented email-notification path is the cloud SES path for scan-result emails.

1. The scanner Lambda writes a scan-result JSON object to S3.
2. An S3 object-created notification invokes the SES notification Lambda.
3. The SES notification Lambda reads the exact object key from the event.
4. The SES notification Lambda parses the scan-result JSON.
5. The SES notification Lambda sends a concise email through Amazon SES.

This is backend/Lambda behavior. The frontend does not send emails directly.

## Production and cloud email path

The implemented production-style email path uses Amazon SES.

- `infra/lambda/lambda_ses.py` is the implemented SES notification Lambda for scan-result emails.
- `infra/ses/` manages the SES sender and recipient identities used for sandbox-style testing assumptions.
- Terraform can create those SES email identity resources, but mailbox owners must still complete AWS verification outside Terraform.
- While SES remains in sandbox, both sender and recipient must be verified before sending succeeds.

The current SES notification body includes:

1. A first line with the serialized scan summary:
   `scan_summary: {...}`
2. A short notification sentence with:
   - scanner type
   - account ID
   - timestamp
   - total findings
   - bucket name

## Future local email path

MailHog is still the planned local-development email path, but it is not fully wired into the current backend/Lambda notification flow.

That means:

- MailHog should be treated as future local infrastructure for safe email capture during development.
- MailHog is not the active source of truth for scan-result notifications today.
- The current implemented notification path is SES in the cloud flow described above.

## Cognito-related notifications

The frontend currently uses Cognito through the SDK for login and logout.

The frontend does not currently have:

- an implemented signup screen
- an implemented reset-password screen

Because those UI flows are not implemented yet, Cognito-triggered welcome/reset-password notification logic remains future work.

`infra/lambda/lambda_cognito.py` exists only as a scaffold for that later work. It is intentionally not wired yet.

## Architecture guidance

- Mail sending belongs in backend or Lambda code, not in the frontend.
- The frontend should never talk directly to SMTP.
- SES is the current implemented scan-notification delivery path.
- MailHog is the planned local email-testing path for future work, not a completed integration in the current backend path.