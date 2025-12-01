package repository

import (
	"context"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/keshablive/quester/internal/framework/utils"
	"github.com/keshablive/quester/internal/models"
)

// LikeRepository handles like database operations
type LikeRepository struct {
	db *gorm.DB
}

// NewLikeRepository creates a new LikeRepository
func NewLikeRepository(db *gorm.DB) *LikeRepository {
	return &LikeRepository{db: db}
}

// Create creates a new like
func (r *LikeRepository) Create(ctx context.Context, like *models.Like) error {
	if err := r.db.WithContext(ctx).Create(like).Error; err != nil {
		return utils.WrapCreateError(err, "like")
	}
	return nil
}

// Delete removes a like
func (r *LikeRepository) Delete(ctx context.Context, userID, postID, tenantID uuid.UUID) error {
	result := r.db.WithContext(ctx).
		Where("tenant_id = ? AND user_id = ? AND post_id = ?", tenantID, userID, postID).
		Delete(&models.Like{})

	if result.Error != nil {
		return utils.WrapDeleteError(result.Error, "like")
	}
	if result.RowsAffected == 0 {
		return utils.WrapNotFoundError("like", userID.String()+":"+postID.String())
	}
	return nil
}

// IsLiked checks if a user has liked a post
func (r *LikeRepository) IsLiked(ctx context.Context, userID, postID, tenantID uuid.UUID) (bool, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Model(&models.Like{}).
		Where("tenant_id = ? AND user_id = ? AND post_id = ?", tenantID, userID, postID).
		Count(&count).Error
	if err != nil {
		return false, utils.WrapCountError(err, "like")
	}
	return count > 0, nil
}

// GetLikeCount gets the count of likes for a post
func (r *LikeRepository) GetLikeCount(ctx context.Context, postID, tenantID uuid.UUID) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Model(&models.Like{}).
		Where("tenant_id = ? AND post_id = ?", tenantID, postID).
		Count(&count).Error
	if err != nil {
		return 0, utils.WrapCountError(err, "like")
	}
	return count, nil
}

// GetLikers gets users who liked a post (paginated)
func (r *LikeRepository) GetLikers(ctx context.Context, postID, tenantID uuid.UUID, page, limit int) ([]models.User, int64, error) {
	var users []models.User
	var total int64

	// Count total likers
	err := r.db.WithContext(ctx).
		Model(&models.Like{}).
		Where("tenant_id = ? AND post_id = ?", tenantID, postID).
		Count(&total).Error
	if err != nil {
		return nil, 0, utils.WrapCountError(err, "like")
	}

	// Get likers with pagination
	offset := (page - 1) * limit
	err = r.db.WithContext(ctx).
		Table("users").
		Joins("INNER JOIN likes ON users.id = likes.user_id").
		Where("likes.tenant_id = ? AND likes.post_id = ?", tenantID, postID).
		Order("likes.created_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&users).Error
	if err != nil {
		return nil, 0, utils.WrapListError(err, "user")
	}

	return users, total, nil
}

// GetUserLikes gets posts that a user has liked (paginated)
func (r *LikeRepository) GetUserLikes(ctx context.Context, userID, tenantID uuid.UUID, page, limit int) ([]models.Post, int64, error) {
	var posts []models.Post
	var total int64

	// Count total liked posts
	err := r.db.WithContext(ctx).
		Model(&models.Like{}).
		Where("tenant_id = ? AND user_id = ?", tenantID, userID).
		Count(&total).Error
	if err != nil {
		return nil, 0, utils.WrapCountError(err, "like")
	}

	// Get liked posts with pagination
	offset := (page - 1) * limit
	err = r.db.WithContext(ctx).
		Table("posts").
		Joins("INNER JOIN likes ON posts.id = likes.post_id").
		Where("likes.tenant_id = ? AND likes.user_id = ?", tenantID, userID).
		Preload("User").
		Order("likes.created_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&posts).Error
	if err != nil {
		return nil, 0, utils.WrapListError(err, "post")
	}

	return posts, total, nil
}
