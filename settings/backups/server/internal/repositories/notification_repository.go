package repositories

import (
	"context"
	"time"

	"gorm.io/gorm"

	"github.com/yourusername/quester/internal/models"
)

// NotificationRepository handles notification data access
type NotificationRepository struct {
	db *gorm.DB
}

// NewNotificationRepository creates a new notification repository
func NewNotificationRepository(db *gorm.DB) *NotificationRepository {
	return &NotificationRepository{db: db}
}

// Create creates a new notification
func (r *NotificationRepository) Create(ctx context.Context, notification *models.Notification) error {
	return r.db.WithContext(ctx).Create(notification).Error
}

// FindByID finds a notification by ID
func (r *NotificationRepository) FindByID(ctx context.Context, id string) (*models.Notification, error) {
	var notification models.Notification
	err := r.db.WithContext(ctx).
		Preload("User").
		First(&notification, "id = ?", id).Error
	return &notification, err
}

// Update updates a notification
func (r *NotificationRepository) Update(ctx context.Context, notification *models.Notification) error {
	return r.db.WithContext(ctx).Save(notification).Error
}

// Delete soft deletes a notification
func (r *NotificationRepository) Delete(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Delete(&models.Notification{}, "id = ?", id).Error
}

// FindByUser finds notifications for a user with pagination
func (r *NotificationRepository) FindByUser(ctx context.Context, tenantID, userID string, unreadOnly bool, page, limit int) ([]*models.Notification, int64, error) {
	var notifications []*models.Notification
	var total int64

	query := r.db.WithContext(ctx).
		Where("tenant_id = ? AND user_id = ?", tenantID, userID)

	if unreadOnly {
		query = query.Where("read_at IS NULL")
	}

	// Get total count
	if err := query.Model(&models.Notification{}).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Get paginated results
	offset := (page - 1) * limit
	err := query.
		Order("created_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&notifications).Error

	return notifications, total, err
}

// GetUnreadCount gets the count of unread notifications for a user
func (r *NotificationRepository) GetUnreadCount(ctx context.Context, tenantID, userID string) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Model(&models.Notification{}).
		Where("tenant_id = ? AND user_id = ? AND read_at IS NULL", tenantID, userID).
		Count(&count).Error
	return count, err
}

// GetTotalCount gets the total count of notifications for a user
func (r *NotificationRepository) GetTotalCount(ctx context.Context, tenantID, userID string) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Model(&models.Notification{}).
		Where("tenant_id = ? AND user_id = ?", tenantID, userID).
		Count(&count).Error
	return count, err
}

// MarkAllAsRead marks all notifications as read for a user
func (r *NotificationRepository) MarkAllAsRead(ctx context.Context, tenantID, userID string) (int64, error) {
	now := time.Now()
	result := r.db.WithContext(ctx).
		Model(&models.Notification{}).
		Where("tenant_id = ? AND user_id = ? AND read_at IS NULL", tenantID, userID).
		Updates(map[string]interface{}{
			"read_at":    now,
			"updated_at": now,
		})

	if result.Error != nil {
		return 0, result.Error
	}

	return result.RowsAffected, nil
}

// DeleteOldReadNotifications deletes read notifications older than cutoff date
func (r *NotificationRepository) DeleteOldReadNotifications(ctx context.Context, cutoffDate time.Time) (int64, error) {
	result := r.db.WithContext(ctx).
		Where("read_at IS NOT NULL AND read_at < ?", cutoffDate).
		Delete(&models.Notification{})

	if result.Error != nil {
		return 0, result.Error
	}

	return result.RowsAffected, nil
}

// FindByType finds notifications by type
func (r *NotificationRepository) FindByType(ctx context.Context, tenantID, userID, notifType string, page, limit int) ([]*models.Notification, int64, error) {
	var notifications []*models.Notification
	var total int64

	query := r.db.WithContext(ctx).
		Where("tenant_id = ? AND user_id = ? AND notification_type = ?", tenantID, userID, notifType)

	// Get total count
	if err := query.Model(&models.Notification{}).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Get paginated results
	offset := (page - 1) * limit
	err := query.
		Order("created_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&notifications).Error

	return notifications, total, err
}
