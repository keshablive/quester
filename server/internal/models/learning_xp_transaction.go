// Package models contains learning XP transaction model (T014)
// Records each XP award from learning activities
package models

import (
	"time"

	"github.com/google/uuid"
)

// LearningActionType represents the type of learning action that earns XP
type LearningActionType string

const (
	LearningActionLessonCompletion LearningActionType = "lesson_completion"
	LearningActionCourseCompletion LearningActionType = "course_completion"
	LearningActionStreakBonus      LearningActionType = "streak_bonus"
	LearningActionChallenge        LearningActionType = "challenge"
	LearningActionAchievement      LearningActionType = "achievement"
	LearningActionLevelUp          LearningActionType = "level_up"
)

// IsValid checks if the action type is valid
func (a LearningActionType) IsValid() bool {
	switch a {
	case LearningActionLessonCompletion, LearningActionCourseCompletion,
		LearningActionStreakBonus, LearningActionChallenge,
		LearningActionAchievement, LearningActionLevelUp:
		return true
	}
	return false
}

// XPValue returns the base XP value for this action type (FR-001)
func (a LearningActionType) XPValue() int {
	switch a {
	case LearningActionLessonCompletion:
		return 10 // Base XP per lesson
	case LearningActionCourseCompletion:
		return 100 // Bonus XP for completing a course
	default:
		return 0 // Streak, challenges, achievements have custom XP
	}
}

// LearningXPTransaction records each XP award from learning activities
// FR-001: Award XP for lesson/course completion
// FR-002: Track unique actions to prevent duplicate XP
// FR-004: Track learning-specific XP separately for learning leaderboard
type LearningXPTransaction struct {
	ID       uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	TenantID uuid.UUID `gorm:"type:uuid;not null;index:idx_learning_xp_tenant" json:"tenant_id"`
	UserID   uuid.UUID `gorm:"type:uuid;not null;index:idx_learning_xp_user" json:"user_id"`

	// Action details
	ActionType LearningActionType `gorm:"type:varchar(50);not null;index:idx_learning_xp_action" json:"action_type"`
	XPAmount   int                `gorm:"not null" json:"xp_amount"`

	// Content reference (for duplicate prevention)
	ContentType string    `gorm:"type:varchar(50)" json:"content_type,omitempty"` // 'Lesson', 'Course', 'Challenge'
	ContentID   uuid.UUID `gorm:"type:uuid" json:"content_id,omitempty"`

	// Metadata
	Description string  `gorm:"type:varchar(255)" json:"description,omitempty"`
	Multiplier  float64 `gorm:"type:decimal(3,2);not null;default:1.00" json:"multiplier"`

	// Async processing (FR-013)
	Processed   bool       `gorm:"not null;default:false;index:idx_learning_xp_processed" json:"processed"`
	ProcessedAt *time.Time `gorm:"default:null" json:"processed_at,omitempty"`

	// Timestamps
	CreatedAt time.Time `gorm:"not null;default:CURRENT_TIMESTAMP;index:idx_learning_xp_created" json:"created_at"`

	// Relationships
	User User `gorm:"foreignKey:UserID" json:"-"`
}

// TableName overrides the default table name
func (LearningXPTransaction) TableName() string {
	return "learning_xp_transactions"
}

// GetID implements repository.TenantModel interface
func (l *LearningXPTransaction) GetID() uuid.UUID {
	return l.ID
}

// GetTenantID implements repository.TenantModel interface
func (l *LearningXPTransaction) GetTenantID() uuid.UUID {
	return l.TenantID
}

// SetTenantID implements repository.TenantModel interface
func (l *LearningXPTransaction) SetTenantID(id uuid.UUID) {
	l.TenantID = id
}

// Validate checks transaction data integrity
func (l *LearningXPTransaction) Validate() error {
	if !l.ActionType.IsValid() {
		return &ValidationError{Message: "invalid learning action type"}
	}
	if l.XPAmount <= 0 {
		return &ValidationError{Message: "xp_amount must be positive"}
	}
	if l.UserID == uuid.Nil {
		return &ValidationError{Message: "user_id is required"}
	}
	if l.Multiplier <= 0 {
		return &ValidationError{Message: "multiplier must be positive"}
	}
	return nil
}

// UserLearningStats aggregates learning activity stats per user
// Used for leaderboards and achievement tracking
type UserLearningStats struct {
	ID       uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	TenantID uuid.UUID `gorm:"type:uuid;not null;index:idx_user_learning_stats_tenant" json:"tenant_id"`
	UserID   uuid.UUID `gorm:"type:uuid;not null" json:"user_id"`

	// XP totals
	TotalLearningXP int `gorm:"not null;default:0;index:idx_user_learning_stats_xp" json:"total_learning_xp"`

	// Activity counts (for achievement tracking)
	LessonsCompleted int `gorm:"not null;default:0" json:"lessons_completed"`
	CoursesCompleted int `gorm:"not null;default:0" json:"courses_completed"`
	QuizzesPassed    int `gorm:"not null;default:0" json:"quizzes_passed"`
	PerfectScores    int `gorm:"not null;default:0" json:"perfect_scores"`

	// Timestamps
	CreatedAt time.Time `gorm:"not null;default:CURRENT_TIMESTAMP" json:"created_at"`
	UpdatedAt time.Time `gorm:"not null;default:CURRENT_TIMESTAMP" json:"updated_at"`

	// Relationships
	User User `gorm:"foreignKey:UserID" json:"-"`
}

// TableName overrides the default table name
func (UserLearningStats) TableName() string {
	return "user_learning_stats"
}

// GetID implements repository.TenantModel interface
func (u *UserLearningStats) GetID() uuid.UUID {
	return u.ID
}

// GetTenantID implements repository.TenantModel interface
func (u *UserLearningStats) GetTenantID() uuid.UUID {
	return u.TenantID
}

// SetTenantID implements repository.TenantModel interface
func (u *UserLearningStats) SetTenantID(id uuid.UUID) {
	u.TenantID = id
}

// LearningXPSummary is a DTO for XP summary responses
type LearningXPSummary struct {
	TotalXP       int     `json:"total_xp"`
	Level         int     `json:"level"`
	LevelName     string  `json:"level_name"`
	XPToNextLevel int     `json:"xp_to_next_level"`
	ProgressPct   float64 `json:"progress_pct"`
}

// LearningLeaderboardEntry is a DTO for leaderboard responses
type LearningLeaderboardEntry struct {
	Rank       int       `json:"rank"`
	UserID     uuid.UUID `json:"user_id"`
	Username   string    `json:"username"`
	Avatar     *string   `json:"avatar,omitempty"`
	TotalXP    int       `json:"total_xp"`
	Level      int       `json:"level"`
	RankChange int       `json:"rank_change"` // Positive = moved up, negative = moved down
}
