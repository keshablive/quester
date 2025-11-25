package services

import (
	"context"
	"fmt"
	"log"

	"github.com/google/uuid"
	"github.com/yourusername/quester/internal/models"
	"github.com/yourusername/quester/internal/repositories"
	"gorm.io/gorm"
)

// AchievementService handles achievement business logic
type AchievementService struct {
	achievementRepo *repositories.AchievementRepository
	userRepo        *repositories.UserRepository
	db              *gorm.DB
	badgeService    *BadgeService
	notificationSvc *NotificationService
}

// NewAchievementService creates a new achievement service
func NewAchievementService(db *gorm.DB) *AchievementService {
	return &AchievementService{
		achievementRepo: repositories.NewAchievementRepository(db),
		userRepo:        repositories.NewUserRepository(db),
		db:              db,
	}
}

// SetBadgeService injects the BadgeService (optional adapter)
func (s *AchievementService) SetBadgeService(b *BadgeService) {
	s.badgeService = b
}

// SetNotificationService injects the NotificationService (optional)
func (s *AchievementService) SetNotificationService(n *NotificationService) {
	s.notificationSvc = n
}

// GetAchievements retrieves all active achievements for a tenant
func (s *AchievementService) GetAchievements(ctx context.Context, tenantID uuid.UUID, category *models.AchievementCategory) ([]models.Achievement, error) {
	if category != nil {
		return s.achievementRepo.FindByCategory(ctx, tenantID, *category)
	}
	return s.achievementRepo.FindByTenant(ctx, tenantID)
}

// GetAchievement retrieves a specific achievement by ID
func (s *AchievementService) GetAchievement(ctx context.Context, achievementID uuid.UUID) (*models.Achievement, error) {
	return s.achievementRepo.FindByID(ctx, achievementID)
}

// GetUserAchievements retrieves user's achievement progress
func (s *AchievementService) GetUserAchievements(ctx context.Context, userID uuid.UUID, completedOnly bool) ([]models.UserAchievement, error) {
	return s.achievementRepo.FindUserAchievements(ctx, userID, completedOnly)
}

// GetUserAchievementProgress retrieves progress for a specific achievement
func (s *AchievementService) GetUserAchievementProgress(ctx context.Context, userID, achievementID uuid.UUID) (*models.UserAchievement, error) {
	return s.achievementRepo.FindUserAchievement(ctx, userID, achievementID)
}

// GetAchievementStats retrieves achievement statistics for a user
func (s *AchievementService) GetAchievementStats(ctx context.Context, userID uuid.UUID) (map[string]interface{}, error) {
	return s.achievementRepo.GetAchievementStats(ctx, userID)
}

// TrackProgress tracks progress towards an achievement
// This is the main entry point for achievement tracking from other services
func (s *AchievementService) TrackProgress(ctx context.Context, userID uuid.UUID, achievementType models.AchievementType, category models.AchievementCategory, increment int) error {
	// Find matching achievements
	achievements, err := s.achievementRepo.FindByCategory(ctx, uuid.Nil, category) // TODO: Get tenantID from context
	if err != nil {
		return fmt.Errorf("failed to find achievements: %w", err)
	}

	for _, achievement := range achievements {
		if achievement.Type != achievementType {
			continue
		}

		// Get or create user achievement progress
		userAchievement, err := s.achievementRepo.FindOrCreateUserAchievement(ctx, userID, achievement.ID)
		if err != nil {
			log.Printf("Error creating user achievement: %v", err)
			continue
		}

		// Skip if already completed
		if userAchievement.Completed {
			continue
		}

		// Increment progress
		if err := s.achievementRepo.IncrementUserAchievementProgress(ctx, userID, achievement.ID, increment); err != nil {
			log.Printf("Error incrementing progress: %v", err)
			continue
		}

		// Reload to check completion
		userAchievement, err = s.achievementRepo.FindUserAchievement(ctx, userID, achievement.ID)
		if err != nil {
			log.Printf("Error reloading user achievement: %v", err)
			continue
		}

		// Check if achievement should be completed
		if userAchievement.CurrentCount >= achievement.TargetCount && !userAchievement.Completed {
			if err := s.completeAchievement(ctx, userID, achievement.ID); err != nil {
				log.Printf("Error completing achievement: %v", err)
			}
		}
	}

	return nil
}

// TrackLessonCompletion tracks lesson completion achievements
func (s *AchievementService) TrackLessonCompletion(ctx context.Context, userID uuid.UUID) error {
	return s.TrackProgress(ctx, userID, models.AchievementTypeCount, models.AchievementCategoryLearning, 1)
}

// TrackCourseCompletion tracks course completion achievements
func (s *AchievementService) TrackCourseCompletion(ctx context.Context, userID uuid.UUID) error {
	return s.TrackProgress(ctx, userID, models.AchievementTypeMilestone, models.AchievementCategoryLearning, 1)
}

// TrackXPThreshold checks if user has reached XP threshold achievements
func (s *AchievementService) TrackXPThreshold(ctx context.Context, userID uuid.UUID, currentXP int) error {
	// Get user's tenant
	user, err := s.userRepo.FindByID(ctx, userID)
	if err != nil {
		return fmt.Errorf("failed to find user: %w", err)
	}

	// Find XP threshold achievements
	achievements, err := s.achievementRepo.FindByCategory(ctx, user.TenantID, models.AchievementCategoryMilestone)
	if err != nil {
		return fmt.Errorf("failed to find achievements: %w", err)
	}

	for _, achievement := range achievements {
		if achievement.Type != models.AchievementTypeThreshold {
			continue
		}

		// Check if user has reached threshold
		if currentXP >= achievement.TargetCount {
			// Get or create user achievement
			userAchievement, err := s.achievementRepo.FindOrCreateUserAchievement(ctx, userID, achievement.ID)
			if err != nil {
				log.Printf("Error creating user achievement: %v", err)
				continue
			}

			// Complete if not already completed
			if !userAchievement.Completed {
				if err := s.completeAchievement(ctx, userID, achievement.ID); err != nil {
					log.Printf("Error completing achievement: %v", err)
				}
			}
		}
	}

	return nil
}

// TrackStreak tracks streak achievements
func (s *AchievementService) TrackStreak(ctx context.Context, userID uuid.UUID, currentStreak int) error {
	// Get user's tenant
	user, err := s.userRepo.FindByID(ctx, userID)
	if err != nil {
		return fmt.Errorf("failed to find user: %w", err)
	}

	// Find streak achievements
	achievements, err := s.achievementRepo.FindByCategory(ctx, user.TenantID, models.AchievementCategoryStreak)
	if err != nil {
		return fmt.Errorf("failed to find achievements: %w", err)
	}

	for _, achievement := range achievements {
		if achievement.Type != models.AchievementTypeStreak {
			continue
		}

		// Check if user has reached streak threshold
		if currentStreak >= achievement.TargetCount {
			// Get or create user achievement
			userAchievement, err := s.achievementRepo.FindOrCreateUserAchievement(ctx, userID, achievement.ID)
			if err != nil {
				log.Printf("Error creating user achievement: %v", err)
				continue
			}

			// Update progress to match streak
			userAchievement.CurrentCount = currentStreak
			if err := s.achievementRepo.UpdateUserAchievementProgress(ctx, userAchievement); err != nil {
				log.Printf("Error updating progress: %v", err)
				continue
			}

			// Complete if not already completed
			if !userAchievement.Completed && currentStreak >= achievement.TargetCount {
				if err := s.completeAchievement(ctx, userID, achievement.ID); err != nil {
					log.Printf("Error completing achievement: %v", err)
				}
			}
		}
	}

	return nil
}

// completeAchievement marks an achievement as completed and awards rewards
func (s *AchievementService) completeAchievement(ctx context.Context, userID, achievementID uuid.UUID) error {
	// Get achievement details
	achievement, err := s.achievementRepo.FindByID(ctx, achievementID)
	if err != nil {
		return fmt.Errorf("failed to find achievement: %w", err)
	}

	// Mark as completed
	if err := s.achievementRepo.CompleteUserAchievement(ctx, userID, achievementID); err != nil {
		return fmt.Errorf("failed to complete achievement: %w", err)
	}

	// Award XP if specified
	if achievement.XPReward > 0 {
		if err := s.awardXP(ctx, userID, achievement.XPReward); err != nil {
			log.Printf("Failed to award XP for achievement %s: %v", achievement.Name, err)
		} else {
			log.Printf("Achievement completed: user_id=%s, achievement=%s, xp_reward=%d",
				userID, achievement.Name, achievement.XPReward)
		}
	}

	// TODO: Award badge if specified
	if achievement.BadgeID != uuid.Nil {
		log.Printf("Badge award pending: user_id=%s, badge_id=%s", userID, achievement.BadgeID)

		// Create a lightweight mapping record (user_achievement_badges) so we can show a badge earned in the achievements UI
		if err := s.achievementRepo.CreateUserAchievementBadge(ctx, userID, achievementID, achievement.BadgeID); err != nil {
			log.Printf("Failed to persist user achievement badge mapping: %v", err)
		}

		// Try to award badge via BadgeService (now fully UUID-compatible)
		if s.badgeService != nil {
			// Look up user to get tenantID
			user, err := s.userRepo.FindByID(ctx, userID)
			if err != nil {
				log.Printf("Failed to lookup user for badge award: %v", err)
			} else {
				go func(tID, uID, bID uuid.UUID) {
					if err := s.badgeService.AwardBadge(context.Background(), tID, uID, bID); err != nil {
						log.Printf("Failed to auto-award badge: %v", err)
					} else {
						log.Printf("Badge awarded successfully: user=%s, badge=%s", uID, bID)
					}
				}(user.TenantID, userID, achievement.BadgeID)
			}
		}
	}

	// TODO: Send achievement unlock notification
	log.Printf("Achievement unlocked: user_id=%s, achievement=%s", userID, achievement.Name)
	// Future: Call NotificationService.SendAchievementUnlock(ctx, userID, achievement)

	// Send notification via NotificationService if injected
	if s.notificationSvc != nil {
		// Build notification content
		title := "Achievement unlocked 🎉"
		message := fmt.Sprintf("You unlocked '%s' — %s", achievement.Name, achievement.Description)
		actionURL := fmt.Sprintf("/achievements/%s", achievement.ID.String())
		iconURL := achievement.IconURL
		channels := []string{"in_app", "push"}
		metadata := map[string]any{
			"achievement_id":   achievement.ID.String(),
			"achievement_name": achievement.Name,
			"xp_reward":        achievement.XPReward,
		}

		// Fire-and-forget: don't block the completion flow
		go func() {
			if _, err := s.notificationSvc.CreateNotification(context.Background(), achievement.TenantID.String(), userID.String(), models.NotificationTypeBadgeEarned, title, message, actionURL, iconURL, models.NotificationPriorityHigh, channels, metadata); err != nil {
				log.Printf("Failed to send achievement notification: %v", err)
			}
		}()
	}

	return nil
}

// awardXP awards XP to a user (same logic as LessonService)
func (s *AchievementService) awardXP(ctx context.Context, userID uuid.UUID, xp int) error {
	return s.db.WithContext(ctx).
		Model(&models.User{}).
		Where("id = ?", userID).
		UpdateColumn("xp", gorm.Expr("xp + ?", xp)).Error
}

// CreateAchievement creates a new achievement (admin only)
func (s *AchievementService) CreateAchievement(ctx context.Context, achievement *models.Achievement) error {
	return s.achievementRepo.Create(ctx, achievement)
}

// UpdateAchievement updates an achievement (admin only)
func (s *AchievementService) UpdateAchievement(ctx context.Context, achievement *models.Achievement) error {
	return s.achievementRepo.Update(ctx, achievement)
}

// DeleteAchievement soft deletes an achievement (admin only)
func (s *AchievementService) DeleteAchievement(ctx context.Context, achievementID uuid.UUID) error {
	return s.achievementRepo.Delete(ctx, achievementID)
}

// GetRecentUnlocks retrieves recently unlocked achievements for a user
func (s *AchievementService) GetRecentUnlocks(ctx context.Context, userID uuid.UUID, limit int) ([]models.UserAchievement, error) {
	if limit <= 0 {
		limit = 5
	}

	var recentUnlocks []models.UserAchievement
	err := s.db.WithContext(ctx).
		Preload("Achievement").
		Preload("Achievement.Badge").
		Where("user_id = ? AND completed = ?", userID, true).
		Order("completed_at DESC").
		Limit(limit).
		Find(&recentUnlocks).Error

	return recentUnlocks, err
}

// CalculateCompletionRate calculates completion rate for achievement categories
func (s *AchievementService) CalculateCompletionRate(ctx context.Context, userID uuid.UUID) (map[string]float64, error) {
	user, err := s.userRepo.FindByID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to find user: %w", err)
	}

	categories := []models.AchievementCategory{
		models.AchievementCategoryLearning,
		models.AchievementCategorySocial,
		models.AchievementCategoryMastery,
		models.AchievementCategoryExplorer,
		models.AchievementCategoryStreak,
		models.AchievementCategoryMilestone,
	}

	rates := make(map[string]float64)

	for _, category := range categories {
		// Count total achievements in category
		var totalCount int64
		if err := s.db.WithContext(ctx).
			Model(&models.Achievement{}).
			Where("tenant_id = ? AND category = ? AND active = ?", user.TenantID, category, true).
			Count(&totalCount).Error; err != nil {
			return nil, err
		}

		// Count completed achievements in category
		var completedCount int64
		if err := s.db.WithContext(ctx).
			Model(&models.UserAchievement{}).
			Joins("JOIN achievements ON achievements.id = user_achievements.achievement_id").
			Where("user_achievements.user_id = ? AND achievements.category = ? AND user_achievements.completed = ?",
				userID, category, true).
			Count(&completedCount).Error; err != nil {
			return nil, err
		}

		if totalCount > 0 {
			rates[string(category)] = float64(completedCount) / float64(totalCount) * 100
		} else {
			rates[string(category)] = 0
		}
	}

	return rates, nil
}
