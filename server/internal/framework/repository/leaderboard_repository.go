package repository

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"github.com/keshablive/quester/internal/framework/utils"
	"github.com/keshablive/quester/internal/models"
)

// LeaderboardRepository handles database operations for leaderboards
type LeaderboardRepository struct {
	db *gorm.DB
}

// NewLeaderboardRepository creates a new leaderboard repository
func NewLeaderboardRepository(db *gorm.DB) *LeaderboardRepository {
	ValidateDB(db, "LeaderboardRepository")
	return &LeaderboardRepository{db: db}
}

// Create creates a new leaderboard entry
func (r *LeaderboardRepository) Create(ctx context.Context, leaderboard *models.Leaderboard) error {
	// Validate
	if err := leaderboard.Validate(); err != nil {
		return utils.WrapCreateError(err, "leaderboard (validation)")
	}

	if err := r.db.WithContext(ctx).Create(leaderboard).Error; err != nil {
		return utils.WrapCreateError(err, "leaderboard entry")
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
		return utils.WrapCreateError(err, "leaderboards (bulk upsert)")
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
		return nil, utils.WrapListError(err, "leaderboards by user")
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
		return nil, utils.WrapListError(err, "top N leaderboards")
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
		return nil, utils.WrapFindError(err, "leaderboard", "user position")
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
		return utils.WrapDeleteError(err, "old leaderboard cache")
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
		return 0, utils.WrapCountError(err, "leaderboard users")
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
		return utils.WrapDeleteError(err, "leaderboard by period")
	}

	return nil
}

// Interface-compliant methods below

// FindByID retrieves a leaderboard entry by ID
func (r *LeaderboardRepository) FindByID(ctx context.Context, tenantID uuid.UUID, entryID uuid.UUID) (*models.Leaderboard, error) {
	var entry models.Leaderboard

	err := r.db.WithContext(ctx).
		Where("tenant_id = ? AND id = ?", tenantID, entryID).
		First(&entry).Error

	if err == gorm.ErrRecordNotFound {
		return nil, utils.WrapNotFoundError("leaderboard entry", entryID.String())
	}
	if err != nil {
		return nil, utils.WrapFindError(err, "leaderboard entry", entryID.String())
	}

	return &entry, nil
}

// FindAll retrieves all leaderboard entries for a tenant with pagination
func (r *LeaderboardRepository) FindAll(ctx context.Context, tenantID uuid.UUID, limit, offset int) ([]models.Leaderboard, int64, error) {
	var entries []models.Leaderboard
	var total int64

	// Count total
	if err := r.db.WithContext(ctx).Model(&models.Leaderboard{}).Where("tenant_id = ?", tenantID).Count(&total).Error; err != nil {
		return nil, 0, utils.WrapCountError(err, "leaderboard entries")
	}

	// Get paginated results
	err := r.db.WithContext(ctx).
		Where("tenant_id = ?", tenantID).
		Order("score DESC").
		Limit(limit).
		Offset(offset).
		Find(&entries).Error

	if err != nil {
		return nil, 0, utils.WrapListError(err, "leaderboard entries")
	}

	return entries, total, nil
}

// Update updates an existing leaderboard entry
func (r *LeaderboardRepository) Update(ctx context.Context, entry *models.Leaderboard) error {
	result := r.db.WithContext(ctx).
		Where("tenant_id = ?", entry.TenantID).
		Save(entry)

	if result.Error != nil {
		return utils.WrapUpdateError(result.Error, "leaderboard entry")
	}

	if result.RowsAffected == 0 {
		return utils.WrapNotFoundError("leaderboard entry", fmt.Sprintf("%d", entry.ID))
	}

	return nil
}

// Delete soft-deletes a leaderboard entry by ID
func (r *LeaderboardRepository) Delete(ctx context.Context, tenantID uuid.UUID, entryID uuid.UUID) error {
	result := r.db.WithContext(ctx).
		Where("tenant_id = ? AND id = ?", tenantID, entryID).
		Delete(&models.Leaderboard{})

	if result.Error != nil {
		return utils.WrapDeleteError(result.Error, "leaderboard entry")
	}

	if result.RowsAffected == 0 {
		return utils.WrapNotFoundError("leaderboard entry", entryID.String())
	}

	return nil
}

// GetTopPlayers retrieves the top N players by score
func (r *LeaderboardRepository) GetTopPlayers(ctx context.Context, tenantID uuid.UUID, limit int) ([]models.Leaderboard, error) {
	return r.FindTopN(ctx, tenantID, models.LeaderboardTypeGlobal, "", "", limit)
}

// GetUserRank retrieves the rank of a specific user on the leaderboard
func (r *LeaderboardRepository) GetUserRank(ctx context.Context, tenantID uuid.UUID, userID uuid.UUID) (int64, error) {
	entry, err := r.FindUserPosition(ctx, tenantID, userID, models.LeaderboardTypeGlobal, "", "")
	if err != nil {
		return 0, err
	}
	if entry == nil {
		return 0, utils.WrapNotFoundError("user rank", userID.String())
	}
	return int64(entry.Rank), nil
}

// GetLeaderboardByPeriod retrieves leaderboard entries for a specific period
func (r *LeaderboardRepository) GetLeaderboardByPeriod(ctx context.Context, tenantID uuid.UUID, period string, limit int) ([]models.Leaderboard, error) {
	return r.FindTopN(ctx, tenantID, models.LeaderboardTypeGlobal, period, "", limit)
}

// UpdateUserScore updates or creates a leaderboard entry for a user
func (r *LeaderboardRepository) UpdateUserScore(ctx context.Context, tenantID uuid.UUID, userID uuid.UUID, score int) error {
	entry := models.Leaderboard{
		TenantID:        tenantID,
		UserID:          userID,
		MetricValue:     score,
		LeaderboardType: models.LeaderboardTypeGlobal,
		Period:          models.LeaderboardPeriodAllTime,
		PeriodKey:       "alltime",
	}

	result := r.db.WithContext(ctx).
		Where("tenant_id = ? AND user_id = ? AND leaderboard_type = ?", tenantID, userID, models.LeaderboardTypeGlobal).
		Assign(models.Leaderboard{MetricValue: score}).
		FirstOrCreate(&entry)

	if result.Error != nil {
		return utils.WrapUpdateError(result.Error, "leaderboard entry")
	}

	return nil
}

// GetUserLeaderboardEntry retrieves a user's leaderboard entry
func (r *LeaderboardRepository) GetUserLeaderboardEntry(ctx context.Context, tenantID uuid.UUID, userID uuid.UUID) (*models.Leaderboard, error) {
	var entry models.Leaderboard

	err := r.db.WithContext(ctx).
		Where("tenant_id = ? AND user_id = ? AND leaderboard_type = ?", tenantID, userID, models.LeaderboardTypeGlobal).
		First(&entry).Error

	if err == gorm.ErrRecordNotFound {
		return nil, utils.WrapNotFoundError("user leaderboard entry", userID.String())
	}
	if err != nil {
		return nil, utils.WrapFindError(err, "user leaderboard entry", userID.String())
	}

	return &entry, nil
}

// ResetLeaderboard resets all scores for a specific period
func (r *LeaderboardRepository) ResetLeaderboard(ctx context.Context, tenantID uuid.UUID, period string) error {
	return r.DeleteByPeriod(ctx, tenantID, models.LeaderboardTypeGlobal, period, "")
}
