package services

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/keshablive/quester/internal/framework/database"
	"github.com/keshablive/quester/internal/models"
	"github.com/keshablive/quester/internal/repositories"
)

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
	refreshTokenString, err := GenerateRandomToken(32)
	if err != nil {
		return nil, fmt.Errorf("failed to generate refresh token: %w", err)
	}

	// Hash refresh token for storage
	tokenHash := HashToken(refreshTokenString)

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

// LoginFunc is a convenience function that creates service instances and performs login
// This matches the pattern used by Signup for easy controller integration
func LoginFunc(ctx context.Context, tenantID uuid.UUID, email, password string) (*LoginResponse, error) {
	// Initialize repositories
	userRepo := repositories.NewUserRepository(database.DB)
	tokenRepo := repositories.NewRefreshTokenRepository(database.DB)

	// Create login service
	loginService := NewLoginService(userRepo, tokenRepo)
	// Note: AchievementService is optional for streak tracking
	// It can be wired in via SetAchievementService if needed

	// Perform login
	return loginService.Login(ctx, tenantID, email, password)
}
