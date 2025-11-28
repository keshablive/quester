# API Contracts: Auth API Integration

**Feature**: 014-auth-api-integration  
**Date**: 2025-11-28

## Base Configuration

**Base URL**: `${ENV.API_URL}` (from EXPO_PUBLIC_API_URL)  
**Required Headers**:
```
Content-Type: application/json
Accept: application/json
X-Tenant-ID: <tenant-uuid>  # From EXPO_PUBLIC_TENANT_ID
```

**Authenticated Endpoints** (require Authorization header):
```
Authorization: Bearer <access_token>
```

---

## Authentication Endpoints

### POST /api/v1/auth/login

Authenticate user with email and password.

**Rate Limit**: 10 requests per hour per IP

**Request**:
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "two_factor_code": "123456",       // Optional: if 2FA required
  "trust_device": true,              // Optional: trust for 30 days
  "device_fingerprint": "abc123...", // Optional: for device trust
  "device_name": "iPhone 15",        // Optional: human-readable name
  "device_type": "mobile"            // Optional: mobile|desktop|tablet|web
}
```

**Response 200 OK** (success without 2FA):
```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIs...",
  "refresh_token": "dGhpcyBpcyBhIHJlZnJl...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "tenant_id": "660e8400-e29b-41d4-a716-446655440001",
    "email": "user@example.com",
    "username": "johndoe",
    "role": "user",
    "xp": 1500,
    "level": 5,
    "tier": "silver",
    "login_streak": 3,
    "created_at": "2025-01-01T00:00:00Z"
  },
  "trust_token": ""
}
```

**Response 200 OK** (2FA required):
```json
{
  "requires_2fa": true
}
```

**Response 401 Unauthorized** (invalid credentials):
```json
{
  "error": "invalid_credentials",
  "message": "Invalid email or password",
  "code": 401
}
```

**Response 429 Too Many Requests**:
```json
{
  "error": "rate_limit_exceeded",
  "message": "Maximum 10 login attempts per hour. Please try again later.",
  "code": 429
}
```

---

### POST /api/v1/auth/signup

Create new user account.

**Rate Limit**: 5 requests per hour per IP

**Request**:
```json
{
  "email": "newuser@example.com",
  "username": "newuser",
  "password": "SecurePass123!"
}
```

**Response 201 Created**:
```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIs...",
  "refresh_token": "dGhpcyBpcyBhIHJlZnJl...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440002",
    "tenant_id": "660e8400-e29b-41d4-a716-446655440001",
    "email": "newuser@example.com",
    "username": "newuser",
    "role": "user",
    "xp": 0,
    "level": 1,
    "tier": "bronze",
    "login_streak": 0,
    "created_at": "2025-11-28T10:00:00Z"
  }
}
```

**Response 409 Conflict** (email exists):
```json
{
  "error": "email_exists",
  "message": "User with this email already exists",
  "code": 409
}
```

**Response 400 Bad Request** (validation):
```json
{
  "error": "validation_error",
  "message": "invalid password: must be at least 8 characters",
  "code": 400
}
```

---

### POST /api/v1/auth/refresh

Refresh access token using refresh token.

**Request**:
```json
{
  "refreshToken": "dGhpcyBpcyBhIHJlZnJl..."
}
```

**Response 200 OK**:
```json
{
  "status": "success",
  "data": {
    "accessToken": "eyJhbGciOiJSUzI1NiIs...",
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "tenant_id": "660e8400-e29b-41d4-a716-446655440001",
      "email": "user@example.com",
      "username": "johndoe",
      "role": "user",
      "xp": 1500,
      "level": 5,
      "tier": "silver",
      "login_streak": 3,
      "created_at": "2025-01-01T00:00:00Z"
    }
  }
}
```

**Response 401 Unauthorized** (token expired/revoked):
```json
{
  "status": "error",
  "error": "refresh token expired"
}
```

---

### POST /api/v1/auth/logout

Revoke current refresh token (single device logout).

**Headers**: Requires Authorization

**Request**:
```json
{
  "refreshToken": "dGhpcyBpcyBhIHJlZnJl..."
}
```

**Response 200 OK**:
```json
{
  "status": "success",
  "message": "Logged out successfully"
}
```

---

### POST /api/v1/auth/logout-all

Revoke all refresh tokens for user (all devices logout).

**Headers**: Requires Authorization

**Request**:
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response 200 OK**:
```json
{
  "status": "success",
  "message": "Logged out from 3 device(s)",
  "count": 3
}
```

---

### POST /api/v1/auth/forgot-password

Request password reset email.

**Request**:
```json
{
  "email": "user@example.com"
}
```

**Response 200 OK** (always returns success for security):
```json
{
  "message": "Password reset email sent"
}
```

---

### POST /api/v1/auth/reset-password

Reset password using token from email.

**Request**:
```json
{
  "token": "reset_token_from_email_link",
  "new_password": "NewSecurePass123!"
}
```

**Response 200 OK**:
```json
{
  "message": "Password reset successfully"
}
```

**Response 400 Bad Request** (invalid/expired token):
```json
{
  "error": "invalid_token",
  "message": "Invalid or expired reset token",
  "code": 400
}
```

---

## 2FA Endpoints (Used During Login)

### Response when 2FA required

After successful email/password validation, if user has 2FA enabled:

```json
{
  "requires_2fa": true
}
```

Client should:
1. Prompt user for 2FA code
2. Re-call `/api/v1/auth/login` with `two_factor_code` field

### Trusted Device Flow

When `trust_device: true` and login succeeds with 2FA:
- Server returns `trust_token` in response
- Client stores trust token
- On next login, include trust token in `X-Trust-Token` header
- Server skips 2FA if trust token valid (30 days)

---

## Error Response Format

All error responses follow this format:

```json
{
  "error": "error_code",
  "message": "Human-readable message",
  "code": 400
}
```

**Common Error Codes**:

| Code | Error | Description |
|------|-------|-------------|
| 400 | `invalid_request` | Malformed JSON or missing fields |
| 400 | `validation_error` | Field validation failed |
| 400 | `missing_tenant_id` | X-Tenant-ID header missing |
| 400 | `invalid_tenant_id` | X-Tenant-ID not valid UUID |
| 401 | `invalid_credentials` | Wrong email or password |
| 401 | `invalid_2fa_code` | Wrong 2FA code |
| 401 | `token_expired` | Access/refresh token expired |
| 401 | `token_revoked` | Token has been revoked |
| 409 | `email_exists` | Email already registered |
| 429 | `rate_limit_exceeded` | Too many requests |
| 500 | `internal_error` | Server error |

---

## Client Endpoint Configuration

Add to `client/core/config/env.ts`:

```typescript
AUTH: {
  LOGIN: '/api/v1/auth/login',
  SIGNUP: '/api/v1/auth/signup',
  LOGOUT: '/api/v1/auth/logout',
  LOGOUT_ALL: '/api/v1/auth/logout-all',
  REFRESH: '/api/v1/auth/refresh',
  TOKENS: '/api/v1/auth/tokens',
  BLACKLIST_CHECK: '/api/v1/auth/blacklist/check',
  FORGOT_PASSWORD: '/api/v1/auth/forgot-password',  // NEW
  RESET_PASSWORD: '/api/v1/auth/reset-password',    // NEW
  TWO_FACTOR: {
    ENABLE: '/api/v1/auth/2fa/enable',
    VERIFY: '/api/v1/auth/2fa/verify',
    DISABLE: '/api/v1/auth/2fa/disable',
    VALIDATE: '/api/v1/auth/2fa/validate',
    DEVICES: '/api/v1/auth/2fa/devices',
  },
},
```
