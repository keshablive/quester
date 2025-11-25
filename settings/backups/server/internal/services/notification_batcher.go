package services

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

// NotificationBatcher handles notification batching per FR-047
// Max 1 push per 5min per user with digest format
type NotificationBatcher struct {
	redisClient *redis.Client
	ctx         context.Context
}

// BatchConfig holds batching configuration
type BatchConfig struct {
	BatchWindow  time.Duration // Default: 5 minutes
	MaxBatchSize int           // Default: 10 notifications per batch
}

// PendingNotification represents a notification waiting to be batched
type PendingNotification struct {
	ID               string                 `json:"id"`
	UserID           string                 `json:"user_id"`
	TenantID         string                 `json:"tenant_id"`
	NotificationType string                 `json:"notification_type"`
	Title            string                 `json:"title"`
	Message          string                 `json:"message"`
	ActionURL        string                 `json:"action_url,omitempty"`
	Source           string                 `json:"source"` // e.g., "John Doe", "Course Updates"
	Priority         string                 `json:"priority"`
	Timestamp        time.Time              `json:"timestamp"`
	Data             map[string]interface{} `json:"data,omitempty"`
}

// BatchDigest represents a batched notification digest
type BatchDigest struct {
	Count            int                   `json:"count"`
	NotificationType string                `json:"notification_type"`
	Sources          []string              `json:"sources"`
	Notifications    []PendingNotification `json:"notifications"`
	FirstTimestamp   time.Time             `json:"first_timestamp"`
	LastTimestamp    time.Time             `json:"last_timestamp"`
}

// NewNotificationBatcher creates a new notification batcher
func NewNotificationBatcher(redisClient *redis.Client) *NotificationBatcher {
	return &NotificationBatcher{
		redisClient: redisClient,
		ctx:         context.Background(),
	}
}

// AddToBatch adds a notification to the user's batch queue
// Returns true if notification was batched, false if it should be sent immediately
func (nb *NotificationBatcher) AddToBatch(notif PendingNotification) (bool, error) {
	// Check if user has a recent batch
	batchKey := fmt.Sprintf("notif:batch:%s:%s", notif.TenantID, notif.UserID)
	lastSentKey := fmt.Sprintf("notif:last_sent:%s:%s", notif.TenantID, notif.UserID)

	// Check when last notification was sent
	lastSent, err := nb.redisClient.Get(nb.ctx, lastSentKey).Int64()
	if err != nil && err != redis.Nil {
		return false, fmt.Errorf("failed to get last sent time: %w", err)
	}

	now := time.Now().Unix()
	batchWindow := int64(5 * 60) // 5 minutes in seconds

	// If urgent priority, send immediately
	if notif.Priority == "urgent" || notif.Priority == "high" {
		return false, nil
	}

	// If no recent notification, send immediately and set timer
	if err == redis.Nil || (now-lastSent) > batchWindow {
		// Set last sent time
		if err := nb.redisClient.Set(nb.ctx, lastSentKey, now, time.Duration(batchWindow)*time.Second).Err(); err != nil {
			return false, fmt.Errorf("failed to set last sent time: %w", err)
		}
		return false, nil
	}

	// Add to batch using sorted set (score = timestamp)
	notifJSON, err := json.Marshal(notif)
	if err != nil {
		return false, fmt.Errorf("failed to marshal notification: %w", err)
	}

	member := redis.Z{
		Score:  float64(now),
		Member: notifJSON,
	}

	if err := nb.redisClient.ZAdd(nb.ctx, batchKey, member).Err(); err != nil {
		return false, fmt.Errorf("failed to add to batch: %w", err)
	}

	// Set expiry on batch key (10 minutes)
	if err := nb.redisClient.Expire(nb.ctx, batchKey, 10*time.Minute).Err(); err != nil {
		return false, fmt.Errorf("failed to set expiry: %w", err)
	}

	return true, nil
}

// GetBatch retrieves all pending notifications for a user
func (nb *NotificationBatcher) GetBatch(tenantID, userID string) ([]PendingNotification, error) {
	batchKey := fmt.Sprintf("notif:batch:%s:%s", tenantID, userID)

	// Get all members from sorted set
	results, err := nb.redisClient.ZRange(nb.ctx, batchKey, 0, -1).Result()
	if err != nil {
		return nil, fmt.Errorf("failed to get batch: %w", err)
	}

	notifications := make([]PendingNotification, 0, len(results))
	for _, result := range results {
		var notif PendingNotification
		if err := json.Unmarshal([]byte(result), &notif); err != nil {
			continue // Skip invalid entries
		}
		notifications = append(notifications, notif)
	}

	return notifications, nil
}

// ClearBatch removes all pending notifications for a user
func (nb *NotificationBatcher) ClearBatch(tenantID, userID string) error {
	batchKey := fmt.Sprintf("notif:batch:%s:%s", tenantID, userID)
	return nb.redisClient.Del(nb.ctx, batchKey).Err()
}

// CreateDigest creates a digest message from batched notifications
// Format: "You have {count} new {type} from {sources}"
func (nb *NotificationBatcher) CreateDigest(notifications []PendingNotification) *BatchDigest {
	if len(notifications) == 0 {
		return nil
	}

	// Group by notification type
	typeGroups := make(map[string][]PendingNotification)
	sources := make(map[string]bool)

	for _, notif := range notifications {
		typeGroups[notif.NotificationType] = append(typeGroups[notif.NotificationType], notif)
		if notif.Source != "" {
			sources[notif.Source] = true
		}
	}

	// Use the most common notification type
	var primaryType string
	var maxCount int
	for notifType, group := range typeGroups {
		if len(group) > maxCount {
			maxCount = len(group)
			primaryType = notifType
		}
	}

	// Convert sources map to slice
	sourceList := make([]string, 0, len(sources))
	for source := range sources {
		sourceList = append(sourceList, source)
	}

	// Limit sources to first 3
	if len(sourceList) > 3 {
		sourceList = sourceList[:3]
	}

	return &BatchDigest{
		Count:            len(notifications),
		NotificationType: primaryType,
		Sources:          sourceList,
		Notifications:    notifications,
		FirstTimestamp:   notifications[0].Timestamp,
		LastTimestamp:    notifications[len(notifications)-1].Timestamp,
	}
}

// FormatDigestMessage formats the digest into a human-readable message
// Format: "You have {count} new {type} from {sources}"
func (nb *NotificationBatcher) FormatDigestMessage(digest *BatchDigest) string {
	if digest == nil || digest.Count == 0 {
		return ""
	}

	// Format notification type for display
	typeDisplay := digest.NotificationType
	switch digest.NotificationType {
	case "message":
		typeDisplay = "messages"
	case "badge_earned":
		typeDisplay = "badges"
	case "quest_update":
		typeDisplay = "quest updates"
	case "leaderboard_update":
		typeDisplay = "leaderboard updates"
	case "course_enrollment":
		typeDisplay = "course enrollments"
	}

	// Format sources
	var sourcesText string
	if len(digest.Sources) == 0 {
		sourcesText = ""
	} else if len(digest.Sources) == 1 {
		sourcesText = fmt.Sprintf(" from %s", digest.Sources[0])
	} else if len(digest.Sources) == 2 {
		sourcesText = fmt.Sprintf(" from %s and %s", digest.Sources[0], digest.Sources[1])
	} else {
		sourcesText = fmt.Sprintf(" from %s, %s and %d others", digest.Sources[0], digest.Sources[1], len(digest.Sources)-2)
	}

	return fmt.Sprintf("You have %d new %s%s", digest.Count, typeDisplay, sourcesText)
}

// ShouldFlushBatch checks if a batch should be flushed (sent immediately)
func (nb *NotificationBatcher) ShouldFlushBatch(tenantID, userID string, maxSize int) (bool, error) {
	batchKey := fmt.Sprintf("notif:batch:%s:%s", tenantID, userID)

	// Get batch size
	count, err := nb.redisClient.ZCard(nb.ctx, batchKey).Result()
	if err != nil {
		return false, fmt.Errorf("failed to get batch size: %w", err)
	}

	// Flush if batch size exceeds max
	return count >= int64(maxSize), nil
}

// GetBatchCount returns the number of pending notifications for a user
func (nb *NotificationBatcher) GetBatchCount(tenantID, userID string) (int64, error) {
	batchKey := fmt.Sprintf("notif:batch:%s:%s", tenantID, userID)
	return nb.redisClient.ZCard(nb.ctx, batchKey).Result()
}
