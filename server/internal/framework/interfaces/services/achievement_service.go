// Package services defines service layer interfaces for the Quester platform.
package services

import (
	"context"

	"github.com/google/uuid"
)

// AchievementServiceInterface defines the contract for achievement operations.
// Implementations handle achievement tracking, progress updates, and completion.
type AchievementServiceInterface interface {
	// GetAchievement retrieves an achievement by ID.
	GetAchievement(ctx context.Context, tenantID, achievementID uuid.UUID) (*Achievement, error)

	// GetAchievements retrieves achievements with optional filtering.
	GetAchievements(ctx context.Context, tenantID uuid.UUID, category *string) ([]Achievement, error)

	// GetUserAchievements retrieves user's achievement progress.
	GetUserAchievements(ctx context.Context, userID uuid.UUID, completedOnly bool) ([]UserAchievement, error)

	// GetUserAchievementProgress retrieves progress for a specific achievement.
	GetUserAchievementProgress(ctx context.Context, userID, achievementID uuid.UUID) (*UserAchievement, error)

	// GetAchievementStats retrieves achievement statistics for a user.
	GetAchievementStats(ctx context.Context, userID uuid.UUID) (map[string]interface{}, error)

	// TrackProgress tracks progress towards an achievement.
	TrackProgress(ctx context.Context, userID uuid.UUID, achievementType, category string, increment int) error

	// CompleteAchievement manually completes an achievement for a user.
	CompleteAchievement(ctx context.Context, tenantID, userID, achievementID uuid.UUID) error

	// CreateAchievement creates a new achievement definition.
	CreateAchievement(ctx context.Context, tenantID uuid.UUID, input *CreateAchievementInput) (*Achievement, error)

	// UpdateAchievement updates an achievement definition.
	UpdateAchievement(ctx context.Context, tenantID, achievementID uuid.UUID, input *UpdateAchievementInput) (*Achievement, error)
}

// Achievement represents an achievement definition.
type Achievement struct {
	ID          uuid.UUID  `json:"id"`
	TenantID    uuid.UUID  `json:"tenant_id"`
	Name        string     `json:"name"`
	Description string     `json:"description"`
	Category    string     `json:"category"`
	Type        string     `json:"type"`
	IconURL     string     `json:"icon_url"`
	TargetValue int        `json:"target_value"`
	XPReward    int        `json:"xp_reward"`
	CoinReward  int        `json:"coin_reward"`
	BadgeID     *uuid.UUID `json:"badge_id,omitempty"`
	Active      bool       `json:"active"`
	CreatedAt   string     `json:"created_at"`
}

// UserAchievement represents a user's progress on an achievement.
type UserAchievement struct {
	ID            uuid.UUID    `json:"id"`
	UserID        uuid.UUID    `json:"user_id"`
	AchievementID uuid.UUID    `json:"achievement_id"`
	Achievement   *Achievement `json:"achievement,omitempty"`
	CurrentValue  int          `json:"current_value"`
	TargetValue   int          `json:"target_value"`
	Completed     bool         `json:"completed"`
	CompletedAt   *string      `json:"completed_at,omitempty"`
	CreatedAt     string       `json:"created_at"`
	UpdatedAt     string       `json:"updated_at"`
}

// CreateAchievementInput contains data for creating an achievement.
type CreateAchievementInput struct {
	Name        string     `json:"name" validate:"required"`
	Description string     `json:"description"`
	Category    string     `json:"category" validate:"required"`
	Type        string     `json:"type" validate:"required"`
	IconURL     string     `json:"icon_url"`
	TargetValue int        `json:"target_value" validate:"required,min=1"`
	XPReward    int        `json:"xp_reward"`
	CoinReward  int        `json:"coin_reward"`
	BadgeID     *uuid.UUID `json:"badge_id"`
}

// UpdateAchievementInput contains fields that can be updated on an achievement.
type UpdateAchievementInput struct {
	Name        *string    `json:"name"`
	Description *string    `json:"description"`
	Category    *string    `json:"category"`
	Type        *string    `json:"type"`
	IconURL     *string    `json:"icon_url"`
	TargetValue *int       `json:"target_value"`
	XPReward    *int       `json:"xp_reward"`
	CoinReward  *int       `json:"coin_reward"`
	BadgeID     *uuid.UUID `json:"badge_id"`
	Active      *bool      `json:"active"`
}
