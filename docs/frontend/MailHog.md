# MailHog Local Email Testing

## What is MailHog
MailHog is a local SMTP testing server. It accepts outbound email from the application and stores it in a temporary in-memory mailbox instead of delivering to real recipients.

In practice, this lets us safely test email flows (welcome emails, alerts, password reset style flows, etc.) without sending anything to real inboxes.

## Configuration
MailHog is wired into this project through Docker Compose and SMTP environment variables.

In `docker-compose.yml`:
- A dedicated `mailhog` service is defined using `mailhog/mailhog:latest`
- SMTP port `1025` is exposed for app-to-MailHog traffic
- MailHog web UI port `8025` is exposed for viewing captured messages
- The `app` service includes SMTP environment variables with defaults:
  - `SMTP_HOST=${SMTP_HOST:-mailhog}`
  - `SMTP_PORT=${SMTP_PORT:-1025}`
  - `SMTP_USERNAME=${SMTP_USERNAME:-}`
  - `SMTP_PASSWORD=${SMTP_PASSWORD:-}`
  - `SMTP_FROM=${SMTP_FROM:-no-reply@local.test}`

In `env.example`:
- `SMTP_HOST=mailhog`
- `SMTP_PORT=1025`
- `SMTP_USERNAME=`
- `SMTP_PASSWORD=`
- `SMTP_FROM=no-reply@local.test`

These defaults make local testing work out of the box in Docker while still allowing overrides per environment.

## What we're using it for
We are using MailHog to validate email behavior during local development, especially for:
- Welcome emails from the landing page flow
- Alert/notification emails tied to security scan results
- General email template and formatting checks

This gives fast feedback during development and avoids sending test traffic through production email infrastructure.

## How to use HogMail
MailHog uses two ports:
- `1025` for SMTP (application sends email here)
- `8025` for the MailHog web inbox UI (`http://localhost:8025`)

Start services:

```bash
docker compose up -d mailhog app
```

Go to http://localhost:8025:

**HogMail UI**

![Pic](/docs/frontend/Images/MailHog%20UI.png)

Validate SMTP port (Windows PowerShell):

```powershell
Test-NetConnection localhost -Port 1025
```

Send a test email from Windows PowerShell:

```powershell
Send-MailMessage `
  -SmtpServer localhost `
  -Port 1025 `
  -From "test@local.test" `
  -To "you@local.test" `
  -Subject "MailHog test" `
  -Body "If you see this, SMTP is working."
```

Send a test email from Linux/macOS using `swaks`:

```bash
swaks --server localhost:1025 \
  --from test@local.test \
  --to you@local.test \
  --header "Subject: MailHog test" \
  --body "If you see this, SMTP is working."
```

Native Bash alternative (Linux/macOS with `bash`):

```bash
exec 3<>/dev/tcp/localhost/1025
printf 'EHLO localhost\r\n' >&3
printf 'MAIL FROM:<test@local.test>\r\n' >&3
printf 'RCPT TO:<you@local.test>\r\n' >&3
printf 'DATA\r\n' >&3
printf 'Subject: MailHog test\r\n' >&3
printf '\r\nIf you see this, SMTP is working.\r\n.\r\n' >&3
printf 'QUIT\r\n' >&3
cat <&3
exec 3<&-
exec 3>&-
```

Verify Message:

![Pic](/docs/frontend/Images/MailHog%20Test.png)

---

![Pic](/docs/frontend/Images/MailHog%20Email.png)


## Beyond HogMail
MailHog is intentionally a local development/testing tool. It is excellent for safe iteration, quick validation, and avoiding accidental email sends during development.

For production delivery, we plan to use Amazon SES for real outbound notifications (welcome emails, scan alerts, and other user-facing email events), with environment-specific SMTP/provider configuration outside local Docker defaults.
