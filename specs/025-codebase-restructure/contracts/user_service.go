// Package services defines service layer interfaces for the Quester platform.
// These interfaces live in the framework layer and are implemented by
// application-layer services in internal/services/.
package services

import (
	"context"

	"github.com/google/uuid"
)

// UserServiceInterface defines the contract for user management operations.
// Implementations handle user CRUD, profile updates, and preferences.
type UserServiceInterface interface {
	// GetUser retrieves a user by ID.
	// Returns user on success, error if not found.
	GetUser(ctx context.Context, tenantID, userID uuid.UUID) (*UserProfile, error)

	// GetUsers retrieves users with optional filtering and pagination.
	// Returns paginated user list.
	GetUsers(ctx context.Context, tenantID uuid.UUID, filters *UserFilters) (*UserListResponse, error)

	// UpdateUser updates user profile information.
	// Returns updated user on success.
	UpdateUser(ctx context.Context, tenantID, userID uuid.UUID, input *UpdateUserInput) (*UserProfile, error)

	// DeleteUser soft-deletes a user account.
	// Returns error if user not found or deletion fails.
	DeleteUser(ctx context.Context, tenantID, userID uuid.UUID) error

	// GetUserByEmail retrieves a user by email address.
	// Returns user on success, error if not found.
	GetUserByEmail(ctx context.Context, tenantID uuid.UUID, email string) (*UserProfile, error)
}

// UserProfile represents detailed user information.
type UserProfile struct {
	ID          uuid.UUID  `json:"id"`
	TenantID    uuid.UUID  `json:"tenant_id"`
	Email       string     `json:"email"`
	FirstName   string     `json:"first_name"`
	LastName    string     `json:"last_name"`
	DisplayName string     `json:"display_name"`
	AvatarURL   string     `json:"avatar_url"`
	Role        string     `json:"role"`
	CreatedAt   string     `json:"created_at"`
	UpdatedAt   string     `json:"updated_at"`
}

// UserFilters contains filtering options for user queries.
type UserFilters struct {
	Search string `json:"search"`
	Role   string `json:"role"`
	Page   int    `json:"page"`
	Limit  int    `json:"limit"`
}

// UserListResponse contains paginated user results.
type UserListResponse struct {
	Users      []*UserProfile `json:"users"`
	TotalCount int64          `json:"total_count"`
	Page       int            `json:"page"`
	Limit      int            `json:"limit"`
}

// UpdateUserInput contains fields that can be updated on a user.
type UpdateUserInput struct {
	FirstName   *string `json:"first_name"`
	LastName    *string `json:"last_name"`
	DisplayName *string `json:"display_name"`
	AvatarURL   *string `json:"avatar_url"`
}
