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

// LearningXPRepository handles learning XP transaction data access (T019)
// Implements FR-001 to FR-005 for learning gamification XP tracking
type LearningXPRepository struct {
	*repository.GenericRepository[*models.LearningXPTransaction]
	db *gorm.DB
}

// NewLearningXPRepository creates a new learning XP repository
func NewLearningXPRepository(db *gorm.DB) *LearningXPRepository {
	ValidateDB(db, "LearningXPRepository")
	return &LearningXPRepository{
		GenericRepository: repository.NewGenericRepository[*models.LearningXPTransaction](db),
		db:                db,
	}
}

// --- LearningXPTransaction Methods ---

// Create creates a new learning XP transaction with duplicate check (FR-002)
func (r *LearningXPRepository) Create(ctx context.Context, tx *models.LearningXPTransaction) error {
	if err := tx.Validate(); err != nil {
		return utils.WrapCreateError(err, "learning_xp_transaction (validation)")
	}

	tenantCtx := withTenantContext(ctx, tx.TenantID)
	if err := r.GenericRepository.Create(tenantCtx, tx); err != nil {
		return utils.WrapCreateError(err, "learning_xp_transaction")
	}
	return nil
}

// FindByID retrieves a learning XP transaction by ID
func (r *LearningXPRepository) FindByID(ctx context.Context, tenantID, id uuid.UUID) (*models.LearningXPTransaction, error) {
	var tx models.LearningXPTransaction
	err := r.db.WithContext(ctx).
		Where("tenant_id = ? AND id = ?", tenantID, id).
		First(&tx).Error
	if err != nil {
		return nil, utils.WrapFindError(err, "learning_xp_transaction", id.String())
	}
	return &tx, nil
}

// FindByUser retrieves all learning XP transactions for a user with pagination
func (r *LearningXPRepository) FindByUser(ctx context.Context, tenantID, userID uuid.UUID, limit, offset int) ([]models.LearningXPTransaction, int64, error) {
	var transactions []models.LearningXPTransaction
	var total int64

	// Get total count
	err := r.db.WithContext(ctx).
		Model(&models.LearningXPTransaction{}).
		Where("tenant_id = ? AND user_id = ?", tenantID, userID).
		Count(&total).Error
	if err != nil {
		return nil, 0, utils.WrapListError(err, "learning_xp_transactions_count")
	}

	// Get paginated results
	query := r.db.WithContext(ctx).
		Where("tenant_id = ? AND user_id = ?", tenantID, userID).
		Order("created_at DESC")

	if limit > 0 {
		query = query.Limit(limit).Offset(offset)
	}

	err = query.Find(&transactions).Error
	return transactions, total, utils.WrapListError(err, "learning_xp_transactions")
}

// FindByContent retrieves all XP transactions for a specific content item
func (r *LearningXPRepository) FindByContent(ctx context.Context, tenantID uuid.UUID, contentType string, contentID uuid.UUID) ([]models.LearningXPTransaction, error) {
	var transactions []models.LearningXPTransaction
	err := r.db.WithContext(ctx).
		Where("tenant_id = ? AND content_type = ? AND content_id = ?", tenantID, contentType, contentID).
		Order("created_at DESC").
		Find(&transactions).Error
	return transactions, utils.WrapListError(err, "learning_xp_transactions")
}

// CheckDuplicate checks if an XP transaction already exists for this action (FR-002)
func (r *LearningXPRepository) CheckDuplicate(ctx context.Context, tenantID, userID uuid.UUID, actionType models.LearningActionType, contentType string, contentID uuid.UUID) (bool, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Model(&models.LearningXPTransaction{}).
		Where("tenant_id = ? AND user_id = ? AND action_type = ? AND content_type = ? AND content_id = ?",
			tenantID, userID, actionType, contentType, contentID).
		Count(&count).Error
	if err != nil {
		return false, utils.WrapListError(err, "learning_xp_transactions")
	}
	return count > 0, nil
}

// GetUserXPSum returns total learning XP earned by a user
func (r *LearningXPRepository) GetUserXPSum(ctx context.Context, tenantID, userID uuid.UUID) (int, error) {
	var sum struct {
		Total int
	}
	err := r.db.WithContext(ctx).
		Model(&models.LearningXPTransaction{}).
		Select("COALESCE(SUM(xp_amount), 0) as total").
		Where("tenant_id = ? AND user_id = ?", tenantID, userID).
		Scan(&sum).Error
	if err != nil {
		return 0, utils.WrapListError(err, "learning_xp_sum")
	}
	return sum.Total, nil
}

// GetUserXPByPeriod returns XP earned in a specific time period
func (r *LearningXPRepository) GetUserXPByPeriod(ctx context.Context, tenantID, userID uuid.UUID, since time.Time) (int, error) {
	var sum struct {
		Total int
	}
	err := r.db.WithContext(ctx).
		Model(&models.LearningXPTransaction{}).
		Select("COALESCE(SUM(xp_amount), 0) as total").
		Where("tenant_id = ? AND user_id = ? AND created_at >= ?", tenantID, userID, since).
		Scan(&sum).Error
	if err != nil {
		return 0, utils.WrapListError(err, "learning_xp_sum_period")
	}
	return sum.Total, nil
}

// GetLeaderboardByPeriod returns top users by XP for a time period (FR-012)
func (r *LearningXPRepository) GetLeaderboardByPeriod(ctx context.Context, tenantID uuid.UUID, since time.Time, limit int) ([]models.LearningLeaderboardEntry, error) {
	var entries []models.LearningLeaderboardEntry

	query := `
		SELECT 
			u.id as user_id,
			u.username,
			u.avatar,
			COALESCE(SUM(lx.xp_amount), 0) as total_xp,
			u.level
		FROM users u
		LEFT JOIN learning_xp_transactions lx ON u.id = lx.user_id AND lx.tenant_id = ?
	`

	args := []interface{}{tenantID}

	if !since.IsZero() {
		query += " AND lx.created_at >= ?"
		args = append(args, since)
	}

	query += `
		WHERE u.tenant_id = ? AND u.deleted_at IS NULL
		GROUP BY u.id, u.username, u.avatar, u.level
		HAVING COALESCE(SUM(lx.xp_amount), 0) > 0
		ORDER BY total_xp DESC
		LIMIT ?
	`
	args = append(args, tenantID, limit)

	rows, err := r.db.WithContext(ctx).Raw(query, args...).Rows()
	if err != nil {
		return nil, utils.WrapListError(err, "learning_leaderboard")
	}
	defer rows.Close()

	rank := 1
	for rows.Next() {
		var entry models.LearningLeaderboardEntry
		if err := rows.Scan(&entry.UserID, &entry.Username, &entry.Avatar, &entry.TotalXP, &entry.Level); err != nil {
			return nil, utils.WrapListError(err, "learning_leaderboard_scan")
		}
		entry.Rank = rank
		entries = append(entries, entry)
		rank++
	}

	return entries, nil
}

// GetCourseLeaderboard returns top users by XP for a specific course (T059)
func (r *LearningXPRepository) GetCourseLeaderboard(ctx context.Context, tenantID, courseID uuid.UUID, since time.Time, limit int) ([]models.LearningLeaderboardEntry, error) {
	var entries []models.LearningLeaderboardEntry

	query := `
		SELECT 
			u.id as user_id,
			u.username,
			u.avatar,
			COALESCE(SUM(lx.xp_amount), 0) as total_xp,
			u.level
		FROM users u
		INNER JOIN learning_xp_transactions lx ON u.id = lx.user_id AND lx.tenant_id = ?
		WHERE u.tenant_id = ? 
			AND u.deleted_at IS NULL
			AND lx.content_type = 'Lesson'
			AND lx.content_id IN (SELECT id FROM lessons WHERE course_id = ?)
	`

	args := []interface{}{tenantID, tenantID, courseID}

	if !since.IsZero() {
		query += " AND lx.created_at >= ?"
		args = append(args, since)
	}

	query += `
		GROUP BY u.id, u.username, u.avatar, u.level
		HAVING COALESCE(SUM(lx.xp_amount), 0) > 0
		ORDER BY total_xp DESC
		LIMIT ?
	`
	args = append(args, limit)

	rows, err := r.db.WithContext(ctx).Raw(query, args...).Rows()
	if err != nil {
		return nil, utils.WrapListError(err, "course_leaderboard")
	}
	defer rows.Close()

	rank := 1
	for rows.Next() {
		var entry models.LearningLeaderboardEntry
		if err := rows.Scan(&entry.UserID, &entry.Username, &entry.Avatar, &entry.TotalXP, &entry.Level); err != nil {
			return nil, utils.WrapListError(err, "course_leaderboard_scan")
		}
		entry.Rank = rank
		entries = append(entries, entry)
		rank++
	}

	return entries, nil
}

// MarkProcessed marks a transaction as processed (for async queue)
func (r *LearningXPRepository) MarkProcessed(ctx context.Context, tenantID, id uuid.UUID) error {
	now := time.Now()
	err := r.db.WithContext(ctx).
		Model(&models.LearningXPTransaction{}).
		Where("tenant_id = ? AND id = ?", tenantID, id).
		Updates(map[string]interface{}{
			"processed":    true,
			"processed_at": now,
		}).Error
	return utils.WrapUpdateError(err, "learning_xp_transaction")
}

// GetUnprocessed retrieves unprocessed transactions for async processing
func (r *LearningXPRepository) GetUnprocessed(ctx context.Context, limit int) ([]models.LearningXPTransaction, error) {
	var transactions []models.LearningXPTransaction
	err := r.db.WithContext(ctx).
		Where("processed = ?", false).
		Order("created_at ASC").
		Limit(limit).
		Find(&transactions).Error
	return transactions, utils.WrapListError(err, "learning_xp_unprocessed")
}

// --- UserLearningStats Methods ---

// GetUserStats retrieves or creates user learning stats
func (r *LearningXPRepository) GetUserStats(ctx context.Context, tenantID, userID uuid.UUID) (*models.UserLearningStats, error) {
	var stats models.UserLearningStats
	err := r.db.WithContext(ctx).
		Where("tenant_id = ? AND user_id = ?", tenantID, userID).
		First(&stats).Error

	if err == gorm.ErrRecordNotFound {
		// Create new stats record
		stats = models.UserLearningStats{
			TenantID: tenantID,
			UserID:   userID,
		}
		if err := r.db.WithContext(ctx).Create(&stats).Error; err != nil {
			return nil, utils.WrapCreateError(err, "user_learning_stats")
		}
		return &stats, nil
	}
	if err != nil {
		return nil, utils.WrapFindError(err, "user_learning_stats", userID.String())
	}
	return &stats, nil
}

// UpdateUserStats updates user learning stats
func (r *LearningXPRepository) UpdateUserStats(ctx context.Context, stats *models.UserLearningStats) error {
	stats.UpdatedAt = time.Now()
	return r.db.WithContext(ctx).Save(stats).Error
}

// IncrementUserStats increments specific stats fields
func (r *LearningXPRepository) IncrementUserStats(ctx context.Context, tenantID, userID uuid.UUID, xpDelta, lessonsDelta, coursesDelta int) error {
	err := r.db.WithContext(ctx).
		Model(&models.UserLearningStats{}).
		Where("tenant_id = ? AND user_id = ?", tenantID, userID).
		Updates(map[string]interface{}{
			"total_learning_xp": gorm.Expr("total_learning_xp + ?", xpDelta),
			"lessons_completed": gorm.Expr("lessons_completed + ?", lessonsDelta),
			"courses_completed": gorm.Expr("courses_completed + ?", coursesDelta),
			"updated_at":        time.Now(),
		}).Error
	return utils.WrapUpdateError(err, "user_learning_stats")
}
