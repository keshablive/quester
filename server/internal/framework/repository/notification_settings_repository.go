package repository

import (
	"context"

	"gorm.io/gorm"

	"github.com/keshablive/quester/internal/framework/utils"
	"github.com/keshablive/quester/internal/models"
)

// NotificationSettingsRepository handles notification settings data access
type NotificationSettingsRepository struct {
	db *gorm.DB
}

// NewNotificationSettingsRepository creates a new notification settings repository
func NewNotificationSettingsRepository(db *gorm.DB) *NotificationSettingsRepository {
	return &NotificationSettingsRepository{db: db}
}

// Create creates new notification settings
func (r *NotificationSettingsRepository) Create(ctx context.Context, settings *models.NotificationSettings) error {
	return utils.WrapCreateError(r.db.WithContext(ctx).Create(settings).Error, "notification_settings")
}

// FindByID finds notification settings by ID with tenant filtering
func (r *NotificationSettingsRepository) FindByID(ctx context.Context, tenantID, id string) (*models.NotificationSettings, error) {
	var settings models.NotificationSettings
	err := r.db.WithContext(ctx).
		Where("tenant_id = ? AND id = ?", tenantID, id).
		Preload("User").
		First(&settings).Error

	if err == gorm.ErrRecordNotFound {
		return nil, utils.WrapNotFoundError("notification_settings", id)
	}
	if err != nil {
		return nil, utils.WrapFindError(err, "notification_settings", id)
	}

	return &settings, nil
}

// FindByUser finds notification settings for a user
func (r *NotificationSettingsRepository) FindByUser(ctx context.Context, tenantID, userID string) (*models.NotificationSettings, error) {
	var settings models.NotificationSettings
	err := r.db.WithContext(ctx).
		Where("tenant_id = ? AND user_id = ?", tenantID, userID).
		First(&settings).Error
	return &settings, utils.WrapFindError(err, "notification_settings", userID)
}

// Update updates notification settings
func (r *NotificationSettingsRepository) Update(ctx context.Context, settings *models.NotificationSettings) error {
	result := r.db.WithContext(ctx).
		Where("tenant_id = ?", settings.TenantID).
		Save(settings)

	if result.Error != nil {
		return utils.WrapUpdateError(result.Error, "notification_settings")
	}

	if result.RowsAffected == 0 {
		return utils.WrapNotFoundError("notification_settings", settings.ID)
	}

	return nil
}

// Delete soft deletes notification settings
func (r *NotificationSettingsRepository) Delete(ctx context.Context, tenantID, id string) error {
	result := r.db.WithContext(ctx).
		Where("tenant_id = ? AND id = ?", tenantID, id).
		Delete(&models.NotificationSettings{})

	if result.Error != nil {
		return utils.WrapDeleteError(result.Error, "notification_settings")
	}

	if result.RowsAffected == 0 {
		return utils.WrapNotFoundError("notification_settings", id)
	}

	return nil
}
