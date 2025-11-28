package repositories

import (
	"context"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/keshablive/quester/internal/framework/repository"
	"github.com/keshablive/quester/internal/framework/utils"
	"github.com/keshablive/quester/internal/models"
	"gorm.io/gorm"
)

// DailyChallengeRepository handles daily challenge data access.
// Works with DailyChallengeTemplate (admin-defined) and UserDailyChallenge (user progress).
// Implements FR-005, FR-006, FR-010 for daily challenges and perfect day bonuses.
type DailyChallengeRepository struct {
	*repository.GenericRepository[*models.UserDailyChallenge]
	db *gorm.DB
}

// NewDailyChallengeRepository creates a new daily challenge repository
func NewDailyChallengeRepository(db *gorm.DB) *DailyChallengeRepository {
	ValidateDB(db, "DailyChallengeRepository")
	return &DailyChallengeRepository{
		GenericRepository: repository.NewGenericRepository[*models.UserDailyChallenge](db),
		db:                db,
	}
}

// --- DailyChallengeTemplate Methods ---

// CreateTemplate creates a new daily challenge template
func (r *DailyChallengeRepository) CreateTemplate(ctx context.Context, template *models.DailyChallengeTemplate) error {
	if err := template.Validate(); err != nil {
		return utils.WrapCreateError(err, "daily_challenge_template (validation)")
	}
	return utils.WrapCreateError(r.db.WithContext(ctx).Create(template).Error, "daily_challenge_template")
}

// GetActiveTemplates retrieves all active templates for a tenant
func (r *DailyChallengeRepository) GetActiveTemplates(ctx context.Context, tenantID uuid.UUID) ([]models.DailyChallengeTemplate, error) {
	var templates []models.DailyChallengeTemplate
	err := r.db.WithContext(ctx).
		Where("tenant_id = ? AND active = ?", tenantID, true).
		Order("sort_order ASC, created_at ASC").
		Find(&templates).Error
	return templates, utils.WrapListError(err, "daily_challenge_templates")
}

// GetTemplateByID retrieves a specific template by ID
func (r *DailyChallengeRepository) GetTemplateByID(ctx context.Context, tenantID, templateID uuid.UUID) (*models.DailyChallengeTemplate, error) {
	var template models.DailyChallengeTemplate
	err := r.db.WithContext(ctx).
		Where("tenant_id = ? AND id = ?", tenantID, templateID).
		First(&template).Error
	if err != nil {
		return nil, utils.WrapFindError(err, "daily_challenge_template", templateID.String())
	}
	return &template, nil
}

// UpdateTemplate updates an existing template
func (r *DailyChallengeRepository) UpdateTemplate(ctx context.Context, template *models.DailyChallengeTemplate) error {
	if err := template.Validate(); err != nil {
		return utils.WrapUpdateError(err, "daily_challenge_template (validation)")
	}
	return utils.WrapUpdateError(r.db.WithContext(ctx).Save(template).Error, "daily_challenge_template")
}

// DeactivateTemplate deactivates a template (soft delete)
func (r *DailyChallengeRepository) DeactivateTemplate(ctx context.Context, tenantID, templateID uuid.UUID) error {
	return utils.WrapUpdateError(r.db.WithContext(ctx).
		Model(&models.DailyChallengeTemplate{}).
		Where("tenant_id = ? AND id = ?", tenantID, templateID).
		Update("active", false).Error, "daily_challenge_template")
}

// --- UserDailyChallenge Methods ---

// GetUserChallengeByTemplateAndDate retrieves user progress for a specific template on a specific date
func (r *DailyChallengeRepository) GetUserChallengeByTemplateAndDate(ctx context.Context, tenantID, userID, templateID uuid.UUID, date time.Time) (*models.UserDailyChallenge, error) {
	challengeDate := date.Truncate(24 * time.Hour)
	var progress models.UserDailyChallenge
	err := r.db.WithContext(ctx).
		Where("tenant_id = ? AND user_id = ? AND challenge_template_id = ? AND challenge_date = ?",
			tenantID, userID, templateID, challengeDate).
		Preload("ChallengeTemplate").
		First(&progress).Error
	if err == gorm.ErrRecordNotFound {
		return nil, nil // No progress yet
	}
	if err != nil {
		return nil, utils.WrapFindError(err, "user_daily_challenge", userID.String())
	}
	return &progress, nil
}

// GetUserTodaysChallenges retrieves all of user's challenges for today
func (r *DailyChallengeRepository) GetUserTodaysChallenges(ctx context.Context, tenantID, userID uuid.UUID) ([]models.UserDailyChallenge, error) {
	today := time.Now().UTC().Truncate(24 * time.Hour)

	var challenges []models.UserDailyChallenge
	err := r.db.WithContext(ctx).
		Where("tenant_id = ? AND user_id = ? AND challenge_date = ?", tenantID, userID, today).
		Preload("ChallengeTemplate").
		Order("created_at ASC").
		Find(&challenges).Error
	return challenges, utils.WrapListError(err, "user_daily_challenges")
}

// GetOrCreateUserDailyChallenges gets existing challenges or creates new ones from templates
// FR-010: Generate daily social challenges that reset at midnight in user's local timezone
func (r *DailyChallengeRepository) GetOrCreateUserDailyChallenges(ctx context.Context, tenantID, userID uuid.UUID) ([]models.UserDailyChallenge, error) {
	today := time.Now().UTC().Truncate(24 * time.Hour)
	expiresAt := today.Add(24 * time.Hour)

	// Check if user already has challenges for today
	existingChallenges, err := r.GetUserTodaysChallenges(ctx, tenantID, userID)
	if err != nil {
		return nil, err
	}
	if len(existingChallenges) > 0 {
		return existingChallenges, nil
	}

	// Get active templates
	templates, err := r.GetActiveTemplates(ctx, tenantID)
	if err != nil {
		return nil, err
	}

	// Create user challenges from templates
	var challenges []models.UserDailyChallenge
	for _, t := range templates {
		challenge := models.UserDailyChallenge{
			TenantID:            tenantID,
			UserID:              userID,
			ChallengeTemplateID: t.ID,
			CurrentCount:        0,
			TargetCount:         t.TargetCount,
			Completed:           false,
			XPReward:            t.XPReward,
			XPAwarded:           false,
			ChallengeDate:       today,
			ExpiresAt:           expiresAt,
		}
		if err := r.db.WithContext(ctx).Create(&challenge).Error; err != nil {
			// If unique constraint violation, skip (concurrent creation)
			if isUniqueConstraintError(err) {
				continue
			}
			return nil, utils.WrapCreateError(err, "user_daily_challenge")
		}
		challenge.ChallengeTemplate = t
		challenges = append(challenges, challenge)
	}

	// If no new challenges created, fetch existing (race condition)
	if len(challenges) == 0 {
		return r.GetUserTodaysChallenges(ctx, tenantID, userID)
	}

	return challenges, nil
}

// IncrementChallengeProgress increments user progress on matching challenges
// FR-005: Progress daily challenges automatically based on user actions
func (r *DailyChallengeRepository) IncrementChallengeProgress(ctx context.Context, tenantID, userID uuid.UUID, actionType models.ChallengeActionType) ([]models.UserDailyChallenge, error) {
	today := time.Now().UTC().Truncate(24 * time.Hour)

	// Find uncompleted challenges for this action type
	var challenges []models.UserDailyChallenge
	err := r.db.WithContext(ctx).
		Joins("JOIN daily_challenge_templates ON daily_challenge_templates.id = user_daily_challenges.challenge_template_id").
		Where("user_daily_challenges.tenant_id = ? AND user_daily_challenges.user_id = ?", tenantID, userID).
		Where("user_daily_challenges.challenge_date = ?", today).
		Where("user_daily_challenges.completed = ?", false).
		Where("daily_challenge_templates.action_type = ? OR daily_challenge_templates.action_type = ?", actionType, models.ChallengeActionAny).
		Preload("ChallengeTemplate").
		Find(&challenges).Error
	if err != nil {
		return nil, utils.WrapListError(err, "user_daily_challenges")
	}

	// Increment progress for each matching challenge
	var completedChallenges []models.UserDailyChallenge
	for i := range challenges {
		ch := &challenges[i]
		wasCompleted := ch.IncrementProgress(1)

		updates := map[string]interface{}{
			"current_count": ch.CurrentCount,
			"updated_at":    time.Now(),
		}
		if wasCompleted {
			updates["completed"] = true
			updates["completed_at"] = ch.CompletedAt
		}

		err = r.db.WithContext(ctx).
			Model(&models.UserDailyChallenge{}).
			Where("id = ?", ch.ID).
			Updates(updates).Error
		if err != nil {
			return nil, utils.WrapUpdateError(err, "user_daily_challenge")
		}

		if wasCompleted {
			completedChallenges = append(completedChallenges, *ch)
		}
	}

	return completedChallenges, nil
}

// MarkChallengeXPAwarded marks a challenge as having awarded XP
func (r *DailyChallengeRepository) MarkChallengeXPAwarded(ctx context.Context, challengeID uuid.UUID) error {
	return utils.WrapUpdateError(r.db.WithContext(ctx).
		Model(&models.UserDailyChallenge{}).
		Where("id = ?", challengeID).
		Updates(map[string]interface{}{
			"xp_awarded": true,
			"updated_at": time.Now(),
		}).Error, "user_daily_challenge")
}

// CountCompletedTodaysChallenges counts completed challenges for today
func (r *DailyChallengeRepository) CountCompletedTodaysChallenges(ctx context.Context, tenantID, userID uuid.UUID) (int64, int64, error) {
	today := time.Now().UTC().Truncate(24 * time.Hour)

	var totalCount, completedCount int64

	// Count total challenges for today
	err := r.db.WithContext(ctx).
		Model(&models.UserDailyChallenge{}).
		Where("tenant_id = ? AND user_id = ? AND challenge_date = ?", tenantID, userID, today).
		Count(&totalCount).Error
	if err != nil {
		return 0, 0, utils.WrapListError(err, "user_daily_challenges_count")
	}

	// Count completed
	err = r.db.WithContext(ctx).
		Model(&models.UserDailyChallenge{}).
		Where("tenant_id = ? AND user_id = ? AND challenge_date = ? AND completed = ?", tenantID, userID, today, true).
		Count(&completedCount).Error
	if err != nil {
		return 0, 0, utils.WrapListError(err, "user_daily_challenges_completed")
	}

	return totalCount, completedCount, nil
}

// CheckAllChallengesCompleted checks if user completed all challenges for today
func (r *DailyChallengeRepository) CheckAllChallengesCompleted(ctx context.Context, tenantID, userID uuid.UUID) (bool, int, error) {
	total, completed, err := r.CountCompletedTodaysChallenges(ctx, tenantID, userID)
	if err != nil {
		return false, 0, err
	}
	if total == 0 {
		return false, 0, nil
	}
	return completed == total, int(completed), nil
}

// --- Perfect Day Bonus Methods (FR-006) ---

// CheckPerfectDayBonus checks if user has received perfect day bonus today
func (r *DailyChallengeRepository) CheckPerfectDayBonus(ctx context.Context, tenantID, userID uuid.UUID) (*models.PerfectDayBonus, error) {
	today := time.Now().UTC().Truncate(24 * time.Hour)

	var bonus models.PerfectDayBonus
	err := r.db.WithContext(ctx).
		Where("tenant_id = ? AND user_id = ? AND challenge_date = ?", tenantID, userID, today).
		First(&bonus).Error
	if err == gorm.ErrRecordNotFound {
		return nil, nil // No bonus today
	}
	if err != nil {
		return nil, utils.WrapFindError(err, "perfect_day_bonus", userID.String())
	}
	return &bonus, nil
}

// CreatePerfectDayBonus creates a perfect day bonus record
// FR-006: Award "Perfect Day" bonus when all daily challenges completed
func (r *DailyChallengeRepository) CreatePerfectDayBonus(ctx context.Context, bonus *models.PerfectDayBonus) error {
	return utils.WrapCreateError(r.db.WithContext(ctx).Create(bonus).Error, "perfect_day_bonus")
}

// GetUserPerfectDayStreak counts consecutive perfect days
func (r *DailyChallengeRepository) GetUserPerfectDayStreak(ctx context.Context, tenantID, userID uuid.UUID) (int, error) {
	var bonuses []models.PerfectDayBonus
	err := r.db.WithContext(ctx).
		Where("tenant_id = ? AND user_id = ?", tenantID, userID).
		Order("challenge_date DESC").
		Limit(30). // Check last 30 days max
		Find(&bonuses).Error
	if err != nil {
		return 0, utils.WrapListError(err, "perfect_day_bonuses")
	}

	if len(bonuses) == 0 {
		return 0, nil
	}

	// Count consecutive days starting from today/yesterday
	today := time.Now().UTC().Truncate(24 * time.Hour)
	streak := 0
	expectedDate := today

	for _, b := range bonuses {
		bonusDate := b.ChallengeDate.Truncate(24 * time.Hour)
		if bonusDate.Equal(expectedDate) || bonusDate.Equal(expectedDate.Add(-24*time.Hour)) {
			streak++
			expectedDate = bonusDate.Add(-24 * time.Hour)
		} else {
			break // Streak broken
		}
	}

	return streak, nil
}

// MarkFirstViewed marks when user first viewed their daily challenges
func (r *DailyChallengeRepository) MarkFirstViewed(ctx context.Context, tenantID, userID uuid.UUID) error {
	today := time.Now().UTC().Truncate(24 * time.Hour)
	now := time.Now()
	expiresAt := now.Add(24 * time.Hour)

	return utils.WrapUpdateError(r.db.WithContext(ctx).
		Model(&models.UserDailyChallenge{}).
		Where("tenant_id = ? AND user_id = ? AND challenge_date = ? AND first_viewed_at IS NULL",
			tenantID, userID, today).
		Updates(map[string]interface{}{
			"first_viewed_at": now,
			"expires_at":      expiresAt,
			"updated_at":      now,
		}).Error, "user_daily_challenges")
}

// isUniqueConstraintError checks if the error is a unique constraint violation
func isUniqueConstraintError(err error) bool {
	if err == nil {
		return false
	}
	errStr := err.Error()
	// Check for common unique constraint error messages
	return strings.Contains(errStr, "unique constraint") ||
		strings.Contains(errStr, "duplicate key") ||
		strings.Contains(errStr, "UNIQUE constraint failed") ||
		strings.Contains(errStr, "violates unique constraint")
}
