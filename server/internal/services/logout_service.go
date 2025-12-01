// Logout service for handling logout operations
package services

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/keshablive/quester/internal/framework/cache"
	"github.com/keshablive/quester/internal/framework/database"
	"github.com/keshablive/quester/internal/repositories"
)

// LogoutService handles logout operations
type LogoutService struct {
	tokenRepo        RefreshTokenRepository
	blacklistService *BlacklistService
}

// NewLogoutService creates a new logout service
func NewLogoutService(tokenRepo RefreshTokenRepository, blacklistService *BlacklistService) *LogoutService {
	return &LogoutService{
		tokenRepo:        tokenRepo,
		blacklistService: blacklistService,
	}
}

// Logout revokes a single refresh token and adds it to Redis blacklist
func (s *LogoutService) Logout(ctx context.Context, refreshTokenString string) error {
	// Validate input
	if refreshTokenString == "" {
		return errors.New("refresh token is required")
	}

	// Hash the token to get the storage key (same as during creation)
	hash := sha256.Sum256([]byte(refreshTokenString))
	tokenHash := hex.EncodeToString(hash[:])

	// Revoke the token in database (sets revoked_at timestamp)
	err := s.tokenRepo.RevokeToken(ctx, refreshTokenString)
	if err != nil {
		return err
	}

	// Add token hash to Redis blacklist with 30-day TTL (FR-028)
	// This provides fast lookup for revoked tokens
	// If Redis is unavailable, the database revoked_at is still enforced
	ttl := 30 * 24 * time.Hour // 30 days = 2592000 seconds
	if blacklistErr := s.blacklistService.AddToBlacklist(tokenHash, ttl); blacklistErr != nil {
		// Log the error but don't fail the logout - database is source of truth
		// In production, use proper logging: log.Warn("Failed to blacklist token", "error", blacklistErr)
	}

	return nil
}

// LogoutAll revokes all refresh tokens for a specific user
func (s *LogoutService) LogoutAll(ctx context.Context, userID uuid.UUID) (int, error) {
	// Validate input
	if userID == uuid.Nil {
		return 0, errors.New("user ID is required")
	}

	// Revoke all tokens for this user
	count, err := s.tokenRepo.RevokeAllByUserID(ctx, userID)
	if err != nil {
		return 0, err
	}

	return count, nil
}

// Logout is a convenience function that creates service instances and performs logout
// This matches the pattern used by Login and RefreshAccessToken for easy controller integration
func Logout(ctx context.Context, refreshTokenString string) error {
	// Initialize repository
	tokenRepo := repositories.NewRefreshTokenRepository(database.DB)

	// Initialize blacklist service with global cache
	blacklistService := NewBlacklistService(cache.Client)

	// Create logout service
	logoutService := NewLogoutService(tokenRepo, blacklistService)

	// Perform logout
	return logoutService.Logout(ctx, refreshTokenString)
}

// LogoutAll is a convenience function that creates service instances and performs logout all
func LogoutAll(ctx context.Context, userID uuid.UUID) (int, error) {
	// Initialize repository
	tokenRepo := repositories.NewRefreshTokenRepository(database.DB)

	// Initialize blacklist service with global cache
	blacklistService := NewBlacklistService(cache.Client)

	// Create logout service
	logoutService := NewLogoutService(tokenRepo, blacklistService)

	// Perform logout all
	return logoutService.LogoutAll(ctx, userID)
}
