package repositories

import (
	"context"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/keshablive/quester/internal/framework/utils"
	"github.com/keshablive/quester/internal/models"
)

// FollowRepository handles follow relationship database operations
type FollowRepository struct {
	db *gorm.DB
}

// NewFollowRepository creates a new FollowRepository
func NewFollowRepository(db *gorm.DB) *FollowRepository {
	return &FollowRepository{db: db}
}

// Create creates a new follow relationship
func (r *FollowRepository) Create(ctx context.Context, follow *models.Follow) error {
	if err := r.db.WithContext(ctx).Create(follow).Error; err != nil {
		return utils.WrapCreateError(err, "follow")
	}
	return nil
}

// Delete removes a follow relationship (unfollow)
func (r *FollowRepository) Delete(ctx context.Context, followerID, followingID, tenantID uuid.UUID) error {
	result := r.db.WithContext(ctx).
		Where("tenant_id = ? AND follower_id = ? AND following_id = ?", tenantID, followerID, followingID).
		Delete(&models.Follow{})

	if result.Error != nil {
		return utils.WrapDeleteError(result.Error, "follow")
	}
	if result.RowsAffected == 0 {
		return utils.WrapNotFoundError("follow", followerID.String()+":"+followingID.String())
	}
	return nil
}

// IsFollowing checks if a user is following another user
func (r *FollowRepository) IsFollowing(ctx context.Context, followerID, followingID, tenantID uuid.UUID) (bool, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Model(&models.Follow{}).
		Where("tenant_id = ? AND follower_id = ? AND following_id = ?", tenantID, followerID, followingID).
		Count(&count).Error
	if err != nil {
		return false, utils.WrapCountError(err, "follow")
	}
	return count > 0, nil
}

// GetFollowers gets users who follow the specified user (paginated)
func (r *FollowRepository) GetFollowers(ctx context.Context, userID, tenantID uuid.UUID, page, limit int) ([]models.User, int64, error) {
	var users []models.User
	var total int64

	// Count total followers
	err := r.db.WithContext(ctx).
		Model(&models.Follow{}).
		Where("tenant_id = ? AND following_id = ?", tenantID, userID).
		Count(&total).Error
	if err != nil {
		return nil, 0, utils.WrapCountError(err, "follow")
	}

	// Get followers with pagination
	offset := (page - 1) * limit
	err = r.db.WithContext(ctx).
		Table("users").
		Joins("INNER JOIN follows ON users.id = follows.follower_id").
		Where("follows.tenant_id = ? AND follows.following_id = ?", tenantID, userID).
		Order("follows.created_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&users).Error
	if err != nil {
		return nil, 0, utils.WrapListError(err, "user")
	}

	return users, total, nil
}

// GetFollowing gets users that the specified user follows (paginated)
func (r *FollowRepository) GetFollowing(ctx context.Context, userID, tenantID uuid.UUID, page, limit int) ([]models.User, int64, error) {
	var users []models.User
	var total int64

	// Count total following
	err := r.db.WithContext(ctx).
		Model(&models.Follow{}).
		Where("tenant_id = ? AND follower_id = ?", tenantID, userID).
		Count(&total).Error
	if err != nil {
		return nil, 0, utils.WrapCountError(err, "follow")
	}

	// Get following with pagination
	offset := (page - 1) * limit
	err = r.db.WithContext(ctx).
		Table("users").
		Joins("INNER JOIN follows ON users.id = follows.following_id").
		Where("follows.tenant_id = ? AND follows.follower_id = ?", tenantID, userID).
		Order("follows.created_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&users).Error
	if err != nil {
		return nil, 0, utils.WrapListError(err, "user")
	}

	return users, total, nil
}

// GetFollowerCount gets the count of followers for a user
func (r *FollowRepository) GetFollowerCount(ctx context.Context, userID, tenantID uuid.UUID) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Model(&models.Follow{}).
		Where("tenant_id = ? AND following_id = ?", tenantID, userID).
		Count(&count).Error
	if err != nil {
		return 0, utils.WrapCountError(err, "follow")
	}
	return count, nil
}

// GetFollowingCount gets the count of users that a user follows
func (r *FollowRepository) GetFollowingCount(ctx context.Context, userID, tenantID uuid.UUID) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Model(&models.Follow{}).
		Where("tenant_id = ? AND follower_id = ?", tenantID, userID).
		Count(&count).Error
	if err != nil {
		return 0, utils.WrapCountError(err, "follow")
	}
	return count, nil
}

// GetMutualFollowers gets users who mutually follow each other
func (r *FollowRepository) GetMutualFollowers(ctx context.Context, userID, tenantID uuid.UUID, page, limit int) ([]models.User, int64, error) {
	var users []models.User
	var total int64

	// Subquery for mutual follows
	subQuery := r.db.WithContext(ctx).
		Table("follows as f1").
		Select("f1.following_id").
		Joins("INNER JOIN follows as f2 ON f1.following_id = f2.follower_id AND f1.follower_id = f2.following_id").
		Where("f1.tenant_id = ? AND f1.follower_id = ?", tenantID, userID)

	// Count total
	err := r.db.WithContext(ctx).
		Table("(?) as mutual", subQuery).
		Count(&total).Error
	if err != nil {
		return nil, 0, utils.WrapCountError(err, "follow")
	}

	// Get mutual followers with pagination
	offset := (page - 1) * limit
	err = r.db.WithContext(ctx).
		Table("users").
		Joins("INNER JOIN (?) as mutual ON users.id = mutual.following_id", subQuery).
		Offset(offset).
		Limit(limit).
		Find(&users).Error
	if err != nil {
		return nil, 0, utils.WrapListError(err, "user")
	}

	return users, total, nil
}
