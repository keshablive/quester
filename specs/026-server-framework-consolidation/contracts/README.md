# API Contracts: Server Framework Consolidation

**Feature**: 026-server-framework-consolidation
**Date**: 2025-12-01
**Status**: N/A - No API changes

## Overview

This feature is a **refactoring task** that reorganizes internal code structure without modifying any API contracts.

## Unchanged Contracts

- All HTTP endpoints remain unchanged
- All request/response schemas remain unchanged
- All authentication flows remain unchanged
- All error response formats remain unchanged

## Internal Interface Changes

The only contract change is **internal** - extracting shared types to `auth_types.go`:

### auth_types.go (New Internal Contract)

```go
// Package service contains business logic services.
package service

import (
    "context"
    "github.com/google/uuid"
    "github.com/keshablive/quester/internal/models"
)

// SignupRequest - user registration input
type SignupRequest struct {
    Email    string `json:"email" binding:"required,email"`
    Password string `json:"password" binding:"required,min=8"`
    Name     string `json:"name" binding:"required"`
}

// LoginRequest - user authentication input
type LoginRequest struct {
    Email    string `json:"email" binding:"required,email"`
    Password string `json:"password" binding:"required"`
    DeviceID string `json:"device_id"`
}

// RefreshResponse - token refresh output
type RefreshResponse struct {
    AccessToken  string `json:"access_token"`
    RefreshToken string `json:"refresh_token"`
    ExpiresIn    int64  `json:"expires_in"`
}

// UserRepository - user data access contract
type UserRepository interface {
    FindByEmail(ctx context.Context, tenantID uuid.UUID, email string) (*models.User, error)
    Create(ctx context.Context, user *models.User) error
    Update(ctx context.Context, user *models.User) error
}

// RefreshTokenRepository - refresh token data access contract
type RefreshTokenRepository interface {
    Create(ctx context.Context, token *models.RefreshToken) error
    FindByToken(ctx context.Context, token string) (*models.RefreshToken, error)
    Delete(ctx context.Context, id uuid.UUID) error
    DeleteByUserID(ctx context.Context, userID uuid.UUID) error
}
```

## Verification

Since no external APIs change, verification is limited to:

1. Build succeeds: `go build ./...`
2. Tests pass: `go test ./...`
3. Existing API tests in `tests/integration/` continue to pass
