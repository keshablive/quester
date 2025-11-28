// Package models contains learning streak model (T015)
// Tracks daily learning streaks per user with timezone awareness
package models

import (
	"time"

	"github.com/google/uuid"
)

// LearningStreak tracks daily learning activity streaks per user
// FR-016: Track streaks with user timezone awareness
// FR-017: Award bonus XP for streak milestones
type LearningStreak struct {
	ID       uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	TenantID uuid.UUID `gorm:"type:uuid;not null;index:idx_learning_streaks_tenant" json:"tenant_id"`
	UserID   uuid.UUID `gorm:"type:uuid;not null" json:"user_id"`

	// Streak tracking
	CurrentStreak int `gorm:"not null;default:0" json:"current_streak"`
	LongestStreak int `gorm:"not null;default:0" json:"longest_streak"`

	// Timezone-aware date tracking
	LastActivityDate time.Time `gorm:"type:date;not null" json:"last_activity_date"` // Date in user's timezone
	LastActivityAt   time.Time `gorm:"not null;default:CURRENT_TIMESTAMP" json:"last_activity_at"`

	// Grace period (allows 1 day miss before reset)
	GracePeriodUsed bool `gorm:"not null;default:false" json:"grace_period_used"`

	// Timestamps
	CreatedAt time.Time `gorm:"not null;default:CURRENT_TIMESTAMP" json:"created_at"`
	UpdatedAt time.Time `gorm:"not null;default:CURRENT_TIMESTAMP" json:"updated_at"`

	// Relationships
	User User `gorm:"foreignKey:UserID" json:"-"`
}

// TableName overrides the default table name
func (LearningStreak) TableName() string {
	return "learning_streaks"
}

// GetID implements repository.TenantModel interface
func (l *LearningStreak) GetID() uuid.UUID {
	return l.ID
}

// GetTenantID implements repository.TenantModel interface
func (l *LearningStreak) GetTenantID() uuid.UUID {
	return l.TenantID
}

// SetTenantID implements repository.TenantModel interface
func (l *LearningStreak) SetTenantID(id uuid.UUID) {
	l.TenantID = id
}

// StreakMilestones defines XP rewards for streak milestones
var StreakMilestones = map[int]int{
	7:   50,   // 1 week
	14:  100,  // 2 weeks
	30:  250,  // 1 month
	60:  500,  // 2 months
	100: 1000, // 100 days
}

// NextMilestone returns the next milestone and XP reward
func (l *LearningStreak) NextMilestone() (days int, xp int) {
	milestones := []int{7, 14, 30, 60, 100}
	for _, m := range milestones {
		if l.CurrentStreak < m {
			return m, StreakMilestones[m]
		}
	}
	return 0, 0 // No more milestones
}

// DaysUntilNextMilestone returns days remaining to next milestone
func (l *LearningStreak) DaysUntilNextMilestone() int {
	nextMilestone, _ := l.NextMilestone()
	if nextMilestone == 0 {
		return 0
	}
	return nextMilestone - l.CurrentStreak
}

// LearningStreakMilestone records claimed streak milestone bonuses
type LearningStreakMilestone struct {
	ID       uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	TenantID uuid.UUID `gorm:"type:uuid;not null" json:"tenant_id"`
	UserID   uuid.UUID `gorm:"type:uuid;not null" json:"user_id"`

	// Milestone details
	MilestoneDays int `gorm:"not null" json:"milestone_days"` // 7, 14, 30, 60, 100
	XPAwarded     int `gorm:"not null" json:"xp_awarded"`

	// Timestamps
	ClaimedAt time.Time `gorm:"not null;default:CURRENT_TIMESTAMP" json:"claimed_at"`

	// Relationships
	User User `gorm:"foreignKey:UserID" json:"-"`
}

// TableName overrides the default table name
func (LearningStreakMilestone) TableName() string {
	return "learning_streak_milestones"
}

// GetID implements repository.TenantModel interface
func (l *LearningStreakMilestone) GetID() uuid.UUID {
	return l.ID
}

// GetTenantID implements repository.TenantModel interface
func (l *LearningStreakMilestone) GetTenantID() uuid.UUID {
	return l.TenantID
}

// SetTenantID implements repository.TenantModel interface
func (l *LearningStreakMilestone) SetTenantID(id uuid.UUID) {
	l.TenantID = id
}

// LearningStreakInfo is a DTO for streak responses
type LearningStreakInfo struct {
	CurrentStreak          int       `json:"current_streak"`
	LongestStreak          int       `json:"longest_streak"`
	LastActivityDate       time.Time `json:"last_activity_date"`
	NextMilestoneDays      int       `json:"next_milestone_days"`
	NextMilestoneXP        int       `json:"next_milestone_xp"`
	DaysUntilNextMilestone int       `json:"days_until_next_milestone"`
	GracePeriodAvailable   bool      `json:"grace_period_available"`
}

// ToInfo converts LearningStreak to LearningStreakInfo DTO
func (l *LearningStreak) ToInfo() *LearningStreakInfo {
	nextDays, nextXP := l.NextMilestone()
	return &LearningStreakInfo{
		CurrentStreak:          l.CurrentStreak,
		LongestStreak:          l.LongestStreak,
		LastActivityDate:       l.LastActivityDate,
		NextMilestoneDays:      nextDays,
		NextMilestoneXP:        nextXP,
		DaysUntilNextMilestone: l.DaysUntilNextMilestone(),
		GracePeriodAvailable:   !l.GracePeriodUsed,
	}
}
