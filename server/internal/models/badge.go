package models

import (
	"time"

	"github.com/google/uuid"
)

// BadgeTier represents badge prestige levels
type BadgeTier string

const (
	BadgeTierBronze   BadgeTier = "bronze"
	BadgeTierSilver   BadgeTier = "silver"
	BadgeTierGold     BadgeTier = "gold"
	BadgeTierPlatinum BadgeTier = "platinum"
)

// IsValid checks if the badge tier is valid
func (t BadgeTier) IsValid() bool {
	switch t {
	case BadgeTierBronze, BadgeTierSilver, BadgeTierGold, BadgeTierPlatinum:
		return true
	}
	return false
}

// BadgeCategory represents badge groupings
type BadgeCategory string

const (
	BadgeCategoryQuest    BadgeCategory = "quest"
	BadgeCategorySocial   BadgeCategory = "social"
	BadgeCategoryLearning BadgeCategory = "learning"
)

// Badge defines available achievements that users can earn
// Business Rules:
// - Badges with PointsThreshold < 100 MUST have AutoAward = true
// - Badges with PointsThreshold >= 100 MUST have AutoAward = false (admin approval)
type Badge struct {
	ID              uuid.UUID     `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	TenantID        uuid.UUID     `gorm:"type:uuid;not null;index:idx_badges_tenant" json:"tenant_id"`
	Name            string        `gorm:"type:varchar(100);not null" json:"name"`
	Description     string        `gorm:"type:text;not null" json:"description"`
	IconURL         string        `gorm:"type:varchar(500);not null" json:"icon_url"`
	Tier            BadgeTier     `gorm:"type:varchar(20);not null" json:"tier"`
	PointsThreshold int           `gorm:"not null;check:points_threshold >= 0" json:"points_threshold"`
	AutoAward       bool          `gorm:"not null;default:true" json:"auto_award"`
	Category        BadgeCategory `gorm:"type:varchar(50);index:idx_badges_category" json:"category"`
	CreatedAt       time.Time     `gorm:"not null;default:CURRENT_TIMESTAMP" json:"created_at"`
	UpdatedAt       time.Time     `gorm:"not null;default:CURRENT_TIMESTAMP" json:"updated_at"`

	// Relationships
	UserBadges []UserBadge `gorm:"foreignKey:BadgeID;constraint:OnDelete:CASCADE" json:"-"`
}

// TableName overrides the default table name
func (Badge) TableName() string {
	return "badges"
}

// GetID implements repository.TenantModel interface
func (b *Badge) GetID() uuid.UUID {
	return b.ID
}

// GetTenantID implements repository.TenantModel interface
func (b *Badge) GetTenantID() uuid.UUID {
	return b.TenantID
}

// SetTenantID implements repository.TenantModel interface
func (b *Badge) SetTenantID(id uuid.UUID) {
	b.TenantID = id
}

// Validate checks business rules
func (b *Badge) Validate() error {
	if b.PointsThreshold < 100 && !b.AutoAward {
		return ErrBadgeAutoAwardRequired
	}
	if b.PointsThreshold >= 100 && b.AutoAward {
		return ErrBadgeManualApprovalRequired
	}
	if !b.Tier.IsValid() {
		return ErrInvalidBadgeTier
	}
	return nil
}

// Custom errors
var (
	ErrBadgeAutoAwardRequired      = &ValidationError{Message: "badges with points_threshold < 100 must have auto_award = true"}
	ErrBadgeManualApprovalRequired = &ValidationError{Message: "badges with points_threshold >= 100 must have auto_award = false"}
	ErrInvalidBadgeTier            = &ValidationError{Message: "invalid badge tier"}
)

// ValidationError represents a model validation error
type ValidationError struct {
	Message string
}

func (e *ValidationError) Error() string {
	return e.Message
}
