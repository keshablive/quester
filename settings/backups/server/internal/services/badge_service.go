package services

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/yourusername/quester/internal/framework/cache"
	"github.com/yourusername/quester/internal/models"
	"github.com/yourusername/quester/internal/repositories"
)

// BadgeService handles badge award logic
type BadgeService struct {
	badgeRepo           *repositories.BadgeRepository
	redisClient         *cache.PooledRedisClient
	notificationService *NotificationService
}

// NewBadgeService creates a new badge service
func NewBadgeService(badgeRepo *repositories.BadgeRepository, redisClient *cache.PooledRedisClient, notificationService *NotificationService) *BadgeService {
	return &BadgeService{
		badgeRepo:           badgeRepo,
		redisClient:         redisClient,
		notificationService: notificationService,
	}
}

// CheckEligibility checks if user is eligible for any badges and awards them
// Called after significant user actions (quest completion, XP gain, etc.)
func (s *BadgeService) CheckEligibility(ctx context.Context, tenantID, userID uuid.UUID, userStats repositories.UserStats) error {
	// Check Redis cache first (15min TTL)
	cacheKey := fmt.Sprintf("badge:eligible:%s", userID.String())
	cached, err := s.redisClient.Get(ctx, cacheKey)
	if err == nil && cached == "checked" {
		// Recently checked, skip to avoid spam
		return nil
	}

	// Find badges user is eligible for
	eligibleBadges, err := s.badgeRepo.FindEligible(ctx, tenantID, userID, userStats)
	if err != nil {
		return fmt.Errorf("failed to find eligible badges: %w", err)
	}

	// Award each eligible badge
	for _, badge := range eligibleBadges {
		if badge.AutoAward {
			// Auto-award badges with points_threshold < 100
			if err := s.AwardBadge(ctx, tenantID, userID, badge.ID); err != nil {
				// Log error but continue with other badges
				fmt.Printf("Failed to auto-award badge %d to user %d: %v\n", badge.ID, userID, err)
			}
		} else {
			// Queue manual badges for admin approval
			if err := s.QueueForApproval(ctx, tenantID, userID, badge.ID, ""); err != nil {
				fmt.Printf("Failed to queue badge %d for approval: %v\n", badge.ID, err)
			}
		}
	}

	// Set cache to prevent frequent checks (15min TTL)
	if err := s.redisClient.Set(ctx, cacheKey, "checked", 15*time.Minute); err != nil {
		// Non-critical error, just log
		fmt.Printf("Failed to set badge eligibility cache: %v\n", err)
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

	if err := s.badgeRepo.CreateUserBadge(ctx, userBadge); err != nil {
		return fmt.Errorf("failed to award badge: %w", err)
	}

	// Invalidate eligibility cache
	cacheKey := fmt.Sprintf("badge:eligible:%s", userID.String())
	s.redisClient.Del(ctx, cacheKey)

	// Send notification about badge award
	if s.notificationService != nil {
		if err := s.notificationService.SendBadgeAward(ctx, tenantID, userID, badgeID, badge.Name); err != nil {
			// Log error but don't fail badge award
			fmt.Printf("Failed to send badge award notification: %v\n", err)
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

	if err := s.badgeRepo.CreateUserBadge(ctx, userBadge); err != nil {
		return fmt.Errorf("failed to queue badge for approval: %w", err)
	}

	// Send notification to admins about pending badge approval
	if s.notificationService != nil {
		badge, err := s.badgeRepo.FindByID(ctx, tenantID, badgeID)
		if err == nil {
			// Note: SendAdminBadgeApprovalRequest would need to be implemented to notify admins
			// For now, we'll log this - admin notifications are typically handled differently
			fmt.Printf("Badge %s queued for approval by user %d (badge ID: %d)\n", badge.Name, userID, badgeID)
		}
	}

	return nil
}

// ApproveBadge approves a pending badge (admin action)
func (s *BadgeService) ApproveBadge(ctx context.Context, tenantID, userBadgeID, adminID uuid.UUID) error {
	// Find user badge
	userBadge, err := s.badgeRepo.FindUserBadgeByID(ctx, tenantID, userBadgeID)
	if err != nil {
		return fmt.Errorf("user badge not found: %w", err)
	}

	if userBadge.ApprovalStatus != models.ApprovalStatusPending {
		return fmt.Errorf("badge is not pending approval (current status: %s)", userBadge.ApprovalStatus)
	}

	// Approve badge
	userBadge.Approve(adminID)

	if err := s.badgeRepo.UpdateUserBadge(ctx, userBadge); err != nil {
		return fmt.Errorf("failed to approve badge: %w", err)
	}

	// Invalidate eligibility cache
	cacheKey := fmt.Sprintf("badge:eligible:%s", userBadge.UserID)
	s.redisClient.Del(ctx, cacheKey)

	// Send badge approval notification
	if s.notificationService != nil {
		badge, err := s.badgeRepo.FindByID(ctx, tenantID, userBadge.BadgeID)
		if err == nil {
			if err := s.notificationService.SendBadgeAward(ctx, tenantID, userBadge.UserID, userBadge.BadgeID, badge.Name); err != nil {
				fmt.Printf("Failed to send badge approval notification: %v\n", err)
			}
		}
	}

	return nil
}

// RejectBadge rejects a pending badge (admin action)
func (s *BadgeService) RejectBadge(ctx context.Context, tenantID, userBadgeID, adminID uuid.UUID, reason string) error {
	userBadge, err := s.badgeRepo.FindUserBadgeByID(ctx, tenantID, userBadgeID)
	if err != nil {
		return fmt.Errorf("user badge not found: %w", err)
	}

	if userBadge.ApprovalStatus != models.ApprovalStatusPending {
		return fmt.Errorf("badge is not pending approval")
	}

	userBadge.Reject(adminID, reason)

	if err := s.badgeRepo.UpdateUserBadge(ctx, userBadge); err != nil {
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
				fmt.Printf("Failed to send badge rejection notification: %v\n", err)
			}
		}
	}

	return nil
}

// RevokeBadge revokes an approved badge (admin action)
func (s *BadgeService) RevokeBadge(ctx context.Context, tenantID, userBadgeID, adminID uuid.UUID, reason string) error {
	userBadge, err := s.badgeRepo.FindUserBadgeByID(ctx, tenantID, userBadgeID)
	if err != nil {
		return fmt.Errorf("user badge not found: %w", err)
	}

	if userBadge.ApprovalStatus != models.ApprovalStatusApproved {
		return fmt.Errorf("badge is not approved (cannot revoke)")
	}

	userBadge.Revoke(adminID, reason)

	if err := s.badgeRepo.UpdateUserBadge(ctx, userBadge); err != nil {
		return fmt.Errorf("failed to revoke badge: %w", err)
	}

	// Invalidate eligibility cache
	cacheKey := fmt.Sprintf("badge:eligible:%d", userBadge.UserID)
	s.redisClient.Del(ctx, cacheKey)

	return nil
}

// GetBadges retrieves badges with filtering
func (s *BadgeService) GetBadges(ctx context.Context, tenantID uuid.UUID, filters repositories.BadgeFilters) ([]models.Badge, int64, error) {
	return s.badgeRepo.FindAll(ctx, tenantID, filters)
}

// GetUserBadges retrieves user's earned badges
func (s *BadgeService) GetUserBadges(ctx context.Context, tenantID, userID uuid.UUID, statusFilter string) ([]models.UserBadge, error) {
	return s.badgeRepo.FindByUser(ctx, tenantID, userID, statusFilter)
}
