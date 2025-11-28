package repositories

import (
	"context"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/keshablive/quester/internal/framework/utils"
	"github.com/keshablive/quester/internal/models"
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
	err := r.db.WithContext(ctx).Create(activity).Error
	if err != nil {
		return utils.WrapCreateError(err, "activity")
	}
	return nil
}

// FindByID finds an activity by ID
func (r *ActivityRepository) FindByID(ctx context.Context, tenantID, id uuid.UUID) (*models.Activity, error) {
	var activity models.Activity
	err := r.db.WithContext(ctx).
		Where("id = ? AND tenant_id = ?", id, tenantID).
		Preload("User").
		First(&activity).Error
	if err != nil {
		return nil, utils.WrapFindError(err, "activity", id.String())
	}
	return &activity, nil
}

// Delete removes an activity entry
func (r *ActivityRepository) Delete(ctx context.Context, tenantID, id uuid.UUID) error {
	result := r.db.WithContext(ctx).
		Where("id = ? AND tenant_id = ?", id, tenantID).
		Delete(&models.Activity{})
	if result.Error != nil {
		return utils.WrapDeleteError(result.Error, "activity")
	}
	if result.RowsAffected == 0 {
		return utils.WrapNotFoundError("activity", id.String())
	}
	return nil
}

// GetUserActivity gets all activities for a specific user (paginated)
func (r *ActivityRepository) GetUserActivity(ctx context.Context, userID, tenantID uuid.UUID, page, limit int) ([]models.Activity, int64, error) {
	var activities []models.Activity
	var total int64

	// Build base query with common conditions
	baseQuery := r.db.WithContext(ctx).
		Model(&models.Activity{}).
		Where("tenant_id = ? AND user_id = ?", tenantID, userID)

	// Count total using base query
	err := baseQuery.Count(&total).Error
	if err != nil {
		return nil, 0, utils.WrapCountError(err, "user activities")
	}

	// Get activities with pagination, reusing base query
	offset := (page - 1) * limit
	err = baseQuery.
		Preload("User").
		Order("created_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&activities).Error
	if err != nil {
		return nil, 0, utils.WrapListError(err, "user activities")
	}

	return activities, total, nil
}

// GetGlobalActivity gets all activities in a tenant (paginated)
// Optimized to build base query once and reuse for count and fetch
func (r *ActivityRepository) GetGlobalActivity(ctx context.Context, tenantID uuid.UUID, page, limit int) ([]models.Activity, int64, error) {
	var activities []models.Activity
	var total int64

	// Build base query with common conditions
	baseQuery := r.db.WithContext(ctx).
		Model(&models.Activity{}).
		Where("tenant_id = ?", tenantID)

	// Count total using base query
	err := baseQuery.Count(&total).Error
	if err != nil {
		return nil, 0, utils.WrapCountError(err, "global activities")
	}

	// Get activities with pagination, reusing base query
	offset := (page - 1) * limit
	err = baseQuery.
		Preload("User").
		Order("created_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&activities).Error
	if err != nil {
		return nil, 0, utils.WrapListError(err, "global activities")
	}

	return activities, total, nil
}

// GetFollowingActivity gets activities from users that the specified user follows (paginated)
// Optimized to build base query once and reuse for count and fetch
func (r *ActivityRepository) GetFollowingActivity(ctx context.Context, userID, tenantID uuid.UUID, page, limit int) ([]models.Activity, int64, error) {
	var activities []models.Activity
	var total int64

	// Subquery for followed users
	subQuery := r.db.WithContext(ctx).
		Table("follows").
		Select("following_id").
		Where("tenant_id = ? AND follower_id = ?", tenantID, userID)

	// Build base query with common conditions
	baseQuery := r.db.WithContext(ctx).
		Model(&models.Activity{}).
		Where("tenant_id = ? AND user_id IN (?)", tenantID, subQuery)

	// Count total using base query
	err := baseQuery.Count(&total).Error
	if err != nil {
		return nil, 0, utils.WrapCountError(err, "following activities")
	}

	// Get activities with pagination, reusing base query
	offset := (page - 1) * limit
	err = baseQuery.
		Preload("User").
		Order("created_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&activities).Error
	if err != nil {
		return nil, 0, utils.WrapListError(err, "following activities")
	}

	return activities, total, nil
}

// GetActivitiesByType gets activities filtered by type (paginated)
// Optimized to build base query once and reuse for count and fetch
func (r *ActivityRepository) GetActivitiesByType(ctx context.Context, activityType models.ActivityType, tenantID uuid.UUID, page, limit int) ([]models.Activity, int64, error) {
	var activities []models.Activity
	var total int64

	// Build base query with common conditions
	baseQuery := r.db.WithContext(ctx).
		Model(&models.Activity{}).
		Where("tenant_id = ? AND activity_type = ?", tenantID, activityType)

	// Count total using base query
	err := baseQuery.Count(&total).Error
	if err != nil {
		return nil, 0, utils.WrapCountError(err, "activities by type")
	}

	// Get activities with pagination, reusing base query
	offset := (page - 1) * limit
	err = baseQuery.
		Preload("User").
		Order("created_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&activities).Error
	if err != nil {
		return nil, 0, utils.WrapListError(err, "activities by type")
	}

	return activities, total, nil
}

// DeleteByEntity deletes all activities for a specific entity
func (r *ActivityRepository) DeleteByEntity(ctx context.Context, entityType string, entityID, tenantID uuid.UUID) error {
	err := r.db.WithContext(ctx).
		Where("tenant_id = ? AND entity_type = ? AND entity_id = ?", tenantID, entityType, entityID).
		Delete(&models.Activity{}).Error
	if err != nil {
		return utils.WrapDeleteError(err, "activities by entity")
	}
	return nil
}
