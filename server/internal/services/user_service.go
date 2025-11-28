// User business logic
package services

import (
	"context"
	"errors"
	"fmt"

	"github.com/keshablive/quester/internal/models"
	"github.com/keshablive/quester/internal/repositories"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// UserService handles user-related business logic
type UserService struct {
	userRepo           *repositories.UserRepository
	leaderboardService *LeaderboardService
	db                 *gorm.DB
	cacheService       *CacheService // 007-api-performance-caching T022
}

// NewUserService creates a new user service
func NewUserService(
	userRepo *repositories.UserRepository,
	leaderboardService *LeaderboardService,
	db *gorm.DB,
) *UserService {
	return &UserService{
		userRepo:           userRepo,
		leaderboardService: leaderboardService,
		db:                 db,
	}
}

// NewUserServiceWithCache creates a new user service with caching support (007-api-performance-caching T022)
func NewUserServiceWithCache(
	userRepo *repositories.UserRepository,
	leaderboardService *LeaderboardService,
	db *gorm.DB,
	cacheService *CacheService,
) *UserService {
	return &UserService{
		userRepo:           userRepo,
		leaderboardService: leaderboardService,
		db:                 db,
		cacheService:       cacheService,
	}
}

// GetUserByID retrieves a user by ID with caching (007-api-performance-caching T022)
func (s *UserService) GetUserByID(ctx context.Context, tenantID, userID uuid.UUID) (*models.User, error) {
	// Try cache first if available
	if s.cacheService != nil {
		if cached, found, err := s.cacheService.GetUser(ctx, tenantID, userID); err == nil && found {
			return cached, nil
		}
		// On cache miss or error, fall through to database
	}

	user, err := s.userRepo.FindByID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	// Cache the result
	if s.cacheService != nil && user.TenantID != uuid.Nil {
		_ = s.cacheService.SetUser(ctx, user.TenantID, user)
	}

	return user, nil
}

// GetUsersByIDs retrieves multiple users by IDs with caching (007-api-performance-caching T022)
func (s *UserService) GetUsersByIDs(ctx context.Context, tenantID uuid.UUID, userIDs []uuid.UUID) (map[uuid.UUID]*models.User, error) {
	// Try cache first if available
	if s.cacheService != nil {
		cachedUsers, err := s.cacheService.GetUsers(ctx, tenantID, userIDs)
		if err == nil && len(cachedUsers) == len(userIDs) {
			return cachedUsers, nil
		}
		// If partial hit or error, fall through to database
	}

	// Fetch all from database
	users, err := s.userRepo.FindByIDs(ctx, tenantID, userIDs)
	if err != nil {
		return nil, fmt.Errorf("failed to get users: %w", err)
	}

	// Build result map and cache each user
	result := make(map[uuid.UUID]*models.User, len(users))
	for i := range users {
		user := &users[i]
		result[user.ID] = user
		// Cache each user
		if s.cacheService != nil {
			_ = s.cacheService.SetUser(ctx, tenantID, user)
		}
	}

	return result, nil
}

// AddXP adds experience points to a user and updates leaderboards
// This is the primary method for XP changes - updates both user record and all leaderboards
// (007-api-performance-caching T023 - cache invalidation on update)
func (s *UserService) AddXP(ctx context.Context, tenantID, userID int64, xpAmount int) error {
	if xpAmount <= 0 {
		return fmt.Errorf("xp amount must be positive")
	}

	// Start transaction to ensure atomicity
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Get current user (with row lock)
		var user models.User
		if err := tx.Where("id = ? AND tenant_id = ?", userID, tenantID).
			Clauses(clause.Locking{Strength: "UPDATE"}).
			First(&user).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return fmt.Errorf("user not found: %d", userID)
			}
			return fmt.Errorf("failed to get user: %w", err)
		}

		// Calculate new XP and level
		oldXP := user.XP
		newXP := oldXP + xpAmount

		// Simple level calculation: 1 level per 1000 XP
		newLevel := newXP / 1000
		if newLevel < 1 {
			newLevel = 1
		}

		// Update user XP and level
		if err := tx.Model(&user).Updates(map[string]interface{}{
			"xp":    newXP,
			"level": newLevel,
		}).Error; err != nil {
			return fmt.Errorf("failed to update user XP: %w", err)
		}

		// Parse IDs to UUID for leaderboard service
		tenantUUID := uuid.MustParse(fmt.Sprintf("%016x-0000-0000-0000-000000000000", tenantID))
		userUUID := uuid.MustParse(fmt.Sprintf("%016x-0000-0000-0000-000000000000", userID))

		// Invalidate user cache after XP update (007-api-performance-caching T023)
		if s.cacheService != nil {
			_ = s.cacheService.InvalidateUser(ctx, tenantUUID, userUUID)
		}

		// Update global all-time and monthly leaderboards
		if err := s.leaderboardService.UpdateRank(
			ctx,
			tenantUUID,
			userUUID,
			models.LeaderboardTypeGlobal,
			"",
			newXP,
		); err != nil {
			// Log error but don't fail the transaction
			fmt.Printf("Warning: Failed to update global leaderboard for user %d: %v\n", userID, err)
		}

		return nil
	})

	return err
}

// T106-T107: Legacy GetUserByID and GetUserByEmail functions removed
// These functions bypassed the repository pattern and used global database.DB
// Callers should use UserRepository.FindByID() and FindByEmail() instead
