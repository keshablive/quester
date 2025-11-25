package repositories

import (
	"context"

	"gorm.io/gorm"

	"github.com/yourusername/quester/internal/models"
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
	return r.db.WithContext(ctx).Create(settings).Error
}

// FindByID finds notification settings by ID
func (r *NotificationSettingsRepository) FindByID(ctx context.Context, id string) (*models.NotificationSettings, error) {
	var settings models.NotificationSettings
	err := r.db.WithContext(ctx).
		Preload("User").
		First(&settings, "id = ?", id).Error
	return &settings, err
}

// FindByUser finds notification settings for a user
func (r *NotificationSettingsRepository) FindByUser(ctx context.Context, tenantID, userID string) (*models.NotificationSettings, error) {
	var settings models.NotificationSettings
	err := r.db.WithContext(ctx).
		Where("tenant_id = ? AND user_id = ?", tenantID, userID).
		First(&settings).Error
	return &settings, err
}

// Update updates notification settings
func (r *NotificationSettingsRepository) Update(ctx context.Context, settings *models.NotificationSettings) error {
	return r.db.WithContext(ctx).Save(settings).Error
}

// Delete soft deletes notification settings
func (r *NotificationSettingsRepository) Delete(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Delete(&models.NotificationSettings{}, "id = ?", id).Error
}
