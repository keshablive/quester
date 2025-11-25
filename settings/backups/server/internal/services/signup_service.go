// Signup service for user registration
package services

import (
	"context"
	"fmt"
	"regexp"
	"strings"

	"github.com/google/uuid"
	"github.com/yourusername/quester/internal/framework/database"
	"github.com/yourusername/quester/internal/models"
	"github.com/yourusername/quester/internal/repositories"
)

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

// SignupRequest contains the data needed to create a new user account
type SignupRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Username string `json:"username" validate:"required,min=3,max=30"`
	Password string `json:"password" validate:"required,min=8"`
}

// SignupResponse contains the tokens and user data after successful signup
type SignupResponse struct {
	AccessToken  string       `json:"access_token"`
	RefreshToken string       `json:"refresh_token"`
	User         *models.User `json:"user"`
}

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

// ValidatePassword validates password strength
// Requirements: min 8 chars, uppercase, lowercase, number, special character
func ValidatePassword(password string) error {
	if password == "" {
		return fmt.Errorf("password cannot be empty")
	}

	if len(password) < MinPasswordLength {
		return fmt.Errorf("password must be at least 8 characters long")
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

// ValidateUsername validates username format
// Requirements: 3-30 chars, alphanumeric + underscore, hyphen, dot
func ValidateUsername(username string) error {
	if username == "" {
		return fmt.Errorf("username cannot be empty")
	}

	username = strings.TrimSpace(username)

	if len(username) < MinUsernameLength {
		return fmt.Errorf("username must be at least 3 characters long")
	}

	if len(username) > MaxUsernameLength {
		return fmt.Errorf("username must be maximum 30 characters long")
	}

	if !usernameRegex.MatchString(username) {
		return fmt.Errorf("username can only contain letters, numbers, underscore, hyphen, and dot")
	}

	return nil
}

// Signup creates a new user account with validation
// Steps:
// 1. Validate email, username, password
// 2. Check for duplicate email in tenant
// 3. Hash password with bcrypt cost 12
// 4. Create user in database
// 5. Generate JWT access and refresh tokens
// 6. Return tokens and user data
func Signup(ctx context.Context, tenantID uuid.UUID, request *SignupRequest) (*SignupResponse, error) {
	// Validate input
	if err := ValidateEmail(request.Email); err != nil {
		return nil, fmt.Errorf("invalid email: %w", err)
	}

	if err := ValidateUsername(request.Username); err != nil {
		return nil, fmt.Errorf("invalid username: %w", err)
	}

	if err := ValidatePassword(request.Password); err != nil {
		return nil, fmt.Errorf("invalid password: %w", err)
	}

	// Initialize user repository
	userRepo := repositories.NewUserRepository(database.DB)

	// Check for duplicate email in tenant
	existingUser, err := userRepo.FindByEmail(ctx, tenantID, strings.ToLower(strings.TrimSpace(request.Email)))
	if err == nil && existingUser != nil {
		return nil, fmt.Errorf("user with email %s already exists", request.Email)
	}

	// Hash password with bcrypt cost 12 (constitutional requirement)
	passwordHash, err := HashPassword(request.Password)
	if err != nil {
		return nil, fmt.Errorf("failed to hash password: %w", err)
	}

	// Create user model with defaults
	user := &models.User{
		Email:        strings.ToLower(strings.TrimSpace(request.Email)),
		Username:     strings.TrimSpace(request.Username),
		PasswordHash: passwordHash,
		Role:         models.RolePlayer, // Default role
		XP:           0,                 // Start at 0 XP
		Level:        1,                 // Start at level 1
		Tier:         models.TierBronze, // Start at Bronze tier
		LoginStreak:  0,                 // No login streak yet
	}

	// Create user in database
	if err := userRepo.CreateUser(ctx, tenantID, user); err != nil {
		return nil, fmt.Errorf("failed to create user: %w", err)
	}

	// Generate JWT tokens
	accessToken, err := GenerateAccessToken(user)
	if err != nil {
		return nil, fmt.Errorf("failed to generate access token: %w", err)
	}

	refreshToken, err := GenerateRefreshToken(user)
	if err != nil {
		return nil, fmt.Errorf("failed to generate refresh token: %w", err)
	}

	// Return response with tokens and user data
	return &SignupResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		User:         user,
	}, nil
}
