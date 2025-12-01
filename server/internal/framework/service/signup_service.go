// Signup service for user registration
package service

import (
	"context"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/keshablive/quester/internal/framework/database"
	"github.com/keshablive/quester/internal/models"
	"github.com/keshablive/quester/internal/framework/repository"
)

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
	userRepo := repository.NewUserRepository(database.DB)

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
