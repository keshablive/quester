package repositories

import (
	"context"
	"time"

	"gorm.io/gorm"

	"github.com/keshablive/quester/internal/framework/utils"
	"github.com/keshablive/quester/internal/models"
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
	if err := r.db.WithContext(ctx).Create(notification).Error; err != nil {
		return utils.WrapCreateError(err, "notification")
	}
	return nil
}

// BulkCreate creates multiple notifications efficiently (batch operation)
// Useful for sending notifications to multiple users (e.g., quest completion, system announcements)
func (r *NotificationRepository) BulkCreate(ctx context.Context, notifications []models.Notification) error {
	if len(notifications) == 0 {
		return nil
	}

	// Use batch insert (100 records at a time to avoid hitting max parameter limits)
	if err := r.db.WithContext(ctx).CreateInBatches(notifications, 100).Error; err != nil {
		return utils.WrapCreateError(err, "notifications (bulk)")
	}
	return nil
}

// FindByID finds a notification by ID with tenant filtering
func (r *NotificationRepository) FindByID(ctx context.Context, tenantID, id string) (*models.Notification, error) {
	var notification models.Notification
	err := r.db.WithContext(ctx).
		Where("tenant_id = ? AND id = ?", tenantID, id).
		Preload("User").
		First(&notification).Error

	if err != nil {
		return nil, utils.WrapFindError(err, "notification", id)
	}

	return &notification, nil
}

// Update updates a notification
func (r *NotificationRepository) Update(ctx context.Context, notification *models.Notification) error {
	result := r.db.WithContext(ctx).
		Where("tenant_id = ?", notification.TenantID).
		Save(notification)

	if result.Error != nil {
		return utils.WrapUpdateError(result.Error, "notification")
	}

	if result.RowsAffected == 0 {
		return utils.WrapNotFoundError("notification", notification.ID)
	}

	return nil
}

// Delete soft deletes a notification
func (r *NotificationRepository) Delete(ctx context.Context, tenantID, id string) error {
	result := r.db.WithContext(ctx).
		Where("tenant_id = ? AND id = ?", tenantID, id).
		Delete(&models.Notification{})

	if result.Error != nil {
		return utils.WrapDeleteError(result.Error, "notification")
	}

	if result.RowsAffected == 0 {
		return utils.WrapNotFoundError("notification", id)
	}

	return nil
}

// FindByUser finds notifications for a user with pagination
// Optimized to build base query once and reuse for count and fetch
func (r *NotificationRepository) FindByUser(ctx context.Context, tenantID, userID string, unreadOnly bool, page, limit int) ([]*models.Notification, int64, error) {
	var notifications []*models.Notification
	var total int64

	// Build base query with common conditions
	baseQuery := r.db.WithContext(ctx).
		Model(&models.Notification{}).
		Where("tenant_id = ? AND user_id = ?", tenantID, userID)

	if unreadOnly {
		baseQuery = baseQuery.Where("read_at IS NULL")
	}

	// Get total count using base query
	if err := baseQuery.Count(&total).Error; err != nil {
		return nil, 0, utils.WrapCountError(err, "notifications")
	}

	// Get paginated results, reusing base query conditions
	offset := (page - 1) * limit
	err := baseQuery.
		Order("created_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&notifications).Error

	if err != nil {
		return nil, 0, utils.WrapListError(err, "notifications")
	}

	return notifications, total, nil
}

// GetUnreadCount gets the count of unread notifications for a user
func (r *NotificationRepository) GetUnreadCount(ctx context.Context, tenantID, userID string) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Model(&models.Notification{}).
		Where("tenant_id = ? AND user_id = ? AND read_at IS NULL", tenantID, userID).
		Count(&count).Error
	if err != nil {
		return 0, utils.WrapCountError(err, "unread notifications")
	}
	return count, nil
}

// GetTotalCount gets the total count of notifications for a user
func (r *NotificationRepository) GetTotalCount(ctx context.Context, tenantID, userID string) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Model(&models.Notification{}).
		Where("tenant_id = ? AND user_id = ?", tenantID, userID).
		Count(&count).Error
	if err != nil {
		return 0, utils.WrapCountError(err, "notifications")
	}
	return count, nil
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
