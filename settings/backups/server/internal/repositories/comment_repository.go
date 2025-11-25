package repositories

import (
	"context"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/yourusername/quester/internal/models"
)

// CommentRepository handles comment database operations
type CommentRepository struct {
	db *gorm.DB
}

// NewCommentRepository creates a new CommentRepository
func NewCommentRepository(db *gorm.DB) *CommentRepository {
	return &CommentRepository{db: db}
}

// Create creates a new comment
func (r *CommentRepository) Create(ctx context.Context, comment *models.Comment) error {
	return r.db.WithContext(ctx).Create(comment).Error
}

// FindByID finds a comment by ID (excludes soft deleted)
func (r *CommentRepository) FindByID(ctx context.Context, id, tenantID uuid.UUID) (*models.Comment, error) {
	var comment models.Comment
	err := r.db.WithContext(ctx).
		Where("id = ? AND tenant_id = ?", id, tenantID).
		Preload("User").
		First(&comment).Error
	if err != nil {
		return nil, err
	}
	return &comment, nil
}

// Update updates a comment
func (r *CommentRepository) Update(ctx context.Context, comment *models.Comment) error {
	return r.db.WithContext(ctx).Save(comment).Error
}

// Delete soft deletes a comment
func (r *CommentRepository) Delete(ctx context.Context, id, tenantID uuid.UUID) error {
	return r.db.WithContext(ctx).
		Where("id = ? AND tenant_id = ?", id, tenantID).
		Delete(&models.Comment{}).Error
}

// GetPostComments gets all top-level comments for a post (paginated)
func (r *CommentRepository) GetPostComments(ctx context.Context, postID, tenantID uuid.UUID, page, limit int) ([]models.Comment, int64, error) {
	var comments []models.Comment
	var total int64

	query := r.db.WithContext(ctx).
		Model(&models.Comment{}).
		Where("tenant_id = ? AND post_id = ? AND parent_id IS NULL", tenantID, postID)

	// Count total
	err := query.Count(&total).Error
	if err != nil {
		return nil, 0, err
	}

	// Get comments with pagination
	offset := (page - 1) * limit
	err = r.db.WithContext(ctx).
		Where("tenant_id = ? AND post_id = ? AND parent_id IS NULL", tenantID, postID).
		Preload("User").
		Order("created_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&comments).Error

	return comments, total, err
}

// GetCommentReplies gets all replies to a comment (paginated)
func (r *CommentRepository) GetCommentReplies(ctx context.Context, parentID, tenantID uuid.UUID, page, limit int) ([]models.Comment, int64, error) {
	var replies []models.Comment
	var total int64

	query := r.db.WithContext(ctx).
		Model(&models.Comment{}).
		Where("tenant_id = ? AND parent_id = ?", tenantID, parentID)

	// Count total
	err := query.Count(&total).Error
	if err != nil {
		return nil, 0, err
	}

	// Get replies with pagination (chronological order for replies)
	offset := (page - 1) * limit
	err = r.db.WithContext(ctx).
		Where("tenant_id = ? AND parent_id = ?", tenantID, parentID).
		Preload("User").
		Order("created_at ASC").
		Offset(offset).
		Limit(limit).
		Find(&replies).Error

	return replies, total, err
}

// GetUserComments gets all comments by a user (paginated)
func (r *CommentRepository) GetUserComments(ctx context.Context, userID, tenantID uuid.UUID, page, limit int) ([]models.Comment, int64, error) {
	var comments []models.Comment
	var total int64

	query := r.db.WithContext(ctx).
		Model(&models.Comment{}).
		Where("tenant_id = ? AND user_id = ?", tenantID, userID)

	// Count total
	err := query.Count(&total).Error
	if err != nil {
		return nil, 0, err
	}

	// Get comments with pagination
	offset := (page - 1) * limit
	err = r.db.WithContext(ctx).
		Where("tenant_id = ? AND user_id = ?", tenantID, userID).
		Preload("User").
		Preload("Post").
		Order("created_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&comments).Error

	return comments, total, err
}

// GetCommentCount gets the count of comments for a post
func (r *CommentRepository) GetCommentCount(ctx context.Context, postID, tenantID uuid.UUID) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Model(&models.Comment{}).
		Where("tenant_id = ? AND post_id = ?", tenantID, postID).
		Count(&count).Error
	return count, err
}
