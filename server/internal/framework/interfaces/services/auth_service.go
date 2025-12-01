// Package services defines service layer interfaces for the Quester platform.
// These interfaces live in the framework layer and are implemented by
// application-layer services in internal/services/.
//
// Usage:
//   - Framework code depends on these interfaces (never concrete implementations)
//   - Application services implement these interfaces
//   - DI container resolves interfaces to implementations
//   - Tests can mock these interfaces
package services

import (
	"context"

	"github.com/google/uuid"
)

// AuthServiceInterface defines the contract for authentication operations.
// Implementations handle user login, registration, token management, and logout.
type AuthServiceInterface interface {
	// Login authenticates a user with email and password.
	// Returns tokens on success, error on invalid credentials.
	Login(ctx context.Context, tenantID uuid.UUID, email, password string) (*TokenPair, error)

	// Register creates a new user account.
	// Returns the created user on success, error on validation failure.
	Register(ctx context.Context, tenantID uuid.UUID, input *RegisterInput) (*User, error)

	// RefreshToken generates new access/refresh tokens from a valid refresh token.
	// Returns new token pair on success, error if refresh token is invalid/expired.
	RefreshToken(ctx context.Context, tenantID uuid.UUID, refreshToken string) (*TokenPair, error)

	// Logout invalidates the user's tokens.
	// Adds tokens to blacklist to prevent reuse.
	Logout(ctx context.Context, tenantID uuid.UUID, userID uuid.UUID) error

	// ValidateToken checks if an access token is valid and not blacklisted.
	// Returns claims on success, error if token is invalid.
	ValidateToken(ctx context.Context, accessToken string) (*TokenClaims, error)
}

// TokenPair represents access and refresh tokens.
type TokenPair struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresIn    int64  `json:"expires_in"`
}

// RegisterInput contains user registration data.
type RegisterInput struct {
	Email     string `json:"email" validate:"required,email"`
	Password  string `json:"password" validate:"required,min=8"`
	Username  string `json:"username" validate:"required,min=3,max=30"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
}

// TokenClaims represents decoded JWT claims.
type TokenClaims struct {
	UserID   uuid.UUID `json:"user_id"`
	TenantID uuid.UUID `json:"tenant_id"`
	Email    string    `json:"email"`
	Role     string    `json:"role"`
}

// User represents a user entity (subset for auth responses).
type User struct {
	ID        uuid.UUID `json:"id"`
	TenantID  uuid.UUID `json:"tenant_id"`
	Email     string    `json:"email"`
	Username  string    `json:"username"`
	FirstName string    `json:"first_name"`
	LastName  string    `json:"last_name"`
	Role      string    `json:"role"`
}
