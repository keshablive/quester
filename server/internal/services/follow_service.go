package services

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"

	"github.com/keshablive/quester/internal/models"
	"github.com/keshablive/quester/internal/repositories"
)

// FollowService handles follow-related business logic
type FollowService struct {
	followRepo   *repositories.FollowRepository
	activityRepo *repositories.ActivityRepository
	notifService *NotificationService
}

// NewFollowService creates a new FollowService
func NewFollowService(
	followRepo *repositories.FollowRepository,
	activityRepo *repositories.ActivityRepository,
	notifService *NotificationService,
) *FollowService {
	return &FollowService{
		followRepo:   followRepo,
		activityRepo: activityRepo,
		notifService: notifService,
	}
}

// FollowUser creates a follow relationship between two users
func (s *FollowService) FollowUser(ctx context.Context, followerID, followingID, tenantID uuid.UUID) error {
	// Prevent self-follow
	if followerID == followingID {
		return errors.New("cannot follow yourself")
	}

	// Check if already following
	isFollowing, err := s.followRepo.IsFollowing(ctx, followerID, followingID, tenantID)
	if err != nil {
		return err
	}
	if isFollowing {
		return errors.New("already following this user")
	}

	// Create follow relationship
	follow := &models.Follow{
		ID:          uuid.New(),
		TenantID:    tenantID,
		FollowerID:  followerID,
		FollowingID: followingID,
		CreatedAt:   time.Now(),
	}

	if err := s.followRepo.Create(ctx, follow); err != nil {
		return err
	}

	// Create activity entry
	activity := &models.Activity{
		ID:           uuid.New(),
		TenantID:     tenantID,
		UserID:       followerID,
		ActivityType: models.ActivityUserFollowed,
		EntityType:   "user",
		EntityID:     followingID,
		CreatedAt:    time.Now(),
	}
	_ = s.activityRepo.Create(ctx, activity) // Log error but don't fail

	// Send notification to followed user
	go s.notifService.SendFollowNotification(context.Background(), followerID, followingID, tenantID)

	return nil
}

// UnfollowUser removes a follow relationship
func (s *FollowService) UnfollowUser(ctx context.Context, followerID, followingID, tenantID uuid.UUID) error {
	// Check if following
	isFollowing, err := s.followRepo.IsFollowing(ctx, followerID, followingID, tenantID)
	if err != nil {
		return err
	}
	if !isFollowing {
		return errors.New("not following this user")
	}

	// Delete follow relationship
	if err := s.followRepo.Delete(ctx, followerID, followingID, tenantID); err != nil {
		return err
	}

	// Delete activity entry
	_ = s.activityRepo.DeleteByEntity(ctx, "user", followingID, tenantID)

	return nil
}

// IsFollowing checks if a user is following another user
func (s *FollowService) IsFollowing(ctx context.Context, followerID, followingID, tenantID uuid.UUID) (bool, error) {
	return s.followRepo.IsFollowing(ctx, followerID, followingID, tenantID)
}

// GetFollowers gets users who follow the specified user
func (s *FollowService) GetFollowers(ctx context.Context, userID, tenantID uuid.UUID, page, limit int) ([]models.User, int64, error) {
	return s.followRepo.GetFollowers(ctx, userID, tenantID, page, limit)
}

// GetFollowing gets users that the specified user follows
func (s *FollowService) GetFollowing(ctx context.Context, userID, tenantID uuid.UUID, page, limit int) ([]models.User, int64, error) {
	return s.followRepo.GetFollowing(ctx, userID, tenantID, page, limit)
}

// GetFollowerCount gets the count of followers for a user
func (s *FollowService) GetFollowerCount(ctx context.Context, userID, tenantID uuid.UUID) (int64, error) {
	return s.followRepo.GetFollowerCount(ctx, userID, tenantID)
}

// GetFollowingCount gets the count of users that a user follows
func (s *FollowService) GetFollowingCount(ctx context.Context, userID, tenantID uuid.UUID) (int64, error) {
	return s.followRepo.GetFollowingCount(ctx, userID, tenantID)
}

// GetMutualFollowers gets users who mutually follow each other
func (s *FollowService) GetMutualFollowers(ctx context.Context, userID, tenantID uuid.UUID, page, limit int) ([]models.User, int64, error) {
	return s.followRepo.GetMutualFollowers(ctx, userID, tenantID, page, limit)
}

// GetFollowStats gets follow statistics for a user
func (s *FollowService) GetFollowStats(ctx context.Context, userID, tenantID uuid.UUID) (map[string]int64, error) {
	followerCount, err := s.followRepo.GetFollowerCount(ctx, userID, tenantID)
	if err != nil {
		return nil, err
	}

	followingCount, err := s.followRepo.GetFollowingCount(ctx, userID, tenantID)
	if err != nil {
		return nil, err
	}

	return map[string]int64{
		"followers": followerCount,
		"following": followingCount,
	}, nil
}
