# Authentication Flow

## Summary

This document describes the intended **BFF-style authentication flow** for the standalone auth API in `infra/API_Gateway_Auth`.

The goal of this design is to stop exposing Cognito tokens directly to browser JavaScript. Instead of storing Cognito JWTs in `localStorage`, the browser will hold only an **HttpOnly session cookie**, while the real auth/session state is managed server-side.

Current auth API routes:

- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/session`

## Core Design

### Main idea

The browser should not directly store Cognito access tokens or refresh tokens.

Instead:

1. The browser submits login credentials to the auth API.
2. Lambda authenticates against Cognito.
3. Lambda creates an opaque server-side session record in DynamoDB.
4. Lambda returns a session cookie to the browser.
5. The browser sends that cookie on later requests.
6. Lambda reads the cookie, validates the session, and responds accordingly.

### Why this exists

This flow reduces the impact of XSS compared to storing Cognito tokens in `localStorage`.

The browser will not need direct access to:

- Cognito access token
- Cognito ID token
- Cognito refresh token

Instead, the browser stores only an opaque session identifier inside a cookie.

## Components

### Frontend

The frontend:

- shows the login form
- sends credentials to `POST /auth/login`
- stores no Cognito JWTs in browser-accessible storage
- relies on browser cookies for authenticated session continuity
- calls `GET /auth/session` on app load to determine whether the user is already logged in

### API Gateway

API Gateway exposes the auth endpoints and forwards requests to the auth Lambda.

For this BFF flow:

- browser requests are authenticated by **session cookie**
- API Gateway JWT authorizers are not the main auth mechanism for these auth routes
- CORS must allow credentials

### Auth Lambda

The auth Lambda is responsible for:

- authenticating username/password against Cognito
- creating and deleting server-side sessions
- returning `Set-Cookie` headers
- checking whether a session is valid

### Cognito

Cognito still performs authentication and issues tokens, but those tokens are intended to stay server-side in this flow.

### DynamoDB

DynamoDB stores session records.

The browser does **not** store the session record itself.
The browser stores only a session cookie.

## Route Behavior

### `POST /auth/login`

Purpose:

- authenticate the user with Cognito
- create a server-side session
- return an HttpOnly session cookie

Expected request body:

```json
{
  "username": "testuser",
  "password": "Admin123!"
}
```

Expected Lambda flow:

1. Validate request body.
2. Call Cognito `InitiateAuth`.
3. Receive Cognito tokens.
4. Parse the returned token claims needed for identity/authorization context.
5. Generate an opaque session ID.
6. Store session data in DynamoDB.
7. Return:
   - `Set-Cookie` header containing the session ID
   - JSON describing authenticated state and safe user info

Important:

- Do not return raw Cognito tokens to the browser in the final design.

Example success response body:

```json
{
  "authenticated": true,
  "user": {
    "username": "testuser",
    "groups": ["admin"]
  }
}
```

### `POST /auth/logout`

Purpose:

- end the current session
- clear the browser cookie

Expected request:

- normally no request body is needed
- the session is identified by the cookie

Expected Lambda flow:

1. Read the session cookie from the request.
2. Extract the session ID.
3. Delete or invalidate the session record in DynamoDB.
4. Return an expired/cleared cookie.
5. Return a small JSON response confirming logout.

Example response body:

```json
{
  "authenticated": false
}
```

### `GET /auth/session`

Purpose:

- tell the frontend whether the current browser session is authenticated
- restore app auth state after refresh/reload

Expected Lambda flow:

1. Read the session cookie from the request.
2. Extract the session ID.
3. Look up the session in DynamoDB.
4. If found and valid, return authenticated session info.
5. If missing or expired, return unauthenticated.

Example authenticated response:

```json
{
  "authenticated": true,
  "user": {
    "username": "testuser",
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

## Session Model

### Cookie behavior

The cookie should be configured with security-focused attributes:

- `HttpOnly`
- `Secure`
- `SameSite=Lax` or stricter if compatible with the frontend flow
- `Path=/`

The cookie should contain only an opaque session identifier, not the raw Cognito JWTs.

### DynamoDB session record

The DynamoDB record should represent the authoritative session state.

At minimum, it should support:

- session ID
- user identity
- role/group context if needed
- expiration time
- refresh metadata if token refresh is later implemented server-side

### Session lifetime

Cookie lifetime and DynamoDB session TTL should be coordinated.

Possible strategies:

- fixed expiration
- sliding expiration on activity

For the first implementation, a simple fixed-lifetime session is acceptable.

## Security Notes

### XSS reduction

This architecture reduces the impact of XSS because browser JavaScript does not directly read/store Cognito JWTs.

### CSRF

Because cookies are sent automatically, CSRF protections are required.

Recommended protections:

- `SameSite` cookie policy
- `Origin` validation on state-changing routes
- CSRF token strategy if needed for broader protected cookie-authenticated APIs later

### JWT usage

Cognito still issues JWTs.
The difference is that JWTs are handled server-side instead of being stored in browser-accessible storage.

## Recommended Implementation Order

1. Implement Lambda logic for:
   - `POST /auth/login`
   - `POST /auth/logout`
   - `GET /auth/session`
2. Wire API Gateway routes to the Lambda.
3. Return and clear secure cookies correctly.
4. Update the frontend to use cookie-based auth/session checks instead of browser-stored Cognito tokens.
5. Replace temporary testing shortcuts such as shared DynamoDB usage with a dedicated session table.

## Temporary Testing Notes

During initial testing, the implementation may temporarily reuse existing infrastructure shortcuts, such as a shared DynamoDB table.

That is acceptable only as a proof of concept.

The intended final architecture should use:

- a dedicated session storage model
- clear separation between auth/session data and scan-result data

# Testing Lambda + APIGateway

```ps1
Invoke-RestMethod `
>>     -Method GET `
>>     -Uri "$baseUrl/auth/session" `
>>     -WebSession $session `
>>     -Headers @{
>>       Origin = $origin
>>     }
```

```ps1
Invoke-RestMethod `
>>     -Method POST `
>>     -Uri "$baseUrl/auth/logout" `
>>     -WebSession $session `
>>     -Headers @{
>>       Origin = $origin
>>     }
```

```ps1
try {
>>     Invoke-RestMethod `
>>       -Method POST `
>>       -Uri "$baseUrl/auth/login" `
>>       -WebSession $session `
>>       -Headers @{
>>         Origin = $origin
>>         "Content-Type" = "application/json"
>>       } `
>>       -Body '{"username":"testuser","password":"Admin123!"}'
>>   }
>>   catch {
>>     $resp = $_.Exception.Response
>>     if ($resp) {
>>       Write-Host "Status:" ([int]$resp.StatusCode)
>>       $reader = New-Object System.IO.StreamReader($resp.GetResponseStream())
>>       $reader.BaseStream.Position = 0
>>       $reader.DiscardBufferedData()
>>       $body = $reader.ReadToEnd()
>>       Write-Host "Body:" $body
>>     } else {
>>       Write-Host $_
>>     }
>>   }
```
