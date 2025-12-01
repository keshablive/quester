# Data Model: Server Framework Consolidation

**Feature**: 026-server-framework-consolidation
**Date**: 2025-12-01
**Status**: N/A - No new data models

## Overview

This feature is a **refactoring task** that reorganizes existing code without introducing new data models.

## Existing Entities (Unchanged)

The following data model patterns are preserved:

### TenantModel Interface

```go
// Located: internal/framework/repository/tenant_model.go
type TenantModel interface {
    GetTenantID() uuid.UUID
    SetTenantID(uuid.UUID)
}
```

All models implementing `TenantModel` remain unchanged.

### BaseService Dependencies

```go
// Located: internal/framework/service/base.go
type BaseService struct {
    db     *gorm.DB
    logger *slog.Logger
    cache  *cache.PooledRedisClient
    txMgr  *TransactionManager
}
```

Service dependencies remain unchanged.

## New Type File (Auth Types Extraction)

The only "new" file is `auth_types.go` which consolidates existing duplicate declarations:

```go
// Located: internal/framework/service/auth_types.go
package service

// SignupRequest represents user registration input.
// EXTRACTED from auth_service.go and signup_service.go
type SignupRequest struct {
    Email    string `json:"email" binding:"required,email"`
    Password string `json:"password" binding:"required,min=8"`
    Name     string `json:"name" binding:"required"`
}

// LoginRequest represents user authentication input.
// EXTRACTED from auth_service.go and login_service.go
type LoginRequest struct {
    Email    string `json:"email" binding:"required,email"`
    Password string `json:"password" binding:"required"`
    DeviceID string `json:"device_id"`
}

// RefreshResponse represents token refresh output.
// EXTRACTED from auth_service.go and refresh_token_service.go
type RefreshResponse struct {
    AccessToken  string `json:"access_token"`
    RefreshToken string `json:"refresh_token"`
    ExpiresIn    int64  `json:"expires_in"`
}

// UserRepository defines user data access contract.
// EXTRACTED from auth_service.go and login_service.go
type UserRepository interface {
    FindByEmail(ctx context.Context, tenantID uuid.UUID, email string) (*models.User, error)
    Create(ctx context.Context, user *models.User) error
    Update(ctx context.Context, user *models.User) error
}

// RefreshTokenRepository defines refresh token data access contract.
// EXTRACTED from auth_service.go and login_service.go
type RefreshTokenRepository interface {
    Create(ctx context.Context, token *models.RefreshToken) error
    FindByToken(ctx context.Context, token string) (*models.RefreshToken, error)
    Delete(ctx context.Context, id uuid.UUID) error
    DeleteByUserID(ctx context.Context, userID uuid.UUID) error
}
```

## Validation Rules

No changes to validation rules. Existing validation via `go-playground/validator` tags preserved.

## State Transitions

No state transition changes. This is a structural refactoring only.

## Relationships

No relationship changes. Existing foreign key relationships preserved.
