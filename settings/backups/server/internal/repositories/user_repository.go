// User data access
package repositories

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/yourusername/quester/internal/framework/database"
	"github.com/yourusername/quester/internal/models"
	"gorm.io/gorm"
)

// UserRepository handles user data persistence
type UserRepository struct {
	db *gorm.DB
}

// NewUserRepository creates a new user repository instance
// Pass nil to use the global database.DB instance
func NewUserRepository(db *gorm.DB) *UserRepository {
	if db == nil {
		db = database.DB
	}
	return &UserRepository{db: db}
}

// CreateUser inserts a new user into the database
// Automatically sets TenantID and validates uniqueness within tenant
func (r *UserRepository) CreateUser(ctx context.Context, tenantID uuid.UUID, user *models.User) error {
	// Set tenant ID
	user.TenantID = tenantID

	// Use tenant-scoped query
	db := r.db.WithContext(ctx).Where("tenant_id = ?", tenantID)

	// Create user
	if err := db.Create(user).Error; err != nil {
		return fmt.Errorf("failed to create user: %w", err)
	}

	return nil
}

// FindByEmail finds a user by email within a specific tenant
// Returns error if user not found (tenant-scoped query)
func (r *UserRepository) FindByEmail(ctx context.Context, tenantID uuid.UUID, email string) (*models.User, error) {
	var user models.User
	if err := r.db.WithContext(ctx).
		Where("tenant_id = ? AND email = ?", tenantID, email).
		First(&user).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("user not found: %s", email)
		}
		return nil, fmt.Errorf("failed to find user by email: %w", err)
	}

	return &user, nil
}

// FindByID finds a user by ID (no tenant scoping - used for token validation)
func (r *UserRepository) FindByID(ctx context.Context, userID uuid.UUID) (*models.User, error) {
	var user models.User
	if err := r.db.WithContext(ctx).First(&user, "id = ?", userID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("user not found: %s", userID)
		}
		return nil, fmt.Errorf("failed to find user by ID: %w", err)
	}

	return &user, nil
}

// UpdateUser updates an existing user's fields
func (r *UserRepository) UpdateUser(ctx context.Context, user *models.User) error {
	result := r.db.WithContext(ctx).Save(user)
	if result.Error != nil {
		return fmt.Errorf("failed to update user: %w", result.Error)
	}

	if result.RowsAffected == 0 {
		return fmt.Errorf("user not found: %s", user.ID)
	}

	return nil
}

// IncrementLoginStreak increments the user's login streak by 1
func (r *UserRepository) IncrementLoginStreak(ctx context.Context, userID uuid.UUID) error {
	result := r.db.WithContext(ctx).Model(&models.User{}).
		Where("id = ?", userID).
		Update("login_streak", gorm.Expr("login_streak + ?", 1))

	if result.Error != nil {
		return fmt.Errorf("failed to increment login streak: %w", result.Error)
	}

	if result.RowsAffected == 0 {
		return fmt.Errorf("user not found: %s", userID)
	}

	return nil
}

// ResetLoginStreak resets the user's login streak to 0
func (r *UserRepository) ResetLoginStreak(ctx context.Context, userID uuid.UUID) error {
	result := r.db.WithContext(ctx).Model(&models.User{}).
		Where("id = ?", userID).
		Update("login_streak", 0)

	if result.Error != nil {
		return fmt.Errorf("failed to reset login streak: %w", result.Error)
	}

	if result.RowsAffected == 0 {
		return fmt.Errorf("user not found: %s", userID)
	}

	return nil
}
