// Package models contains user learning challenge model (T018)
// Individual user challenge instances with progress tracking
package models

import (
	"time"

	"github.com/google/uuid"
)

// ChallengeStatus represents the status of a user challenge
type ChallengeStatus string

const (
	ChallengeStatusActive    ChallengeStatus = "active"
	ChallengeStatusCompleted ChallengeStatus = "completed"
	ChallengeStatusExpired   ChallengeStatus = "expired"
)

// IsValid checks if the status is valid
func (s ChallengeStatus) IsValid() bool {
	switch s {
	case ChallengeStatusActive, ChallengeStatusCompleted, ChallengeStatusExpired:
		return true
	}
	return false
}

// UserLearningChallenge represents a user's assigned daily challenge
// FR-024: Challenge progress and completion tracking
type UserLearningChallenge struct {
	ID         uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	TenantID   uuid.UUID `gorm:"type:uuid;not null;index:idx_user_challenges_tenant" json:"tenant_id"`
	UserID     uuid.UUID `gorm:"type:uuid;not null;index:idx_user_challenges_user" json:"user_id"`
	TemplateID uuid.UUID `gorm:"type:uuid;not null" json:"template_id"`

	// Challenge progress
	CurrentProgress int `gorm:"not null;default:0" json:"current_progress"`
	TargetValue     int `gorm:"not null" json:"target_value"`

	// Status
	Status ChallengeStatus `gorm:"type:varchar(20);not null;default:'active';index:idx_user_challenges_active" json:"status"`

	// Date tracking (user's local date)
	ChallengeDate time.Time `gorm:"type:date;not null;index:idx_user_challenges_date" json:"challenge_date"`

	// Completion tracking
	CompletedAt *time.Time `gorm:"" json:"completed_at,omitempty"`
	XPAwarded   *int       `gorm:"" json:"xp_awarded,omitempty"` // NULL if not completed

	// Timestamps
	CreatedAt time.Time `gorm:"not null;default:CURRENT_TIMESTAMP" json:"created_at"`
	UpdatedAt time.Time `gorm:"not null;default:CURRENT_TIMESTAMP" json:"updated_at"`
	ExpiresAt time.Time `gorm:"not null;index:idx_user_challenges_expires" json:"expires_at"` // End of user's day

	// Relationships
	User     User                      `gorm:"foreignKey:UserID" json:"-"`
	Template LearningChallengeTemplate `gorm:"foreignKey:TemplateID" json:"template,omitempty"`
}

// TableName overrides the default table name
func (UserLearningChallenge) TableName() string {
	return "user_learning_challenges"
}

// GetID implements repository.TenantModel interface
func (u *UserLearningChallenge) GetID() uuid.UUID {
	return u.ID
}

// GetTenantID implements repository.TenantModel interface
func (u *UserLearningChallenge) GetTenantID() uuid.UUID {
	return u.TenantID
}

// SetTenantID implements repository.TenantModel interface
func (u *UserLearningChallenge) SetTenantID(id uuid.UUID) {
	u.TenantID = id
}

// IsComplete returns true if challenge is completed
func (u *UserLearningChallenge) IsComplete() bool {
	return u.CurrentProgress >= u.TargetValue
}

// ProgressPct returns progress as percentage
func (u *UserLearningChallenge) ProgressPct() float64 {
	if u.TargetValue == 0 {
		return 100.0
	}
	pct := float64(u.CurrentProgress) / float64(u.TargetValue) * 100.0
	if pct > 100.0 {
		return 100.0
	}
	return pct
}

// IncrementProgress increases progress and returns true if challenge was just completed
func (u *UserLearningChallenge) IncrementProgress(amount int) bool {
	wasComplete := u.IsComplete()
	u.CurrentProgress += amount
	now := time.Now()
	u.UpdatedAt = now

	if !wasComplete && u.IsComplete() {
		u.Status = ChallengeStatusCompleted
		u.CompletedAt = &now
		return true // Just completed
	}
	return false
}

// MarkExpired marks the challenge as expired
func (u *UserLearningChallenge) MarkExpired() {
	if u.Status == ChallengeStatusActive {
		u.Status = ChallengeStatusExpired
		u.UpdatedAt = time.Now()
	}
}

// DailyLearningChallenge is a DTO for daily challenge responses
type DailyLearningChallenge struct {
	ID              uuid.UUID           `json:"id"`
	Name            string              `json:"name"`
	Description     string              `json:"description"`
	ChallengeType   ChallengeType       `json:"challenge_type"`
	Difficulty      ChallengeDifficulty `json:"difficulty"`
	TargetValue     int                 `json:"target_value"`
	CurrentProgress int                 `json:"current_progress"`
	ProgressPct     float64             `json:"progress_pct"`
	XPReward        int                 `json:"xp_reward"`
	Status          ChallengeStatus     `json:"status"`
	ExpiresAt       time.Time           `json:"expires_at"`
	IconURL         *string             `json:"icon_url,omitempty"`
}

// ToDTO converts UserLearningChallenge to DailyLearningChallenge DTO
func (u *UserLearningChallenge) ToDTO() *DailyLearningChallenge {
	return &DailyLearningChallenge{
		ID:              u.ID,
		Name:            u.Template.Name,
		Description:     u.Template.Description,
		ChallengeType:   u.Template.ChallengeType,
		Difficulty:      u.Template.Difficulty,
		TargetValue:     u.TargetValue,
		CurrentProgress: u.CurrentProgress,
		ProgressPct:     u.ProgressPct(),
		XPReward:        u.Template.XPReward,
		Status:          u.Status,
		ExpiresAt:       u.ExpiresAt,
		IconURL:         u.Template.IconURL,
	}
}
