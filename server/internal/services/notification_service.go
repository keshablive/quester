package services

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/keshablive/quester/internal/models"
	"github.com/keshablive/quester/internal/repositories"
)

// NotificationService handles notification business logic
type NotificationService struct {
	notificationRepo         *repositories.NotificationRepository
	notificationSettingsRepo *repositories.NotificationSettingsRepository
	fcmTokenRepo             *repositories.FCMTokenRepository
	userRepo                 *repositories.UserRepository
	db                       *gorm.DB
}

// NewNotificationService creates a new notification service
// T110: Initializes repositories for dependency injection (eliminates direct DB usage)
func NewNotificationService(db *gorm.DB) *NotificationService {
	return &NotificationService{
		notificationRepo:         repositories.NewNotificationRepository(db),
		notificationSettingsRepo: repositories.NewNotificationSettingsRepository(db),
		fcmTokenRepo:             repositories.NewFCMTokenRepository(db),
		userRepo:                 repositories.NewUserRepository(db),
		db:                       db,
	}
}

// CreateNotification creates a new notification
func (s *NotificationService) CreateNotification(ctx context.Context, tenantID, userID string, notifType, title, message, actionURL, iconURL, priority string, channels []string, metadata map[string]any) (*models.Notification, error) {
	// Parse user UUID for validation
	userUUID, err := uuid.Parse(userID)
	if err != nil {
		return nil, fmt.Errorf("invalid user ID: %w", err)
	}

	// Validate user exists
	if _, err := s.userRepo.FindByID(ctx, userUUID); err != nil {
		return nil, fmt.Errorf("user not found: %w", err)
	}

	// Get user's notification settings
	settings, err := s.GetNotificationSettings(ctx, tenantID, userID)
	if err != nil {
		// Create default settings if not found
		if errors.Is(err, gorm.ErrRecordNotFound) {
			settings, err = s.CreateDefaultSettings(ctx, tenantID, userID)
			if err != nil {
				return nil, fmt.Errorf("failed to create default settings: %w", err)
			}
		} else {
			return nil, fmt.Errorf("failed to get notification settings: %w", err)
		}
	}

	// Check if notification type is enabled
	if !settings.IsNotificationTypeEnabled(notifType) {
		return nil, errors.New("notification type is disabled for user")
	}

	// Check quiet hours
	if settings.IsQuietHoursActive(time.Now()) {
		// Queue notification for later delivery instead of sending immediately
		priority = models.NotificationPriorityLow
	}

	// Filter channels based on user preferences
	enabledChannels := make([]string, 0)
	for _, channel := range channels {
		if settings.IsChannelEnabled(channel) {
			enabledChannels = append(enabledChannels, channel)
		}
	}

	if len(enabledChannels) == 0 {
		return nil, errors.New("no enabled channels for notification")
	}

	// Create notification
	notification := &models.Notification{
		TenantID:         tenantID,
		UserID:           userID,
		NotificationType: notifType,
		Title:            title,
		Message:          message,
		ActionURL:        &actionURL,
		IconURL:          &iconURL,
		Priority:         priority,
		Channels:         enabledChannels,
		Metadata:         metadata,
	}

	if err := s.notificationRepo.Create(ctx, notification); err != nil {
		return nil, fmt.Errorf("failed to create notification: %w", err)
	}

	return notification, nil
}

// GetNotifications retrieves notifications for a user with pagination
func (s *NotificationService) GetNotifications(ctx context.Context, tenantID, userID string, unreadOnly bool, page, limit int) ([]*models.Notification, int64, error) {
	return s.notificationRepo.FindByUser(ctx, tenantID, userID, unreadOnly, page, limit)
}

// GetNotificationByID retrieves a single notification by ID
func (s *NotificationService) GetNotificationByID(ctx context.Context, notificationID, tenantID, userID string) (*models.Notification, error) {
	notification, err := s.notificationRepo.FindByID(ctx, tenantID, notificationID)
	if err != nil {
		return nil, err
	}

	if notification.UserID != userID {
		return nil, errors.New("notification not found")
	}

	return notification, nil
}

// MarkNotificationAsRead marks a notification as read
func (s *NotificationService) MarkNotificationAsRead(ctx context.Context, notificationID, tenantID, userID string) error {
	notification, err := s.GetNotificationByID(ctx, notificationID, tenantID, userID)
	if err != nil {
		return err
	}

	if notification.IsRead() {
		return nil // Already read
	}

	notification.MarkAsRead()
	return s.notificationRepo.Update(ctx, notification)
}

// MarkAllAsRead marks all notifications as read for a user
func (s *NotificationService) MarkAllAsRead(ctx context.Context, tenantID, userID string) (int64, error) {
	return s.notificationRepo.MarkAllAsRead(ctx, tenantID, userID)
}

// DeleteNotification soft deletes a notification
func (s *NotificationService) DeleteNotification(ctx context.Context, notificationID, tenantID, userID string) error {
	notification, err := s.GetNotificationByID(ctx, notificationID, tenantID, userID)
	if err != nil {
		return err
	}

	return s.notificationRepo.Delete(ctx, tenantID, notification.ID)
}

// GetUnreadCount gets the count of unread notifications for a user
func (s *NotificationService) GetUnreadCount(ctx context.Context, tenantID, userID string) (int64, error) {
	return s.notificationRepo.GetUnreadCount(ctx, tenantID, userID)
}

// GetNotificationSettings retrieves a user's notification settings
func (s *NotificationService) GetNotificationSettings(ctx context.Context, tenantID, userID string) (*models.NotificationSettings, error) {
	return s.notificationSettingsRepo.FindByUser(ctx, tenantID, userID)
}

// UpdateNotificationSettings updates a user's notification settings
func (s *NotificationService) UpdateNotificationSettings(ctx context.Context, tenantID, userID string, channels map[string]bool, preferences map[string]bool, quietHours *models.QuietHours) (*models.NotificationSettings, error) {
	settings, err := s.GetNotificationSettings(ctx, tenantID, userID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			// Create new settings if not found
			return s.CreateSettings(ctx, tenantID, userID, channels, preferences, quietHours)
		}
		return nil, err
	}

	// Update fields if provided
	if channels != nil {
		settings.Channels = channels
	}
	if preferences != nil {
		settings.Preferences = preferences
	}
	if quietHours != nil {
		settings.QuietHours = quietHours
	}

	if err := s.notificationSettingsRepo.Update(ctx, settings); err != nil {
		return nil, fmt.Errorf("failed to update settings: %w", err)
	}

	return settings, nil
}

// CreateSettings creates new notification settings
func (s *NotificationService) CreateSettings(ctx context.Context, tenantID, userID string, channels map[string]bool, preferences map[string]bool, quietHours *models.QuietHours) (*models.NotificationSettings, error) {
	settings := &models.NotificationSettings{
		TenantID:    tenantID,
		UserID:      userID,
		Channels:    channels,
		Preferences: preferences,
		QuietHours:  quietHours,
	}

	if err := s.notificationSettingsRepo.Create(ctx, settings); err != nil {
		return nil, fmt.Errorf("failed to create settings: %w", err)
	}

	return settings, nil
}

// CreateDefaultSettings creates default notification settings for a user
func (s *NotificationService) CreateDefaultSettings(ctx context.Context, tenantID, userID string) (*models.NotificationSettings, error) {
	defaultChannels := map[string]bool{
		models.NotificationChannelInApp: true,
		models.NotificationChannelEmail: true,
		models.NotificationChannelPush:  true,
		models.NotificationChannelSMS:   false,
	}

	defaultPreferences := map[string]bool{
		models.NotificationTypeMessage:      true,
		models.NotificationTypeBadgeEarned:  true,
		models.NotificationTypeQuestUpdate:  true,
		models.NotificationTypeCourseUpdate: true,
		models.NotificationTypePayment:      true,
		models.NotificationTypeSystem:       true,
	}

	return s.CreateSettings(ctx, tenantID, userID, defaultChannels, defaultPreferences, nil)
}

// RegisterFCMToken registers a Firebase Cloud Messaging token for push notifications
func (s *NotificationService) RegisterFCMToken(ctx context.Context, tenantID, userID, token, deviceType, deviceID string) (*models.FCMToken, error) {
	// Check if token already exists
	existingToken, err := s.fcmTokenRepo.FindByToken(ctx, token)
	if err == nil {
		// Token exists, update it
		existingToken.UserID = userID
		existingToken.TenantID = tenantID
		existingToken.DeviceType = deviceType
		existingToken.DeviceID = deviceID
		existingToken.IsActive = true
		existingToken.UpdateLastUsed()

		if err := s.fcmTokenRepo.Update(ctx, existingToken); err != nil {
			return nil, fmt.Errorf("failed to update FCM token: %w", err)
		}
		return existingToken, nil
	}

	// Create new token
	fcmToken := &models.FCMToken{
		TenantID:   tenantID,
		UserID:     userID,
		Token:      token,
		DeviceType: deviceType,
		DeviceID:   deviceID,
		IsActive:   true,
		LastUsedAt: time.Now(),
	}

	if err := s.fcmTokenRepo.Create(ctx, fcmToken); err != nil {
		return nil, fmt.Errorf("failed to register FCM token: %w", err)
	}

	return fcmToken, nil
}

// UnregisterFCMToken unregisters a Firebase Cloud Messaging token
func (s *NotificationService) UnregisterFCMToken(ctx context.Context, token string) error {
	fcmToken, err := s.fcmTokenRepo.FindByToken(ctx, token)
	if err != nil {
		return fmt.Errorf("token not found: %w", err)
	}

	fcmToken.Deactivate()
	return s.fcmTokenRepo.Update(ctx, fcmToken)
}

// GetUserFCMTokens retrieves all active FCM tokens for a user
func (s *NotificationService) GetUserFCMTokens(ctx context.Context, tenantID, userID string) ([]*models.FCMToken, error) {
	return s.fcmTokenRepo.FindByUser(ctx, tenantID, userID, true)
}

// CleanupOldNotifications deletes read notifications older than the specified days
func (s *NotificationService) CleanupOldNotifications(ctx context.Context, retentionDays int) (int64, error) {
	cutoffDate := time.Now().AddDate(0, 0, -retentionDays)
	return s.notificationRepo.DeleteOldReadNotifications(ctx, cutoffDate)
}

// GetNotificationStats retrieves notification statistics for a user
func (s *NotificationService) GetNotificationStats(ctx context.Context, tenantID, userID string) (map[string]interface{}, error) {
	unreadCount, err := s.GetUnreadCount(ctx, tenantID, userID)
	if err != nil {
		return nil, err
	}

	totalCount, err := s.notificationRepo.GetTotalCount(ctx, tenantID, userID)
	if err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"unread_count": unreadCount,
		"total_count":  totalCount,
	}, nil
}

// SendBulkNotifications sends notifications to multiple users
func (s *NotificationService) SendBulkNotifications(ctx context.Context, tenantID string, userIDs []string, notifType, title, message, actionURL, iconURL, priority string, channels []string, metadata map[string]any) error {
	for _, userID := range userIDs {
		if _, err := s.CreateNotification(ctx, tenantID, userID, notifType, title, message, actionURL, iconURL, priority, channels, metadata); err != nil {
			// Log error but continue with other users
			fmt.Printf("Failed to send notification to user %s: %v\n", userID, err)
		}
	}
	return nil
}

// SendBadgeApprovalNotification sends a notification when a badge is approved by an admin
// This implements FR-002.1 (send push + email within 1 hour of admin action)
func (s *NotificationService) SendBadgeApprovalNotification(ctx context.Context, tenantID, userID string, badgeName string, badgeID uint) error {
	title := "Badge Approved! 🎉"
	message := fmt.Sprintf("Congratulations! Your badge '%s' has been approved by an administrator.", badgeName)
	actionURL := fmt.Sprintf("/badges/%d", badgeID)
	iconURL := "" // Can be set to badge icon URL
	priority := models.NotificationPriorityHigh
	channels := []string{"push", "email"} // Send both push and email per FR-002.1

	metadata := map[string]any{
		"badge_id":   badgeID,
		"badge_name": badgeName,
		"action":     "approved",
		"timestamp":  time.Now().Unix(),
	}

	_, err := s.CreateNotification(ctx, tenantID, userID, models.NotificationTypeBadgeEarned, title, message, actionURL, iconURL, priority, channels, metadata)
	if err != nil {
		return fmt.Errorf("failed to send badge approval notification: %w", err)
	}

	return nil
}

// SendBadgeRejectionNotification sends a notification when a badge is rejected by an admin
// This implements FR-002.1 (send push + email within 1 hour of admin action)
func (s *NotificationService) SendBadgeRejectionNotification(ctx context.Context, tenantID, userID uuid.UUID, badgeName string, badgeID uuid.UUID, reason string) error {
	title := "Badge Application Update"
	message := fmt.Sprintf("Your badge application for '%s' was not approved. Reason: %s", badgeName, reason)
	actionURL := fmt.Sprintf("/badges/%s", badgeID)
	iconURL := ""
	priority := models.NotificationPriorityHigh // Changed from Medium which doesn't exist
	channels := []string{"push", "email"}       // Send both push and email per FR-002.1

	metadata := map[string]any{
		"badge_id":   badgeID.String(),
		"badge_name": badgeName,
		"action":     "rejected",
		"reason":     reason,
		"timestamp":  time.Now().Unix(),
	}

	_, err := s.CreateNotification(ctx, tenantID.String(), userID.String(), models.NotificationTypeBadgeEarned, title, message, actionURL, iconURL, priority, channels, metadata)
	if err != nil {
		return fmt.Errorf("failed to send badge rejection notification: %w", err)
	}

	return nil
}

// TrackNotificationDeliveryStatus tracks the delivery status of a notification
// This implements FR-002.1 (track notification delivery status)
func (s *NotificationService) TrackNotificationDeliveryStatus(ctx context.Context, tenantID, notificationID string, channel string, status string, deliveredAt *time.Time, errorMsg string) error {
	// Fetch notification
	notification, err := s.notificationRepo.FindByID(ctx, tenantID, notificationID)
	if err != nil {
		return fmt.Errorf("notification not found: %w", err)
	}

	// Update delivery tracking fields
	updates := map[string]interface{}{
		"delivery_status":  status,
		"delivery_channel": channel,
	}

	if deliveredAt != nil {
		updates["delivered_at"] = deliveredAt
	} else if status == "delivered" {
		now := time.Now()
		updates["delivered_at"] = now
	}

	if errorMsg != "" {
		updates["delivery_error"] = errorMsg
	}

	// Update retry count if failed
	if status == "failed" {
		updates["retry_count"] = notification.RetryCount + 1
		now := time.Now()
		updates["last_retry_at"] = now
	}

	// Apply updates to notification
	if deliveredAt != nil {
		notification.DeliveredAt = deliveredAt
	} else if status == "delivered" {
		now := time.Now()
		notification.DeliveredAt = &now
	}

	notification.DeliveryStatus = status
	notification.DeliveryChannel = channel

	if errorMsg != "" {
		notification.DeliveryError = &errorMsg
	}

	if status == "failed" {
		notification.RetryCount++
		now := time.Now()
		notification.LastRetryAt = &now
	}

	// Update notification in database
	if err := s.notificationRepo.Update(ctx, notification); err != nil {
		return fmt.Errorf("failed to update notification delivery status: %w", err)
	}

	return nil
}

// SendBadgeAward sends a notification when a user earns a badge
func (s *NotificationService) SendBadgeAward(ctx context.Context, tenantID, userID, badgeID uuid.UUID, badgeName string) error {
	title := "🎖️ Badge Earned!"
	message := fmt.Sprintf("Congratulations! You've earned the '%s' badge.", badgeName)
	actionURL := fmt.Sprintf("/badges/%s", badgeID)
	iconURL := "/icons/badge-award.png"

	_, err := s.CreateNotification(
		ctx,
		tenantID.String(),
		userID.String(),
		models.NotificationTypeBadgeEarned,
		title,
		message,
		actionURL,
		iconURL,
		models.NotificationPriorityHigh,
		[]string{models.NotificationChannelPush, models.NotificationChannelInApp},
		map[string]any{
			"badge_id":   badgeID.String(),
			"badge_name": badgeName,
		},
	)

	if err != nil {
		return fmt.Errorf("failed to send badge award notification: %w", err)
	}

	return nil
}

// SendQuestCompletion sends a notification when a user completes a quest
func (s *NotificationService) SendQuestCompletion(ctx context.Context, tenantID, userID uuid.UUID, questID uint, questTitle string, xpAwarded int) error {
	title := "🎯 Quest Completed!"
	message := fmt.Sprintf("You've completed '%s' and earned %d XP!", questTitle, xpAwarded)
	actionURL := fmt.Sprintf("/quests/%d", questID)
	iconURL := "/icons/quest-complete.png"

	_, err := s.CreateNotification(
		ctx,
		tenantID.String(),
		userID.String(),
		models.NotificationTypeQuestUpdate,
		title,
		message,
		actionURL,
		iconURL,
		models.NotificationPriorityNormal,
		[]string{models.NotificationChannelPush, models.NotificationChannelInApp},
		map[string]any{
			"quest_id":    questID,
			"quest_title": questTitle,
			"xp_awarded":  xpAwarded,
		},
	)

	if err != nil {
		return fmt.Errorf("failed to send quest completion notification: %w", err)
	}

	return nil
}

// SendSocialNotification sends a notification for social interactions (likes, comments, follows)
func (s *NotificationService) SendSocialNotification(ctx context.Context, tenantID, userID uuid.UUID, actorName, actionType, targetType string, targetID uint) error {
	var title, message, actionURL, iconURL, notifType string

	switch actionType {
	case "like":
		title = "👍 New Like"
		message = fmt.Sprintf("%s liked your %s", actorName, targetType)
		iconURL = "/icons/like.png"
		notifType = models.NotificationTypeLike
	case "comment":
		title = "💬 New Comment"
		message = fmt.Sprintf("%s commented on your %s", actorName, targetType)
		iconURL = "/icons/comment.png"
		notifType = models.NotificationTypeComment
	case "follow":
		title = "👥 New Follower"
		message = fmt.Sprintf("%s started following you", actorName)
		iconURL = "/icons/follow.png"
		notifType = models.NotificationTypeFollow
	case "share":
		title = "🔄 Content Shared"
		message = fmt.Sprintf("%s shared your %s", actorName, targetType)
		iconURL = "/icons/share.png"
		notifType = models.NotificationTypeSystem
	default:
		title = "🔔 New Activity"
		message = fmt.Sprintf("%s interacted with your %s", actorName, targetType)
		iconURL = "/icons/notification.png"
		notifType = models.NotificationTypeSystem
	}

	actionURL = fmt.Sprintf("/%ss/%d", targetType, targetID)

	_, err := s.CreateNotification(
		ctx,
		tenantID.String(),
		userID.String(),
		notifType,
		title,
		message,
		actionURL,
		iconURL,
		models.NotificationPriorityLow,
		[]string{models.NotificationChannelInApp},
		map[string]any{
			"actor_name":  actorName,
			"action_type": actionType,
			"target_type": targetType,
			"target_id":   targetID,
		},
	)

	if err != nil {
		return fmt.Errorf("failed to send social notification: %w", err)
	}

	return nil
}

// SendFollowNotification sends a notification when a user follows another user
func (s *NotificationService) SendFollowNotification(ctx context.Context, followerID, followedUserID, tenantID uuid.UUID) error {
	// Get follower info
	follower, err := s.userRepo.FindByID(ctx, followerID)
	if err != nil {
		return fmt.Errorf("failed to get follower info: %w", err)
	}

	// Create notification using existing CreateNotification method
	_, err = s.CreateNotification(
		ctx,
		tenantID.String(),
		followedUserID.String(), // Recipient is the user being followed
		models.NotificationTypeFollow,
		"New Follower",
		fmt.Sprintf("%s started following you", follower.Username),
		fmt.Sprintf("/profile/%s", followerID.String()),
		"/icons/follow.png",
		models.NotificationPriorityHigh, // Changed from Medium which doesn't exist
		[]string{models.NotificationChannelInApp, models.NotificationChannelPush},
		map[string]any{
			"follower_id":   followerID.String(),
			"follower_name": follower.Username,
		},
	)

	if err != nil {
		return fmt.Errorf("failed to create follow notification: %w", err)
	}

	return nil
}
