package models

import (
	"time"

	"github.com/google/uuid"
)

// Like represents a user liking a post
type Like struct {
	ID        uuid.UUID `gorm:"type:uuid;primary_key" json:"id"`
	TenantID  uuid.UUID `gorm:"type:uuid;not null;index:idx_likes_tenant" json:"tenant_id"`
	UserID    uuid.UUID `gorm:"type:uuid;not null;index:idx_likes_user" json:"user_id"`
	PostID    uuid.UUID `gorm:"type:uuid;not null;index:idx_likes_post" json:"post_id"`
	CreatedAt time.Time `gorm:"not null;default:CURRENT_TIMESTAMP" json:"created_at"`

	// Relations
	User *User `gorm:"foreignKey:UserID;references:ID" json:"user,omitempty"`
	Post *Post `gorm:"foreignKey:PostID;references:ID" json:"post,omitempty"`
}

// TableName specifies the table name for Like
func (Like) TableName() string {
	return "likes"
}
