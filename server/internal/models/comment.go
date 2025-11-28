package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Comment represents a user comment on a post
type Comment struct {
	ID        uuid.UUID      `gorm:"type:uuid;primary_key" json:"id"`
	TenantID  uuid.UUID      `gorm:"type:uuid;not null;index:idx_comments_tenant" json:"tenant_id"`
	PostID    uuid.UUID      `gorm:"type:uuid;not null;index:idx_comments_post" json:"post_id"`
	UserID    uuid.UUID      `gorm:"type:uuid;not null;index:idx_comments_user" json:"user_id"`
	ParentID  *uuid.UUID     `gorm:"type:uuid;index:idx_comments_parent" json:"parent_id,omitempty"`
	Content   string         `gorm:"type:text;not null" json:"content"`
	CreatedAt time.Time      `gorm:"not null;default:CURRENT_TIMESTAMP" json:"created_at"`
	UpdatedAt time.Time      `gorm:"not null;default:CURRENT_TIMESTAMP" json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"deleted_at,omitempty"`

	// Relations
	User    *User     `gorm:"foreignKey:UserID;references:ID" json:"user,omitempty"`
	Post    *Post     `gorm:"foreignKey:PostID;references:ID" json:"post,omitempty"`
	Parent  *Comment  `gorm:"foreignKey:ParentID;references:ID" json:"parent,omitempty"`
	Replies []Comment `gorm:"foreignKey:ParentID;references:ID" json:"replies,omitempty"`
}

// TableName specifies the table name for Comment
func (Comment) TableName() string {
	return "comments"
}

// BeforeCreate hook to set ID if not provided
func (c *Comment) BeforeCreate(tx *gorm.DB) error {
	if c.ID == uuid.Nil {
		c.ID = uuid.New()
	}
	return nil
}

// IsReply checks if the comment is a reply to another comment
func (c *Comment) IsReply() bool {
	return c.ParentID != nil
}
