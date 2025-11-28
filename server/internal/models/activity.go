package models

import (
	"time"

	"github.com/google/uuid"
)

// ActivityType represents the type of activity
type ActivityType string

const (
	ActivityPostCreated    ActivityType = "post_created"
	ActivityPostLiked      ActivityType = "post_liked"
	ActivityPostCommented  ActivityType = "post_commented"
	ActivityPostShared     ActivityType = "post_shared"
	ActivityUserFollowed   ActivityType = "user_followed"
	ActivityBadgeEarned    ActivityType = "badge_earned"
	ActivityCourseComplete ActivityType = "course_completed"
	ActivityStreamStarted  ActivityType = "stream_started"
)

// Activity represents a user activity for the activity feed
type Activity struct {
	ID           uuid.UUID              `gorm:"type:uuid;primary_key" json:"id"`
	TenantID     uuid.UUID              `gorm:"type:uuid;not null;index:idx_activities_tenant" json:"tenant_id"`
	UserID       uuid.UUID              `gorm:"type:uuid;not null;index:idx_activities_user" json:"user_id"`
	ActivityType ActivityType           `gorm:"type:varchar(50);not null;index:idx_activities_type" json:"activity_type"`
	EntityType   string                 `gorm:"type:varchar(50);not null" json:"entity_type"`
	EntityID     uuid.UUID              `gorm:"type:uuid;not null" json:"entity_id"`
	Metadata     map[string]interface{} `gorm:"type:jsonb" json:"metadata,omitempty"`
	CreatedAt    time.Time              `gorm:"not null;default:CURRENT_TIMESTAMP;index:idx_activities_created_at" json:"created_at"`

	// Relations
	User *User `gorm:"foreignKey:UserID;references:ID" json:"user,omitempty"`
}

// TableName specifies the table name for Activity
func (Activity) TableName() string {
	return "activities"
}
