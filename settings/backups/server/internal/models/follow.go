package models

import (
	"time"

	"github.com/google/uuid"
)

// Follow represents a follower-following relationship between users
type Follow struct {
	ID          uuid.UUID `gorm:"type:uuid;primary_key" json:"id"`
	TenantID    uuid.UUID `gorm:"type:uuid;not null;index:idx_follows_tenant" json:"tenant_id"`
	FollowerID  uuid.UUID `gorm:"type:uuid;not null;index:idx_follows_follower" json:"follower_id"`
	FollowingID uuid.UUID `gorm:"type:uuid;not null;index:idx_follows_following" json:"following_id"`
	CreatedAt   time.Time `gorm:"not null;default:CURRENT_TIMESTAMP" json:"created_at"`

	// Relations
	Follower  *User `gorm:"foreignKey:FollowerID;references:ID" json:"follower,omitempty"`
	Following *User `gorm:"foreignKey:FollowingID;references:ID" json:"following,omitempty"`
}

// TableName specifies the table name for Follow
func (Follow) TableName() string {
	return "follows"
}
