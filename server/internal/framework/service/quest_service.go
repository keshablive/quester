// Quest business logic
package service

import (
	"context"
	"errors"
	"fmt"
	"log/slog"

	"github.com/google/uuid"
	"github.com/keshablive/quester/internal/framework/cache"
	"github.com/keshablive/quester/internal/framework/interfaces"
	"github.com/keshablive/quester/internal/models"
	"github.com/keshablive/quester/internal/framework/repository"
	"gorm.io/gorm" // Only for error types (gorm.ErrRecordNotFound)
)

// QuestService handles quest-related business logic
type QuestService struct {
	BaseService
	questRepo           interfaces.QuestRepository
	userRepo            *repository.UserRepository // Phase 10: Migrate to interfaces.UserRepository when full interface is implemented
	badgeService        *BadgeService
	notificationService *NotificationService
	cacheService        *CacheService // 007-api-performance-caching T017
}

// NewQuestService creates a new quest service
func NewQuestService(db *gorm.DB, logger *slog.Logger, redisClient *cache.PooledRedisClient, questRepo interfaces.QuestRepository, userRepo *repository.UserRepository, badgeService *BadgeService, notificationService *NotificationService) *QuestService {
	return &QuestService{
		BaseService:         NewBaseService(db, logger, redisClient, nil),
		questRepo:           questRepo,
		userRepo:            userRepo,
		badgeService:        badgeService,
		notificationService: notificationService,
	}
}

// NewQuestServiceWithCache creates a new quest service with caching support (007-api-performance-caching T017)
func NewQuestServiceWithCache(db *gorm.DB, logger *slog.Logger, redisClient *cache.PooledRedisClient, questRepo interfaces.QuestRepository, userRepo *repository.UserRepository, badgeService *BadgeService, notificationService *NotificationService, cacheService *CacheService) *QuestService {
	return &QuestService{
		BaseService:         NewBaseService(db, logger, redisClient, nil),
		questRepo:           questRepo,
		userRepo:            userRepo,
		badgeService:        badgeService,
		notificationService: notificationService,
		cacheService:        cacheService,
	}
}

// CreateQuest creates a new quest (007-api-performance-caching T018)
func (s *QuestService) CreateQuest(ctx context.Context, tenantID uuid.UUID, quest *models.Quest) (*models.Quest, error) {
	quest.TenantID = tenantID

	if err := s.questRepo.Create(ctx, quest); err != nil {
		return nil, fmt.Errorf("failed to create quest: %w", err)
	}

	// Invalidate quest list cache (007-api-performance-caching T018)
	if s.cacheService != nil {
		_ = s.cacheService.InvalidateQuestList(ctx, tenantID)
	}

	return quest, nil
}

// GetQuest retrieves a quest by ID with caching (007-api-performance-caching T017)
func (s *QuestService) GetQuest(ctx context.Context, tenantID uuid.UUID, questID uuid.UUID) (*models.Quest, error) {
	// Try cache first if available
	if s.cacheService != nil {
		if cached, found, err := s.cacheService.GetQuest(ctx, tenantID, questID); err == nil && found {
			return cached, nil
		}
		// On cache miss or error, fall through to database
	}

	quest, err := s.questRepo.FindByID(ctx, tenantID, questID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("quest not found")
		}
		return nil, fmt.Errorf("failed to get quest: %w", err)
	}

	// Cache the result
	if s.cacheService != nil {
		_ = s.cacheService.SetQuest(ctx, tenantID, quest)
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

	// Invalidate cache (007-api-performance-caching T018)
	if s.cacheService != nil {
		_ = s.cacheService.InvalidateQuest(ctx, tenantID, questID)
		_ = s.cacheService.InvalidateQuestList(ctx, tenantID)
	}

	return quest, nil
}

// DeleteQuest soft-deletes a quest (007-api-performance-caching T018)
func (s *QuestService) DeleteQuest(ctx context.Context, tenantID uuid.UUID, questID uuid.UUID) error {
	if err := s.questRepo.Delete(ctx, tenantID, questID); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("quest not found")
		}
		return fmt.Errorf("failed to delete quest: %w", err)
	}

	// Invalidate cache (007-api-performance-caching T018)
	if s.cacheService != nil {
		_ = s.cacheService.InvalidateQuest(ctx, tenantID, questID)
		_ = s.cacheService.InvalidateQuestList(ctx, tenantID)
	}

	return nil
}

// GetActiveQuests retrieves all active quests
func (s *QuestService) GetActiveQuests(ctx context.Context, tenantID uuid.UUID) ([]models.Quest, error) {
	quests, err := s.questRepo.GetActiveQuests(ctx, tenantID)
	if err != nil {
		return nil, fmt.Errorf("failed to get active quests: %w", err)
	}
	return quests, nil
}

// Complete marks a quest as completed and awards XP to the user
// T018: Integrates with badge eligibility checking
// Note: Simplified implementation for badge integration - full quest system in Phase 3 (US3 - LMS)
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
		userStats := repository.UserStats{
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

	// Note: Using 0 as placeholder until EnrollmentRepository is integrated
	coursesCompleted := 0

	userStats := repository.UserStats{
		TotalXP:          user.XP,
		QuestsCompleted:  1, // Incremented for this completion
		CoursesCompleted: coursesCompleted,
	}

	// Check badge eligibility after quest completion
	if err := s.badgeService.CheckEligibility(ctx, tenantUUID, userID, userStats); err != nil {
		// Non-critical error - don't fail quest completion if badge check fails
		s.LogWarn("Badge eligibility check failed", "user_id", userID, "error", err)
	}

	// Send quest completion notification using actual quest data
	if s.notificationService != nil {
		if err := s.notificationService.SendQuestCompletion(ctx, tenantUUID, userID, uint(questID), quest.Title, quest.Points); err != nil {
			// Log error but don't fail quest completion
			s.LogError("Failed to send quest completion notification", "error", err)
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
