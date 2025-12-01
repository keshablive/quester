// Package services defines service layer interfaces for the Quester platform.
package services

import (
	"context"

	"github.com/google/uuid"
)

// QuestServiceInterface defines the contract for quest/gamification operations.
// Implementations handle quest creation, assignment, progress tracking, and completion.
type QuestServiceInterface interface {
	// GetQuest retrieves a quest by ID.
	// Returns quest with requirements and rewards.
	GetQuest(ctx context.Context, tenantID, questID uuid.UUID) (*Quest, error)

	// GetQuests retrieves available quests with optional filtering.
	// Returns paginated quest list.
	GetQuests(ctx context.Context, tenantID uuid.UUID, filters *QuestFilters) (*QuestListResponse, error)

	// CreateQuest creates a new quest.
	// Returns created quest on success.
	CreateQuest(ctx context.Context, tenantID uuid.UUID, input *CreateQuestInput) (*Quest, error)

	// UpdateQuest updates quest information.
	// Returns updated quest on success.
	UpdateQuest(ctx context.Context, tenantID, questID uuid.UUID, input *UpdateQuestInput) (*Quest, error)

	// DeleteQuest soft-deletes a quest.
	// Returns error if quest has active assignments.
	DeleteQuest(ctx context.Context, tenantID, questID uuid.UUID) error

	// AssignQuest assigns a quest to a user.
	// Returns assignment record on success.
	AssignQuest(ctx context.Context, tenantID, userID, questID uuid.UUID) (*QuestAssignment, error)

	// GetUserQuests retrieves quests assigned to a user.
	// Returns list of assignments with quest details and progress.
	GetUserQuests(ctx context.Context, tenantID, userID uuid.UUID) ([]*QuestAssignment, error)

	// GetQuestProgress retrieves user's progress on a specific quest.
	// Returns detailed progress including completed objectives.
	GetQuestProgress(ctx context.Context, tenantID, userID, questID uuid.UUID) (*QuestProgress, error)

	// UpdateQuestProgress updates user's progress on a quest objective.
	// Called when user completes a quest objective.
	UpdateQuestProgress(ctx context.Context, tenantID, userID, questID uuid.UUID, input *UpdateQuestProgressInput) (*QuestProgress, error)

	// CompleteQuest marks a quest as complete and awards rewards.
	// Validates all objectives are complete before awarding.
	CompleteQuest(ctx context.Context, tenantID, userID, questID uuid.UUID) (*QuestCompletionResult, error)
}

// Quest represents a gamified challenge or task.
type Quest struct {
	ID          uuid.UUID         `json:"id"`
	TenantID    uuid.UUID         `json:"tenant_id"`
	Title       string            `json:"title"`
	Description string            `json:"description"`
	Type        string            `json:"type"` // daily, weekly, achievement, etc.
	Difficulty  string            `json:"difficulty"`
	XPReward    int               `json:"xp_reward"`
	CoinReward  int               `json:"coin_reward"`
	Objectives  []*QuestObjective `json:"objectives"`
	ExpiresAt   *string           `json:"expires_at,omitempty"`
	Active      bool              `json:"active"`
	CreatedAt   string            `json:"created_at"`
}

// QuestObjective represents a single objective within a quest.
type QuestObjective struct {
	ID           uuid.UUID `json:"id"`
	QuestID      uuid.UUID `json:"quest_id"`
	Description  string    `json:"description"`
	TargetType   string    `json:"target_type"` // lesson_complete, assessment_pass, streak, etc.
	TargetCount  int       `json:"target_count"`
	CurrentCount int       `json:"current_count,omitempty"`
	Completed    bool      `json:"completed,omitempty"`
}

// QuestFilters contains filtering options for quest queries.
type QuestFilters struct {
	Type       string `json:"type"`
	Difficulty string `json:"difficulty"`
	Active     *bool  `json:"active"`
	Page       int    `json:"page"`
	Limit      int    `json:"limit"`
}

// QuestListResponse contains paginated quest results.
type QuestListResponse struct {
	Quests     []*Quest `json:"quests"`
	TotalCount int64    `json:"total_count"`
	Page       int      `json:"page"`
	Limit      int      `json:"limit"`
}

// CreateQuestInput contains data for creating a quest.
type CreateQuestInput struct {
	Title       string                      `json:"title" validate:"required"`
	Description string                      `json:"description"`
	Type        string                      `json:"type" validate:"required"`
	Difficulty  string                      `json:"difficulty"`
	XPReward    int                         `json:"xp_reward"`
	CoinReward  int                         `json:"coin_reward"`
	Objectives  []*CreateQuestObjectiveInput `json:"objectives" validate:"required,min=1"`
	ExpiresAt   *string                     `json:"expires_at"`
}

// CreateQuestObjectiveInput contains data for creating a quest objective.
type CreateQuestObjectiveInput struct {
	Description string `json:"description" validate:"required"`
	TargetType  string `json:"target_type" validate:"required"`
	TargetCount int    `json:"target_count" validate:"required,min=1"`
}

// UpdateQuestInput contains fields that can be updated on a quest.
type UpdateQuestInput struct {
	Title       *string `json:"title"`
	Description *string `json:"description"`
	Type        *string `json:"type"`
	Difficulty  *string `json:"difficulty"`
	XPReward    *int    `json:"xp_reward"`
	CoinReward  *int    `json:"coin_reward"`
	Active      *bool   `json:"active"`
	ExpiresAt   *string `json:"expires_at"`
}

// QuestAssignment represents a user's assignment to a quest.
type QuestAssignment struct {
	ID         uuid.UUID      `json:"id"`
	TenantID   uuid.UUID      `json:"tenant_id"`
	UserID     uuid.UUID      `json:"user_id"`
	QuestID    uuid.UUID      `json:"quest_id"`
	Quest      *Quest         `json:"quest,omitempty"`
	Progress   *QuestProgress `json:"progress,omitempty"`
	AssignedAt string         `json:"assigned_at"`
	Status     string         `json:"status"` // assigned, in_progress, completed, expired
}

// QuestProgress represents user's progress on a quest.
type QuestProgress struct {
	AssignmentID       uuid.UUID                   `json:"assignment_id"`
	QuestID            uuid.UUID                   `json:"quest_id"`
	UserID             uuid.UUID                   `json:"user_id"`
	PercentComplete    int                         `json:"percent_complete"`
	ObjectiveProgress  []*QuestObjectiveProgress   `json:"objective_progress"`
	LastUpdatedAt      string                      `json:"last_updated_at"`
}

// QuestObjectiveProgress represents user's progress on a single objective.
type QuestObjectiveProgress struct {
	ObjectiveID  uuid.UUID `json:"objective_id"`
	CurrentCount int       `json:"current_count"`
	TargetCount  int       `json:"target_count"`
	Completed    bool      `json:"completed"`
}

// UpdateQuestProgressInput contains data for updating quest progress.
type UpdateQuestProgressInput struct {
	ObjectiveID uuid.UUID `json:"objective_id" validate:"required"`
	Increment   int       `json:"increment" validate:"required,min=1"`
}

// QuestCompletionResult contains the result of completing a quest.
type QuestCompletionResult struct {
	QuestID       uuid.UUID `json:"quest_id"`
	UserID        uuid.UUID `json:"user_id"`
	XPAwarded     int       `json:"xp_awarded"`
	CoinsAwarded  int       `json:"coins_awarded"`
	BadgesAwarded []string  `json:"badges_awarded,omitempty"`
	CompletedAt   string    `json:"completed_at"`
}
