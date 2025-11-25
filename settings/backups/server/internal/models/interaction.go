package models

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
	"gorm.io/datatypes"
)

// InteractionType represents the type of social interaction
type InteractionType string

const (
	InteractionTypeLike    InteractionType = "like"
	InteractionTypeComment InteractionType = "comment"
	InteractionTypeShare   InteractionType = "share"
	InteractionTypeRate    InteractionType = "rate"
)

// ModerationStatus represents the moderation state of content
type ModerationStatus string

const (
	ModerationStatusPending  ModerationStatus = "pending"
	ModerationStatusApproved ModerationStatus = "approved"
	ModerationStatusRejected ModerationStatus = "rejected"
	ModerationStatusFlagged  ModerationStatus = "flagged"
)

// Interaction represents social engagement on any content (polymorphic)
type Interaction struct {
	ID                   uuid.UUID        `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	TenantID             uuid.UUID        `gorm:"type:uuid;not null;index:idx_interactions_tenant" json:"tenant_id"`
	UserID               uuid.UUID        `gorm:"type:uuid;not null;index:idx_interactions_user" json:"user_id"`
	TargetType           string           `gorm:"type:varchar(50);not null;index:idx_interactions_target,priority:1" json:"target_type"` // quest, course, video, property, etc.
	TargetID             uuid.UUID        `gorm:"type:uuid;not null;index:idx_interactions_target,priority:2" json:"target_id"`
	InteractionType      InteractionType  `gorm:"type:varchar(20);not null" json:"interaction_type"`
	Content              string           `gorm:"type:text" json:"content,omitempty"`                                             // Comment text or share message
	Rating               *int             `gorm:"check:rating >= 1 AND rating <= 5" json:"rating,omitempty"`                      // 1-5 stars
	ParentInteractionID  *uuid.UUID       `gorm:"type:uuid;index:idx_interactions_parent" json:"parent_interaction_id,omitempty"` // For nested comments
	Depth                int              `gorm:"not null;default:0" json:"depth"`                                                // Nesting level (0 = top-level)
	ModerationStatus     ModerationStatus `gorm:"type:varchar(20);not null;default:'approved';index:idx_interactions_moderation" json:"moderation_status"`
	ModerationConfidence float64          `gorm:"type:decimal(5,2)" json:"moderation_confidence,omitempty"` // AI confidence score (0-100)
	CreatedAt            time.Time        `gorm:"not null;default:CURRENT_TIMESTAMP" json:"created_at"`
	UpdatedAt            time.Time        `gorm:"not null;default:CURRENT_TIMESTAMP" json:"updated_at"`

	// Relationships
	Tenant              *Tenant          `gorm:"foreignKey:TenantID;constraint:OnDelete:CASCADE" json:"tenant,omitempty"`
	User                *User            `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"user,omitempty"`
	ParentInteraction   *Interaction     `gorm:"foreignKey:ParentInteractionID;constraint:OnDelete:CASCADE" json:"parent_interaction,omitempty"`
	ChildInteractions   []Interaction    `gorm:"foreignKey:ParentInteractionID" json:"child_interactions,omitempty"`
	ModerationQueueItem *ModerationQueue `gorm:"foreignKey:InteractionID" json:"moderation_queue_item,omitempty"`
}

// TableName specifies the table name for Interaction
func (Interaction) TableName() string {
	return "interactions"
}

// Validate performs business logic validation
func (i *Interaction) Validate() error {
	// Validate interaction type
	validTypes := map[InteractionType]bool{
		InteractionTypeLike:    true,
		InteractionTypeComment: true,
		InteractionTypeShare:   true,
		InteractionTypeRate:    true,
	}
	if !validTypes[i.InteractionType] {
		return ErrInvalidInteractionType
	}

	// Comments require content
	if i.InteractionType == InteractionTypeComment && (i.Content == "" || len(i.Content) < 1) {
		return ErrCommentRequiresContent
	}

	// Shares can have optional content
	if i.InteractionType == InteractionTypeShare && len(i.Content) > 500 {
		return ErrShareContentTooLong
	}

	// Ratings require rating value
	if i.InteractionType == InteractionTypeRate {
		if i.Rating == nil {
			return ErrRatingRequiresValue
		}
		if *i.Rating < 1 || *i.Rating > 5 {
			return ErrInvalidRatingRange
		}
	}

	// Validate target type
	validTargets := map[string]bool{
		"quest":    true,
		"course":   true,
		"lesson":   true,
		"video":    true,
		"property": true,
		"listing":  true,
		"badge":    true,
	}
	if !validTargets[i.TargetType] {
		return ErrInvalidTargetType
	}

	return nil
}

// IsNested checks if this is a nested comment (reply)
func (i *Interaction) IsNested() bool {
	return i.ParentInteractionID != nil && *i.ParentInteractionID != uuid.Nil
}

// RequiresModeration determines if content needs AI moderation
func (i *Interaction) RequiresModeration() bool {
	// Only comments and shares need moderation (has text content)
	return i.InteractionType == InteractionTypeComment ||
		(i.InteractionType == InteractionTypeShare && i.Content != "")
}

// IsAutoApproved checks if interaction type is auto-approved
func (i *Interaction) IsAutoApproved() bool {
	// Likes and ratings auto-approve (no text content)
	return i.InteractionType == InteractionTypeLike ||
		i.InteractionType == InteractionTypeRate
}

// Custom errors
var (
	ErrInvalidInteractionType = &AppError{Code: "INVALID_INTERACTION_TYPE", Message: "Invalid interaction type. Must be: like, comment, share, rate"}
	ErrCommentRequiresContent = &AppError{Code: "COMMENT_REQUIRES_CONTENT", Message: "Comments must have content"}
	ErrShareContentTooLong    = &AppError{Code: "SHARE_CONTENT_TOO_LONG", Message: "Share message cannot exceed 500 characters"}
	ErrRatingRequiresValue    = &AppError{Code: "RATING_REQUIRES_VALUE", Message: "Ratings must have a value between 1 and 5"}
	ErrInvalidRatingRange     = &AppError{Code: "INVALID_RATING_RANGE", Message: "Rating must be between 1 and 5 stars"}
	ErrInvalidTargetType      = &AppError{Code: "INVALID_TARGET_TYPE", Message: "Invalid target type"}
	ErrRateLimitExceeded      = &AppError{Code: "RATE_LIMIT_EXCEEDED", Message: "Rate limit exceeded. Please try again later"}
)

// ModerationConfig stores per-content-type moderation thresholds
type ModerationConfig struct {
	ID                   uint      `gorm:"primaryKey" json:"id"`
	TenantID             uint      `gorm:"not null;index:idx_moderation_config_tenant" json:"tenant_id"`
	ContentType          string    `gorm:"type:varchar(50);not null;uniqueIndex:idx_moderation_config_unique" json:"content_type"` // quest, course, etc.
	AutoRemoveThreshold  float64   `gorm:"type:decimal(5,2);not null;default:95.0" json:"auto_remove_threshold"`                   // > threshold = auto-reject
	ReviewThreshold      float64   `gorm:"type:decimal(5,2);not null;default:70.0" json:"review_threshold"`                        // Between review-remove = flag for review
	AutoApproveThreshold float64   `gorm:"type:decimal(5,2);not null;default:70.0" json:"auto_approve_threshold"`                  // < threshold = auto-approve
	CreatedAt            time.Time `gorm:"not null;default:CURRENT_TIMESTAMP" json:"created_at"`
	UpdatedAt            time.Time `gorm:"not null;default:CURRENT_TIMESTAMP" json:"updated_at"`

	// Relationships
	Tenant *Tenant `gorm:"foreignKey:TenantID;constraint:OnDelete:CASCADE" json:"tenant,omitempty"`
}

// TableName specifies the table name for ModerationConfig
func (ModerationConfig) TableName() string {
	return "moderation_configs"
}

// GetThresholds returns the thresholds for this config
func (mc *ModerationConfig) GetThresholds() (autoRemove, review, autoApprove float64) {
	return mc.AutoRemoveThreshold, mc.ReviewThreshold, mc.AutoApproveThreshold
}

// ModerationAction represents the action taken by moderator
type ModerationAction string

const (
	ModerationActionApproved ModerationAction = "approved"
	ModerationActionRemoved  ModerationAction = "removed"
	ModerationActionWarned   ModerationAction = "warned"
	ModerationActionBanned   ModerationAction = "banned"
)

// ModerationQueue tracks content flagged for human review
type ModerationQueue struct {
	ID             uint             `gorm:"primaryKey" json:"id"`
	TenantID       uint             `gorm:"not null;index:idx_moderation_queue_tenant" json:"tenant_id"`
	InteractionID  uint             `gorm:"not null;uniqueIndex:idx_moderation_queue_interaction" json:"interaction_id"`
	ReporterID     *uint            `gorm:"index:idx_moderation_queue_reporter" json:"reporter_id,omitempty"` // User who reported (if manual)
	Reason         string           `gorm:"type:text;not null" json:"reason"`
	AICategories   datatypes.JSON   `gorm:"type:jsonb" json:"ai_categories,omitempty"` // OpenAI categories {"hate": 0.85, "sexual": 0.1}
	ReviewedBy     *uint            `gorm:"index:idx_moderation_queue_reviewer" json:"reviewed_by,omitempty"`
	ReviewedAt     *time.Time       `gorm:"index:idx_moderation_queue_reviewed" json:"reviewed_at,omitempty"`
	Action         ModerationAction `gorm:"type:varchar(20)" json:"action,omitempty"`
	ModeratorNotes string           `gorm:"type:text" json:"moderator_notes,omitempty"`
	CreatedAt      time.Time        `gorm:"not null;default:CURRENT_TIMESTAMP" json:"created_at"`

	// Relationships
	Tenant      *Tenant      `gorm:"foreignKey:TenantID;constraint:OnDelete:CASCADE" json:"tenant,omitempty"`
	Interaction *Interaction `gorm:"foreignKey:InteractionID;constraint:OnDelete:CASCADE" json:"interaction,omitempty"`
	Reporter    *User        `gorm:"foreignKey:ReporterID;constraint:OnDelete:SET NULL" json:"reporter,omitempty"`
	Reviewer    *User        `gorm:"foreignKey:ReviewedBy;constraint:OnDelete:SET NULL" json:"reviewer,omitempty"`
}

// TableName specifies the table name for ModerationQueue
func (ModerationQueue) TableName() string {
	return "moderation_queue"
}

// IsPending checks if this item is awaiting review
func (mq *ModerationQueue) IsPending() bool {
	return mq.ReviewedAt == nil
}

// IsReviewed checks if this item has been reviewed
func (mq *ModerationQueue) IsReviewed() bool {
	return mq.ReviewedAt != nil && mq.ReviewedBy != nil
}

// GetAICategoryScore retrieves the confidence score for a specific category
func (mq *ModerationQueue) GetAICategoryScore(category string) (float64, bool) {
	if mq.AICategories == nil {
		return 0, false
	}

	var categories map[string]float64
	if err := json.Unmarshal(mq.AICategories, &categories); err != nil {
		return 0, false
	}

	score, exists := categories[category]
	return score, exists
}

// GetHighestCategory returns the category with highest confidence
func (mq *ModerationQueue) GetHighestCategory() (string, float64) {
	if mq.AICategories == nil {
		return "", 0
	}

	var categories map[string]float64
	if err := json.Unmarshal(mq.AICategories, &categories); err != nil {
		return "", 0
	}

	var highestCategory string
	var highestScore float64

	for category, score := range categories {
		if score > highestScore {
			highestScore = score
			highestCategory = category
		}
	}

	return highestCategory, highestScore
}
