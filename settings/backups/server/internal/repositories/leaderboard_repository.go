package repositories

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"github.com/yourusername/quester/internal/models"
)

// LeaderboardRepository handles database operations for leaderboards
type LeaderboardRepository struct {
	db *gorm.DB
}

// NewLeaderboardRepository creates a new leaderboard repository
func NewLeaderboardRepository(db *gorm.DB) *LeaderboardRepository {
	return &LeaderboardRepository{db: db}
}

// Create creates a new leaderboard entry
func (r *LeaderboardRepository) Create(ctx context.Context, leaderboard *models.Leaderboard) error {
	// Validate
	if err := leaderboard.Validate(); err != nil {
		return fmt.Errorf("leaderboard validation failed: %w", err)
	}

	if err := r.db.WithContext(ctx).Create(leaderboard).Error; err != nil {
		return fmt.Errorf("failed to create leaderboard entry: %w", err)
	}
	return nil
}

// BulkUpsert inserts or updates multiple leaderboard entries
// Uses UPSERT to handle duplicates efficiently
func (r *LeaderboardRepository) BulkUpsert(ctx context.Context, leaderboards []models.Leaderboard) error {
	if len(leaderboards) == 0 {
		return nil
	}

	// Use UPSERT with ON CONFLICT clause
	// Update rank, metric_value, and cached_at if entry already exists
	err := r.db.WithContext(ctx).Clauses(clause.OnConflict{
		Columns: []clause.Column{
			{Name: "tenant_id"},
			{Name: "user_id"},
			{Name: "leaderboard_type"},
			{Name: "period_key"},
			{Name: "category"},
		},
		DoUpdates: clause.AssignmentColumns([]string{
			"rank",
			"metric_value",
			"cached_at",
			"updated_at",
		}),
	}).CreateInBatches(leaderboards, 100).Error

	if err != nil {
		return fmt.Errorf("failed to bulk upsert leaderboards: %w", err)
	}

	return nil
}

// FindByUserID retrieves all leaderboard entries for a user
func (r *LeaderboardRepository) FindByUserID(
	ctx context.Context,
	tenantID uuid.UUID,
	userID uuid.UUID,
) ([]models.Leaderboard, error) {
	var leaderboards []models.Leaderboard
	err := r.db.WithContext(ctx).
		Where("tenant_id = ? AND user_id = ?", tenantID, userID).
		Order("rank ASC").
		Find(&leaderboards).Error

	if err != nil {
		return nil, fmt.Errorf("failed to find leaderboards for user: %w", err)
	}

	return leaderboards, nil
}

// FindTopN retrieves the top N users from a leaderboard
func (r *LeaderboardRepository) FindTopN(
	ctx context.Context,
	tenantID uuid.UUID,
	leaderboardType models.LeaderboardType,
	periodKey string,
	category string,
	limit int,
) ([]models.Leaderboard, error) {
	query := r.db.WithContext(ctx).
		Where("tenant_id = ? AND leaderboard_type = ? AND period_key = ?",
			tenantID, leaderboardType, periodKey)

	// Add category filter for category leaderboards
	if leaderboardType == models.LeaderboardTypeCategory {
		query = query.Where("category = ?", category)
	}

	var leaderboards []models.Leaderboard
	err := query.
		Order("rank ASC").
		Limit(limit).
		Preload("User"). // Load user data
		Find(&leaderboards).Error

	if err != nil {
		return nil, fmt.Errorf("failed to find top N leaderboards: %w", err)
	}

	return leaderboards, nil
}

// FindUserPosition retrieves a user's position in a specific leaderboard
func (r *LeaderboardRepository) FindUserPosition(
	ctx context.Context,
	tenantID uuid.UUID,
	userID uuid.UUID,
	leaderboardType models.LeaderboardType,
	periodKey string,
	category string,
) (*models.Leaderboard, error) {
	query := r.db.WithContext(ctx).
		Where("tenant_id = ? AND user_id = ? AND leaderboard_type = ? AND period_key = ?",
			tenantID, userID, leaderboardType, periodKey)

	// Add category filter for category leaderboards
	if leaderboardType == models.LeaderboardTypeCategory {
		query = query.Where("category = ?", category)
	}

	var leaderboard models.Leaderboard
	err := query.First(&leaderboard).Error

	if err == gorm.ErrRecordNotFound {
		// User not in leaderboard
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to find user position: %w", err)
	}

	return &leaderboard, nil
}

// DeleteOldCache deletes leaderboard entries older than the specified time
// Used for cleanup of stale cached data
func (r *LeaderboardRepository) DeleteOldCache(ctx context.Context, olderThan int64) error {
	err := r.db.WithContext(ctx).
		Where("cached_at < ?", olderThan).
		Delete(&models.Leaderboard{}).Error

	if err != nil {
		return fmt.Errorf("failed to delete old cache: %w", err)
	}

	return nil
}

// GetTotalUsers returns the total number of users in a leaderboard
func (r *LeaderboardRepository) GetTotalUsers(
	ctx context.Context,
	tenantID uuid.UUID,
	leaderboardType models.LeaderboardType,
	periodKey string,
	category string,
) (int64, error) {
	query := r.db.WithContext(ctx).Model(&models.Leaderboard{}).
		Where("tenant_id = ? AND leaderboard_type = ? AND period_key = ?",
			tenantID, leaderboardType, periodKey)

	// Add category filter for category leaderboards
	if leaderboardType == models.LeaderboardTypeCategory {
		query = query.Where("category = ?", category)
	}

	var count int64
	err := query.Count(&count).Error
	if err != nil {
		return 0, fmt.Errorf("failed to count total users: %w", err)
	}

	return count, nil
}

// DeleteByPeriod deletes all leaderboard entries for a specific period
// Used when resetting monthly leaderboards
func (r *LeaderboardRepository) DeleteByPeriod(
	ctx context.Context,
	tenantID uuid.UUID,
	leaderboardType models.LeaderboardType,
	periodKey string,
	category string,
) error {
	query := r.db.WithContext(ctx).
		Where("tenant_id = ? AND leaderboard_type = ? AND period_key = ?",
			tenantID, leaderboardType, periodKey)

	// Add category filter for category leaderboards
	if leaderboardType == models.LeaderboardTypeCategory {
		query = query.Where("category = ?", category)
	}

	err := query.Delete(&models.Leaderboard{}).Error
	if err != nil {
		return fmt.Errorf("failed to delete leaderboard by period: %w", err)
	}

	return nil
}
