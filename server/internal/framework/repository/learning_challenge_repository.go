package repository

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/keshablive/quester/internal/framework/utils"
	"github.com/keshablive/quester/internal/models"
	"gorm.io/gorm"
)

// LearningChallengeRepository handles learning challenge data access (T022)
// Implements FR-023 to FR-025 for daily challenge tracking
type LearningChallengeRepository struct {
	*GenericRepository[*models.LearningChallengeTemplate]
	db *gorm.DB
}

// NewLearningChallengeRepository creates a new learning challenge repository
func NewLearningChallengeRepository(db *gorm.DB) *LearningChallengeRepository {
	ValidateDB(db, "LearningChallengeRepository")
	return &LearningChallengeRepository{
		GenericRepository: NewGenericRepository[*models.LearningChallengeTemplate](db),
		db:                db,
	}
}

// --- Challenge Template Methods ---

// GetActiveTemplates retrieves all active challenge templates for a tenant
func (r *LearningChallengeRepository) GetActiveTemplates(ctx context.Context, tenantID uuid.UUID) ([]models.LearningChallengeTemplate, error) {
	var templates []models.LearningChallengeTemplate
	err := r.db.WithContext(ctx).
		Where("tenant_id = ? AND is_active = ?", tenantID, true).
		Find(&templates).Error
	return templates, utils.WrapListError(err, "learning_challenge_templates")
}

// GetRandomTemplates retrieves N random active templates for challenge generation
func (r *LearningChallengeRepository) GetRandomTemplates(ctx context.Context, tenantID uuid.UUID, count int) ([]models.LearningChallengeTemplate, error) {
	var templates []models.LearningChallengeTemplate
	err := r.db.WithContext(ctx).
		Where("tenant_id = ? AND is_active = ?", tenantID, true).
		Order("RANDOM()").
		Limit(count).
		Find(&templates).Error
	return templates, utils.WrapListError(err, "learning_challenge_templates_random")
}

// GetTemplateByID retrieves a specific template
func (r *LearningChallengeRepository) GetTemplateByID(ctx context.Context, tenantID, templateID uuid.UUID) (*models.LearningChallengeTemplate, error) {
	var template models.LearningChallengeTemplate
	err := r.db.WithContext(ctx).
		Where("tenant_id = ? AND id = ?", tenantID, templateID).
		First(&template).Error
	if err != nil {
		return nil, utils.WrapFindError(err, "learning_challenge_template", templateID.String())
	}
	return &template, nil
}

// CreateTemplate creates a new challenge template
func (r *LearningChallengeRepository) CreateTemplate(ctx context.Context, template *models.LearningChallengeTemplate) error {
	if err := template.Validate(); err != nil {
		return utils.WrapCreateError(err, "learning_challenge_template (validation)")
	}
	return utils.WrapCreateError(r.db.WithContext(ctx).Create(template).Error, "learning_challenge_template")
}

// UpdateTemplate updates a challenge template
func (r *LearningChallengeRepository) UpdateTemplate(ctx context.Context, template *models.LearningChallengeTemplate) error {
	template.UpdatedAt = time.Now()
	return utils.WrapUpdateError(r.db.WithContext(ctx).Save(template).Error, "learning_challenge_template")
}

// CreateDefaultTemplates creates default challenge templates for a tenant
func (r *LearningChallengeRepository) CreateDefaultTemplates(ctx context.Context, tenantID uuid.UUID) error {
	templates := models.DefaultChallengeTemplates(tenantID)

	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		for _, template := range templates {
			if err := tx.Create(&template).Error; err != nil {
				return utils.WrapCreateError(err, "learning_challenge_template_default")
			}
		}
		return nil
	})
}

// HasTemplates checks if a tenant has any challenge templates
func (r *LearningChallengeRepository) HasTemplates(ctx context.Context, tenantID uuid.UUID) (bool, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Model(&models.LearningChallengeTemplate{}).
		Where("tenant_id = ?", tenantID).
		Count(&count).Error
	return count > 0, utils.WrapListError(err, "learning_challenge_templates_count")
}

// --- User Challenge Methods ---

// GetUserChallengesForDate retrieves user challenges for a specific date
func (r *LearningChallengeRepository) GetUserChallengesForDate(ctx context.Context, tenantID, userID uuid.UUID, date time.Time) ([]models.UserLearningChallenge, error) {
	var challenges []models.UserLearningChallenge
	dateOnly := date.Truncate(24 * time.Hour)
	err := r.db.WithContext(ctx).
		Preload("Template").
		Where("tenant_id = ? AND user_id = ? AND challenge_date = ?", tenantID, userID, dateOnly).
		Find(&challenges).Error
	return challenges, utils.WrapListError(err, "user_learning_challenges")
}

// GetActiveUserChallenges retrieves active challenges for a user
func (r *LearningChallengeRepository) GetActiveUserChallenges(ctx context.Context, tenantID, userID uuid.UUID) ([]models.UserLearningChallenge, error) {
	var challenges []models.UserLearningChallenge
	err := r.db.WithContext(ctx).
		Preload("Template").
		Where("tenant_id = ? AND user_id = ? AND status = ?", tenantID, userID, models.ChallengeStatusActive).
		Find(&challenges).Error
	return challenges, utils.WrapListError(err, "user_learning_challenges_active")
}

// CreateUserChallenge creates a new user challenge
func (r *LearningChallengeRepository) CreateUserChallenge(ctx context.Context, challenge *models.UserLearningChallenge) error {
	return utils.WrapCreateError(r.db.WithContext(ctx).Create(challenge).Error, "user_learning_challenge")
}

// UpdateUserChallenge updates a user challenge
func (r *LearningChallengeRepository) UpdateUserChallenge(ctx context.Context, challenge *models.UserLearningChallenge) error {
	challenge.UpdatedAt = time.Now()
	return utils.WrapUpdateError(r.db.WithContext(ctx).Save(challenge).Error, "user_learning_challenge")
}

// IncrementChallengeProgress increments challenge progress and checks for completion
func (r *LearningChallengeRepository) IncrementChallengeProgress(ctx context.Context, challengeID uuid.UUID, increment int) (*models.UserLearningChallenge, bool, error) {
	var challenge models.UserLearningChallenge

	err := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Lock the row for update
		if err := tx.Set("gorm:query_option", "FOR UPDATE").
			Preload("Template").
			First(&challenge, "id = ?", challengeID).Error; err != nil {
			return err
		}

		// Check if already completed
		if challenge.Status != models.ChallengeStatusActive {
			return nil
		}

		// Increment progress
		challenge.CurrentProgress += increment
		challenge.UpdatedAt = time.Now()

		// Check if completed
		if challenge.CurrentProgress >= challenge.TargetValue {
			challenge.Status = models.ChallengeStatusCompleted
			now := time.Now()
			challenge.CompletedAt = &now
			challenge.XPAwarded = &challenge.Template.XPReward
		}

		return tx.Save(&challenge).Error
	})

	if err != nil {
		return nil, false, utils.WrapUpdateError(err, "user_learning_challenge_progress")
	}

	completed := challenge.Status == models.ChallengeStatusCompleted
	return &challenge, completed, nil
}

// ExpireUserChallenges marks challenges as expired
func (r *LearningChallengeRepository) ExpireUserChallenges(ctx context.Context, before time.Time) (int64, error) {
	result := r.db.WithContext(ctx).
		Model(&models.UserLearningChallenge{}).
		Where("status = ? AND expires_at < ?", models.ChallengeStatusActive, before).
		Updates(map[string]interface{}{
			"status":     models.ChallengeStatusExpired,
			"updated_at": time.Now(),
		})
	return result.RowsAffected, utils.WrapUpdateError(result.Error, "user_learning_challenges_expire")
}

// DeleteExpiredChallenges removes old expired challenges (cleanup)
func (r *LearningChallengeRepository) DeleteExpiredChallenges(ctx context.Context, olderThan time.Time) (int64, error) {
	result := r.db.WithContext(ctx).
		Where("status = ? AND expires_at < ?", models.ChallengeStatusExpired, olderThan).
		Delete(&models.UserLearningChallenge{})
	return result.RowsAffected, utils.WrapDeleteError(result.Error, "user_learning_challenges_cleanup")
}

// GetChallengesByType gets active challenges of a specific type for progress updates
func (r *LearningChallengeRepository) GetChallengesByType(ctx context.Context, tenantID, userID uuid.UUID, challengeType models.ChallengeType) ([]models.UserLearningChallenge, error) {
	var challenges []models.UserLearningChallenge
	err := r.db.WithContext(ctx).
		Joins("JOIN learning_challenge_templates ON user_learning_challenges.template_id = learning_challenge_templates.id").
		Where("user_learning_challenges.tenant_id = ? AND user_learning_challenges.user_id = ? AND user_learning_challenges.status = ? AND learning_challenge_templates.challenge_type = ?",
			tenantID, userID, models.ChallengeStatusActive, challengeType).
		Preload("Template").
		Find(&challenges).Error
	return challenges, utils.WrapListError(err, "user_learning_challenges_by_type")
}

// CountCompletedChallenges returns total completed challenges for a user
func (r *LearningChallengeRepository) CountCompletedChallenges(ctx context.Context, tenantID, userID uuid.UUID) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Model(&models.UserLearningChallenge{}).
		Where("tenant_id = ? AND user_id = ? AND status = ?", tenantID, userID, models.ChallengeStatusCompleted).
		Count(&count).Error
	return count, utils.WrapListError(err, "user_learning_challenges_completed_count")
}
