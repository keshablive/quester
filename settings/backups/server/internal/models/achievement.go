package models

import (
	"time"

	"github.com/google/uuid"
)

// AchievementCategory represents achievement groupings
type AchievementCategory string

const (
	AchievementCategoryLearning  AchievementCategory = "learning"  // Course/lesson completions
	AchievementCategorySocial    AchievementCategory = "social"    // Community engagement
	AchievementCategoryMastery   AchievementCategory = "mastery"   // Skill proficiency
	AchievementCategoryExplorer  AchievementCategory = "explorer"  // Content discovery
	AchievementCategoryStreak    AchievementCategory = "streak"    // Consistency rewards
	AchievementCategoryMilestone AchievementCategory = "milestone" // Platform milestones
)

// IsValid checks if the achievement category is valid
func (c AchievementCategory) IsValid() bool {
	switch c {
	case AchievementCategoryLearning, AchievementCategorySocial,
		AchievementCategoryMastery, AchievementCategoryExplorer,
		AchievementCategoryStreak, AchievementCategoryMilestone:
		return true
	}
	return false
}

// AchievementType defines how achievement progress is tracked
type AchievementType string

const (
	AchievementTypeCount      AchievementType = "count"      // Count to target (e.g., complete 10 courses)
	AchievementTypeStreak     AchievementType = "streak"     // Consecutive days/actions
	AchievementTypeCollection AchievementType = "collection" // Collect specific items/badges
	AchievementTypeMilestone  AchievementType = "milestone"  // Single event (e.g., first course)
	AchievementTypeThreshold  AchievementType = "threshold"  // Reach specific value (e.g., 1000 XP)
)

// IsValid checks if the achievement type is valid
func (t AchievementType) IsValid() bool {
	switch t {
	case AchievementTypeCount, AchievementTypeStreak,
		AchievementTypeCollection, AchievementTypeMilestone,
		AchievementTypeThreshold:
		return true
	}
	return false
}

// Achievement represents a multi-step accomplishment that users can work towards
// Achievements are more complex than badges with progress tracking and multiple criteria
type Achievement struct {
	ID          uuid.UUID           `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	TenantID    uuid.UUID           `gorm:"type:uuid;not null;index:idx_achievements_tenant" json:"tenant_id"`
	Name        string              `gorm:"type:varchar(100);not null" json:"name"`
	Description string              `gorm:"type:text;not null" json:"description"`
	IconURL     string              `gorm:"type:varchar(500);not null" json:"icon_url"`
	Category    AchievementCategory `gorm:"type:varchar(50);not null;index:idx_achievements_category" json:"category"`
	Type        AchievementType     `gorm:"type:varchar(50);not null" json:"type"`
	
	// Progress tracking
	TargetCount int  `gorm:"not null;default:1" json:"target_count"` // Required count/threshold
	Hidden      bool `gorm:"not null;default:false" json:"hidden"`   // Hidden until unlocked
	
	// Rewards
	XPReward     int       `gorm:"not null;default:0" json:"xp_reward"`         // XP awarded on completion
	BadgeID      uuid.UUID `gorm:"type:uuid;index:idx_achievements_badge" json:"badge_id,omitempty"` // Optional badge unlock
	
	// Metadata
	Difficulty string    `gorm:"type:varchar(20);not null;default:'medium'" json:"difficulty"` // easy, medium, hard, epic
	SortOrder  int       `gorm:"not null;default:0" json:"sort_order"`
	Active     bool      `gorm:"not null;default:true" json:"active"`
	CreatedAt  time.Time `gorm:"not null;default:CURRENT_TIMESTAMP" json:"created_at"`
	UpdatedAt  time.Time `gorm:"not null;default:CURRENT_TIMESTAMP" json:"updated_at"`

	// Relationships
	Badge             *Badge              `gorm:"foreignKey:BadgeID;constraint:OnDelete:SET NULL" json:"badge,omitempty"`
	UserAchievements  []UserAchievement   `gorm:"foreignKey:AchievementID;constraint:OnDelete:CASCADE" json:"-"`
	AchievementSteps  []AchievementStep   `gorm:"foreignKey:AchievementID;constraint:OnDelete:CASCADE" json:"steps,omitempty"`
}

// TableName overrides the default table name
func (Achievement) TableName() string {
	return "achievements"
}

// Validate checks achievement data integrity
func (a *Achievement) Validate() error {
	if !a.Category.IsValid() {
		return &ValidationError{Message: "invalid achievement category"}
	}
	if !a.Type.IsValid() {
		return &ValidationError{Message: "invalid achievement type"}
	}
	if a.TargetCount < 1 {
		return &ValidationError{Message: "target_count must be at least 1"}
	}
	if a.XPReward < 0 {
		return &ValidationError{Message: "xp_reward cannot be negative"}
	}
	return nil
}

// AchievementStep defines individual steps/criteria for multi-step achievements
// Example: "Complete Your First Course" achievement might have steps:
// 1. Enroll in a course
// 2. Complete first lesson
// 3. Complete all lessons
type AchievementStep struct {
	ID            uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	AchievementID uuid.UUID `gorm:"type:uuid;not null;index:idx_achievement_steps_achievement" json:"achievement_id"`
	Name          string    `gorm:"type:varchar(200);not null" json:"name"`
	Description   string    `gorm:"type:text" json:"description"`
	SortOrder     int       `gorm:"not null;default:0" json:"sort_order"`
	Required      bool      `gorm:"not null;default:true" json:"required"` // If false, step is optional
	CreatedAt     time.Time `gorm:"not null;default:CURRENT_TIMESTAMP" json:"created_at"`

	// Relationships
	Achievement Achievement `gorm:"foreignKey:AchievementID" json:"-"`
}

// TableName overrides the default table name
func (AchievementStep) TableName() string {
	return "achievement_steps"
}

// UserAchievement tracks user progress towards achievements
type UserAchievement struct {
	ID            uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	TenantID      uuid.UUID `gorm:"type:uuid;not null;index:idx_user_achievements_tenant" json:"tenant_id"`
	UserID        uuid.UUID `gorm:"type:uuid;not null;index:idx_user_achievements_user" json:"user_id"`
	AchievementID uuid.UUID `gorm:"type:uuid;not null;index:idx_user_achievements_achievement" json:"achievement_id"`
	
	// Progress tracking
	CurrentCount int       `gorm:"not null;default:0" json:"current_count"` // Current progress
	Completed    bool      `gorm:"not null;default:false;index:idx_user_achievements_completed" json:"completed"`
	CompletedAt  *time.Time `gorm:"default:null" json:"completed_at,omitempty"`
	
	// Metadata
	FirstProgressAt *time.Time `gorm:"default:null" json:"first_progress_at,omitempty"` // When user first made progress
	LastProgressAt  *time.Time `gorm:"default:null" json:"last_progress_at,omitempty"`  // Last progress update
	CreatedAt       time.Time  `gorm:"not null;default:CURRENT_TIMESTAMP" json:"created_at"`
	UpdatedAt       time.Time  `gorm:"not null;default:CURRENT_TIMESTAMP" json:"updated_at"`

	// Relationships
	User        User        `gorm:"foreignKey:UserID" json:"-"`
	Achievement Achievement `gorm:"foreignKey:AchievementID" json:"achievement,omitempty"`
	StepProgress []UserAchievementStepProgress `gorm:"foreignKey:UserAchievementID;constraint:OnDelete:CASCADE" json:"step_progress,omitempty"`
}

// TableName overrides the default table name
func (UserAchievement) TableName() string {
	return "user_achievements"
}

// UserAchievementStepProgress tracks completion of individual achievement steps
type UserAchievementStepProgress struct {
	ID                uuid.UUID  `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	UserAchievementID uuid.UUID  `gorm:"type:uuid;not null;index:idx_user_achievement_step_user_ach" json:"user_achievement_id"`
	AchievementStepID uuid.UUID  `gorm:"type:uuid;not null;index:idx_user_achievement_step_step" json:"achievement_step_id"`
	Completed         bool       `gorm:"not null;default:false" json:"completed"`
	CompletedAt       *time.Time `gorm:"default:null" json:"completed_at,omitempty"`
	CreatedAt         time.Time  `gorm:"not null;default:CURRENT_TIMESTAMP" json:"created_at"`
	UpdatedAt         time.Time  `gorm:"not null;default:CURRENT_TIMESTAMP" json:"updated_at"`

	// Relationships
	UserAchievement UserAchievement `gorm:"foreignKey:UserAchievementID" json:"-"`
	AchievementStep AchievementStep `gorm:"foreignKey:AchievementStepID" json:"step,omitempty"`
}

// TableName overrides the default table name
func (UserAchievementStepProgress) TableName() string {
	return "user_achievement_step_progress"
}

// CalculateProgress returns achievement progress percentage (0-100)
func (ua *UserAchievement) CalculateProgress() int {
	if ua.Completed {
		return 100
	}
	if ua.Achievement.TargetCount == 0 {
		return 0
	}
	progress := (ua.CurrentCount * 100) / ua.Achievement.TargetCount
	if progress > 100 {
		return 100
	}
	return progress
}

// IsUnlocked checks if achievement should be visible to user
func (a *Achievement) IsUnlocked(userAchievement *UserAchievement) bool {
	if !a.Hidden {
		return true // Always visible if not hidden
	}
	if userAchievement != nil && userAchievement.CurrentCount > 0 {
		return true // Unlocked once user makes any progress
	}
	return false
}
