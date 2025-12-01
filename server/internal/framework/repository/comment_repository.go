package repository

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/keshablive/quester/internal/framework/utils"
	"github.com/keshablive/quester/internal/models"
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
	if err := r.db.WithContext(ctx).Create(comment).Error; err != nil {
		return utils.WrapCreateError(err, "comment")
	}
	return nil
}

// FindByID finds a comment by ID (excludes soft deleted)
// Parameter order: (ctx, tenantID, id) for consistency across repositories
func (r *CommentRepository) FindByID(ctx context.Context, tenantID, id uuid.UUID) (*models.Comment, error) {
	var comment models.Comment
	err := r.db.WithContext(ctx).
		Where("tenant_id = ? AND id = ?", tenantID, id).
		Preload("User").
		First(&comment).Error

	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, utils.WrapNotFoundError("comment", id.String())
	}
	if err != nil {
		return nil, utils.WrapFindError(err, "comment", id.String())
	}
	return &comment, nil
}

// Update updates a comment
func (r *CommentRepository) Update(ctx context.Context, comment *models.Comment) error {
	if err := r.db.WithContext(ctx).Save(comment).Error; err != nil {
		return utils.WrapUpdateError(err, "comment")
	}
	return nil
}

// Delete soft deletes a comment
// Parameter order: (ctx, tenantID, id) for consistency across repositories
func (r *CommentRepository) Delete(ctx context.Context, tenantID, id uuid.UUID) error {
	result := r.db.WithContext(ctx).
		Where("tenant_id = ? AND id = ?", tenantID, id).
		Delete(&models.Comment{})

	if result.Error != nil {
		return utils.WrapDeleteError(result.Error, "comment")
	}
	if result.RowsAffected == 0 {
		return utils.WrapNotFoundError("comment", id.String())
	}
	return nil
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
// Optimized to build base query once and reuse for count and fetch
func (r *CommentRepository) GetCommentReplies(ctx context.Context, parentID, tenantID uuid.UUID, page, limit int) ([]models.Comment, int64, error) {
	var replies []models.Comment
	var total int64

	// Build base query with common conditions
	baseQuery := r.db.WithContext(ctx).
		Model(&models.Comment{}).
		Where("tenant_id = ? AND parent_id = ?", tenantID, parentID)

	// Count total using base query
	err := baseQuery.Count(&total).Error
	if err != nil {
		return nil, 0, utils.WrapCountError(err, "comment replies")
	}

	// Get replies with pagination (chronological order for replies), reusing base query
	offset := (page - 1) * limit
	err = baseQuery.
		Preload("User").
		Order("created_at ASC").
		Offset(offset).
		Limit(limit).
		Find(&replies).Error

	if err != nil {
		return nil, 0, utils.WrapListError(err, "comment replies")
	}

	return replies, total, nil
}

// GetUserComments gets all comments by a user (paginated)
// Optimized to build base query once and reuse for count and fetch
func (r *CommentRepository) GetUserComments(ctx context.Context, userID, tenantID uuid.UUID, page, limit int) ([]models.Comment, int64, error) {
	var comments []models.Comment
	var total int64

	// Build base query with common conditions
	baseQuery := r.db.WithContext(ctx).
		Model(&models.Comment{}).
		Where("tenant_id = ? AND user_id = ?", tenantID, userID)

	// Count total using base query
	err := baseQuery.Count(&total).Error
	if err != nil {
		return nil, 0, utils.WrapCountError(err, "user comments")
	}

	// Get comments with pagination, reusing base query conditions
	offset := (page - 1) * limit
	err = baseQuery.
		Preload("User").
		Preload("Post").
		Order("created_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&comments).Error

	if err != nil {
		return nil, 0, utils.WrapListError(err, "user comments")
	}

	return comments, total, nil
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
