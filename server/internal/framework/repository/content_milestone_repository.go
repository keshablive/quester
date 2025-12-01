package repository

import (
	"context"
	"strings"

	"github.com/google/uuid"
	"github.com/keshablive/quester/internal/framework/utils"
	"github.com/keshablive/quester/internal/models"
	"gorm.io/gorm"
)

// ContentMilestoneRepository handles content milestone data access.
// Implements FR-009 for content creator engagement milestones.
type ContentMilestoneRepository struct {
	*GenericRepository[*models.ContentMilestone]
	db *gorm.DB
}

// NewContentMilestoneRepository creates a new content milestone repository
func NewContentMilestoneRepository(db *gorm.DB) *ContentMilestoneRepository {
	ValidateDB(db, "ContentMilestoneRepository")
	return &ContentMilestoneRepository{
		GenericRepository: NewGenericRepository[*models.ContentMilestone](db),
		db:                db,
	}
}

// Create creates a new content milestone record
func (r *ContentMilestoneRepository) Create(ctx context.Context, milestone *models.ContentMilestone) error {
	if err := milestone.Validate(); err != nil {
		return utils.WrapCreateError(err, "content_milestone (validation)")
	}
	tenantCtx := withTenantContext(ctx, milestone.TenantID)
	return utils.WrapCreateError(r.GenericRepository.Create(tenantCtx, milestone), "content_milestone")
}

// FindByID retrieves a content milestone by ID
func (r *ContentMilestoneRepository) FindByID(ctx context.Context, tenantID, id uuid.UUID) (*models.ContentMilestone, error) {
	var milestone models.ContentMilestone
	err := r.db.WithContext(ctx).
		Where("tenant_id = ? AND id = ?", tenantID, id).
		First(&milestone).Error
	if err != nil {
		return nil, utils.WrapFindError(err, "content_milestone", id.String())
	}
	return &milestone, nil
}

// FindByContent retrieves all milestones for a specific content item
func (r *ContentMilestoneRepository) FindByContent(ctx context.Context, tenantID uuid.UUID, contentType string, contentID uuid.UUID) ([]models.ContentMilestone, error) {
	var milestones []models.ContentMilestone
	err := r.db.WithContext(ctx).
		Where("tenant_id = ? AND content_type = ? AND content_id = ?", tenantID, contentType, contentID).
		Order("threshold ASC").
		Find(&milestones).Error
	return milestones, utils.WrapListError(err, "content_milestones")
}

// FindByAuthor retrieves all milestones earned by a content author
func (r *ContentMilestoneRepository) FindByAuthor(ctx context.Context, tenantID, authorID uuid.UUID) ([]models.ContentMilestone, error) {
	var milestones []models.ContentMilestone
	err := r.db.WithContext(ctx).
		Where("tenant_id = ? AND author_id = ?", tenantID, authorID).
		Order("created_at DESC").
		Find(&milestones).Error
	return milestones, utils.WrapListError(err, "content_milestones")
}

// GetAwardedMilestones returns milestone types already awarded for a content item
func (r *ContentMilestoneRepository) GetAwardedMilestones(ctx context.Context, tenantID uuid.UUID, contentType string, contentID uuid.UUID) ([]models.MilestoneType, error) {
	var milestones []models.ContentMilestone
	err := r.db.WithContext(ctx).
		Select("milestone_type").
		Where("tenant_id = ? AND content_type = ? AND content_id = ?", tenantID, contentType, contentID).
		Find(&milestones).Error
	if err != nil {
		return nil, utils.WrapListError(err, "content_milestones")
	}

	types := make([]models.MilestoneType, len(milestones))
	for i, m := range milestones {
		types[i] = m.MilestoneType
	}
	return types, nil
}

// HasMilestone checks if a specific milestone has been awarded for content
func (r *ContentMilestoneRepository) HasMilestone(ctx context.Context, tenantID uuid.UUID, contentType string, contentID uuid.UUID, milestoneType models.MilestoneType) (bool, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Model(&models.ContentMilestone{}).
		Where("tenant_id = ? AND content_type = ? AND content_id = ? AND milestone_type = ?",
			tenantID, contentType, contentID, milestoneType).
		Count(&count).Error
	if err != nil {
		return false, utils.WrapListError(err, "content_milestone")
	}
	return count > 0, nil
}

// GetAuthorMilestoneStats returns milestone statistics for an author
func (r *ContentMilestoneRepository) GetAuthorMilestoneStats(ctx context.Context, tenantID, authorID uuid.UUID) (*AuthorMilestoneStats, error) {
	var stats AuthorMilestoneStats

	// Count by milestone type
	var results []struct {
		MilestoneType models.MilestoneType
		Count         int
		TotalXP       int
	}

	err := r.db.WithContext(ctx).
		Model(&models.ContentMilestone{}).
		Select("milestone_type, COUNT(*) as count, SUM(xp_bonus) as total_xp").
		Where("tenant_id = ? AND author_id = ?", tenantID, authorID).
		Group("milestone_type").
		Scan(&results).Error
	if err != nil {
		return nil, utils.WrapListError(err, "content_milestone_stats")
	}

	for _, r := range results {
		switch r.MilestoneType {
		case models.MilestoneTrending:
			stats.TrendingCount = r.Count
		case models.MilestoneViral:
			stats.ViralCount = r.Count
		case models.MilestoneLegendary:
			stats.LegendaryCount = r.Count
		}
		stats.TotalMilestones += r.Count
		stats.TotalXPEarned += r.TotalXP
	}

	return &stats, nil
}

// AuthorMilestoneStats holds aggregated milestone statistics for an author
type AuthorMilestoneStats struct {
	TrendingCount   int `json:"trending_count"`
	ViralCount      int `json:"viral_count"`
	LegendaryCount  int `json:"legendary_count"`
	TotalMilestones int `json:"total_milestones"`
	TotalXPEarned   int `json:"total_xp_earned"`
}

// CheckAndAwardMilestones checks if new milestones should be awarded based on like count
// FR-009: Award bonuses at 10, 50, 100+ likes
func (r *ContentMilestoneRepository) CheckAndAwardMilestones(ctx context.Context, tenantID uuid.UUID, contentType string, contentID, authorID uuid.UUID, currentLikes int) ([]models.ContentMilestone, error) {
	// Get already awarded milestones
	awarded, err := r.GetAwardedMilestones(ctx, tenantID, contentType, contentID)
	if err != nil {
		return nil, err
	}

	// Determine which new milestones to award
	var newMilestones []models.ContentMilestone
	milestoneTypes := []models.MilestoneType{models.MilestoneTrending, models.MilestoneViral, models.MilestoneLegendary}

	for _, mt := range milestoneTypes {
		// Skip if already awarded
		alreadyAwarded := false
		for _, a := range awarded {
			if a == mt {
				alreadyAwarded = true
				break
			}
		}
		if alreadyAwarded {
			continue
		}

		// Check if threshold is met
		if currentLikes >= mt.Threshold() {
			milestone := models.ContentMilestone{
				TenantID:      tenantID,
				ContentType:   contentType,
				ContentID:     contentID,
				AuthorID:      authorID,
				MilestoneType: mt,
				Threshold:     mt.Threshold(),
				XPBonus:       mt.XPBonus(),
			}
			if err := r.db.WithContext(ctx).Create(&milestone).Error; err != nil {
				// Could be unique constraint violation if concurrent request
				if !isContentMilestoneUniqueError(err) {
					return nil, utils.WrapCreateError(err, "content_milestone")
				}
				continue // Skip this milestone, already awarded
			}
			newMilestones = append(newMilestones, milestone)
		}
	}

	return newMilestones, nil
}

// isContentMilestoneUniqueError checks if the error is a unique constraint violation
func isContentMilestoneUniqueError(err error) bool {
	if err == nil {
		return false
	}
	errStr := err.Error()
	return strings.Contains(errStr, "unique constraint") ||
		strings.Contains(errStr, "duplicate key") ||
		strings.Contains(errStr, "UNIQUE constraint failed") ||
		strings.Contains(errStr, "violates unique constraint")
}
