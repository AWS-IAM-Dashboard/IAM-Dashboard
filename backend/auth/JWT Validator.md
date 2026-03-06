
## Purpose
This file adds **authentication middleware** to the Flask backend.

Instead of checking authentication at every endpoint, this middleware runs **before requests reach protected API routes** and blocks requests without a valid token.

---

## How It Connects to the App
app.py registers the middleware with:

```
init_auth(app)
```

Inside the middleware, Flask’s @app.before_request hook is used. This tells Flask to run the authentication check **before every request**.

Flow:

```
Request → middleware runs → if valid → endpoint runs
```

---

## What the Middleware Protects
Only API routes are protected, as established by this line:

```
/api/v1/*
```

Some routes are intentionally public, if you want to add to this list, add it to PUBLIC_PATHS.

```
/api/v1/health
/api/v1/auth/login
/api/v1/auth/callback
```

Everything else under /api/v1 requires authentication.

---

## Token Extraction
The middleware looks for a token in two places:

1. **Authorization header** (used by curl) 

```
Authorization: Bearer <token>
```

2. **Cookie fallback** (used by browser requests)

```
access_token=<token>
```

Supporting both allows the backend to work with:

- developer tools
- the browser-based BFF architecture
---

## Token Verification
Once a token is found, it is passed to:

```
verify_access_token(token)
```

If verification fails:

```
401 Unauthorized
```

If verification succeeds, Flask continues to the endpoint.

---

## Current Behavior
Right now the system is in developer mode

verify_access_token() just checks if the token matches the environment variable:

```
DEV_BEARER_TOKEN
```

This is for testing authentication without Cognito.

---

## Why Middleware Is Used
Benefits:

- Authentication logic lives in **one place**    
- All API routes are protected by default
- Supports cookie and header authentication

---

## Future Upgrade
When Cognito is integrated, only verify.py needs to change.
The middleware structure stays the same, but verification will instead:

- validate the JWT signature using Cognito JWKS
- check token claims

---

## Summary
middleware.py acts as the backend’s **authentication gate**.

It runs before API endpoints, extracts a token from the request, verifies it, and blocks unauthorized requests with a 401 response.