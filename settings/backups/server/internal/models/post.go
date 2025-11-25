package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// MediaType represents the type of media in a post
type MediaType string

const (
	MediaTypeText  MediaType = "text"
	MediaTypeImage MediaType = "image"
	MediaTypeVideo MediaType = "video"
)

// Visibility represents post visibility settings
type Visibility string

const (
	VisibilityPublic    Visibility = "public"
	VisibilityFollowers Visibility = "followers"
	VisibilityPrivate   Visibility = "private"
)

// Post represents a user-generated post (text, image, or video)
type Post struct {
	ID           uuid.UUID      `gorm:"type:uuid;primary_key" json:"id"`
	TenantID     uuid.UUID      `gorm:"type:uuid;not null;index:idx_posts_tenant" json:"tenant_id"`
	UserID       uuid.UUID      `gorm:"type:uuid;not null;index:idx_posts_user" json:"user_id"`
	Content      string         `gorm:"type:text;not null" json:"content"`
	MediaType    MediaType      `gorm:"type:varchar(20);not null;default:'text'" json:"media_type"`
	MediaURL     string         `gorm:"type:varchar(512)" json:"media_url,omitempty"`
	Visibility   Visibility     `gorm:"type:varchar(20);not null;default:'public';index:idx_posts_visibility" json:"visibility"`
	LikeCount    int            `gorm:"not null;default:0" json:"like_count"`
	CommentCount int            `gorm:"not null;default:0" json:"comment_count"`
	ShareCount   int            `gorm:"not null;default:0" json:"share_count"`
	CreatedAt    time.Time      `gorm:"not null;default:CURRENT_TIMESTAMP;index:idx_posts_created_at" json:"created_at"`
	UpdatedAt    time.Time      `gorm:"not null;default:CURRENT_TIMESTAMP" json:"updated_at"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"deleted_at,omitempty"`

	// Relations
	User     *User     `gorm:"foreignKey:UserID;references:ID" json:"user,omitempty"`
	Likes    []Like    `gorm:"foreignKey:PostID;references:ID" json:"likes,omitempty"`
	Comments []Comment `gorm:"foreignKey:PostID;references:ID" json:"comments,omitempty"`
}

// TableName specifies the table name for Post
func (Post) TableName() string {
	return "posts"
}

// BeforeCreate hook to set ID if not provided
func (p *Post) BeforeCreate(tx *gorm.DB) error {
	if p.ID == uuid.Nil {
		p.ID = uuid.New()
	}
	return nil
}
