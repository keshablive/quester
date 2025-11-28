// Authentication interfaces for framework layer
package interfaces

import (
	"context"
	"time"
)

// TokenBlacklist manages revoked tokens.
// Application implements this interface (typically using Redis) to enable
// token revocation without framework importing application services.
type TokenBlacklist interface {
	// Blacklist adds a token to the blacklist with expiration.
	// The tokenHash should be a hash of the JWT token.
	// expiresAt should match the token's expiration time.
	Blacklist(ctx context.Context, tokenHash string, expiresAt time.Time) error

	// IsBlacklisted checks if a token hash is in the blacklist.
	// Returns true if the token has been revoked.
	IsBlacklisted(ctx context.Context, tokenHash string) (bool, error)

	// CleanupExpired removes expired entries from the blacklist.
	// This is a maintenance operation that can be run periodically.
	CleanupExpired(ctx context.Context) error
}

// TokenBlacklistChecker is a simplified interface for checking token blacklist status.
// This is used by middleware that only needs to check, not modify, the blacklist.
type TokenBlacklistChecker interface {
	// IsBlacklisted checks if a token hash is in the blacklist.
	IsBlacklisted(tokenHash string) bool
}
