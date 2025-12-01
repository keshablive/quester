// Package services provides shared types for authentication services.
// This file contains types shared across auth_service.go, login_service.go,
// signup_service.go, and refresh_token_service.go to avoid duplicate declarations.
package services

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"regexp"
	"strings"

	"github.com/google/uuid"
	"github.com/keshablive/quester/internal/models"
)

// ============================================================================
// Request/Response Types
// ============================================================================

// SignupRequest contains the data needed to create a new user account
type SignupRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Username string `json:"username" validate:"required,min=3,max=30"`
	Password string `json:"password" validate:"required,min=8"`
}

// LoginRequest represents login credentials
type LoginRequest struct {
	Email    string
	Password string
}

// AuthResponse contains the tokens and user data after successful authentication
type AuthResponse struct {
	AccessToken  string       `json:"access_token"`
	RefreshToken string       `json:"refresh_token"`
	User         *models.User `json:"user"`
}

// RefreshResponse represents the response after refreshing a token
type RefreshResponse struct {
	AccessToken  string       `json:"access_token"`
	RefreshToken string       `json:"refresh_token,omitempty"` // Optional - only if token rotation enabled
	User         *models.User `json:"user"`
}

// LoginResponse contains authentication tokens and user data
type LoginResponse struct {
	AccessToken  string       `json:"access_token"`
	RefreshToken string       `json:"refresh_token"`
	User         *models.User `json:"user"`
}

// SignupResponse contains the tokens and user data after successful signup
type SignupResponse struct {
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

// ============================================================================
// Repository Interfaces
// ============================================================================

// UserRepository interface for user data access
type UserRepository interface {
	FindByEmail(ctx context.Context, tenantID uuid.UUID, email string) (*models.User, error)
	FindByID(ctx context.Context, userID uuid.UUID) (*models.User, error)
	CreateUser(ctx context.Context, tenantID uuid.UUID, user *models.User) error
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

// ============================================================================
// Validation Helpers
// ============================================================================

// Email validation regex (RFC 5322 simplified)
var emailRegex = regexp.MustCompile(`^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$`)

// Username validation regex (alphanumeric, underscore, hyphen, dot)
var usernameRegex = regexp.MustCompile(`^[a-zA-Z0-9_.\-]+$`)

// Password strength requirements
const (
	MinPasswordLength = 8
	MinUsernameLength = 3
	MaxUsernameLength = 30
)

// ValidateEmail validates email format using RFC 5322 simplified regex
func ValidateEmail(email string) error {
	if email == "" {
		return fmt.Errorf("email cannot be empty")
	}

	email = strings.TrimSpace(email)
	email = strings.ToLower(email)

	// Check for consecutive dots (invalid)
	if strings.Contains(email, "..") {
		return fmt.Errorf("invalid email format")
	}

	if !emailRegex.MatchString(email) {
		return fmt.Errorf("invalid email format")
	}

	return nil
}

// ValidateUsername validates username format
// Requirements: 3-30 chars, alphanumeric + underscore, hyphen, dot
func ValidateUsername(username string) error {
	if username == "" {
		return fmt.Errorf("username cannot be empty")
	}
	username = strings.TrimSpace(username)
	if len(username) < MinUsernameLength || len(username) > MaxUsernameLength {
		return fmt.Errorf("username must be between %d and %d characters", MinUsernameLength, MaxUsernameLength)
	}
	if !usernameRegex.MatchString(username) {
		return fmt.Errorf("username can only contain letters, numbers, underscore, hyphen, and dot")
	}
	return nil
}

// ValidatePassword validates password strength
// Requirements: min 8 chars, uppercase, lowercase, number, special character
func ValidatePassword(password string) error {
	if password == "" {
		return fmt.Errorf("password cannot be empty")
	}

	if len(password) < MinPasswordLength {
		return fmt.Errorf("password must be at least %d characters long", MinPasswordLength)
	}

	hasUpper := regexp.MustCompile(`[A-Z]`).MatchString(password)
	if !hasUpper {
		return fmt.Errorf("password must contain at least one uppercase letter")
	}

	hasLower := regexp.MustCompile(`[a-z]`).MatchString(password)
	if !hasLower {
		return fmt.Errorf("password must contain at least one lowercase letter")
	}

	hasNumber := regexp.MustCompile(`[0-9]`).MatchString(password)
	if !hasNumber {
		return fmt.Errorf("password must contain at least one number")
	}

	hasSpecial := regexp.MustCompile(`[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]`).MatchString(password)
	if !hasSpecial {
		return fmt.Errorf("password must contain at least one special character")
	}

	return nil
}

// ============================================================================
// Token Helpers
// ============================================================================

// GenerateRandomToken generates a cryptographically secure random token
func GenerateRandomToken(length int) (string, error) {
	bytes := make([]byte, length)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}

// HashToken creates a SHA256 hash of the token for storage
func HashToken(token string) string {
	hash := sha256.Sum256([]byte(token))
	return hex.EncodeToString(hash[:])
}
