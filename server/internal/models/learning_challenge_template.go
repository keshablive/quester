// Package models contains learning challenge template model (T017)
// Admin-defined templates for daily learning challenges
package models

import (
	"time"

	"github.com/google/uuid"
)

// ChallengeType represents the type of learning challenge
type ChallengeType string

const (
	ChallengeTypeLessonCount    ChallengeType = "lesson_count"
	ChallengeTypeXPEarned       ChallengeType = "xp_earned"
	ChallengeTypeTimeSpent      ChallengeType = "time_spent"
	ChallengeTypeQuizScore      ChallengeType = "quiz_score"
	ChallengeTypeStreakMaintain ChallengeType = "streak_maintain"
)

// IsValid checks if the challenge type is valid
func (c ChallengeType) IsValid() bool {
	switch c {
	case ChallengeTypeLessonCount, ChallengeTypeXPEarned,
		ChallengeTypeTimeSpent, ChallengeTypeQuizScore,
		ChallengeTypeStreakMaintain:
		return true
	}
	return false
}

// ChallengeDifficulty represents challenge difficulty levels
type ChallengeDifficulty string

const (
	ChallengeDifficultyEasy   ChallengeDifficulty = "easy"
	ChallengeDifficultyMedium ChallengeDifficulty = "medium"
	ChallengeDifficultyHard   ChallengeDifficulty = "hard"
)

// IsValid checks if the difficulty is valid
func (d ChallengeDifficulty) IsValid() bool {
	switch d {
	case ChallengeDifficultyEasy, ChallengeDifficultyMedium, ChallengeDifficultyHard:
		return true
	}
	return false
}

// LearningChallengeTemplate defines a template for daily challenges
// FR-023: Daily challenge generation and tracking
type LearningChallengeTemplate struct {
	ID       uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	TenantID uuid.UUID `gorm:"type:uuid;not null;index:idx_challenge_templates_tenant" json:"tenant_id"`

	// Challenge definition
	Name          string        `gorm:"type:varchar(100);not null" json:"name"`
	Description   string        `gorm:"type:varchar(500);not null" json:"description"`
	ChallengeType ChallengeType `gorm:"type:varchar(50);not null;index:idx_challenge_templates_type" json:"challenge_type"`

	// Target criteria
	TargetValue    int        `gorm:"not null" json:"target_value"`                // e.g., 3 lessons, 100 XP
	TargetCourseID *uuid.UUID `gorm:"type:uuid" json:"target_course_id,omitempty"` // NULL for any course

	// Rewards
	XPReward int `gorm:"not null" json:"xp_reward"`

	// Display
	IconURL    *string             `gorm:"type:varchar(500)" json:"icon_url,omitempty"`
	Difficulty ChallengeDifficulty `gorm:"type:varchar(20);not null;default:'medium'" json:"difficulty"`

	// Status
	IsActive bool `gorm:"not null;default:true;index:idx_challenge_templates_active" json:"is_active"`

	// Timestamps
	CreatedAt time.Time `gorm:"not null;default:CURRENT_TIMESTAMP" json:"created_at"`
	UpdatedAt time.Time `gorm:"not null;default:CURRENT_TIMESTAMP" json:"updated_at"`
}

// TableName overrides the default table name
func (LearningChallengeTemplate) TableName() string {
	return "learning_challenge_templates"
}

// GetID implements repository.TenantModel interface
func (l *LearningChallengeTemplate) GetID() uuid.UUID {
	return l.ID
}

// GetTenantID implements repository.TenantModel interface
func (l *LearningChallengeTemplate) GetTenantID() uuid.UUID {
	return l.TenantID
}

// SetTenantID implements repository.TenantModel interface
func (l *LearningChallengeTemplate) SetTenantID(id uuid.UUID) {
	l.TenantID = id
}

// Validate checks template data integrity
func (l *LearningChallengeTemplate) Validate() error {
	if !l.ChallengeType.IsValid() {
		return &ValidationError{Message: "invalid challenge type"}
	}
	if !l.Difficulty.IsValid() {
		return &ValidationError{Message: "invalid difficulty level"}
	}
	if l.TargetValue <= 0 {
		return &ValidationError{Message: "target_value must be positive"}
	}
	if l.XPReward <= 0 {
		return &ValidationError{Message: "xp_reward must be positive"}
	}
	if l.Name == "" {
		return &ValidationError{Message: "name is required"}
	}
	return nil
}

// DefaultChallengeTemplates returns default challenge templates
func DefaultChallengeTemplates(tenantID uuid.UUID) []LearningChallengeTemplate {
	templates := []struct {
		name        string
		description string
		chalType    ChallengeType
		target      int
		xp          int
		difficulty  ChallengeDifficulty
	}{
		// Easy challenges
		{"Quick Study", "Complete 1 lesson today", ChallengeTypeLessonCount, 1, 15, ChallengeDifficultyEasy},
		{"XP Collector", "Earn 25 XP today", ChallengeTypeXPEarned, 25, 20, ChallengeDifficultyEasy},

		// Medium challenges
		{"Learning Streak", "Complete 3 lessons today", ChallengeTypeLessonCount, 3, 35, ChallengeDifficultyMedium},
		{"XP Hunter", "Earn 75 XP today", ChallengeTypeXPEarned, 75, 40, ChallengeDifficultyMedium},
		{"Keep Going", "Maintain your streak today", ChallengeTypeStreakMaintain, 1, 30, ChallengeDifficultyMedium},

		// Hard challenges
		{"Power Learner", "Complete 5 lessons today", ChallengeTypeLessonCount, 5, 60, ChallengeDifficultyHard},
		{"XP Champion", "Earn 150 XP today", ChallengeTypeXPEarned, 150, 75, ChallengeDifficultyHard},
		{"Quiz Master", "Score 100% on a quiz", ChallengeTypeQuizScore, 100, 50, ChallengeDifficultyHard},
	}

	result := make([]LearningChallengeTemplate, len(templates))
	for i, t := range templates {
		result[i] = LearningChallengeTemplate{
			ID:            uuid.New(),
			TenantID:      tenantID,
			Name:          t.name,
			Description:   t.description,
			ChallengeType: t.chalType,
			TargetValue:   t.target,
			XPReward:      t.xp,
			Difficulty:    t.difficulty,
			IsActive:      true,
			CreatedAt:     time.Now(),
			UpdatedAt:     time.Now(),
		}
	}
	return result
}
