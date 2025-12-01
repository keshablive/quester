package repository

import (
	"context"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/keshablive/quester/internal/framework/utils"
	"github.com/keshablive/quester/internal/models"
)

// PostRepository handles post database operations
type PostRepository struct {
	db *gorm.DB
}

// NewPostRepository creates a new PostRepository
func NewPostRepository(db *gorm.DB) *PostRepository {
	return &PostRepository{db: db}
}

// Create creates a new post
func (r *PostRepository) Create(ctx context.Context, post *models.Post) error {
	if err := r.db.WithContext(ctx).Create(post).Error; err != nil {
		return utils.WrapCreateError(err, "post")
	}
	return nil
}

// FindByID finds a post by ID (excludes soft deleted)
func (r *PostRepository) FindByID(ctx context.Context, tenantID, id uuid.UUID) (*models.Post, error) {
	var post models.Post
	err := r.db.WithContext(ctx).
		Where("tenant_id = ? AND id = ?", tenantID, id).
		Preload("User").
		First(&post).Error

	if err != nil {
		return nil, utils.WrapFindError(err, "post", id.String())
	}

	return &post, nil
}

// Update updates a post
func (r *PostRepository) Update(ctx context.Context, post *models.Post) error {
	result := r.db.WithContext(ctx).
		Where("tenant_id = ?", post.TenantID).
		Save(post)

	if result.Error != nil {
		return utils.WrapUpdateError(result.Error, "post")
	}

	if result.RowsAffected == 0 {
		return utils.WrapNotFoundError("post", post.ID.String())
	}

	return nil
}

// Delete soft deletes a post
func (r *PostRepository) Delete(ctx context.Context, tenantID, id uuid.UUID) error {
	result := r.db.WithContext(ctx).
		Where("tenant_id = ? AND id = ?", tenantID, id).
		Delete(&models.Post{})

	if result.Error != nil {
		return utils.WrapDeleteError(result.Error, "post")
	}

	if result.RowsAffected == 0 {
		return utils.WrapNotFoundError("post", id.String())
	}

	return nil
}

// GetUserPosts gets all posts by a specific user (paginated)
// Optimized to build base query once and avoid duplication
func (r *PostRepository) GetUserPosts(ctx context.Context, userID, tenantID uuid.UUID, page, limit int) ([]models.Post, int64, error) {
	var posts []models.Post
	var total int64

	// Build base query with common conditions
	baseQuery := r.db.WithContext(ctx).
		Model(&models.Post{}).
		Where("tenant_id = ? AND user_id = ?", tenantID, userID)

	// Count total using base query
	err := baseQuery.Count(&total).Error
	if err != nil {
		return nil, 0, utils.WrapCountError(err, "user posts")
	}

	// Get posts with pagination, reusing same base conditions
	offset := (page - 1) * limit
	err = baseQuery.
		Preload("User").
		Order("created_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&posts).Error

	if err != nil {
		return nil, 0, utils.WrapListError(err, "user posts")
	}

	return posts, total, nil
}

// GetPublicPosts gets all public posts (paginated)
// Optimized to build base query once and avoid duplication
func (r *PostRepository) GetPublicPosts(ctx context.Context, tenantID uuid.UUID, page, limit int) ([]models.Post, int64, error) {
	var posts []models.Post
	var total int64

	// Build base query with common conditions
	baseQuery := r.db.WithContext(ctx).
		Model(&models.Post{}).
		Where("tenant_id = ? AND visibility = ?", tenantID, models.VisibilityPublic)

	// Count total using base query
	err := baseQuery.Count(&total).Error
	if err != nil {
		return nil, 0, utils.WrapCountError(err, "public posts")
	}

	// Get posts with pagination, reusing same base conditions
	offset := (page - 1) * limit
	err = baseQuery.
		Preload("User").
		Order("created_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&posts).Error

	if err != nil {
		return nil, 0, utils.WrapListError(err, "public posts")
	}

	return posts, total, nil
}

// GetFollowingPosts gets posts from users that the specified user follows (paginated)
// Optimized to build base query once and avoid duplication
func (r *PostRepository) GetFollowingPosts(ctx context.Context, userID, tenantID uuid.UUID, page, limit int) ([]models.Post, int64, error) {
	var posts []models.Post
	var total int64

	// Subquery for followed users
	subQuery := r.db.WithContext(ctx).
		Table("follows").
		Select("following_id").
		Where("tenant_id = ? AND follower_id = ?", tenantID, userID)

	// Build base query with common conditions
	baseQuery := r.db.WithContext(ctx).
		Model(&models.Post{}).
		Where("tenant_id = ? AND user_id IN (?) AND (visibility = ? OR visibility = ?)",
			tenantID, subQuery, models.VisibilityPublic, models.VisibilityFollowers)

	// Count total using base query
	err := baseQuery.Count(&total).Error
	if err != nil {
		return nil, 0, utils.WrapCountError(err, "following posts")
	}

	// Get posts with pagination, reusing same base conditions
	offset := (page - 1) * limit
	err = baseQuery.
		Preload("User").
		Order("created_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&posts).Error

	if err != nil {
		return nil, 0, utils.WrapListError(err, "following posts")
	}

	return posts, total, nil
}

// IncrementLikeCount increments the like count for a post
func (r *PostRepository) IncrementLikeCount(ctx context.Context, postID, tenantID uuid.UUID) error {
	err := r.db.WithContext(ctx).
		Model(&models.Post{}).
		Where("id = ? AND tenant_id = ?", postID, tenantID).
		UpdateColumn("like_count", gorm.Expr("like_count + ?", 1)).Error
	if err != nil {
		return utils.WrapUpdateError(err, "post")
	}
	return nil
}

// DecrementLikeCount decrements the like count for a post
func (r *PostRepository) DecrementLikeCount(ctx context.Context, postID, tenantID uuid.UUID) error {
	err := r.db.WithContext(ctx).
		Model(&models.Post{}).
		Where("id = ? AND tenant_id = ?", postID, tenantID).
		UpdateColumn("like_count", gorm.Expr("like_count - ?", 1)).Error
	if err != nil {
		return utils.WrapUpdateError(err, "post")
	}
	return nil
}

// IncrementCommentCount increments the comment count for a post
func (r *PostRepository) IncrementCommentCount(ctx context.Context, postID, tenantID uuid.UUID) error {
	err := r.db.WithContext(ctx).
		Model(&models.Post{}).
		Where("id = ? AND tenant_id = ?", postID, tenantID).
		UpdateColumn("comment_count", gorm.Expr("comment_count + ?", 1)).Error
	if err != nil {
		return utils.WrapUpdateError(err, "post")
	}
	return nil
}

// DecrementCommentCount decrements the comment count for a post
func (r *PostRepository) DecrementCommentCount(ctx context.Context, postID, tenantID uuid.UUID) error {
	err := r.db.WithContext(ctx).
		Model(&models.Post{}).
		Where("id = ? AND tenant_id = ?", postID, tenantID).
		UpdateColumn("comment_count", gorm.Expr("comment_count - ?", 1)).Error
	if err != nil {
		return utils.WrapUpdateError(err, "post")
	}
	return nil
}

// IncrementShareCount increments the share count for a post
func (r *PostRepository) IncrementShareCount(ctx context.Context, postID, tenantID uuid.UUID) error {
	err := r.db.WithContext(ctx).
		Model(&models.Post{}).
		Where("id = ? AND tenant_id = ?", postID, tenantID).
		UpdateColumn("share_count", gorm.Expr("share_count + ?", 1)).Error
	if err != nil {
		return utils.WrapUpdateError(err, "post")
	}
	return nil
}

// SearchPosts searches posts by content (paginated)
// Optimized to build base query once and avoid duplication
func (r *PostRepository) SearchPosts(ctx context.Context, query string, tenantID uuid.UUID, page, limit int) ([]models.Post, int64, error) {
	var posts []models.Post
	var total int64

	searchQuery := "%" + query + "%"

	// Build base query with common conditions
	baseQuery := r.db.WithContext(ctx).
		Model(&models.Post{}).
		Where("tenant_id = ? AND content ILIKE ? AND visibility = ?", tenantID, searchQuery, models.VisibilityPublic)

	// Count total using base query
	err := baseQuery.Count(&total).Error
	if err != nil {
		return nil, 0, utils.WrapCountError(err, "posts")
	}

	// Get posts with pagination, reusing same base conditions
	offset := (page - 1) * limit
	err = baseQuery.
		Preload("User").
		Order("created_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&posts).Error

	if err != nil {
		return nil, 0, utils.WrapListError(err, "posts")
	}

	return posts, total, nil
}
