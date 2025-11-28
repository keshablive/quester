package repositories

import (
	"context"
	"errors"
	"time"

	"gorm.io/gorm"

	"github.com/keshablive/quester/internal/framework/utils"
	"github.com/keshablive/quester/internal/models"
)

// MessageRepository handles message data access
type MessageRepository struct {
	db *gorm.DB
}

// NewMessageRepository creates a new message repository
func NewMessageRepository(db *gorm.DB) *MessageRepository {
	return &MessageRepository{db: db}
}

// Create creates a new message
func (r *MessageRepository) Create(ctx context.Context, message *models.Message) error {
	if err := r.db.WithContext(ctx).Create(message).Error; err != nil {
		return utils.WrapCreateError(err, "message")
	}
	return nil
}

// FindByID finds a message by ID with tenant filtering
func (r *MessageRepository) FindByID(ctx context.Context, tenantID, id string) (*models.Message, error) {
	var message models.Message
	err := r.db.WithContext(ctx).
		Where("tenant_id = ? AND id = ?", tenantID, id).
		Preload("Sender").
		Preload("Recipient").
		First(&message).Error

	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, utils.WrapNotFoundError("message", id)
	}
	if err != nil {
		return nil, utils.WrapFindError(err, "message", id)
	}
	return &message, nil
}

// Update updates a message with tenant verification
func (r *MessageRepository) Update(ctx context.Context, tenantID string, message *models.Message) error {
	result := r.db.WithContext(ctx).
		Model(&models.Message{}).
		Where("tenant_id = ? AND id = ?", tenantID, message.ID).
		Updates(message)

	if result.Error != nil {
		return utils.WrapUpdateError(result.Error, "message")
	}
	if result.RowsAffected == 0 {
		return utils.WrapNotFoundError("message", message.ID)
	}
	return nil
}

// Delete soft deletes a message with tenant verification
func (r *MessageRepository) Delete(ctx context.Context, tenantID, id string) error {
	result := r.db.WithContext(ctx).
		Where("tenant_id = ? AND id = ?", tenantID, id).
		Delete(&models.Message{})

	if result.Error != nil {
		return utils.WrapDeleteError(result.Error, "message")
	}
	if result.RowsAffected == 0 {
		return utils.WrapNotFoundError("message", id)
	}
	return nil
}

// FindDirectMessages finds messages between two users with pagination
// Optimized to build base query once and reuse for count and fetch
func (r *MessageRepository) FindDirectMessages(ctx context.Context, tenantID, userID, recipientID string, page, limit int) ([]*models.Message, int64, error) {
	var messages []*models.Message
	var total int64

	// Build base query with common conditions
	baseQuery := r.db.WithContext(ctx).
		Model(&models.Message{}).
		Where("tenant_id = ?", tenantID).
		Where("group_id IS NULL").
		Where("((sender_id = ? AND recipient_id = ?) OR (sender_id = ? AND recipient_id = ?))",
			userID, recipientID, recipientID, userID)

	// Get total count using base query
	if err := baseQuery.Count(&total).Error; err != nil {
		return nil, 0, utils.WrapCountError(err, "direct messages")
	}

	// Get paginated results, reusing base query conditions
	offset := (page - 1) * limit
	err := baseQuery.
		Preload("Sender").
		Preload("Recipient").
		Order("created_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&messages).Error

	if err != nil {
		return nil, 0, utils.WrapListError(err, "message")
	}

	return messages, total, nil
}

// FindGroupMessages finds messages in a group with pagination
// Optimized to build base query once and reuse for count and fetch
func (r *MessageRepository) FindGroupMessages(ctx context.Context, tenantID, groupID string, page, limit int) ([]*models.Message, int64, error) {
	var messages []*models.Message
	var total int64

	// Build base query with common conditions
	baseQuery := r.db.WithContext(ctx).
		Model(&models.Message{}).
		Where("tenant_id = ? AND group_id = ?", tenantID, groupID)

	// Get total count using base query
	if err := baseQuery.Count(&total).Error; err != nil {
		return nil, 0, utils.WrapCountError(err, "group messages")
	}

	// Get paginated results, reusing base query conditions
	offset := (page - 1) * limit
	err := baseQuery.
		Preload("Sender").
		Order("created_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&messages).Error

	if err != nil {
		return nil, 0, utils.WrapListError(err, "message")
	}

	return messages, total, nil
}

// GetUnreadCount gets the count of unread messages for a user
func (r *MessageRepository) GetUnreadCount(ctx context.Context, tenantID, userID string) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Model(&models.Message{}).
		Where("tenant_id = ? AND recipient_id = ? AND read_at IS NULL", tenantID, userID).
		Count(&count).Error
	return count, err
}

// MarkMultipleAsRead marks multiple messages as read
func (r *MessageRepository) MarkMultipleAsRead(ctx context.Context, messageIDs []string, tenantID, userID string) error {
	now := time.Now()
	return r.db.WithContext(ctx).
		Model(&models.Message{}).
		Where("id IN ? AND tenant_id = ? AND recipient_id = ?", messageIDs, tenantID, userID).
		Updates(map[string]interface{}{
			"read_at":      now,
			"delivered_at": gorm.Expr("COALESCE(delivered_at, ?)", now),
			"updated_at":   now,
		}).Error
}

// GetMessageThreads gets all message threads for a user
func (r *MessageRepository) GetMessageThreads(ctx context.Context, tenantID, userID string, page, limit int) ([]map[string]interface{}, error) {
	var threads []map[string]interface{}

	offset := (page - 1) * limit

	// This is a complex query that gets the latest message from each conversation
	err := r.db.WithContext(ctx).Raw(`
		WITH latest_messages AS (
			SELECT DISTINCT ON (
				CASE 
					WHEN group_id IS NOT NULL THEN CONCAT('group_', group_id)
					WHEN sender_id < recipient_id THEN CONCAT(sender_id, '_', recipient_id)
					ELSE CONCAT(recipient_id, '_', sender_id)
				END
			) 
			id,
			tenant_id,
			sender_id,
			recipient_id,
			group_id,
			content,
			message_type,
			read_at,
			created_at,
			CASE 
				WHEN group_id IS NOT NULL THEN CONCAT('group_', group_id)
				WHEN sender_id < recipient_id THEN CONCAT(sender_id, '_', recipient_id)
				ELSE CONCAT(recipient_id, '_', sender_id)
			END AS thread_id
			FROM messages
			WHERE tenant_id = ? 
			AND deleted_at IS NULL
			AND (sender_id = ? OR recipient_id = ?)
			ORDER BY thread_id, created_at DESC
		)
		SELECT 
			thread_id,
			id AS last_message_id,
			content AS last_message_content,
			message_type AS last_message_type,
			created_at AS last_message_at,
			(SELECT COUNT(*) FROM messages m 
			 WHERE m.recipient_id = ? 
			 AND m.read_at IS NULL 
			 AND m.deleted_at IS NULL
			 AND (
				(m.group_id = lm.group_id AND lm.group_id IS NOT NULL) OR
				(m.sender_id = lm.sender_id AND m.recipient_id = lm.recipient_id AND lm.group_id IS NULL) OR
				(m.sender_id = lm.recipient_id AND m.recipient_id = lm.sender_id AND lm.group_id IS NULL)
			 )
			) AS unread_count
		FROM latest_messages lm
		ORDER BY last_message_at DESC
		LIMIT ? OFFSET ?
	`, tenantID, userID, userID, userID, limit, offset).Scan(&threads).Error

	return threads, err
}

// Search searches for messages containing a keyword
// Optimized to build base query once and reuse for count and fetch
func (r *MessageRepository) Search(ctx context.Context, tenantID, userID, keyword string, page, limit int) ([]*models.Message, int64, error) {
	var messages []*models.Message
	var total int64

	// Build base query with common conditions
	baseQuery := r.db.WithContext(ctx).
		Model(&models.Message{}).
		Where("tenant_id = ?", tenantID).
		Where("(sender_id = ? OR recipient_id = ?)", userID, userID).
		Where("content ILIKE ?", "%"+keyword+"%")

	// Get total count using base query
	if err := baseQuery.Count(&total).Error; err != nil {
		return nil, 0, utils.WrapCountError(err, "messages")
	}

	// Get paginated results, reusing base query conditions
	offset := (page - 1) * limit
	err := baseQuery.
		Preload("Sender").
		Preload("Recipient").
		Order("created_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&messages).Error

	if err != nil {
		return nil, 0, utils.WrapListError(err, "message")
	}

	return messages, total, nil
}

// GetSentCount gets the count of messages sent by a user
func (r *MessageRepository) GetSentCount(ctx context.Context, tenantID, userID string) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Model(&models.Message{}).
		Where("tenant_id = ? AND sender_id = ?", tenantID, userID).
		Count(&count).Error
	return count, err
}

// GetReceivedCount gets the count of messages received by a user
func (r *MessageRepository) GetReceivedCount(ctx context.Context, tenantID, userID string) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Model(&models.Message{}).
		Where("tenant_id = ? AND recipient_id = ?", tenantID, userID).
		Count(&count).Error
	return count, err
}
