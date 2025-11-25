package repositories

import (
	"context"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/yourusername/quester/internal/models"
)

// ActivityRepository handles activity feed database operations
type ActivityRepository struct {
	db *gorm.DB
}

// NewActivityRepository creates a new ActivityRepository
func NewActivityRepository(db *gorm.DB) *ActivityRepository {
	return &ActivityRepository{db: db}
}

// Create creates a new activity entry
func (r *ActivityRepository) Create(ctx context.Context, activity *models.Activity) error {
	return r.db.WithContext(ctx).Create(activity).Error
}

// FindByID finds an activity by ID
func (r *ActivityRepository) FindByID(ctx context.Context, id, tenantID uuid.UUID) (*models.Activity, error) {
	var activity models.Activity
	err := r.db.WithContext(ctx).
		Where("id = ? AND tenant_id = ?", id, tenantID).
		Preload("User").
		First(&activity).Error
	if err != nil {
		return nil, err
	}
	return &activity, nil
}

// Delete removes an activity entry
func (r *ActivityRepository) Delete(ctx context.Context, id, tenantID uuid.UUID) error {
	return r.db.WithContext(ctx).
		Where("id = ? AND tenant_id = ?", id, tenantID).
		Delete(&models.Activity{}).Error
}

// GetUserActivity gets all activities for a specific user (paginated)
func (r *ActivityRepository) GetUserActivity(ctx context.Context, userID, tenantID uuid.UUID, page, limit int) ([]models.Activity, int64, error) {
	var activities []models.Activity
	var total int64

	query := r.db.WithContext(ctx).
		Model(&models.Activity{}).
		Where("tenant_id = ? AND user_id = ?", tenantID, userID)

	// Count total
	err := query.Count(&total).Error
	if err != nil {
		return nil, 0, err
	}

	// Get activities with pagination
	offset := (page - 1) * limit
	err = r.db.WithContext(ctx).
		Where("tenant_id = ? AND user_id = ?", tenantID, userID).
		Preload("User").
		Order("created_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&activities).Error

	return activities, total, err
}

// GetGlobalActivity gets all activities in a tenant (paginated)
func (r *ActivityRepository) GetGlobalActivity(ctx context.Context, tenantID uuid.UUID, page, limit int) ([]models.Activity, int64, error) {
	var activities []models.Activity
	var total int64

	query := r.db.WithContext(ctx).
		Model(&models.Activity{}).
		Where("tenant_id = ?", tenantID)

	// Count total
	err := query.Count(&total).Error
	if err != nil {
		return nil, 0, err
	}

	// Get activities with pagination
	offset := (page - 1) * limit
	err = r.db.WithContext(ctx).
		Where("tenant_id = ?", tenantID).
		Preload("User").
		Order("created_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&activities).Error

	return activities, total, err
}

// GetFollowingActivity gets activities from users that the specified user follows (paginated)
func (r *ActivityRepository) GetFollowingActivity(ctx context.Context, userID, tenantID uuid.UUID, page, limit int) ([]models.Activity, int64, error) {
	var activities []models.Activity
	var total int64

	// Subquery for followed users
	subQuery := r.db.WithContext(ctx).
		Table("follows").
		Select("following_id").
		Where("tenant_id = ? AND follower_id = ?", tenantID, userID)

	// Count total
	countQuery := r.db.WithContext(ctx).
		Model(&models.Activity{}).
		Where("tenant_id = ? AND user_id IN (?)", tenantID, subQuery)

	err := countQuery.Count(&total).Error
	if err != nil {
		return nil, 0, err
	}

	// Get activities with pagination
	offset := (page - 1) * limit
	err = r.db.WithContext(ctx).
		Where("tenant_id = ? AND user_id IN (?)", tenantID, subQuery).
		Preload("User").
		Order("created_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&activities).Error

	return activities, total, err
}

// GetActivitiesByType gets activities filtered by type (paginated)
func (r *ActivityRepository) GetActivitiesByType(ctx context.Context, activityType models.ActivityType, tenantID uuid.UUID, page, limit int) ([]models.Activity, int64, error) {
	var activities []models.Activity
	var total int64

	query := r.db.WithContext(ctx).
		Model(&models.Activity{}).
		Where("tenant_id = ? AND activity_type = ?", tenantID, activityType)

	// Count total
	err := query.Count(&total).Error
	if err != nil {
		return nil, 0, err
	}

	// Get activities with pagination
	offset := (page - 1) * limit
	err = r.db.WithContext(ctx).
		Where("tenant_id = ? AND activity_type = ?", tenantID, activityType).
		Preload("User").
		Order("created_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&activities).Error

	return activities, total, err
}

// DeleteByEntity deletes all activities for a specific entity
func (r *ActivityRepository) DeleteByEntity(ctx context.Context, entityType string, entityID, tenantID uuid.UUID) error {
	return r.db.WithContext(ctx).
		Where("tenant_id = ? AND entity_type = ? AND entity_id = ?", tenantID, entityType, entityID).
		Delete(&models.Activity{}).Error
}
