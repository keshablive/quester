package services

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/google/uuid"
	"github.com/keshablive/quester/internal/framework/cache"
	"github.com/keshablive/quester/internal/framework/interfaces"
	"github.com/keshablive/quester/internal/framework/service"
	"github.com/keshablive/quester/internal/models"
	"github.com/keshablive/quester/internal/repositories"
	"gorm.io/gorm"
)

// BadgeService handles badge award logic
type BadgeService struct {
	service.BaseService
	badgeRepo           interfaces.BadgeRepository
	badgeRepoImpl       *repositories.BadgeRepository // Retained for Phase 5 - complex queries (FindEligible, UserBadge operations)
	notificationService *NotificationService
}

// NewBadgeService creates a new badge service
// Note: badgeRepoImpl parameter retained for Phase 5 complex queries - will be removed when QueryBuilder pattern implemented
func NewBadgeService(db *gorm.DB, logger *slog.Logger, badgeRepo interfaces.BadgeRepository, badgeRepoImpl *repositories.BadgeRepository, redisClient *cache.PooledRedisClient, notificationService *NotificationService) *BadgeService {
	return &BadgeService{
		BaseService:         service.NewBaseService(db, logger, redisClient, nil),
		badgeRepo:           badgeRepo,
		badgeRepoImpl:       badgeRepoImpl,
		notificationService: notificationService,
	}
}

// CheckEligibility checks if user is eligible for any badges and awards them
// Called after significant user actions (quest completion, XP gain, etc.)
func (s *BadgeService) CheckEligibility(ctx context.Context, tenantID, userID uuid.UUID, userStats repositories.UserStats) error {
	// Check Redis cache first (15min TTL)
	cacheKey := fmt.Sprintf("badge:eligible:%s", userID.String())
	cached, err := s.GetCache().Get(ctx, cacheKey)
	if err == nil && cached == "checked" {
		// Recently checked, skip to avoid spam
		return nil
	}

	// Find badges user is eligible for
	eligibleBadges, err := s.badgeRepoImpl.FindEligible(ctx, tenantID, userID, userStats)
	if err != nil {
		return fmt.Errorf("failed to find eligible badges: %w", err)
	}

	// Award each eligible badge
	for _, badge := range eligibleBadges {
		if badge.AutoAward {
			// Auto-award badges with points_threshold < 100
			if err := s.AwardBadge(ctx, tenantID, userID, badge.ID); err != nil {
				// Log error but continue with other badges
				s.LogError("Failed to auto-award badge", "badge_id", badge.ID, "user_id", userID, "error", err)
			}
		} else {
			// Queue manual badges for admin approval
			if err := s.QueueForApproval(ctx, tenantID, userID, badge.ID, ""); err != nil {
				s.LogError("Failed to queue badge for approval", "badge_id", badge.ID, "error", err)
			}
		}
	}

	// Set cache to prevent frequent checks (15min TTL)
	if err := s.GetCache().Set(ctx, cacheKey, "checked", 15*time.Minute); err != nil {
		// Non-critical error, just log
		s.LogError("Failed to set badge eligibility cache", "error", err)
	}

	return nil
}

// AwardBadge awards a badge to a user (auto-approved)
// Business rule: Only badges with PointsThreshold < 100 can be auto-awarded
func (s *BadgeService) AwardBadge(ctx context.Context, tenantID, userID, badgeID uuid.UUID) error {
	// Get badge details for notification
	badge, err := s.badgeRepo.FindByID(ctx, tenantID, badgeID)
	if err != nil {
		return fmt.Errorf("failed to find badge: %w", err)
	}

	// Create user badge with auto-approval
	userBadge := &models.UserBadge{
		TenantID:       tenantID,
		UserID:         userID,
		BadgeID:        badgeID,
		ApprovalStatus: models.ApprovalStatusApproved,
		EarnedAt:       time.Now(),
	}

	if err := s.badgeRepoImpl.CreateUserBadge(ctx, userBadge); err != nil {
		return fmt.Errorf("failed to award badge: %w", err)
	}

	// Invalidate eligibility cache
	cacheKey := fmt.Sprintf("badge:eligible:%s", userID.String())
	s.GetCache().Del(ctx, cacheKey)

	// Send notification about badge award
	if s.notificationService != nil {
		if err := s.notificationService.SendBadgeAward(ctx, tenantID, userID, badgeID, badge.Name); err != nil {
			// Log error but don't fail badge award
			s.LogError("Failed to send badge award notification", "error", err)
		}
	}

	return nil
}

// QueueForApproval queues a badge for admin approval
// Business rule: Only badges with PointsThreshold >= 100 can be queued
func (s *BadgeService) QueueForApproval(ctx context.Context, tenantID, userID, badgeID uuid.UUID, evidenceURL string) error {
	// Verify badge exists and requires manual approval
	badge, err := s.badgeRepo.FindByID(ctx, tenantID, badgeID)
	if err != nil {
		return fmt.Errorf("badge not found: %w", err)
	}

	if badge.AutoAward {
		return fmt.Errorf("badge %d is auto-award, use AwardBadge instead", badgeID)
	}

	// Create user badge with pending status
	userBadge := &models.UserBadge{
		TenantID:       tenantID,
		UserID:         userID,
		BadgeID:        badgeID,
		ApprovalStatus: models.ApprovalStatusPending,
		EarnedAt:       time.Now(),
		EvidenceURL:    evidenceURL,
	}

	if err := s.badgeRepoImpl.CreateUserBadge(ctx, userBadge); err != nil {
		return fmt.Errorf("failed to queue badge for approval: %w", err)
	}

	// Send notification to admins about pending badge approval
	if s.notificationService != nil {
		badge, err := s.badgeRepo.FindByID(ctx, tenantID, badgeID)
		if err == nil {
			// Note: SendAdminBadgeApprovalRequest would need to be implemented to notify admins
			// For now, we'll log this - admin notifications are typically handled differently
			s.LogInfo("Badge queued for approval", "badge_name", badge.Name, "user_id", userID, "badge_id", badgeID)
		}
	}

	return nil
}

// ApproveBadge approves a pending badge (admin action)
func (s *BadgeService) ApproveBadge(ctx context.Context, tenantID, userBadgeID, adminID uuid.UUID) error {
	// Find user badge
	userBadge, err := s.badgeRepoImpl.FindUserBadgeByID(ctx, tenantID, userBadgeID)
	if err != nil {
		return fmt.Errorf("user badge not found: %w", err)
	}

	if userBadge.ApprovalStatus != models.ApprovalStatusPending {
		return fmt.Errorf("badge is not pending approval (current status: %s)", userBadge.ApprovalStatus)
	}

	// Approve badge
	userBadge.Approve(adminID)

	if err := s.badgeRepoImpl.UpdateUserBadge(ctx, userBadge); err != nil {
		return fmt.Errorf("failed to approve badge: %w", err)
	}

	// Invalidate eligibility cache
	cacheKey := fmt.Sprintf("badge:eligible:%s", userBadge.UserID)
	s.GetCache().Del(ctx, cacheKey)

	// Send badge approval notification
	if s.notificationService != nil {
		badge, err := s.badgeRepo.FindByID(ctx, tenantID, userBadge.BadgeID)
		if err == nil {
			if err := s.notificationService.SendBadgeAward(ctx, tenantID, userBadge.UserID, userBadge.BadgeID, badge.Name); err != nil {
				s.LogError("Failed to send badge approval notification", "error", err)
			}
		}
	}

	return nil
}

// RejectBadge rejects a pending badge (admin action)
func (s *BadgeService) RejectBadge(ctx context.Context, tenantID, userBadgeID, adminID uuid.UUID, reason string) error {
	userBadge, err := s.badgeRepoImpl.FindUserBadgeByID(ctx, tenantID, userBadgeID)
	if err != nil {
		return fmt.Errorf("user badge not found: %w", err)
	}

	if userBadge.ApprovalStatus != models.ApprovalStatusPending {
		return fmt.Errorf("badge is not pending approval")
	}

	userBadge.Reject(adminID, reason)

	if err := s.badgeRepoImpl.UpdateUserBadge(ctx, userBadge); err != nil {
		return fmt.Errorf("failed to reject badge: %w", err)
	}

	// Send badge rejection notification
	if s.notificationService != nil {
		badge, err := s.badgeRepo.FindByID(ctx, tenantID, userBadge.BadgeID)
		if err == nil {
			if err := s.notificationService.SendBadgeRejectionNotification(
				ctx,
				tenantID,
				userBadge.UserID,
				badge.Name,
				userBadge.BadgeID,
				reason,
			); err != nil {
				s.LogError("Failed to send badge rejection notification", "error", err)
			}
		}
	}

	return nil
}

// RevokeBadge revokes an approved badge (admin action)
func (s *BadgeService) RevokeBadge(ctx context.Context, tenantID, userBadgeID, adminID uuid.UUID, reason string) error {
	userBadge, err := s.badgeRepoImpl.FindUserBadgeByID(ctx, tenantID, userBadgeID)
	if err != nil {
		return fmt.Errorf("user badge not found: %w", err)
	}

	if userBadge.ApprovalStatus != models.ApprovalStatusApproved {
		return fmt.Errorf("badge is not approved (cannot revoke)")
	}

	userBadge.Revoke(adminID, reason)

	if err := s.badgeRepoImpl.UpdateUserBadge(ctx, userBadge); err != nil {
		return fmt.Errorf("failed to revoke badge: %w", err)
	}

	// Invalidate eligibility cache
	cacheKey := fmt.Sprintf("badge:eligible:%s", userBadge.UserID.String())
	s.GetCache().Del(ctx, cacheKey)

	return nil
}

// GetBadges retrieves badges with filtering
func (s *BadgeService) GetBadges(ctx context.Context, tenantID uuid.UUID, filters repositories.BadgeFilters) ([]models.Badge, int64, error) {
	return s.badgeRepoImpl.FindAllPaginated(ctx, tenantID, filters)
}

// GetUserBadges retrieves user's earned badges
func (s *BadgeService) GetUserBadges(ctx context.Context, tenantID, userID uuid.UUID, statusFilter string) ([]models.UserBadge, error) {
	return s.badgeRepoImpl.FindByUser(ctx, tenantID, userID, statusFilter)
}
