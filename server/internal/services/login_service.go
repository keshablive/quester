package services

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/keshablive/quester/internal/framework/database"
	"github.com/keshablive/quester/internal/models"
	"github.com/keshablive/quester/internal/repositories"
)

// LoginRequest represents login credentials
type LoginRequest struct {
	Email    string
	Password string
}

// LoginResponse contains authentication tokens and user data
type LoginResponse struct {
	AccessToken  string       `json:"access_token"`
	RefreshToken string       `json:"refresh_token"`
	User         *models.User `json:"user"`
}

// NotFoundError represents a resource not found error
type NotFoundError struct {
	Message string
}

func (e *NotFoundError) Error() string {
	return e.Message
}

// UserRepository interface for user data access
type UserRepository interface {
	FindByEmail(ctx context.Context, tenantID uuid.UUID, email string) (*models.User, error)
	FindByID(ctx context.Context, userID uuid.UUID) (*models.User, error)
	UpdateUser(ctx context.Context, user *models.User) error
}

// RefreshTokenRepository interface for refresh token data access
type RefreshTokenRepository interface {
	CreateToken(ctx context.Context, token *models.RefreshToken) error
	FindByToken(ctx context.Context, tokenString string) (*models.RefreshToken, error)
	RevokeToken(ctx context.Context, tokenString string) error
	RevokeAllByUserID(ctx context.Context, userID uuid.UUID) (int, error)
	GetActiveTokens(ctx context.Context, userID uuid.UUID, limit, offset int) ([]models.RefreshToken, int64, error)
}

// LoginService handles user authentication
type LoginService struct {
	userRepo       UserRepository
	tokenRepo      RefreshTokenRepository
	achievementSvc *AchievementService
}

// NewLoginService creates a new login service
func NewLoginService(userRepo UserRepository, tokenRepo RefreshTokenRepository) *LoginService {
	return &LoginService{
		userRepo:  userRepo,
		tokenRepo: tokenRepo,
	}
}

// SetAchievementService injects AchievementService for optional tracking of login streaks
func (s *LoginService) SetAchievementService(a *AchievementService) {
	s.achievementSvc = a
}

// Login authenticates a user and returns tokens
func (s *LoginService) Login(ctx context.Context, tenantID uuid.UUID, email, password string) (*LoginResponse, error) {
	// Validate input
	if email == "" {
		return nil, errors.New("email is required")
	}
	if password == "" {
		return nil, errors.New("password is required")
	}

	// Find user by email (tenant-scoped)
	user, err := s.userRepo.FindByEmail(ctx, tenantID, email)
	if err != nil {
		// Don't reveal whether user exists or password is wrong
		return nil, errors.New("invalid credentials")
	}

	// Verify password
	err = ComparePassword(user.PasswordHash, password)
	if err != nil {
		return nil, errors.New("invalid credentials")
	}

	// Update last login timestamp and calculate login streak
	s.updateLoginStreak(user)

	// Save updated user
	err = s.userRepo.UpdateUser(ctx, user)
	if err != nil {
		return nil, fmt.Errorf("failed to update user: %w", err)
	}

	// Fire-and-forget: track streaks in AchievementService if available
	if s.achievementSvc != nil {
		go func(uID uuid.UUID, streak int) {
			if err := s.achievementSvc.TrackStreak(context.Background(), uID, streak); err != nil {
				// log but do not block login flow
				// Use standard library log to avoid heavy deps in this file
				// (there's an existing logging choice elsewhere in project)
				// fmt.Printf used here for minimal changes
				fmt.Printf("achievement.TrackStreak error: %v\n", err)
			}
		}(user.ID, user.LoginStreak)
	}

	// Generate access token (1 hour)
	accessToken, err := GenerateAccessToken(user)
	if err != nil {
		return nil, fmt.Errorf("failed to generate access token: %w", err)
	}

	// Generate refresh token (30 days)
	refreshTokenString, err := generateRandomToken(32)
	if err != nil {
		return nil, fmt.Errorf("failed to generate refresh token: %w", err)
	}

	// Hash refresh token for storage
	tokenHash := hashToken(refreshTokenString)

	// Create refresh token record
	refreshToken := &models.RefreshToken{
		UserID:    user.ID,
		TokenHash: tokenHash,
		ExpiresAt: time.Now().UTC().Add(30 * 24 * time.Hour), // 30 days
	}

	// Store refresh token
	err = s.tokenRepo.CreateToken(ctx, refreshToken)
	if err != nil {
		return nil, fmt.Errorf("failed to store refresh token: %w", err)
	}

	return &LoginResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshTokenString,
		User:         user,
	}, nil
}

// updateLoginStreak updates the user's last login timestamp and login streak
// FR-023: Login streaks increment if user logs in within 24 hours, reset otherwise
func (s *LoginService) updateLoginStreak(user *models.User) {
	now := time.Now().UTC()

	if user.LastLogin == nil {
		// First login
		user.LoginStreak = 1
	} else {
		// Calculate time since last login
		timeSinceLastLogin := now.Sub(*user.LastLogin)

		if timeSinceLastLogin < 24*time.Hour {
			// Login within 24 hours - increment streak
			user.LoginStreak++
		} else {
			// Login after 24 hours - reset streak
			user.LoginStreak = 1
		}
	}

	user.LastLogin = &now
}

// generateRandomToken generates a cryptographically secure random token
func generateRandomToken(length int) (string, error) {
	bytes := make([]byte, length)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}

// hashToken creates a SHA256 hash of the token for storage
func hashToken(token string) string {
	hash := sha256.Sum256([]byte(token))
	return hex.EncodeToString(hash[:])
}

// Login is a convenience function that creates service instances and performs login
// This matches the pattern used by Signup for easy controller integration
func Login(ctx context.Context, tenantID uuid.UUID, email, password string) (*LoginResponse, error) {
	// Import required packages
	// Note: These imports are at package level, adding here for clarity
	// "github.com/keshablive/quester/internal/framework/database"
	// "github.com/keshablive/quester/internal/repositories"

	// Initialize repositories
	userRepo := repositories.NewUserRepository(database.DB)
	tokenRepo := repositories.NewRefreshTokenRepository(database.DB)

	// Create login service
	loginService := NewLoginService(userRepo, tokenRepo)
	// Wire achievement service for optional streak tracking
	achievementSvc := NewAchievementService(database.DB)
	loginService.SetAchievementService(achievementSvc)

	// Perform login
	return loginService.Login(ctx, tenantID, email, password)
}
