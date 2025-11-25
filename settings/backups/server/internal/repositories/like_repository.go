package repositories

import (
	"context"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/yourusername/quester/internal/models"
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
	return r.db.WithContext(ctx).Create(like).Error
}

// Delete removes a like
func (r *LikeRepository) Delete(ctx context.Context, userID, postID, tenantID uuid.UUID) error {
	return r.db.WithContext(ctx).
		Where("tenant_id = ? AND user_id = ? AND post_id = ?", tenantID, userID, postID).
		Delete(&models.Like{}).Error
}

// IsLiked checks if a user has liked a post
func (r *LikeRepository) IsLiked(ctx context.Context, userID, postID, tenantID uuid.UUID) (bool, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Model(&models.Like{}).
		Where("tenant_id = ? AND user_id = ? AND post_id = ?", tenantID, userID, postID).
		Count(&count).Error
	return count > 0, err
}

// GetLikeCount gets the count of likes for a post
func (r *LikeRepository) GetLikeCount(ctx context.Context, postID, tenantID uuid.UUID) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Model(&models.Like{}).
		Where("tenant_id = ? AND post_id = ?", tenantID, postID).
		Count(&count).Error
	return count, err
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
		return nil, 0, err
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

	return users, total, err
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
		return nil, 0, err
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

	return posts, total, err
}
