package repository

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/keshablive/quester/internal/framework/utils"
	"github.com/keshablive/quester/internal/models"
	"gorm.io/gorm"
)

// LearningStreakRepository handles learning streak data access (T020)
// Implements FR-016 to FR-018 for streak tracking with timezone awareness
type LearningStreakRepository struct {
	*GenericRepository[*models.LearningStreak]
	db *gorm.DB
}

// NewLearningStreakRepository creates a new learning streak repository
func NewLearningStreakRepository(db *gorm.DB) *LearningStreakRepository {
	ValidateDB(db, "LearningStreakRepository")
	return &LearningStreakRepository{
		GenericRepository: NewGenericRepository[*models.LearningStreak](db),
		db:                db,
	}
}

// GetOrCreate retrieves or creates a streak record for a user
func (r *LearningStreakRepository) GetOrCreate(ctx context.Context, tenantID, userID uuid.UUID) (*models.LearningStreak, error) {
	var streak models.LearningStreak
	err := r.db.WithContext(ctx).
		Where("tenant_id = ? AND user_id = ?", tenantID, userID).
		First(&streak).Error

	if err == gorm.ErrRecordNotFound {
		// Create new streak record
		now := time.Now()
		streak = models.LearningStreak{
			TenantID:         tenantID,
			UserID:           userID,
			CurrentStreak:    0,
			LongestStreak:    0,
			LastActivityDate: now,
			LastActivityAt:   now,
			GracePeriodUsed:  false,
		}
		if err := r.db.WithContext(ctx).Create(&streak).Error; err != nil {
			return nil, utils.WrapCreateError(err, "learning_streak")
		}
		return &streak, nil
	}
	if err != nil {
		return nil, utils.WrapFindError(err, "learning_streak", userID.String())
	}
	return &streak, nil
}

// Update updates a streak record
func (r *LearningStreakRepository) Update(ctx context.Context, streak *models.LearningStreak) error {
	streak.UpdatedAt = time.Now()
	err := r.db.WithContext(ctx).Save(streak).Error
	return utils.WrapUpdateError(err, "learning_streak")
}

// UpdateStreak updates streak values with proper timezone handling
// Returns true if a milestone was reached
func (r *LearningStreakRepository) UpdateStreak(ctx context.Context, tenantID, userID uuid.UUID, userDate time.Time) (*models.LearningStreak, bool, error) {
	streak, err := r.GetOrCreate(ctx, tenantID, userID)
	if err != nil {
		return nil, false, err
	}

	// Normalize dates to compare just the date portion
	lastDate := streak.LastActivityDate.Truncate(24 * time.Hour)
	currentDate := userDate.Truncate(24 * time.Hour)

	// Calculate days difference
	daysDiff := int(currentDate.Sub(lastDate).Hours() / 24)

	milestoneReached := false

	switch {
	case daysDiff == 0:
		// Same day - no streak update needed
		streak.LastActivityAt = time.Now()
	case daysDiff == 1:
		// Consecutive day - increment streak
		streak.CurrentStreak++
		streak.GracePeriodUsed = false
		if streak.CurrentStreak > streak.LongestStreak {
			streak.LongestStreak = streak.CurrentStreak
		}
		streak.LastActivityDate = currentDate
		streak.LastActivityAt = time.Now()

		// Check if milestone reached
		if _, ok := models.StreakMilestones[streak.CurrentStreak]; ok {
			milestoneReached = true
		}
	case daysDiff == 2 && !streak.GracePeriodUsed:
		// Missed one day but grace period available
		streak.CurrentStreak++
		streak.GracePeriodUsed = true
		if streak.CurrentStreak > streak.LongestStreak {
			streak.LongestStreak = streak.CurrentStreak
		}
		streak.LastActivityDate = currentDate
		streak.LastActivityAt = time.Now()

		// Check if milestone reached
		if _, ok := models.StreakMilestones[streak.CurrentStreak]; ok {
			milestoneReached = true
		}
	default:
		// Streak broken - reset
		streak.CurrentStreak = 1
		streak.GracePeriodUsed = false
		streak.LastActivityDate = currentDate
		streak.LastActivityAt = time.Now()
	}

	if err := r.Update(ctx, streak); err != nil {
		return nil, false, err
	}

	return streak, milestoneReached, nil
}

// ResetStreak resets a user's streak to 0
func (r *LearningStreakRepository) ResetStreak(ctx context.Context, tenantID, userID uuid.UUID) error {
	err := r.db.WithContext(ctx).
		Model(&models.LearningStreak{}).
		Where("tenant_id = ? AND user_id = ?", tenantID, userID).
		Updates(map[string]interface{}{
			"current_streak":    0,
			"grace_period_used": false,
			"updated_at":        time.Now(),
		}).Error
	return utils.WrapUpdateError(err, "learning_streak")
}

// GetExpiredStreaks finds streaks that should be reset (more than 2 days since last activity)
// This should be called by a cron job to reset stale streaks
func (r *LearningStreakRepository) GetExpiredStreaks(ctx context.Context, before time.Time, limit int) ([]models.LearningStreak, error) {
	var streaks []models.LearningStreak
	err := r.db.WithContext(ctx).
		Where("current_streak > 0 AND last_activity_date < ?", before).
		Limit(limit).
		Find(&streaks).Error
	return streaks, utils.WrapListError(err, "learning_streaks_expired")
}

// ResetExpiredStreaks resets all streaks that have expired
func (r *LearningStreakRepository) ResetExpiredStreaks(ctx context.Context, before time.Time) (int64, error) {
	result := r.db.WithContext(ctx).
		Model(&models.LearningStreak{}).
		Where("current_streak > 0 AND last_activity_date < ?", before).
		Updates(map[string]interface{}{
			"current_streak":    0,
			"grace_period_used": false,
			"updated_at":        time.Now(),
		})
	return result.RowsAffected, utils.WrapUpdateError(result.Error, "learning_streaks_expired")
}

// GetTopStreaks returns users with highest streaks for leaderboard
func (r *LearningStreakRepository) GetTopStreaks(ctx context.Context, tenantID uuid.UUID, limit int) ([]models.LearningStreak, error) {
	var streaks []models.LearningStreak
	err := r.db.WithContext(ctx).
		Preload("User").
		Where("tenant_id = ? AND current_streak > 0", tenantID).
		Order("current_streak DESC").
		Limit(limit).
		Find(&streaks).Error
	return streaks, utils.WrapListError(err, "learning_streaks_top")
}

// --- StreakMilestone Methods ---

// CheckMilestoneClaimed checks if a user has already claimed a milestone
func (r *LearningStreakRepository) CheckMilestoneClaimed(ctx context.Context, tenantID, userID uuid.UUID, milestoneDays int) (bool, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Model(&models.LearningStreakMilestone{}).
		Where("tenant_id = ? AND user_id = ? AND milestone_days = ?", tenantID, userID, milestoneDays).
		Count(&count).Error
	if err != nil {
		return false, utils.WrapListError(err, "learning_streak_milestones")
	}
	return count > 0, nil
}

// ClaimMilestone records a milestone claim
func (r *LearningStreakRepository) ClaimMilestone(ctx context.Context, milestone *models.LearningStreakMilestone) error {
	return utils.WrapCreateError(r.db.WithContext(ctx).Create(milestone).Error, "learning_streak_milestone")
}

// GetUserMilestones returns all milestones claimed by a user
func (r *LearningStreakRepository) GetUserMilestones(ctx context.Context, tenantID, userID uuid.UUID) ([]models.LearningStreakMilestone, error) {
	var milestones []models.LearningStreakMilestone
	err := r.db.WithContext(ctx).
		Where("tenant_id = ? AND user_id = ?", tenantID, userID).
		Order("milestone_days ASC").
		Find(&milestones).Error
	return milestones, utils.WrapListError(err, "learning_streak_milestones")
}
