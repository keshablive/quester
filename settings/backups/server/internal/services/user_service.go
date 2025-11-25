// User business logic
package services

import (
	"context"
	"errors"
	"fmt"

	"github.com/yourusername/quester/internal/framework/database"
	"github.com/yourusername/quester/internal/models"
	"github.com/yourusername/quester/internal/repositories"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// UserService handles user-related business logic
type UserService struct {
	userRepo           *repositories.UserRepository
	leaderboardService *LeaderboardService
	db                 *gorm.DB
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

// AddXP adds experience points to a user and updates leaderboards
// This is the primary method for XP changes - updates both user record and all leaderboards
func (s *UserService) AddXP(ctx context.Context, tenantID, userID int64, xpAmount int) error {
	if xpAmount <= 0 {
		return fmt.Errorf("xp amount must be positive")
	}

	// Start transaction to ensure atomicity
	return s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
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
}

// GetUserByID retrieves a user by their ID
func GetUserByID(userID uuid.UUID, user *models.User) error {
	if err := database.DB.Where("id = ?", userID).First(user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("user not found")
		}
		return err
	}
	return nil
}

// GetUserByEmail retrieves a user by their email
func GetUserByEmail(email string, user *models.User) error {
	if err := database.DB.Where("email = ?", email).First(user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("user not found")
		}
		return err
	}
	return nil
}
