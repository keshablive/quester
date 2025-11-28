package repositories

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/keshablive/quester/internal/framework/repository"
	"github.com/keshablive/quester/internal/framework/utils"
	"github.com/keshablive/quester/internal/models"
	"gorm.io/gorm"
)

// SocialXPRepository handles social XP transaction data access.
// Implements FR-001 to FR-012 for social gamification XP tracking.
type SocialXPRepository struct {
	*repository.GenericRepository[*models.SocialXPTransaction]
	db *gorm.DB
}

// NewSocialXPRepository creates a new social XP repository
func NewSocialXPRepository(db *gorm.DB) *SocialXPRepository {
	ValidateDB(db, "SocialXPRepository")
	return &SocialXPRepository{
		GenericRepository: repository.NewGenericRepository[*models.SocialXPTransaction](db),
		db:                db,
	}
}

// --- SocialXPTransaction Methods ---

// Create creates a new social XP transaction with duplicate check (FR-002)
func (r *SocialXPRepository) Create(ctx context.Context, tx *models.SocialXPTransaction) error {
	if err := tx.Validate(); err != nil {
		return utils.WrapCreateError(err, "social_xp_transaction (validation)")
	}

	tenantCtx := withTenantContext(ctx, tx.TenantID)
	if err := r.GenericRepository.Create(tenantCtx, tx); err != nil {
		return utils.WrapCreateError(err, "social_xp_transaction")
	}
	return nil
}

// FindByID retrieves a social XP transaction by ID
func (r *SocialXPRepository) FindByID(ctx context.Context, tenantID, id uuid.UUID) (*models.SocialXPTransaction, error) {
	var tx models.SocialXPTransaction
	err := r.db.WithContext(ctx).
		Where("tenant_id = ? AND id = ?", tenantID, id).
		First(&tx).Error
	if err != nil {
		return nil, utils.WrapFindError(err, "social_xp_transaction", id.String())
	}
	return &tx, nil
}

// FindByUser retrieves all social XP transactions for a user
func (r *SocialXPRepository) FindByUser(ctx context.Context, tenantID, userID uuid.UUID, limit int) ([]models.SocialXPTransaction, error) {
	var transactions []models.SocialXPTransaction
	query := r.db.WithContext(ctx).
		Where("tenant_id = ? AND user_id = ?", tenantID, userID).
		Order("created_at DESC")

	if limit > 0 {
		query = query.Limit(limit)
	}

	err := query.Find(&transactions).Error
	return transactions, utils.WrapListError(err, "social_xp_transactions")
}

// FindByContent retrieves all XP transactions for a specific content item
func (r *SocialXPRepository) FindByContent(ctx context.Context, tenantID uuid.UUID, contentType string, contentID uuid.UUID) ([]models.SocialXPTransaction, error) {
	var transactions []models.SocialXPTransaction
	err := r.db.WithContext(ctx).
		Where("tenant_id = ? AND content_type = ? AND content_id = ?", tenantID, contentType, contentID).
		Order("created_at DESC").
		Find(&transactions).Error
	return transactions, utils.WrapListError(err, "social_xp_transactions")
}

// CheckDuplicate checks if an XP transaction already exists for this action
// FR-002: Prevent duplicate XP awards for the same action
func (r *SocialXPRepository) CheckDuplicate(ctx context.Context, tenantID, userID uuid.UUID, actionType models.SocialActionType, contentType string, contentID uuid.UUID) (bool, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Model(&models.SocialXPTransaction{}).
		Where("tenant_id = ? AND user_id = ? AND action_type = ? AND content_type = ? AND content_id = ?",
			tenantID, userID, actionType, contentType, contentID).
		Count(&count).Error
	if err != nil {
		return false, utils.WrapListError(err, "social_xp_transactions")
	}
	return count > 0, nil
}

// GetUserXPSum returns total social XP earned by a user
func (r *SocialXPRepository) GetUserXPSum(ctx context.Context, tenantID, userID uuid.UUID) (int, error) {
	var sum struct {
		Total int
	}
	err := r.db.WithContext(ctx).
		Model(&models.SocialXPTransaction{}).
		Select("COALESCE(SUM(xp_amount), 0) as total").
		Where("tenant_id = ? AND user_id = ?", tenantID, userID).
		Scan(&sum).Error
	if err != nil {
		return 0, utils.WrapListError(err, "social_xp_sum")
	}
	return sum.Total, nil
}

// GetUserXPByPeriod returns XP earned in a specific time period
func (r *SocialXPRepository) GetUserXPByPeriod(ctx context.Context, tenantID, userID uuid.UUID, since time.Time) (int, error) {
	var sum struct {
		Total int
	}
	err := r.db.WithContext(ctx).
		Model(&models.SocialXPTransaction{}).
		Select("COALESCE(SUM(xp_amount), 0) as total").
		Where("tenant_id = ? AND user_id = ? AND created_at >= ?", tenantID, userID, since).
		Scan(&sum).Error
	if err != nil {
		return 0, utils.WrapListError(err, "social_xp_sum_period")
	}
	return sum.Total, nil
}

// --- UserSocialStats Methods ---

// GetUserStats retrieves or creates user social stats
func (r *SocialXPRepository) GetUserStats(ctx context.Context, tenantID, userID uuid.UUID) (*models.UserSocialStats, error) {
	var stats models.UserSocialStats
	err := r.db.WithContext(ctx).
		Where("tenant_id = ? AND user_id = ?", tenantID, userID).
		First(&stats).Error

	if err == gorm.ErrRecordNotFound {
		// Create new stats record
		stats = models.UserSocialStats{
			TenantID: tenantID,
			UserID:   userID,
		}
		if err := r.db.WithContext(ctx).Create(&stats).Error; err != nil {
			return nil, utils.WrapCreateError(err, "user_social_stats")
		}
		return &stats, nil
	}
	if err != nil {
		return nil, utils.WrapFindError(err, "user_social_stats", userID.String())
	}
	return &stats, nil
}

// UpdateUserStats updates aggregated user stats after an XP award
func (r *SocialXPRepository) UpdateUserStats(ctx context.Context, tenantID, userID uuid.UUID, actionType models.SocialActionType, xpAmount int) error {
	// Determine which stat column to increment
	statUpdate := map[string]interface{}{
		"total_xp_earned": gorm.Expr("total_xp_earned + ?", xpAmount),
		"updated_at":      time.Now(),
	}

	switch actionType {
	case models.SocialActionPost:
		statUpdate["posts_count"] = gorm.Expr("posts_count + 1")
	case models.SocialActionLike:
		statUpdate["likes_given"] = gorm.Expr("likes_given + 1")
	case models.SocialActionComment:
		statUpdate["comments_count"] = gorm.Expr("comments_count + 1")
	case models.SocialActionFollow:
		statUpdate["follows_count"] = gorm.Expr("follows_count + 1")
	case models.SocialActionShare:
		statUpdate["shares_count"] = gorm.Expr("shares_count + 1")
	}

	result := r.db.WithContext(ctx).
		Model(&models.UserSocialStats{}).
		Where("tenant_id = ? AND user_id = ?", tenantID, userID).
		Updates(statUpdate)

	if result.Error != nil {
		return utils.WrapUpdateError(result.Error, "user_social_stats")
	}

	// If no row updated, create one
	if result.RowsAffected == 0 {
		stats := models.UserSocialStats{
			TenantID:      tenantID,
			UserID:        userID,
			TotalSocialXP: xpAmount,
		}
		switch actionType {
		case models.SocialActionPost:
			stats.PostsCount = 1
		case models.SocialActionLike:
			stats.LikesGivenCount = 1
		case models.SocialActionComment:
			stats.CommentsCount = 1
		case models.SocialActionFollow:
			stats.FollowingCount = 1
		case models.SocialActionShare:
			stats.SharesCount = 1
		}
		return utils.WrapCreateError(r.db.WithContext(ctx).Create(&stats).Error, "user_social_stats")
	}

	return nil
}

// IncrementLikesReceived increments the likes received count for a user (content author)
func (r *SocialXPRepository) IncrementLikesReceived(ctx context.Context, tenantID, userID uuid.UUID) error {
	result := r.db.WithContext(ctx).
		Model(&models.UserSocialStats{}).
		Where("tenant_id = ? AND user_id = ?", tenantID, userID).
		Updates(map[string]interface{}{
			"likes_received_count": gorm.Expr("likes_received_count + 1"),
			"updated_at":           time.Now(),
		})
	return utils.WrapUpdateError(result.Error, "user_social_stats.likes_received_count")
}

// --- Rate Limiting Methods (FR-012) ---

// GetRateLimitStatus retrieves current rate limit status for a user
// The model uses a 1-hour sliding window for all actions combined
func (r *SocialXPRepository) GetRateLimitStatus(ctx context.Context, tenantID, userID uuid.UUID, _ models.SocialActionType) (*models.SocialXPRateLimit, error) {
	var limit models.SocialXPRateLimit
	oneHourAgo := time.Now().Add(-time.Hour)

	err := r.db.WithContext(ctx).
		Where("tenant_id = ? AND user_id = ? AND window_start >= ?",
			tenantID, userID, oneHourAgo).
		First(&limit).Error

	if err == gorm.ErrRecordNotFound {
		return nil, nil // No limit record exists for this hour
	}
	if err != nil {
		return nil, utils.WrapFindError(err, "social_xp_rate_limit", userID.String())
	}
	return &limit, nil
}

// IncrementRateLimit increments or creates rate limit counter
// Uses a 1-hour sliding window (100 actions per hour max)
func (r *SocialXPRepository) IncrementRateLimit(ctx context.Context, tenantID, userID uuid.UUID, _ models.SocialActionType, maxHourly int) (int, error) {
	oneHourAgo := time.Now().Add(-time.Hour)

	// Try to update existing record within the current window
	result := r.db.WithContext(ctx).
		Model(&models.SocialXPRateLimit{}).
		Where("tenant_id = ? AND user_id = ? AND window_start >= ?",
			tenantID, userID, oneHourAgo).
		Updates(map[string]interface{}{
			"action_count": gorm.Expr("action_count + 1"),
		})

	if result.Error != nil {
		return 0, utils.WrapUpdateError(result.Error, "social_xp_rate_limit")
	}

	// If no row updated, create new record
	if result.RowsAffected == 0 {
		limit := models.SocialXPRateLimit{
			TenantID:    tenantID,
			UserID:      userID,
			ActionCount: 1,
			WindowStart: time.Now(),
		}
		if err := r.db.WithContext(ctx).Create(&limit).Error; err != nil {
			return 0, utils.WrapCreateError(err, "social_xp_rate_limit")
		}
		return 1, nil
	}

	// Get updated count
	var limit models.SocialXPRateLimit
	oneHourAgoCheck := time.Now().Add(-time.Hour)
	err := r.db.WithContext(ctx).
		Where("tenant_id = ? AND user_id = ? AND window_start >= ?",
			tenantID, userID, oneHourAgoCheck).
		First(&limit).Error
	if err != nil {
		return 0, utils.WrapFindError(err, "social_xp_rate_limit", userID.String())
	}

	return limit.ActionCount, nil
}

// IsRateLimited checks if user has exceeded hourly limit for actions
func (r *SocialXPRepository) IsRateLimited(ctx context.Context, tenantID, userID uuid.UUID, actionType models.SocialActionType, maxHourly int) (bool, int, error) {
	limit, err := r.GetRateLimitStatus(ctx, tenantID, userID, actionType)
	if err != nil {
		return false, 0, err
	}
	if limit == nil {
		return false, maxHourly, nil // No limit yet, full quota available
	}
	remaining := maxHourly - limit.ActionCount
	if remaining < 0 {
		remaining = 0
	}
	return limit.ActionCount >= maxHourly, remaining, nil
}
