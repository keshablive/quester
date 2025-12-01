// Package services defines service layer interfaces for the Quester platform.
package services

import (
	"context"

	"github.com/google/uuid"
)

// BadgeServiceInterface defines the contract for badge/award operations.
// Implementations handle badge CRUD, awarding, eligibility checks, and user badges.
type BadgeServiceInterface interface {
	// GetBadge retrieves a badge by ID.
	GetBadge(ctx context.Context, tenantID, badgeID uuid.UUID) (*Badge, error)

	// GetBadges retrieves badges with optional filtering.
	GetBadges(ctx context.Context, tenantID uuid.UUID, filters *BadgeFilters) (*BadgeListResponse, error)

	// CreateBadge creates a new badge.
	CreateBadge(ctx context.Context, tenantID uuid.UUID, input *CreateBadgeInput) (*Badge, error)

	// UpdateBadge updates badge information.
	UpdateBadge(ctx context.Context, tenantID, badgeID uuid.UUID, input *UpdateBadgeInput) (*Badge, error)

	// DeleteBadge soft-deletes a badge.
	DeleteBadge(ctx context.Context, tenantID, badgeID uuid.UUID) error

	// AwardBadge awards a badge to a user.
	AwardBadge(ctx context.Context, tenantID, userID, badgeID uuid.UUID) error

	// RevokeBadge revokes a badge from a user.
	RevokeBadge(ctx context.Context, tenantID, userID, badgeID uuid.UUID) error

	// GetUserBadges retrieves badges earned by a user.
	GetUserBadges(ctx context.Context, tenantID, userID uuid.UUID) ([]*UserBadge, error)

	// CheckEligibility checks if user is eligible for any badges.
	CheckEligibility(ctx context.Context, tenantID, userID uuid.UUID, stats *BadgeUserStats) error

	// QueueForApproval queues a badge award for admin approval.
	QueueForApproval(ctx context.Context, tenantID, userID, badgeID uuid.UUID, reason string) error
}

// Badge represents a badge/achievement that can be earned.
type Badge struct {
	ID              uuid.UUID `json:"id"`
	TenantID        uuid.UUID `json:"tenant_id"`
	Name            string    `json:"name"`
	Description     string    `json:"description"`
	ImageURL        string    `json:"image_url"`
	Category        string    `json:"category"`
	PointsThreshold int       `json:"points_threshold"`
	AutoAward       bool      `json:"auto_award"`
	Active          bool      `json:"active"`
	CreatedAt       string    `json:"created_at"`
}

// BadgeFilters contains filtering options for badge queries.
type BadgeFilters struct {
	Category string `json:"category"`
	Active   *bool  `json:"active"`
	Page     int    `json:"page"`
	Limit    int    `json:"limit"`
}

// BadgeListResponse contains paginated badge results.
type BadgeListResponse struct {
	Badges     []*Badge `json:"badges"`
	TotalCount int64    `json:"total_count"`
	Page       int      `json:"page"`
	Limit      int      `json:"limit"`
}

// CreateBadgeInput contains data for creating a badge.
type CreateBadgeInput struct {
	Name            string `json:"name" validate:"required"`
	Description     string `json:"description"`
	ImageURL        string `json:"image_url"`
	Category        string `json:"category"`
	PointsThreshold int    `json:"points_threshold"`
	AutoAward       bool   `json:"auto_award"`
}

// UpdateBadgeInput contains fields that can be updated on a badge.
type UpdateBadgeInput struct {
	Name            *string `json:"name"`
	Description     *string `json:"description"`
	ImageURL        *string `json:"image_url"`
	Category        *string `json:"category"`
	PointsThreshold *int    `json:"points_threshold"`
	AutoAward       *bool   `json:"auto_award"`
	Active          *bool   `json:"active"`
}

// UserBadge represents a badge earned by a user.
type UserBadge struct {
	ID        uuid.UUID `json:"id"`
	UserID    uuid.UUID `json:"user_id"`
	BadgeID   uuid.UUID `json:"badge_id"`
	Badge     *Badge    `json:"badge,omitempty"`
	AwardedAt string    `json:"awarded_at"`
	AwardedBy string    `json:"awarded_by"` // system, admin username, etc.
}

// BadgeUserStats contains user statistics for badge eligibility.
type BadgeUserStats struct {
	TotalXP           int `json:"total_xp"`
	QuestsCompleted   int `json:"quests_completed"`
	CoursesCompleted  int `json:"courses_completed"`
	LessonsCompleted  int `json:"lessons_completed"`
	ConsecutiveDays   int `json:"consecutive_days"`
	TotalLoginDays    int `json:"total_login_days"`
	AchievementsCount int `json:"achievements_count"`
}
