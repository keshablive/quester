// Package services defines service layer interfaces for the Quester platform.
package services

import (
	"context"
	"time"

	"github.com/google/uuid"
)

// TokenServiceInterface defines the contract for JWT token operations.
// Implementations handle token generation, validation, and revocation.
type TokenServiceInterface interface {
	// GenerateAccessToken creates a short-lived JWT access token.
	GenerateAccessToken(ctx context.Context, userID, tenantID uuid.UUID, role string) (string, error)

	// GenerateRefreshToken creates a long-lived refresh token.
	GenerateRefreshToken(ctx context.Context, userID, tenantID uuid.UUID) (string, error)

	// ValidateAccessToken validates an access token and returns claims.
	ValidateAccessToken(ctx context.Context, token string) (*TokenValidationResult, error)

	// ValidateRefreshToken validates a refresh token.
	ValidateRefreshToken(ctx context.Context, token string) (*RefreshTokenInfo, error)

	// RevokeToken revokes a token (adds to blacklist).
	RevokeToken(ctx context.Context, token string) error

	// RevokeAllUserTokens revokes all tokens for a user.
	RevokeAllUserTokens(ctx context.Context, userID uuid.UUID) (int, error)

	// IsTokenRevoked checks if a token has been revoked.
	IsTokenRevoked(ctx context.Context, tokenHash string) (bool, error)

	// CleanupExpiredTokens removes expired tokens from storage.
	CleanupExpiredTokens(ctx context.Context) (int64, error)
}

// TokenValidationResult contains the result of token validation.
type TokenValidationResult struct {
	Valid    bool      `json:"valid"`
	UserID   uuid.UUID `json:"user_id"`
	TenantID uuid.UUID `json:"tenant_id"`
	Role     string    `json:"role"`
	Expiry   time.Time `json:"expiry"`
}

// RefreshTokenInfo contains information about a refresh token.
type RefreshTokenInfo struct {
	TokenID   uuid.UUID `json:"token_id"`
	UserID    uuid.UUID `json:"user_id"`
	TenantID  uuid.UUID `json:"tenant_id"`
	ExpiresAt time.Time `json:"expires_at"`
	Revoked   bool      `json:"revoked"`
}
