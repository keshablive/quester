// RefreshToken service for handling token refresh operations
package services

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/yourusername/quester/internal/framework/database"
	"github.com/yourusername/quester/internal/models"
	"github.com/yourusername/quester/internal/repositories"
)

// RefreshResponse represents the response after refreshing a token
type RefreshResponse struct {
	AccessToken  string       `json:"access_token"`
	RefreshToken string       `json:"refresh_token,omitempty"` // Optional - only if token rotation enabled
	User         *models.User `json:"user"`
}

// RefreshTokenService handles token refresh operations
type RefreshTokenService struct {
	tokenRepo        RefreshTokenRepository
	userRepo         UserRepository
	blacklistService *BlacklistService
}

// NewRefreshTokenService creates a new refresh token service
func NewRefreshTokenService(tokenRepo RefreshTokenRepository, userRepo UserRepository) *RefreshTokenService {
	return &RefreshTokenService{
		tokenRepo:        tokenRepo,
		userRepo:         userRepo,
		blacklistService: NewBlacklistService(),
	}
}

// RefreshAccessToken validates a refresh token and generates a new access token
func (s *RefreshTokenService) RefreshAccessToken(ctx context.Context, refreshTokenString string) (*RefreshResponse, error) {
	// Validate input
	if refreshTokenString == "" {
		return nil, errors.New("refresh token is required")
	}

	// Hash the token for blacklist lookup (FR-029)
	hash := sha256.Sum256([]byte(refreshTokenString))
	tokenHash := hex.EncodeToString(hash[:])

	// Check Redis blacklist FIRST for fast rejection (adds ~1-2ms)
	// This prevents unnecessary database queries for revoked tokens
	if s.blacklistService.IsBlacklisted(tokenHash) {
		return nil, errors.New("token has been revoked")
	}

	// Find refresh token in database
	refreshToken, err := s.tokenRepo.FindByToken(ctx, refreshTokenString)
	if err != nil {
		return nil, fmt.Errorf("refresh token not found: %w", err)
	}

	// Check if token is expired
	if refreshToken.IsExpired() {
		return nil, errors.New("refresh token has expired")
	}

	// Check if token is revoked (database check - source of truth)
	if refreshToken.IsRevoked() {
		return nil, errors.New("refresh token has been revoked")
	}

	// Get user from token
	user, err := s.userRepo.FindByID(ctx, refreshToken.UserID)
	if err != nil {
		return nil, fmt.Errorf("user not found: %w", err)
	}

	// Generate new access token (1 hour)
	accessToken, err := GenerateAccessToken(user)
	if err != nil {
		return nil, fmt.Errorf("failed to generate access token: %w", err)
	}

	// Prepare response with user data
	response := &RefreshResponse{
		AccessToken: accessToken,
		User:        user,
	}

	// Token rotation: create new refresh token and revoke old one
	// This is optional but recommended for security
	// Comment this block if you want to keep refresh tokens valid until expiry
	/*
		newRefreshTokenString, err := generateRandomToken(64)
		if err != nil {
			return nil, fmt.Errorf("failed to generate new refresh token: %w", err)
		}

		newRefreshToken := &models.RefreshToken{
			ID:        uuid.New(),
			UserID:    user.ID,
			TokenHash: newRefreshTokenString,
			ExpiresAt: time.Now().Add(30 * 24 * time.Hour), // 30 days
			CreatedAt: time.Now(),
		}

		// Save new refresh token
		if err := s.tokenRepo.CreateToken(ctx, newRefreshToken); err != nil {
			return nil, fmt.Errorf("failed to create new refresh token: %w", err)
		}

		// Revoke old refresh token
		if err := s.tokenRepo.RevokeToken(ctx, refreshTokenString); err != nil {
			// Log error but don't fail the request
			// The new token is already created
		}

		response.RefreshToken = newRefreshTokenString
	*/

	return response, nil
}

// GetActiveTokens retrieves paginated active tokens for a user (T085, FR-032)
// Returns only non-expired, non-revoked tokens ordered by created_at DESC
func (s *RefreshTokenService) GetActiveTokens(ctx context.Context, userID string, limit, offset int) ([]models.RefreshToken, int64, error) {
	// Parse and validate user ID
	parsedUserID, err := uuid.Parse(userID)
	if err != nil {
		return nil, 0, fmt.Errorf("invalid user ID: %w", err)
	}

	// Validate and cap limit at 50 (per FR-032)
	if limit <= 0 {
		limit = 50
	}
	if limit > 50 {
		limit = 50
	}

	// Validate offset
	if offset < 0 {
		offset = 0
	}

	// Get active tokens from repository
	tokens, total, err := s.tokenRepo.GetActiveTokens(ctx, parsedUserID, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to get active tokens: %w", err)
	}

	return tokens, total, nil
}

// RefreshAccessToken is a convenience function that creates service instances and refreshes access token
// This matches the pattern used by Login for easy controller integration
func RefreshAccessToken(ctx context.Context, refreshTokenString string) (*RefreshResponse, error) {
	// Import required packages
	// Note: These imports are at package level
	// "github.com/yourusername/quester/internal/framework/database"
	// "github.com/yourusername/quester/internal/repositories"

	// Initialize repositories
	userRepo := repositories.NewUserRepository(database.DB)
	tokenRepo := repositories.NewRefreshTokenRepository(database.DB)

	// Create refresh token service
	refreshService := NewRefreshTokenService(tokenRepo, userRepo)

	// Perform token refresh
	return refreshService.RefreshAccessToken(ctx, refreshTokenString)
}
