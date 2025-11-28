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

// LearningLevelRepository handles learning level data access (T021)
// Implements FR-006 for level-based progression system
type LearningLevelRepository struct {
	*repository.GenericRepository[*models.LearningLevel]
	db *gorm.DB
}

// NewLearningLevelRepository creates a new learning level repository
func NewLearningLevelRepository(db *gorm.DB) *LearningLevelRepository {
	ValidateDB(db, "LearningLevelRepository")
	return &LearningLevelRepository{
		GenericRepository: repository.NewGenericRepository[*models.LearningLevel](db),
		db:                db,
	}
}

// GetLevels retrieves all levels for a tenant ordered by level number
func (r *LearningLevelRepository) GetLevels(ctx context.Context, tenantID uuid.UUID) ([]models.LearningLevel, error) {
	var levels []models.LearningLevel
	err := r.db.WithContext(ctx).
		Where("tenant_id = ?", tenantID).
		Order("level_number ASC").
		Find(&levels).Error
	return levels, utils.WrapListError(err, "learning_levels")
}

// GetLevelForXP returns the level for a given XP amount
func (r *LearningLevelRepository) GetLevelForXP(ctx context.Context, tenantID uuid.UUID, xp int) (*models.LearningLevel, error) {
	var level models.LearningLevel
	err := r.db.WithContext(ctx).
		Where("tenant_id = ? AND min_xp <= ? AND (max_xp IS NULL OR max_xp >= ?)", tenantID, xp, xp).
		Order("level_number DESC").
		First(&level).Error

	if err == gorm.ErrRecordNotFound {
		// If no level found, return level 1 by default
		err = r.db.WithContext(ctx).
			Where("tenant_id = ? AND level_number = 1", tenantID).
			First(&level).Error
		if err != nil {
			return nil, utils.WrapFindError(err, "learning_level_default", "1")
		}
	} else if err != nil {
		return nil, utils.WrapFindError(err, "learning_level", "xp")
	}

	return &level, nil
}

// GetLevelByNumber retrieves a specific level by number
func (r *LearningLevelRepository) GetLevelByNumber(ctx context.Context, tenantID uuid.UUID, levelNumber int) (*models.LearningLevel, error) {
	var level models.LearningLevel
	err := r.db.WithContext(ctx).
		Where("tenant_id = ? AND level_number = ?", tenantID, levelNumber).
		First(&level).Error
	if err != nil {
		return nil, utils.WrapFindError(err, "learning_level", string(rune(levelNumber)))
	}
	return &level, nil
}

// GetNextLevel returns the next level after the current one
func (r *LearningLevelRepository) GetNextLevel(ctx context.Context, tenantID uuid.UUID, currentLevelNumber int) (*models.LearningLevel, error) {
	var level models.LearningLevel
	err := r.db.WithContext(ctx).
		Where("tenant_id = ? AND level_number = ?", tenantID, currentLevelNumber+1).
		First(&level).Error
	if err == gorm.ErrRecordNotFound {
		return nil, nil // No next level (at max)
	}
	if err != nil {
		return nil, utils.WrapFindError(err, "learning_level_next", string(rune(currentLevelNumber+1)))
	}
	return &level, nil
}

// CreateDefaultLevels creates default level definitions for a tenant
func (r *LearningLevelRepository) CreateDefaultLevels(ctx context.Context, tenantID uuid.UUID) error {
	levels := models.DefaultLearningLevels(tenantID)

	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		for _, level := range levels {
			if err := tx.Create(&level).Error; err != nil {
				return utils.WrapCreateError(err, "learning_level_default")
			}
		}
		return nil
	})
}

// HasLevels checks if a tenant has any levels configured
func (r *LearningLevelRepository) HasLevels(ctx context.Context, tenantID uuid.UUID) (bool, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Model(&models.LearningLevel{}).
		Where("tenant_id = ?", tenantID).
		Count(&count).Error
	return count > 0, utils.WrapListError(err, "learning_levels_count")
}

// UpdateLevel updates a level definition
func (r *LearningLevelRepository) UpdateLevel(ctx context.Context, level *models.LearningLevel) error {
	level.UpdatedAt = time.Now()
	return utils.WrapUpdateError(r.db.WithContext(ctx).Save(level).Error, "learning_level")
}

// DeleteLevel deletes a level definition (admin only)
func (r *LearningLevelRepository) DeleteLevel(ctx context.Context, tenantID, levelID uuid.UUID) error {
	result := r.db.WithContext(ctx).
		Where("tenant_id = ? AND id = ?", tenantID, levelID).
		Delete(&models.LearningLevel{})
	return utils.WrapDeleteError(result.Error, "learning_level")
}

// GetLevelInfo returns detailed level info for a user's XP
func (r *LearningLevelRepository) GetLevelInfo(ctx context.Context, tenantID uuid.UUID, currentXP int) (*models.LevelInfo, error) {
	level, err := r.GetLevelForXP(ctx, tenantID, currentXP)
	if err != nil {
		return nil, err
	}

	return &models.LevelInfo{
		Level:         level.LevelNumber,
		LevelName:     level.LevelName,
		CurrentXP:     currentXP,
		MinXP:         level.MinXP,
		MaxXP:         level.MaxXP,
		XPToNextLevel: level.XPToNextLevel(currentXP),
		ProgressPct:   level.ProgressInLevel(currentXP),
		ColorHex:      level.ColorHex,
		IconURL:       level.IconURL,
	}, nil
}
