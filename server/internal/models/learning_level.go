// Package models contains learning level model (T016)
// Defines XP thresholds for each level
package models

import (
	"time"

	"github.com/google/uuid"
)

// LearningLevel defines XP thresholds for levels
// FR-006: Level-based progression system with escalating thresholds
type LearningLevel struct {
	ID       uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	TenantID uuid.UUID `gorm:"type:uuid;not null;index:idx_learning_levels_tenant" json:"tenant_id"`

	// Level definition
	LevelNumber int    `gorm:"not null" json:"level_number"`
	LevelName   string `gorm:"type:varchar(100);not null" json:"level_name"`
	MinXP       int    `gorm:"not null" json:"min_xp"`
	MaxXP       *int   `gorm:"" json:"max_xp,omitempty"` // NULL for max level

	// Rewards
	BadgeID *uuid.UUID `gorm:"type:uuid" json:"badge_id,omitempty"` // Optional badge awarded at this level

	// Display
	IconURL  *string `gorm:"type:varchar(500)" json:"icon_url,omitempty"`
	ColorHex *string `gorm:"type:varchar(7)" json:"color_hex,omitempty"` // e.g., '#FF5733'

	// Timestamps
	CreatedAt time.Time `gorm:"not null;default:CURRENT_TIMESTAMP" json:"created_at"`
	UpdatedAt time.Time `gorm:"not null;default:CURRENT_TIMESTAMP" json:"updated_at"`
}

// TableName overrides the default table name
func (LearningLevel) TableName() string {
	return "learning_levels"
}

// GetID implements repository.TenantModel interface
func (l *LearningLevel) GetID() uuid.UUID {
	return l.ID
}

// GetTenantID implements repository.TenantModel interface
func (l *LearningLevel) GetTenantID() uuid.UUID {
	return l.TenantID
}

// SetTenantID implements repository.TenantModel interface
func (l *LearningLevel) SetTenantID(id uuid.UUID) {
	l.TenantID = id
}

// ContainsXP checks if this level contains the given XP value
func (l *LearningLevel) ContainsXP(xp int) bool {
	if xp < l.MinXP {
		return false
	}
	if l.MaxXP == nil {
		return true // Top level has no cap
	}
	return xp <= *l.MaxXP
}

// ProgressInLevel returns progress percentage within this level
func (l *LearningLevel) ProgressInLevel(currentXP int) float64 {
	if l.MaxXP == nil {
		return 100.0 // Max level is always 100%
	}

	xpInLevel := currentXP - l.MinXP
	levelRange := *l.MaxXP - l.MinXP
	if levelRange == 0 {
		return 100.0
	}

	progress := float64(xpInLevel) / float64(levelRange) * 100.0
	if progress > 100.0 {
		return 100.0
	}
	if progress < 0 {
		return 0.0
	}
	return progress
}

// XPToNextLevel returns XP needed to reach next level
func (l *LearningLevel) XPToNextLevel(currentXP int) int {
	if l.MaxXP == nil {
		return 0 // Already at max level
	}
	remaining := *l.MaxXP - currentXP + 1
	if remaining < 0 {
		return 0
	}
	return remaining
}

// DefaultLearningLevels returns default level definitions
// These should be seeded per tenant during tenant creation
func DefaultLearningLevels(tenantID uuid.UUID) []LearningLevel {
	levels := []struct {
		number int
		name   string
		minXP  int
		maxXP  *int
		color  string
	}{
		{1, "Beginner", 0, intPtr(99), "#94A3B8"},
		{2, "Novice", 100, intPtr(299), "#22C55E"},
		{3, "Apprentice", 300, intPtr(599), "#3B82F6"},
		{4, "Intermediate", 600, intPtr(999), "#8B5CF6"},
		{5, "Skilled", 1000, intPtr(1499), "#F59E0B"},
		{6, "Proficient", 1500, intPtr(2099), "#EF4444"},
		{7, "Advanced", 2100, intPtr(2799), "#EC4899"},
		{8, "Expert", 2800, intPtr(3599), "#14B8A6"},
		{9, "Master", 3600, intPtr(4499), "#6366F1"},
		{10, "Grandmaster", 4500, nil, "#FFD700"}, // No cap
	}

	result := make([]LearningLevel, len(levels))
	for i, lvl := range levels {
		colorHex := lvl.color
		result[i] = LearningLevel{
			ID:          uuid.New(),
			TenantID:    tenantID,
			LevelNumber: lvl.number,
			LevelName:   lvl.name,
			MinXP:       lvl.minXP,
			MaxXP:       lvl.maxXP,
			ColorHex:    &colorHex,
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		}
	}
	return result
}

// Helper function to create int pointer
func intPtr(i int) *int {
	return &i
}

// LevelInfo is a DTO for level responses
type LevelInfo struct {
	Level         int     `json:"level"`
	LevelName     string  `json:"level_name"`
	CurrentXP     int     `json:"current_xp"`
	MinXP         int     `json:"min_xp"`
	MaxXP         *int    `json:"max_xp,omitempty"`
	XPToNextLevel int     `json:"xp_to_next_level"`
	ProgressPct   float64 `json:"progress_pct"`
	ColorHex      *string `json:"color_hex,omitempty"`
	IconURL       *string `json:"icon_url,omitempty"`
}
