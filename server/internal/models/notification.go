package models

import (
	"time"

	"gorm.io/gorm"
)

// Notification represents a user notification
type Notification struct {
	ID               string         `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	TenantID         string         `gorm:"type:uuid;not null;index:idx_notifications_tenant" json:"tenant_id"`
	UserID           string         `gorm:"type:uuid;not null;index:idx_notifications_user" json:"user_id"`
	NotificationType string         `gorm:"type:varchar(100);not null;index:idx_notifications_type" json:"notification_type"`
	Title            string         `gorm:"type:varchar(255);not null" json:"title"`
	Message          string         `gorm:"type:text;not null" json:"message"`
	ActionURL        *string        `gorm:"type:text" json:"action_url,omitempty"`
	IconURL          *string        `gorm:"type:text" json:"icon_url,omitempty"`
	Priority         string         `gorm:"type:varchar(50);not null;default:'normal'" json:"priority"` // low, normal, high, urgent
	Channels         []string       `gorm:"type:text[];not null;default:'{in_app}'" json:"channels"`    // in_app, email, push, sms
	Metadata         map[string]any `gorm:"type:jsonb" json:"metadata,omitempty"`
	ReadAt           *time.Time     `gorm:"index:idx_notifications_read" json:"read_at,omitempty"`
	SentAt           *time.Time     `json:"sent_at,omitempty"`

	// Delivery tracking
	DeliveredAt     *time.Time `json:"delivered_at,omitempty"`
	DeliveryStatus  string     `gorm:"type:varchar(50);default:'pending'" json:"delivery_status,omitempty"` // pending, delivered, failed, bounced
	DeliveryError   *string    `gorm:"type:text" json:"delivery_error,omitempty"`
	DeliveryChannel string     `gorm:"type:varchar(50)" json:"delivery_channel,omitempty"` // in_app, email, push, sms
	RetryCount      int        `gorm:"type:integer;default:0" json:"retry_count"`
	LastRetryAt     *time.Time `json:"last_retry_at,omitempty"`

	DeletedAt gorm.DeletedAt `gorm:"index" json:"deleted_at,omitempty"`
	CreatedAt time.Time      `gorm:"not null;default:now();index:idx_notifications_created" json:"created_at"`
	UpdatedAt time.Time      `gorm:"not null;default:now()" json:"updated_at"`

	// Relationships
	User *User `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

// TableName specifies the table name for Notification model
func (Notification) TableName() string {
	return "notifications"
}

// MarkAsRead marks the notification as read
func (n *Notification) MarkAsRead() {
	now := time.Now()
	n.ReadAt = &now
}

// MarkAsSent marks the notification as sent
func (n *Notification) MarkAsSent() {
	now := time.Now()
	n.SentAt = &now
}

// MarkAsDelivered marks the notification as delivered
func (n *Notification) MarkAsDelivered(channel string) {
	now := time.Now()
	n.DeliveredAt = &now
	n.DeliveryStatus = "delivered"
	n.DeliveryChannel = channel
}

// MarkAsDeliveryFailed marks the notification delivery as failed
func (n *Notification) MarkAsDeliveryFailed(channel string, errorMsg string) {
	n.DeliveryStatus = "failed"
	n.DeliveryChannel = channel
	n.DeliveryError = &errorMsg
	n.RetryCount++
	now := time.Now()
	n.LastRetryAt = &now
}

// IsDelivered checks if notification was successfully delivered
func (n *Notification) IsDelivered() bool {
	return n.DeliveryStatus == "delivered" && n.DeliveredAt != nil
}

// CanRetry checks if notification can be retried
func (n *Notification) CanRetry(maxRetries int) bool {
	return n.DeliveryStatus == "failed" && n.RetryCount < maxRetries
}

// IsRead checks if notification has been read
func (n *Notification) IsRead() bool {
	return n.ReadAt != nil
}

// IsSent checks if notification has been sent
func (n *Notification) IsSent() bool {
	return n.SentAt != nil
}

// HasChannel checks if notification should be sent via specific channel
func (n *Notification) HasChannel(channel string) bool {
	for _, ch := range n.Channels {
		if ch == channel {
			return true
		}
	}
	return false
}

// NotificationType constants
const (
	NotificationTypeMessage       = "message"
	NotificationTypeBadgeEarned   = "badge_earned"
	NotificationTypeQuestUpdate   = "quest_update"
	NotificationTypeQuestReminder = "quest_reminder"
	NotificationTypeCourseUpdate  = "course_update"
	NotificationTypePayment       = "payment"
	NotificationTypeSystem        = "system"
	NotificationTypeComment       = "comment"
	NotificationTypeLike          = "like"
	NotificationTypeFollow        = "follow"
	NotificationTypeStreamStart   = "stream_start"
)

// NotificationChannel constants
const (
	NotificationChannelInApp = "in_app"
	NotificationChannelEmail = "email"
	NotificationChannelPush  = "push"
	NotificationChannelSMS   = "sms"
)

// NotificationPriority constants
const (
	NotificationPriorityLow    = "low"
	NotificationPriorityNormal = "normal"
	NotificationPriorityHigh   = "high"
	NotificationPriorityUrgent = "urgent"
)

// NotificationSettings represents user's notification preferences
type NotificationSettings struct {
	ID          string          `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	TenantID    string          `gorm:"type:uuid;not null;uniqueIndex:idx_notification_settings_tenant_user" json:"tenant_id"`
	UserID      string          `gorm:"type:uuid;not null;uniqueIndex:idx_notification_settings_tenant_user" json:"user_id"`
	Channels    map[string]bool `gorm:"type:jsonb;not null;default:'{\"in_app\":true,\"email\":true,\"push\":true,\"sms\":false}'" json:"channels"`
	Preferences map[string]bool `gorm:"type:jsonb;not null;default:'{\"messages\":true,\"badge_earned\":true,\"quest_update\":true,\"course_update\":true,\"payment\":true,\"system\":true}'" json:"preferences"`
	QuietHours  *QuietHours     `gorm:"type:jsonb" json:"quiet_hours,omitempty"`
	DeletedAt   gorm.DeletedAt  `gorm:"index" json:"deleted_at,omitempty"`
	CreatedAt   time.Time       `gorm:"not null;default:now()" json:"created_at"`
	UpdatedAt   time.Time       `gorm:"not null;default:now()" json:"updated_at"`

	// Relationships
	User *User `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

// TableName specifies the table name for NotificationSettings model
func (NotificationSettings) TableName() string {
	return "notification_settings"
}

// QuietHours represents quiet hours settings
type QuietHours struct {
	Enabled  bool   `json:"enabled"`
	Start    string `json:"start"`    // Format: "22:00"
	End      string `json:"end"`      // Format: "08:00"
	Timezone string `json:"timezone"` // Format: "Asia/Kolkata"
}

// IsChannelEnabled checks if a notification channel is enabled
func (ns *NotificationSettings) IsChannelEnabled(channel string) bool {
	if enabled, ok := ns.Channels[channel]; ok {
		return enabled
	}
	return false
}

// IsNotificationTypeEnabled checks if a notification type is enabled
func (ns *NotificationSettings) IsNotificationTypeEnabled(notifType string) bool {
	if enabled, ok := ns.Preferences[notifType]; ok {
		return enabled
	}
	return true // Default to enabled if not specified
}

// IsQuietHoursActive checks if current time is within quiet hours
func (ns *NotificationSettings) IsQuietHoursActive(currentTime time.Time) bool {
	if ns.QuietHours == nil || !ns.QuietHours.Enabled {
		return false
	}

	// Load timezone
	loc, err := time.LoadLocation(ns.QuietHours.Timezone)
	if err != nil {
		return false
	}

	// Convert current time to user's timezone
	userTime := currentTime.In(loc)
	currentHour := userTime.Format("15:04")

	// Simple comparison (handles same-day ranges)
	if ns.QuietHours.Start < ns.QuietHours.End {
		return currentHour >= ns.QuietHours.Start && currentHour < ns.QuietHours.End
	}

	// Handles overnight ranges (e.g., 22:00 to 08:00)
	return currentHour >= ns.QuietHours.Start || currentHour < ns.QuietHours.End
}

// FCMToken represents a Firebase Cloud Messaging device token
type FCMToken struct {
	ID         string         `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	TenantID   string         `gorm:"type:uuid;not null;index:idx_fcm_tokens_tenant" json:"tenant_id"`
	UserID     string         `gorm:"type:uuid;not null;index:idx_fcm_tokens_user" json:"user_id"`
	Token      string         `gorm:"type:text;not null;uniqueIndex:idx_fcm_tokens_token" json:"token"`
	DeviceType string         `gorm:"type:varchar(50);not null" json:"device_type"` // ios, android, web
	DeviceID   string         `gorm:"type:varchar(255);not null" json:"device_id"`
	IsActive   bool           `gorm:"not null;default:true" json:"is_active"`
	LastUsedAt time.Time      `gorm:"not null;default:now()" json:"last_used_at"`
	DeletedAt  gorm.DeletedAt `gorm:"index" json:"deleted_at,omitempty"`
	CreatedAt  time.Time      `gorm:"not null;default:now()" json:"created_at"`
	UpdatedAt  time.Time      `gorm:"not null;default:now()" json:"updated_at"`

	// Relationships
	User *User `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

// TableName specifies the table name for FCMToken model
func (FCMToken) TableName() string {
	return "fcm_tokens"
}

// DeviceType constants
const (
	DeviceTypeIOS     = "ios"
	DeviceTypeAndroid = "android"
	DeviceTypeWeb     = "web"
)

// UpdateLastUsed updates the last used timestamp
func (f *FCMToken) UpdateLastUsed() {
	f.LastUsedAt = time.Now()
}

// Deactivate marks the token as inactive
func (f *FCMToken) Deactivate() {
	f.IsActive = false
}
