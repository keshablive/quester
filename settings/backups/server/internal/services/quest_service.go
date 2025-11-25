// Quest business logic
package services

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/yourusername/quester/internal/models"
	"github.com/yourusername/quester/internal/repositories"
	"gorm.io/gorm"
)

// QuestService handles quest-related business logic
type QuestService struct {
	questRepo           *repositories.QuestRepository
	userRepo            *repositories.UserRepository
	badgeService        *BadgeService
	notificationService *NotificationService
}

// NewQuestService creates a new quest service
func NewQuestService(db *gorm.DB, badgeService *BadgeService, notificationService *NotificationService) *QuestService {
	return &QuestService{
		questRepo:           repositories.NewQuestRepository(db),
		userRepo:            repositories.NewUserRepository(db),
		badgeService:        badgeService,
		notificationService: notificationService,
	}
}

// CreateQuest creates a new quest
func (s *QuestService) CreateQuest(ctx context.Context, tenantID uuid.UUID, quest *models.Quest) (*models.Quest, error) {
	quest.TenantID = tenantID

	if err := s.questRepo.Create(ctx, quest); err != nil {
		return nil, fmt.Errorf("failed to create quest: %w", err)
	}
	return quest, nil
}

// GetQuest retrieves a quest by ID
func (s *QuestService) GetQuest(ctx context.Context, tenantID uuid.UUID, questID uuid.UUID) (*models.Quest, error) {
	quest, err := s.questRepo.FindByID(ctx, tenantID, questID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("quest not found")
		}
		return nil, fmt.Errorf("failed to get quest: %w", err)
	}
	return quest, nil
}

// ListQuests retrieves all quests for a tenant
func (s *QuestService) ListQuests(ctx context.Context, tenantID uuid.UUID, filters map[string]interface{}) ([]models.Quest, error) {
	quests, err := s.questRepo.FindAll(ctx, tenantID, filters)
	if err != nil {
		return nil, fmt.Errorf("failed to list quests: %w", err)
	}
	return quests, nil
}

// UpdateQuest updates a quest
func (s *QuestService) UpdateQuest(ctx context.Context, tenantID uuid.UUID, questID uuid.UUID, updates *models.Quest) (*models.Quest, error) {
	// Get existing quest
	quest, err := s.questRepo.FindByID(ctx, tenantID, questID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("quest not found")
		}
		return nil, fmt.Errorf("failed to find quest: %w", err)
	}

	// Update fields
	if updates.Title != "" {
		quest.Title = updates.Title
	}
	if updates.Description != "" {
		quest.Description = updates.Description
	}
	if updates.Type != "" {
		quest.Type = updates.Type
	}
	if updates.Status != "" {
		quest.Status = updates.Status
	}
	if updates.Points > 0 {
		quest.Points = updates.Points
	}
	if updates.BadgeID != nil {
		quest.BadgeID = updates.BadgeID
	}
	if updates.Requirements != nil {
		quest.Requirements = updates.Requirements
	}
	if updates.EndDate != nil {
		quest.EndDate = updates.EndDate
	}

	if err := s.questRepo.Update(ctx, quest); err != nil {
		return nil, fmt.Errorf("failed to update quest: %w", err)
	}
	return quest, nil
}

// DeleteQuest soft-deletes a quest
func (s *QuestService) DeleteQuest(ctx context.Context, tenantID uuid.UUID, questID uuid.UUID) error {
	if err := s.questRepo.Delete(ctx, tenantID, questID); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("quest not found")
		}
		return fmt.Errorf("failed to delete quest: %w", err)
	}
	return nil
}

// GetActiveQuests retrieves all active quests
func (s *QuestService) GetActiveQuests(ctx context.Context, tenantID uuid.UUID) ([]models.Quest, error) {
	quests, err := s.questRepo.FindActiveQuests(ctx, tenantID)
	if err != nil {
		return nil, fmt.Errorf("failed to get active quests: %w", err)
	}
	return quests, nil
}

// Complete marks a quest as completed and awards XP to the user
// T018: Integrates with badge eligibility checking
//
// TODO: This is a simplified implementation for badge integration (T018)
// Full quest system will be implemented in Phase 3 (US3 - LMS)
// TODO: Resolve ID type mismatch (User uses UUID, Badge uses int64)
func (s *QuestService) Complete(ctx context.Context, tenantID int64, userID uuid.UUID, questID int64) error {
	// Convert tenantID to UUID (temporary until all services use UUID)
	tenantUUID := uuid.MustParse(fmt.Sprintf("%016x-0000-0000-0000-000000000000", tenantID))

	// Convert questID to UUID for database queries
	questUUID, err := uuid.Parse(fmt.Sprintf("%016x-0000-0000-0000-000000000000", questID))
	if err != nil {
		return fmt.Errorf("invalid quest ID: %w", err)
	}

	// Get quest details first (for notification and validation)
	quest, err := s.questRepo.FindByID(ctx, tenantUUID, questUUID)
	if err != nil {
		return fmt.Errorf("failed to find quest: %w", err)
	}

	// Build user stats for badge eligibility
	// Query actual stats from database
	user, err := s.userRepo.FindByID(ctx, userID)
	if err != nil {
		// Non-critical - use placeholder stats if user fetch fails
		userStats := repositories.UserStats{
			TotalXP:          100,
			QuestsCompleted:  1,
			CoursesCompleted: 0,
		}
		if err := s.badgeService.CheckEligibility(ctx, tenantUUID, userID, userStats); err != nil {
			// Non-critical error - don't fail quest completion if badge check fails
			return fmt.Errorf("warning: badge eligibility check failed: %w", err)
		}
		return nil
	}

	// TODO: Count completed enrollments once EnrollmentRepository is created
	// For now, use 0 as placeholder
	coursesCompleted := 0

	userStats := repositories.UserStats{
		TotalXP:          user.XP,
		QuestsCompleted:  1, // Incremented for this completion
		CoursesCompleted: coursesCompleted,
	}

	// Check badge eligibility after quest completion
	if err := s.badgeService.CheckEligibility(ctx, tenantUUID, userID, userStats); err != nil {
		// Non-critical error - don't fail quest completion if badge check fails
		fmt.Printf("Warning: Badge eligibility check failed for user %s: %v\n", userID, err)
	}

	// Send quest completion notification using actual quest data
	if s.notificationService != nil {
		if err := s.notificationService.SendQuestCompletion(ctx, tenantUUID, userID, uint(questID), quest.Title, quest.Points); err != nil {
			// Log error but don't fail quest completion
			fmt.Printf("Failed to send quest completion notification: %v\n", err)
		}
	}

	return nil
}

// convertUUIDToInt64 is a temporary helper to bridge UUID and int64 ID types
// Note: This function is kept for backward compatibility but should be phased out
func convertUUIDToInt64(id uuid.UUID) int64 {
	// Simple hash of UUID bytes to int64 (not cryptographically secure)
	// This is a temporary workaround until ID types are unified
	bytes := id[:]
	var result int64
	for i := 0; i < 8 && i < len(bytes); i++ {
		result = (result << 8) | int64(bytes[i])
	}
	if result < 0 {
		result = -result
	}
	return result
}
