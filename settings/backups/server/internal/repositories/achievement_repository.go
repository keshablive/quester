package repositories

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/yourusername/quester/internal/models"
	"gorm.io/gorm"
)

// AchievementRepository handles achievement data access
type AchievementRepository struct {
	db *gorm.DB
}

// NewAchievementRepository creates a new achievement repository
func NewAchievementRepository(db *gorm.DB) *AchievementRepository {
	return &AchievementRepository{db: db}
}

// Create creates a new achievement
func (r *AchievementRepository) Create(ctx context.Context, achievement *models.Achievement) error {
	if err := achievement.Validate(); err != nil {
		return fmt.Errorf("validation failed: %w", err)
	}
	return r.db.WithContext(ctx).Create(achievement).Error
}

// FindByID retrieves an achievement by ID
func (r *AchievementRepository) FindByID(ctx context.Context, id uuid.UUID) (*models.Achievement, error) {
	var achievement models.Achievement
	err := r.db.WithContext(ctx).
		Preload("Badge").
		Preload("AchievementSteps", func(db *gorm.DB) *gorm.DB {
			return db.Order("sort_order ASC")
		}).
		First(&achievement, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &achievement, nil
}

// FindByTenant retrieves all achievements for a tenant
func (r *AchievementRepository) FindByTenant(ctx context.Context, tenantID uuid.UUID) ([]models.Achievement, error) {
	var achievements []models.Achievement
	err := r.db.WithContext(ctx).
		Where("tenant_id = ? AND active = ?", tenantID, true).
		Preload("Badge").
		Order("sort_order ASC, created_at ASC").
		Find(&achievements).Error
	return achievements, err
}

// FindByCategory retrieves achievements by category
func (r *AchievementRepository) FindByCategory(ctx context.Context, tenantID uuid.UUID, category models.AchievementCategory) ([]models.Achievement, error) {
	var achievements []models.Achievement
	err := r.db.WithContext(ctx).
		Where("tenant_id = ? AND category = ? AND active = ?", tenantID, category, true).
		Preload("Badge").
		Order("sort_order ASC, created_at ASC").
		Find(&achievements).Error
	return achievements, err
}

// Update updates an achievement
func (r *AchievementRepository) Update(ctx context.Context, achievement *models.Achievement) error {
	if err := achievement.Validate(); err != nil {
		return fmt.Errorf("validation failed: %w", err)
	}
	return r.db.WithContext(ctx).Save(achievement).Error
}

// Delete soft deletes an achievement (sets active = false)
func (r *AchievementRepository) Delete(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).
		Model(&models.Achievement{}).
		Where("id = ?", id).
		Update("active", false).Error
}

// --- User Achievement Progress Methods ---

// CreateUserAchievement initializes user progress for an achievement
func (r *AchievementRepository) CreateUserAchievement(ctx context.Context, userAchievement *models.UserAchievement) error {
	return r.db.WithContext(ctx).Create(userAchievement).Error
}

// FindUserAchievement retrieves user progress for a specific achievement
func (r *AchievementRepository) FindUserAchievement(ctx context.Context, userID, achievementID uuid.UUID) (*models.UserAchievement, error) {
	var userAchievement models.UserAchievement
	err := r.db.WithContext(ctx).
		Preload("Achievement").
		Preload("Achievement.Badge").
		Preload("Achievement.AchievementSteps", func(db *gorm.DB) *gorm.DB {
			return db.Order("sort_order ASC")
		}).
		Preload("StepProgress").
		Where("user_id = ? AND achievement_id = ?", userID, achievementID).
		First(&userAchievement).Error
	if err != nil {
		return nil, err
	}
	return &userAchievement, nil
}

// FindUserAchievements retrieves all user achievement progress
func (r *AchievementRepository) FindUserAchievements(ctx context.Context, userID uuid.UUID, completedOnly bool) ([]models.UserAchievement, error) {
	query := r.db.WithContext(ctx).
		Preload("Achievement").
		Preload("Achievement.Badge").
		Where("user_id = ?", userID)

	if completedOnly {
		query = query.Where("completed = ?", true)
	}

	var userAchievements []models.UserAchievement
	err := query.Order("updated_at DESC").Find(&userAchievements).Error
	return userAchievements, err
}

// FindOrCreateUserAchievement finds existing or creates new user achievement progress
func (r *AchievementRepository) FindOrCreateUserAchievement(ctx context.Context, userID, achievementID uuid.UUID) (*models.UserAchievement, error) {
	userAchievement, err := r.FindUserAchievement(ctx, userID, achievementID)
	if err == nil {
		return userAchievement, nil
	}
	if err != gorm.ErrRecordNotFound {
		return nil, err
	}

	// Get achievement to set tenant_id
	achievement, err := r.FindByID(ctx, achievementID)
	if err != nil {
		return nil, fmt.Errorf("achievement not found: %w", err)
	}

	// Create new user achievement
	userAchievement = &models.UserAchievement{
		TenantID:      achievement.TenantID,
		UserID:        userID,
		AchievementID: achievementID,
		CurrentCount:  0,
		Completed:     false,
	}

	if err := r.CreateUserAchievement(ctx, userAchievement); err != nil {
		return nil, err
	}

	// Reload with relationships
	return r.FindUserAchievement(ctx, userID, achievementID)
}

// UpdateUserAchievementProgress updates user progress for an achievement
func (r *AchievementRepository) UpdateUserAchievementProgress(ctx context.Context, userAchievement *models.UserAchievement) error {
	return r.db.WithContext(ctx).Save(userAchievement).Error
}

// IncrementUserAchievementProgress atomically increments achievement progress
func (r *AchievementRepository) IncrementUserAchievementProgress(ctx context.Context, userID, achievementID uuid.UUID, increment int) error {
	now := gorm.Expr("CURRENT_TIMESTAMP")

	return r.db.WithContext(ctx).
		Model(&models.UserAchievement{}).
		Where("user_id = ? AND achievement_id = ?", userID, achievementID).
		Updates(map[string]interface{}{
			"current_count":     gorm.Expr("current_count + ?", increment),
			"last_progress_at":  now,
			"first_progress_at": gorm.Expr("COALESCE(first_progress_at, ?)", now),
		}).Error
}

// CompleteUserAchievement marks an achievement as completed
func (r *AchievementRepository) CompleteUserAchievement(ctx context.Context, userID, achievementID uuid.UUID) error {
	now := gorm.Expr("CURRENT_TIMESTAMP")

	return r.db.WithContext(ctx).
		Model(&models.UserAchievement{}).
		Where("user_id = ? AND achievement_id = ? AND completed = ?", userID, achievementID, false).
		Updates(map[string]interface{}{
			"completed":        true,
			"completed_at":     now,
			"last_progress_at": now,
		}).Error
}

// --- Achievement Step Progress Methods ---

// UpdateStepProgress updates or creates step progress
func (r *AchievementRepository) UpdateStepProgress(ctx context.Context, userAchievementID, stepID uuid.UUID, completed bool) error {
	updates := map[string]interface{}{
		"completed": completed,
	}

	if completed {
		updates["completed_at"] = gorm.Expr("CURRENT_TIMESTAMP")
	}

	return r.db.WithContext(ctx).
		Model(&models.UserAchievementStepProgress{}).
		Where("user_achievement_id = ? AND achievement_step_id = ?", userAchievementID, stepID).
		Updates(updates).Error
}

// GetAchievementStats retrieves achievement statistics for a user
func (r *AchievementRepository) GetAchievementStats(ctx context.Context, userID uuid.UUID) (map[string]interface{}, error) {
	var stats struct {
		TotalAchievements      int64
		CompletedAchievements  int64
		InProgressAchievements int64
		TotalXPEarned          int
	}

	// Count total achievements available to user (active)
	if err := r.db.WithContext(ctx).
		Model(&models.Achievement{}).
		Where("active = ?", true).
		Count(&stats.TotalAchievements).Error; err != nil {
		return nil, err
	}

	// Count completed achievements
	if err := r.db.WithContext(ctx).
		Model(&models.UserAchievement{}).
		Where("user_id = ? AND completed = ?", userID, true).
		Count(&stats.CompletedAchievements).Error; err != nil {
		return nil, err
	}

	// Count in-progress achievements
	if err := r.db.WithContext(ctx).
		Model(&models.UserAchievement{}).
		Where("user_id = ? AND completed = ? AND current_count > 0", userID, false).
		Count(&stats.InProgressAchievements).Error; err != nil {
		return nil, err
	}

	// Calculate total XP earned from achievements
	if err := r.db.WithContext(ctx).
		Model(&models.UserAchievement{}).
		Select("COALESCE(SUM(achievements.xp_reward), 0) as total_xp_earned").
		Joins("JOIN achievements ON achievements.id = user_achievements.achievement_id").
		Where("user_achievements.user_id = ? AND user_achievements.completed = ?", userID, true).
		Scan(&stats.TotalXPEarned).Error; err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"total_achievements":       stats.TotalAchievements,
		"completed_achievements":   stats.CompletedAchievements,
		"in_progress_achievements": stats.InProgressAchievements,
		"completion_rate":          float64(stats.CompletedAchievements) / float64(stats.TotalAchievements) * 100,
		"total_xp_earned":          stats.TotalXPEarned,
	}, nil
}

// CreateUserAchievementBadge persists a UUID-based badge award tied to an achievement
func (r *AchievementRepository) CreateUserAchievementBadge(ctx context.Context, userID, achievementID, badgeID uuid.UUID) error {
	rec := &models.UserAchievementBadge{
		TenantID:      uuid.Nil, // will be set via DB trigger/foreign key if needed; keep nil-safe
		UserID:        userID,
		AchievementID: achievementID,
		BadgeID:       badgeID,
	}

	// Try to set TenantID by loading achievement (best-effort)
	if a, err := r.FindByID(ctx, achievementID); err == nil {
		rec.TenantID = a.TenantID
	}

	return r.db.WithContext(ctx).Create(rec).Error
}
