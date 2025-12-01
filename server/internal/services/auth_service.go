package services

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/keshablive/quester/internal/framework/auth"
	"github.com/keshablive/quester/internal/models"
)

// AuthService handles all authentication related operations
type AuthService struct {
	userRepo         UserRepository
	tokenRepo        RefreshTokenRepository
	blacklistService *BlacklistService
	achievementSvc   *AchievementService
}

// NewAuthService creates a new authentication service
// T104: Now accepts cache client for dependency injection
func NewAuthService(userRepo UserRepository, tokenRepo RefreshTokenRepository, blacklistService *BlacklistService) *AuthService {
	return &AuthService{
		userRepo:         userRepo,
		tokenRepo:        tokenRepo,
		blacklistService: blacklistService,
	}
}

// SetAchievementService injects AchievementService for optional tracking
func (s *AuthService) SetAchievementService(a *AchievementService) {
	s.achievementSvc = a
}

// Signup creates a new user account
func (s *AuthService) Signup(ctx context.Context, tenantID uuid.UUID, req *SignupRequest) (*AuthResponse, error) {
	// Validate input
	if err := ValidateEmail(req.Email); err != nil {
		return nil, fmt.Errorf("invalid email: %w", err)
	}
	if err := ValidateUsername(req.Username); err != nil {
		return nil, fmt.Errorf("invalid username: %w", err)
	}
	if err := ValidatePassword(req.Password); err != nil {
		return nil, fmt.Errorf("invalid password: %w", err)
	}

	// Check for duplicate email
	existingUser, err := s.userRepo.FindByEmail(ctx, tenantID, strings.ToLower(strings.TrimSpace(req.Email)))
	if err == nil && existingUser != nil {
		return nil, fmt.Errorf("user with email %s already exists", req.Email)
	}

	// Hash password
	passwordHash, err := auth.HashPassword(req.Password)
	if err != nil {
		return nil, fmt.Errorf("failed to hash password: %w", err)
	}

	// Create user model
	user := &models.User{
		Email:        strings.ToLower(strings.TrimSpace(req.Email)),
		Username:     strings.TrimSpace(req.Username),
		PasswordHash: passwordHash,
		Role:         models.RolePlayer,
		XP:           0,
		Level:        1,
		Tier:         models.TierBronze,
		LoginStreak:  0,
	}

	// Save user
	if err := s.userRepo.CreateUser(ctx, tenantID, user); err != nil {
		return nil, fmt.Errorf("failed to create user: %w", err)
	}

	// Generate tokens
	return s.generateTokens(ctx, user)
}

// Login authenticates a user
func (s *AuthService) Login(ctx context.Context, tenantID uuid.UUID, email, password string) (*AuthResponse, error) {
	if email == "" || password == "" {
		return nil, errors.New("email and password are required")
	}

	// Find user
	user, err := s.userRepo.FindByEmail(ctx, tenantID, email)
	if err != nil {
		return nil, errors.New("invalid credentials")
	}

	// Verify password
	if err := auth.ComparePassword(user.PasswordHash, password); err != nil {
		return nil, errors.New("invalid credentials")
	}

	// Update login stats
	s.updateLoginStreak(user)
	if err := s.userRepo.UpdateUser(ctx, user); err != nil {
		return nil, fmt.Errorf("failed to update user: %w", err)
	}

	// Track streak (async)
	if s.achievementSvc != nil {
		go func(uID uuid.UUID, streak int) {
			_ = s.achievementSvc.TrackStreak(context.Background(), uID, streak)
		}(user.ID, user.LoginStreak)
	}

	// Generate tokens
	return s.generateTokens(ctx, user)
}

// RefreshAccessToken refreshes the access token using a refresh token
func (s *AuthService) RefreshAccessToken(ctx context.Context, refreshTokenString string) (*RefreshResponse, error) {
	if refreshTokenString == "" {
		return nil, errors.New("refresh token is required")
	}

	// Check blacklist
	hash := sha256.Sum256([]byte(refreshTokenString))
	tokenHash := hex.EncodeToString(hash[:])
	if s.blacklistService.IsBlacklistedSimple(tokenHash) {
		return nil, errors.New("token has been revoked")
	}

	// Find token in DB
	refreshToken, err := s.tokenRepo.FindByToken(ctx, refreshTokenString)
	if err != nil {
		return nil, fmt.Errorf("refresh token not found: %w", err)
	}

	if refreshToken.IsExpired() {
		return nil, errors.New("refresh token has expired")
	}
	if refreshToken.IsRevoked() {
		return nil, errors.New("refresh token has been revoked")
	}

	// Get user
	user, err := s.userRepo.FindByID(ctx, refreshToken.UserID)
	if err != nil {
		return nil, fmt.Errorf("user not found: %w", err)
	}

	// Generate new access token
	accessToken, err := auth.GenerateAccessToken(user)
	if err != nil {
		return nil, fmt.Errorf("failed to generate access token: %w", err)
	}

	return &RefreshResponse{
		AccessToken: accessToken,
		User:        user,
	}, nil
}

// Logout revokes a refresh token
func (s *AuthService) Logout(ctx context.Context, refreshTokenString string) error {
	if refreshTokenString == "" {
		return errors.New("refresh token is required")
	}

	// Revoke in DB
	if err := s.tokenRepo.RevokeToken(ctx, refreshTokenString); err != nil {
		return err
	}

	// Add to blacklist
	hash := sha256.Sum256([]byte(refreshTokenString))
	tokenHash := hex.EncodeToString(hash[:])
	_ = s.blacklistService.AddToBlacklist(tokenHash, 30*24*time.Hour)

	return nil
}

// LogoutAll revokes all tokens for a user
func (s *AuthService) LogoutAll(ctx context.Context, userID uuid.UUID) (int, error) {
	if userID == uuid.Nil {
		return 0, errors.New("user ID is required")
	}
	return s.tokenRepo.RevokeAllByUserID(ctx, userID)
}

// Helper methods

func (s *AuthService) generateTokens(ctx context.Context, user *models.User) (*AuthResponse, error) {
	accessToken, err := auth.GenerateAccessToken(user)
	if err != nil {
		return nil, err
	}

	refreshTokenString, err := GenerateRandomToken(32)
	if err != nil {
		return nil, err
	}

	tokenHash := HashToken(refreshTokenString)
	refreshToken := &models.RefreshToken{
		UserID:    user.ID,
		TokenHash: tokenHash,
		ExpiresAt: time.Now().UTC().Add(30 * 24 * time.Hour),
	}

	if err := s.tokenRepo.CreateToken(ctx, refreshToken); err != nil {
		return nil, err
	}

	return &AuthResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshTokenString,
		User:         user,
	}, nil
}

func (s *AuthService) updateLoginStreak(user *models.User) {
	now := time.Now().UTC()
	if user.LastLogin == nil {
		user.LoginStreak = 1
	} else {
		if now.Sub(*user.LastLogin) < 24*time.Hour {
			user.LoginStreak++
		} else {
			user.LoginStreak = 1
		}
	}
	user.LastLogin = &now
}
