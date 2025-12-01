// Package services defines service layer interfaces for the Quester platform.
package services

import (
	"context"

	"github.com/google/uuid"
)

// NotificationServiceInterface defines the contract for notification operations.
// Implementations handle notification CRUD, delivery, and user preferences.
type NotificationServiceInterface interface {
	// CreateNotification creates a new notification for a user.
	CreateNotification(ctx context.Context, tenantID uuid.UUID, userID uuid.UUID, input *CreateNotificationInput) (*Notification, error)

	// GetNotification retrieves a notification by ID.
	GetNotification(ctx context.Context, tenantID uuid.UUID, notificationID uuid.UUID) (*Notification, error)

	// GetUserNotifications retrieves notifications for a user.
	GetUserNotifications(ctx context.Context, tenantID, userID uuid.UUID, filters *NotificationFilters) (*NotificationListResponse, error)

	// MarkAsRead marks a notification as read.
	MarkAsRead(ctx context.Context, tenantID uuid.UUID, notificationID uuid.UUID) error

	// MarkAllAsRead marks all notifications as read for a user.
	MarkAllAsRead(ctx context.Context, tenantID, userID uuid.UUID) error

	// DeleteNotification deletes a notification.
	DeleteNotification(ctx context.Context, tenantID, notificationID uuid.UUID) error

	// GetNotificationSettings retrieves user's notification preferences.
	GetNotificationSettings(ctx context.Context, tenantID uuid.UUID, userID uuid.UUID) (*NotificationSettings, error)

	// UpdateNotificationSettings updates user's notification preferences.
	UpdateNotificationSettings(ctx context.Context, tenantID, userID uuid.UUID, settings *NotificationSettings) error

	// SendPushNotification sends a push notification to a user's devices.
	SendPushNotification(ctx context.Context, tenantID, userID uuid.UUID, notification *PushNotification) error

	// GetUnreadCount returns the count of unread notifications for a user.
	GetUnreadCount(ctx context.Context, tenantID, userID uuid.UUID) (int64, error)
}

// Notification represents a notification.
type Notification struct {
	ID        uuid.UUID      `json:"id"`
	TenantID  uuid.UUID      `json:"tenant_id"`
	UserID    uuid.UUID      `json:"user_id"`
	Type      string         `json:"type"`
	Title     string         `json:"title"`
	Message   string         `json:"message"`
	ActionURL string         `json:"action_url,omitempty"`
	IconURL   string         `json:"icon_url,omitempty"`
	Priority  string         `json:"priority"`
	Read      bool           `json:"read"`
	ReadAt    *string        `json:"read_at,omitempty"`
	Metadata  map[string]any `json:"metadata,omitempty"`
	CreatedAt string         `json:"created_at"`
}

// CreateNotificationInput contains data for creating a notification.
type CreateNotificationInput struct {
	Type      string         `json:"type" validate:"required"`
	Title     string         `json:"title" validate:"required"`
	Message   string         `json:"message" validate:"required"`
	ActionURL string         `json:"action_url"`
	IconURL   string         `json:"icon_url"`
	Priority  string         `json:"priority"`
	Channels  []string       `json:"channels"`
	Metadata  map[string]any `json:"metadata"`
}

// NotificationFilters contains filtering options for notification queries.
type NotificationFilters struct {
	Type     string `json:"type"`
	Read     *bool  `json:"read"`
	Priority string `json:"priority"`
	Page     int    `json:"page"`
	Limit    int    `json:"limit"`
}

// NotificationListResponse contains paginated notification results.
type NotificationListResponse struct {
	Notifications []*Notification `json:"notifications"`
	TotalCount    int64           `json:"total_count"`
	UnreadCount   int64           `json:"unread_count"`
	Page          int             `json:"page"`
	Limit         int             `json:"limit"`
}

// NotificationSettings represents user's notification preferences.
type NotificationSettings struct {
	UserID             uuid.UUID       `json:"user_id"`
	EmailEnabled       bool            `json:"email_enabled"`
	PushEnabled        bool            `json:"push_enabled"`
	SMSEnabled         bool            `json:"sms_enabled"`
	InAppEnabled       bool            `json:"in_app_enabled"`
	QuietHoursEnabled  bool            `json:"quiet_hours_enabled"`
	QuietHoursStart    string          `json:"quiet_hours_start"`
	QuietHoursEnd      string          `json:"quiet_hours_end"`
	TypePreferences    map[string]bool `json:"type_preferences"`
	ChannelPreferences map[string]bool `json:"channel_preferences"`
}

// PushNotification represents a push notification to be sent.
type PushNotification struct {
	Title     string         `json:"title"`
	Body      string         `json:"body"`
	ImageURL  string         `json:"image_url,omitempty"`
	ActionURL string         `json:"action_url,omitempty"`
	Data      map[string]any `json:"data,omitempty"`
}
