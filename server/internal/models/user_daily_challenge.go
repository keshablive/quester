package models

import (
	"time"

	"github.com/google/uuid"
)

// UserDailyChallenge tracks a user's progress on a specific daily challenge
// FR-010: Generate daily social challenges that reset at midnight in user's local timezone
type UserDailyChallenge struct {
	ID                  uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	TenantID            uuid.UUID `gorm:"type:uuid;not null;index:idx_user_challenge_tenant" json:"tenant_id"`
	UserID              uuid.UUID `gorm:"type:uuid;not null;index:idx_user_challenge_user" json:"user_id"`
	ChallengeTemplateID uuid.UUID `gorm:"type:uuid;not null" json:"challenge_template_id"`

	// Progress tracking
	CurrentCount int        `gorm:"not null;default:0" json:"current_count"`
	TargetCount  int        `gorm:"not null" json:"target_count"`
	Completed    bool       `gorm:"not null;default:false;index:idx_user_challenge_active" json:"completed"`
	CompletedAt  *time.Time `gorm:"default:null" json:"completed_at,omitempty"`

	// XP tracking
	XPReward  int  `gorm:"not null" json:"xp_reward"`
	XPAwarded bool `gorm:"not null;default:false" json:"xp_awarded"`

	// Time window (user's local day)
	ChallengeDate time.Time  `gorm:"type:date;not null;index:idx_user_challenge_date" json:"challenge_date"`
	ExpiresAt     time.Time  `gorm:"not null" json:"expires_at"`
	FirstViewedAt *time.Time `gorm:"default:null" json:"first_viewed_at,omitempty"`

	// Timestamps
	CreatedAt time.Time `gorm:"not null;default:CURRENT_TIMESTAMP" json:"created_at"`
	UpdatedAt time.Time `gorm:"not null;default:CURRENT_TIMESTAMP" json:"updated_at"`

	// Relationships
	User              User                   `gorm:"foreignKey:UserID" json:"-"`
	ChallengeTemplate DailyChallengeTemplate `gorm:"foreignKey:ChallengeTemplateID" json:"template,omitempty"`
}

// TableName overrides the default table name
func (UserDailyChallenge) TableName() string {
	return "user_daily_challenges"
}

// GetID implements repository.TenantModel interface
func (u *UserDailyChallenge) GetID() uuid.UUID {
	return u.ID
}

// GetTenantID implements repository.TenantModel interface
func (u *UserDailyChallenge) GetTenantID() uuid.UUID {
	return u.TenantID
}

// SetTenantID implements repository.TenantModel interface
func (u *UserDailyChallenge) SetTenantID(id uuid.UUID) {
	u.TenantID = id
}

// IsExpired checks if the challenge has expired
func (u *UserDailyChallenge) IsExpired() bool {
	return time.Now().After(u.ExpiresAt)
}

// IsActive checks if the challenge is still active (not completed and not expired)
func (u *UserDailyChallenge) IsActive() bool {
	return !u.Completed && !u.IsExpired()
}

// Progress returns the completion percentage (0-100)
func (u *UserDailyChallenge) Progress() int {
	if u.TargetCount == 0 {
		return 0
	}
	progress := (u.CurrentCount * 100) / u.TargetCount
	if progress > 100 {
		return 100
	}
	return progress
}

// IncrementProgress adds to the current count and checks for completion
func (u *UserDailyChallenge) IncrementProgress(amount int) bool {
	if u.Completed || u.IsExpired() {
		return false
	}

	u.CurrentCount += amount
	if u.CurrentCount >= u.TargetCount {
		u.Completed = true
		now := time.Now()
		u.CompletedAt = &now
		return true // Challenge just completed
	}
	return false
}

// MarkFirstViewed sets the first viewed timestamp and locks the 24h window
func (u *UserDailyChallenge) MarkFirstViewed() {
	if u.FirstViewedAt == nil {
		now := time.Now()
		u.FirstViewedAt = &now
		// Lock expiration to 24h after first view
		u.ExpiresAt = now.Add(24 * time.Hour)
	}
}

// PerfectDayBonus tracks bonus XP for completing all daily challenges
type PerfectDayBonus struct {
	ID       uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	TenantID uuid.UUID `gorm:"type:uuid;not null" json:"tenant_id"`
	UserID   uuid.UUID `gorm:"type:uuid;not null;index:idx_perfect_day_user" json:"user_id"`

	// Bonus details
	ChallengeDate       time.Time `gorm:"type:date;not null" json:"challenge_date"`
	ChallengesCompleted int       `gorm:"not null" json:"challenges_completed"`
	XPBonus             int       `gorm:"not null" json:"xp_bonus"`

	// Timestamps
	CreatedAt time.Time `gorm:"not null;default:CURRENT_TIMESTAMP" json:"created_at"`

	// Relationships
	User User `gorm:"foreignKey:UserID" json:"-"`
}

// TableName overrides the default table name
func (PerfectDayBonus) TableName() string {
	return "perfect_day_bonuses"
}

// DefaultPerfectDayXPBonus is the XP awarded for completing all daily challenges
const DefaultPerfectDayXPBonus = 100
