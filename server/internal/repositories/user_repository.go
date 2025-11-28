// User data access
package repositories

import (
	"context"

	"github.com/google/uuid"
	"github.com/keshablive/quester/internal/framework/utils"
	"github.com/keshablive/quester/internal/models"
	"gorm.io/gorm"
)

// UserRepository handles user data persistence
type UserRepository struct {
	db *gorm.DB
}

// NewUserRepository creates a new user repository instance
func NewUserRepository(db *gorm.DB) *UserRepository {
	ValidateDB(db, "UserRepository")
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
		return utils.WrapCreateError(err, "user")
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
		return nil, utils.WrapFindError(err, "user", email)
	}

	return &user, nil
}

// FindByID finds a user by ID (no tenant scoping - used for token validation)
func (r *UserRepository) FindByID(ctx context.Context, userID uuid.UUID) (*models.User, error) {
	var user models.User
	if err := r.db.WithContext(ctx).First(&user, "id = ?", userID).Error; err != nil {
		return nil, utils.WrapFindError(err, "user", userID.String())
	}

	return &user, nil
}

// UpdateUser updates an existing user's fields
func (r *UserRepository) UpdateUser(ctx context.Context, user *models.User) error {
	result := r.db.WithContext(ctx).Save(user)
	if result.Error != nil {
		return utils.WrapUpdateError(result.Error, "user")
	}

	if result.RowsAffected == 0 {
		return utils.WrapNotFoundError("user", user.ID.String())
	}

	return nil
}

// IncrementLoginStreak increments the user's login streak by 1
func (r *UserRepository) IncrementLoginStreak(ctx context.Context, userID uuid.UUID) error {
	result := r.db.WithContext(ctx).Model(&models.User{}).
		Where("id = ?", userID).
		Update("login_streak", gorm.Expr("login_streak + ?", 1))

	if result.Error != nil {
		return utils.WrapUpdateError(result.Error, "user")
	}

	if result.RowsAffected == 0 {
		return utils.WrapNotFoundError("user", userID.String())
	}

	return nil
}

// ResetLoginStreak resets the user's login streak to 0
func (r *UserRepository) ResetLoginStreak(ctx context.Context, userID uuid.UUID) error {
	result := r.db.WithContext(ctx).Model(&models.User{}).
		Where("id = ?", userID).
		Update("login_streak", 0)

	if result.Error != nil {
		return utils.WrapUpdateError(result.Error, "user")
	}

	if result.RowsAffected == 0 {
		return utils.WrapNotFoundError("user", userID.String())
	}

	return nil
}

// AddSocialXP adds XP from social gamification to user's total XP
// FR-014: Social XP contributes to unified global XP total
func (r *UserRepository) AddSocialXP(ctx context.Context, userID uuid.UUID, xpAmount int) error {
	if xpAmount <= 0 {
		return nil // No-op for zero or negative XP
	}

	result := r.db.WithContext(ctx).Model(&models.User{}).
		Where("id = ?", userID).
		Update("xp", gorm.Expr("xp + ?", xpAmount))

	if result.Error != nil {
		return utils.WrapUpdateError(result.Error, "user.xp")
	}

	if result.RowsAffected == 0 {
		return utils.WrapNotFoundError("user", userID.String())
	}

	return nil
}

// GetUserXP retrieves the current total XP for a user
func (r *UserRepository) GetUserXP(ctx context.Context, userID uuid.UUID) (int, error) {
	var user models.User
	if err := r.db.WithContext(ctx).
		Select("xp").
		First(&user, "id = ?", userID).Error; err != nil {
		return 0, utils.WrapFindError(err, "user.xp", userID.String())
	}
	return user.XP, nil
}

// FindByIDs retrieves multiple users by their IDs in a single query (T021)
// This eliminates N+1 queries in leaderboards and lists
// Returns users in arbitrary order - caller should map by ID
func (r *UserRepository) FindByIDs(ctx context.Context, tenantID uuid.UUID, ids []uuid.UUID) ([]models.User, error) {
	if len(ids) == 0 {
		return []models.User{}, nil
	}

	var users []models.User
	err := r.db.WithContext(ctx).
		Where("tenant_id = ? AND id IN ?", tenantID, ids).
		Find(&users).Error

	if err != nil {
		return nil, utils.WrapFindError(err, "users", "batch")
	}

	return users, nil
}
