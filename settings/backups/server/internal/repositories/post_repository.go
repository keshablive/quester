package repositories

import (
	"context"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/yourusername/quester/internal/models"
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
	return r.db.WithContext(ctx).Create(post).Error
}

// FindByID finds a post by ID (excludes soft deleted)
func (r *PostRepository) FindByID(ctx context.Context, id, tenantID uuid.UUID) (*models.Post, error) {
	var post models.Post
	err := r.db.WithContext(ctx).
		Where("id = ? AND tenant_id = ?", id, tenantID).
		Preload("User").
		First(&post).Error
	if err != nil {
		return nil, err
	}
	return &post, nil
}

// Update updates a post
func (r *PostRepository) Update(ctx context.Context, post *models.Post) error {
	return r.db.WithContext(ctx).Save(post).Error
}

// Delete soft deletes a post
func (r *PostRepository) Delete(ctx context.Context, id, tenantID uuid.UUID) error {
	return r.db.WithContext(ctx).
		Where("id = ? AND tenant_id = ?", id, tenantID).
		Delete(&models.Post{}).Error
}

// GetUserPosts gets all posts by a specific user (paginated)
func (r *PostRepository) GetUserPosts(ctx context.Context, userID, tenantID uuid.UUID, page, limit int) ([]models.Post, int64, error) {
	var posts []models.Post
	var total int64

	query := r.db.WithContext(ctx).
		Model(&models.Post{}).
		Where("tenant_id = ? AND user_id = ?", tenantID, userID)

	// Count total
	err := query.Count(&total).Error
	if err != nil {
		return nil, 0, err
	}

	// Get posts with pagination
	offset := (page - 1) * limit
	err = r.db.WithContext(ctx).
		Where("tenant_id = ? AND user_id = ?", tenantID, userID).
		Preload("User").
		Order("created_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&posts).Error

	return posts, total, err
}

// GetPublicPosts gets all public posts (paginated)
func (r *PostRepository) GetPublicPosts(ctx context.Context, tenantID uuid.UUID, page, limit int) ([]models.Post, int64, error) {
	var posts []models.Post
	var total int64

	query := r.db.WithContext(ctx).
		Model(&models.Post{}).
		Where("tenant_id = ? AND visibility = ?", tenantID, models.VisibilityPublic)

	// Count total
	err := query.Count(&total).Error
	if err != nil {
		return nil, 0, err
	}

	// Get posts with pagination
	offset := (page - 1) * limit
	err = r.db.WithContext(ctx).
		Where("tenant_id = ? AND visibility = ?", tenantID, models.VisibilityPublic).
		Preload("User").
		Order("created_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&posts).Error

	return posts, total, err
}

// GetFollowingPosts gets posts from users that the specified user follows (paginated)
func (r *PostRepository) GetFollowingPosts(ctx context.Context, userID, tenantID uuid.UUID, page, limit int) ([]models.Post, int64, error) {
	var posts []models.Post
	var total int64

	// Subquery for followed users
	subQuery := r.db.WithContext(ctx).
		Table("follows").
		Select("following_id").
		Where("tenant_id = ? AND follower_id = ?", tenantID, userID)

	// Count total
	countQuery := r.db.WithContext(ctx).
		Model(&models.Post{}).
		Where("tenant_id = ? AND user_id IN (?) AND (visibility = ? OR visibility = ?)",
			tenantID, subQuery, models.VisibilityPublic, models.VisibilityFollowers)

	err := countQuery.Count(&total).Error
	if err != nil {
		return nil, 0, err
	}

	// Get posts with pagination
	offset := (page - 1) * limit
	err = r.db.WithContext(ctx).
		Where("tenant_id = ? AND user_id IN (?) AND (visibility = ? OR visibility = ?)",
			tenantID, subQuery, models.VisibilityPublic, models.VisibilityFollowers).
		Preload("User").
		Order("created_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&posts).Error

	return posts, total, err
}

// IncrementLikeCount increments the like count for a post
func (r *PostRepository) IncrementLikeCount(ctx context.Context, postID, tenantID uuid.UUID) error {
	return r.db.WithContext(ctx).
		Model(&models.Post{}).
		Where("id = ? AND tenant_id = ?", postID, tenantID).
		UpdateColumn("like_count", gorm.Expr("like_count + ?", 1)).Error
}

// DecrementLikeCount decrements the like count for a post
func (r *PostRepository) DecrementLikeCount(ctx context.Context, postID, tenantID uuid.UUID) error {
	return r.db.WithContext(ctx).
		Model(&models.Post{}).
		Where("id = ? AND tenant_id = ?", postID, tenantID).
		UpdateColumn("like_count", gorm.Expr("like_count - ?", 1)).Error
}

// IncrementCommentCount increments the comment count for a post
func (r *PostRepository) IncrementCommentCount(ctx context.Context, postID, tenantID uuid.UUID) error {
	return r.db.WithContext(ctx).
		Model(&models.Post{}).
		Where("id = ? AND tenant_id = ?", postID, tenantID).
		UpdateColumn("comment_count", gorm.Expr("comment_count + ?", 1)).Error
}

// DecrementCommentCount decrements the comment count for a post
func (r *PostRepository) DecrementCommentCount(ctx context.Context, postID, tenantID uuid.UUID) error {
	return r.db.WithContext(ctx).
		Model(&models.Post{}).
		Where("id = ? AND tenant_id = ?", postID, tenantID).
		UpdateColumn("comment_count", gorm.Expr("comment_count - ?", 1)).Error
}

// IncrementShareCount increments the share count for a post
func (r *PostRepository) IncrementShareCount(ctx context.Context, postID, tenantID uuid.UUID) error {
	return r.db.WithContext(ctx).
		Model(&models.Post{}).
		Where("id = ? AND tenant_id = ?", postID, tenantID).
		UpdateColumn("share_count", gorm.Expr("share_count + ?", 1)).Error
}

// SearchPosts searches posts by content (paginated)
func (r *PostRepository) SearchPosts(ctx context.Context, query string, tenantID uuid.UUID, page, limit int) ([]models.Post, int64, error) {
	var posts []models.Post
	var total int64

	searchQuery := "%" + query + "%"

	// Count total
	countQuery := r.db.WithContext(ctx).
		Model(&models.Post{}).
		Where("tenant_id = ? AND content ILIKE ? AND visibility = ?", tenantID, searchQuery, models.VisibilityPublic)

	err := countQuery.Count(&total).Error
	if err != nil {
		return nil, 0, err
	}

	// Get posts with pagination
	offset := (page - 1) * limit
	err = r.db.WithContext(ctx).
		Where("tenant_id = ? AND content ILIKE ? AND visibility = ?", tenantID, searchQuery, models.VisibilityPublic).
		Preload("User").
		Order("created_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&posts).Error

	return posts, total, err
}
