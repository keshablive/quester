package models

import (
	"time"

	"github.com/google/uuid"
)

// ChallengeActionType represents the type of action required for a challenge
type ChallengeActionType string

const (
	ChallengeActionPost    ChallengeActionType = "post"
	ChallengeActionLike    ChallengeActionType = "like"
	ChallengeActionComment ChallengeActionType = "comment"
	ChallengeActionFollow  ChallengeActionType = "follow"
	ChallengeActionShare   ChallengeActionType = "share"
	ChallengeActionAny     ChallengeActionType = "any" // Any social action counts
)

// IsValid checks if the challenge action type is valid
func (c ChallengeActionType) IsValid() bool {
	switch c {
	case ChallengeActionPost, ChallengeActionLike, ChallengeActionComment,
		ChallengeActionFollow, ChallengeActionShare, ChallengeActionAny:
		return true
	}
	return false
}

// DailyChallengeTemplate defines admin-created challenge types
// FR-010: Generate daily social challenges
type DailyChallengeTemplate struct {
	ID       uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	TenantID uuid.UUID `gorm:"type:uuid;not null;index:idx_challenge_template_tenant" json:"tenant_id"`

	// Challenge definition
	Name        string              `gorm:"type:varchar(100);not null" json:"name"`
	Description string              `gorm:"type:text;not null" json:"description"`
	ActionType  ChallengeActionType `gorm:"type:varchar(50);not null" json:"action_type"`
	TargetCount int                 `gorm:"not null" json:"target_count"`
	XPReward    int                 `gorm:"not null" json:"xp_reward"`

	// Display
	IconName  string `gorm:"type:varchar(50)" json:"icon_name,omitempty"`
	SortOrder int    `gorm:"not null;default:0" json:"sort_order"`

	// Status
	Active bool `gorm:"not null;default:true;index:idx_challenge_template_active" json:"active"`

	// Timestamps
	CreatedAt time.Time `gorm:"not null;default:CURRENT_TIMESTAMP" json:"created_at"`
	UpdatedAt time.Time `gorm:"not null;default:CURRENT_TIMESTAMP" json:"updated_at"`
}

// TableName overrides the default table name
func (DailyChallengeTemplate) TableName() string {
	return "daily_challenge_templates"
}

// GetID implements repository.TenantModel interface
func (d *DailyChallengeTemplate) GetID() uuid.UUID {
	return d.ID
}

// GetTenantID implements repository.TenantModel interface
func (d *DailyChallengeTemplate) GetTenantID() uuid.UUID {
	return d.TenantID
}

// SetTenantID implements repository.TenantModel interface
func (d *DailyChallengeTemplate) SetTenantID(id uuid.UUID) {
	d.TenantID = id
}

// Validate checks challenge template data integrity
func (d *DailyChallengeTemplate) Validate() error {
	if d.Name == "" {
		return &ValidationError{Message: "name is required"}
	}
	if !d.ActionType.IsValid() {
		return &ValidationError{Message: "invalid action type"}
	}
	if d.TargetCount <= 0 {
		return &ValidationError{Message: "target_count must be positive"}
	}
	if d.XPReward <= 0 {
		return &ValidationError{Message: "xp_reward must be positive"}
	}
	return nil
}
