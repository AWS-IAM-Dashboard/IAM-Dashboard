# Authentication Flow

## Summary

This document describes the current standalone authentication architecture implemented under `infra/API_Gateway_Auth`.

The auth stack consists of:

- standalone HTTP API Gateway auth API
- auth Lambda
- dedicated auth-session DynamoDB table
- Cognito for username/password authentication
- browser session continuity through an HttpOnly cookie

Current auth API routes:

- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/session`

The browser does not store Cognito JWTs, refresh tokens, or session records in browser-accessible storage. The browser stores only the session cookie, and the server-side session state lives in DynamoDB.

## Architecture

### Request flow

1. The frontend submits credentials to `POST /auth/login`.
2. API Gateway routes the request to the auth Lambda.
3. Lambda authenticates the user against Cognito.
4. Lambda creates or replaces the server-side session record in DynamoDB.
5. Lambda returns an HttpOnly session cookie to the browser.
6. The browser includes that cookie on later `GET /auth/session` and `POST /auth/logout` requests.
7. Lambda uses the cookie value to load or clear the authoritative session state.

### Component responsibilities

#### Frontend

The frontend:

- renders the login form
- calls the auth API endpoints
- relies on the browser to manage the session cookie
- restores app auth state by calling `GET /auth/session` on startup
- does not store JWTs in `localStorage` or `sessionStorage`

#### API Gateway

API Gateway exposes the standalone auth endpoints and forwards them to the auth Lambda through one HTTP API Lambda proxy integration.

For this auth API:

- browser requests depend on the session cookie, not bearer JWTs
- CORS must allow credentials
- auth routes are not using JWT authorizers

#### Auth Lambda

The auth Lambda is responsible for:

- validating the request shape
- checking allowed browser origins on state-changing routes
- authenticating credentials against Cognito
- decoding returned token claims only to extract identity context
- creating, reading, replacing, and deleting server-side sessions
- returning and clearing the session cookie

#### Cognito

Cognito performs the actual user authentication.

For the current login flow:

- Lambda calls Cognito `InitiateAuth`
- Cognito validates username/password
- Cognito returns tokens to Lambda
- Lambda uses the returned claims to derive the user identity and groups for the session record

Those Cognito tokens are not returned to frontend JavaScript in this architecture.

#### DynamoDB

The dedicated auth-session DynamoDB table stores the authoritative server-side session state.

The current table design includes:

- primary key: `session_id`
- GSI: `username-index` on `username`
- TTL attribute: `expires_at`

This supports:

- direct lookup by `session_id`
- efficient lookup by `username` when replacing prior sessions for the same user
- background cleanup of expired sessions through DynamoDB TTL

## Route Behavior

### `POST /auth/login`

Purpose:

- authenticate the user with Cognito
- create a new server-side session
- replace any existing session for the same user
- return an HttpOnly session cookie

Expected request body:

```json
{
  "username": "example-user",
  "password": "example-password"
}
```

Current Lambda flow:

1. Validate request body.
2. Validate the request origin.
3. Call Cognito `InitiateAuth`.
4. Decode the returned token claims needed for session context.
5. Replace any existing session for the username.
6. Persist the new session item in DynamoDB.
7. Return:
   - session cookie
   - JSON payload describing authenticated state and safe user information

Example success response body:

```json
{
  "authenticated": true,
  "user": {
    "username": "example-user",
    "groups": ["admin"]
  }
}
```

### `POST /auth/logout`

Purpose:

- end the current session
- clear the browser cookie

Expected request:

- no request body required
- session is identified by the cookie

Current Lambda flow:

1. Validate the request origin.
2. Read the session cookie from the request.
3. Delete the session item if it exists.
4. Return a clearing cookie.
5. Return a small JSON response confirming logout.

Example response body:

```json
{
  "session_cleared": true
}
```

### `GET /auth/session`

Purpose:

- tell the frontend whether the current browser session is authenticated
- restore app auth state after refresh or reload

Current Lambda flow:

1. Read the session cookie from the request.
2. Extract the session ID.
3. Look up the session by `session_id` in DynamoDB.
4. If the session exists and is not expired, return authenticated session info.
5. If the session is missing or expired, return unauthenticated.

Example authenticated response:

```json
{
  "authenticated": true,
  "user": {
    "username": "example-user",
    "groups": ["admin"]
  }
}
```

Example unauthenticated response:

```json
{
  "authenticated": false
}
```

## Session and Cookie Model

### Session item shape

The current session item contains at least:

- `session_id`
- `username`
- `groups`
- `expires_at`

`expires_at` is an absolute Unix timestamp written by Lambda. DynamoDB TTL uses that field for background expiration cleanup.

Lambda must still calculate and write `expires_at` explicitly. TTL does not compute it automatically.

### Cookie behavior

The session cookie contains only an opaque session identifier.

The intended security properties are:

- `HttpOnly`
- `Path=/`
- `Max-Age=<SESSION_TTL_SECONDS>`
- `Secure` when using hosted HTTPS origins
- `SameSite` set according to the deployment topology

Current implementation notes:

- localhost development may need relaxed cookie behavior, especially for the `Secure` flag
- hosted cross-site environments may require `SameSite=None; Secure`
- same-site hosted environments may work with `SameSite=Lax`

The exact cookie policy must match the real frontend origin, auth API origin, and browser behavior in the deployed environment.

## Security Notes

### XSS reduction

This architecture reduces XSS exposure compared to browser-managed Cognito tokens because frontend JavaScript does not directly hold Cognito JWTs.

### CSRF

Because cookies are sent automatically by the browser, CSRF protections matter.

Current and recommended protections include:

- `Origin` validation on `POST /auth/login`
- `Origin` validation on `POST /auth/logout`
- appropriate `SameSite` cookie policy
- additional CSRF defenses if this cookie model is later expanded to more state-changing protected endpoints

### Error handling

Client responses should stay generic.

Detailed Cognito, DynamoDB, or runtime failure details belong in Lambda logs rather than API responses.

## Testing

## Direct Lambda Invocation

Direct Lambda testing must use an HTTP API v2-style event, not just the JSON request body.

### Login event

```json
{
  "version": "2.0",
  "routeKey": "POST /auth/login",
  "rawPath": "/auth/login",
  "headers": {
    "content-type": "application/json",
    "origin": "http://localhost:3001"
  },
  "requestContext": {
    "stage": "$default",
    "http": {
      "method": "POST",
      "path": "/auth/login"
    }
  },
  "body": "{\"username\":\"example-user\",\"password\":\"example-password\"}",
  "isBase64Encoded": false
}
```

### Logout event

```json
{
  "version": "2.0",
  "routeKey": "POST /auth/logout",
  "rawPath": "/auth/logout",
  "headers": {
    "origin": "http://localhost:3001",
    "cookie": "iamdash_session=example-session-id"
  },
  "requestContext": {
    "stage": "$default",
    "http": {
      "method": "POST",
      "path": "/auth/logout"
    }
  },
  "isBase64Encoded": false
}
```

### Session event

```json
{
  "version": "2.0",
  "routeKey": "GET /auth/session",
  "rawPath": "/auth/session",
  "headers": {
    "origin": "http://localhost:3001",
    "cookie": "iamdash_session=example-session-id"
  },
  "requestContext": {
    "stage": "$default",
    "http": {
      "method": "GET",
      "path": "/auth/session"
    }
  },
  "isBase64Encoded": false
}
```

You can use those event payloads with the Lambda console test feature or any local invoke workflow that expects the raw Lambda event object.

## API Gateway Testing From Terminal

For API Gateway examples below:

- `$baseUrl` means the deployed auth API stage base URL, for example:
  - `https://<api-id>.execute-api.us-east-1.amazonaws.com/v1`
- `$origin` means an allowed frontend origin, for example:
  - `http://localhost:3001`
  - `http://localhost:5173`
  - your hosted frontend origin if it is in the allowlist

### PowerShell with Invoke-RestMethod

PowerShell cookie/session testing should use a persistent web session object:

```powershell
$baseUrl = "https://<api-id>.execute-api.us-east-1.amazonaws.com/v1"
$origin = "http://localhost:3001"
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
```

`-WebSession $session` preserves cookies between requests. After login, the session cookie returned by the API will be stored in `$session` and reused automatically on later requests.

#### Login

```powershell
Invoke-RestMethod `
  -Method POST `
  -Uri "$baseUrl/auth/login" `
  -WebSession $session `
  -Headers @{
    Origin = $origin
    "Content-Type" = "application/json"
  } `
  -Body '{"username":"example-user","password":"example-password"}'
```

#### Session check

```powershell
Invoke-RestMethod `
  -Method GET `
  -Uri "$baseUrl/auth/session" `
  -WebSession $session `
  -Headers @{
    Origin = $origin
  }
```

#### Logout

```powershell
Invoke-RestMethod `
  -Method POST `
  -Uri "$baseUrl/auth/logout" `
  -WebSession $session `
  -Headers @{
    Origin = $origin
  }
```

#### PowerShell error capture example

```powershell
try {
  Invoke-RestMethod `
    -Method POST `
    -Uri "$baseUrl/auth/login" `
    -WebSession $session `
    -Headers @{
      Origin = $origin
      "Content-Type" = "application/json"
    } `
    -Body '{"username":"example-user","password":"wrong-password"}'
}
catch {
  $resp = $_.Exception.Response
  if ($resp) {
    Write-Host "Status:" ([int]$resp.StatusCode)
    $reader = New-Object System.IO.StreamReader($resp.GetResponseStream())
    $reader.BaseStream.Position = 0
    $reader.DiscardBufferedData()
    $body = $reader.ReadToEnd()
    Write-Host "Body:" $body
  }
  else {
    Write-Host $_
  }
}
```

### curl examples

`curl` testing should use a cookie jar so login, session, and logout share the same browser-like cookie state.

#### Login and save cookies

```bash
curl -i \
  -X POST "https://<api-id>.execute-api.us-east-1.amazonaws.com/v1/auth/login" \
  -H "Origin: http://localhost:3001" \
  -H "Content-Type: application/json" \
  -c auth-cookies.txt \
  --data '{"username":"example-user","password":"example-password"}'
```

#### Session check using saved cookies

```bash
curl -i \
  -X GET "https://<api-id>.execute-api.us-east-1.amazonaws.com/v1/auth/session" \
  -H "Origin: http://localhost:3001" \
  -b auth-cookies.txt
```

#### Logout using saved cookies

```bash
curl -i \
  -X POST "https://<api-id>.execute-api.us-east-1.amazonaws.com/v1/auth/logout" \
  -H "Origin: http://localhost:3001" \
  -b auth-cookies.txt \
  -c auth-cookies.txt
```

## Operational Notes

- API Gateway stage-prefixed paths such as `/v1/auth/login` are normalized by the Lambda before route matching.
- The auth Lambda expects allowed origins on state-changing routes.
- The dedicated auth-session table is the intended backing store for session replacement and lookup.
- The browser stores only the session cookie. The authoritative session state remains server-side.
