package repository

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/keshablive/quester/internal/framework/utils"
	"github.com/keshablive/quester/internal/models"
)

// BadgeRepository handles database operations for badges.
// Embeds GenericRepository for core CRUD operations while providing
// interface-compliant methods and domain-specific functionality.
type BadgeRepository struct {
	*GenericRepository[*models.Badge]
	db *gorm.DB // Keep for custom queries
}

// NewBadgeRepository creates a new badge repository
func NewBadgeRepository(db *gorm.DB) *BadgeRepository {
	ValidateDB(db, "BadgeRepository")
	return &BadgeRepository{
		GenericRepository: NewGenericRepository[*models.Badge](db),
		db:                db,
	}
}

// withTenantContext creates a context with tenant_id for GenericRepository operations
func withTenantContext(ctx context.Context, tenantID uuid.UUID) context.Context {
	return context.WithValue(ctx, TenantIDKey{}, tenantID)
}

// Create creates a new badge (interface-compliant method).
// Delegates to GenericRepository after validation.
func (r *BadgeRepository) Create(ctx context.Context, badge *models.Badge) error {
	// Validate business rules
	if err := badge.Validate(); err != nil {
		return utils.WrapCreateError(err, "badge (validation)")
	}

	// GenericRepository will set TenantID from context and create
	tenantCtx := withTenantContext(ctx, badge.TenantID)
	if err := r.GenericRepository.Create(tenantCtx, badge); err != nil {
		return utils.WrapCreateError(err, "badge")
	}
	return nil
}

// FindByID retrieves a badge by ID with tenant isolation (interface-compliant method).
// Delegates to GenericRepository for tenant-scoped lookup.
func (r *BadgeRepository) FindByID(ctx context.Context, tenantID, badgeID uuid.UUID) (*models.Badge, error) {
	tenantCtx := withTenantContext(ctx, tenantID)
	badge, err := r.GenericRepository.FindByID(tenantCtx, badgeID)
	if err != nil {
		return nil, utils.WrapFindError(err, "badge", badgeID.String())
	}
	return badge, nil
}

// FindAll retrieves all badges for a tenant (interface-compliant method).
// Uses direct query to return non-pointer slice as required by interface.
func (r *BadgeRepository) FindAll(ctx context.Context, tenantID uuid.UUID) ([]models.Badge, error) {
	var badges []models.Badge

	err := r.db.WithContext(ctx).
		Where("tenant_id = ?", tenantID).
		Order("tier ASC, category ASC").
		Find(&badges).Error

	if err != nil {
		return nil, utils.WrapListError(err, "badges")
	}

	return badges, nil
}

// FindAllPaginated retrieves all badges for a tenant with optional filtering and pagination
func (r *BadgeRepository) FindAllPaginated(ctx context.Context, tenantID uuid.UUID, filters BadgeFilters) ([]models.Badge, int64, error) {
	var badges []models.Badge
	var total int64

	query := r.db.WithContext(ctx).Where("tenant_id = ?", tenantID)

	// Apply filters
	if filters.Category != "" {
		query = query.Where("category = ?", filters.Category)
	}
	if filters.Tier != "" {
		query = query.Where("tier = ?", filters.Tier)
	}

	// Count total (before pagination)
	if err := query.Model(&models.Badge{}).Count(&total).Error; err != nil {
		return nil, 0, utils.WrapCountError(err, "badges")
	}

	// Apply pagination
	offset := (filters.Page - 1) * filters.Limit
	if err := query.Offset(offset).Limit(filters.Limit).Find(&badges).Error; err != nil {
		return nil, 0, utils.WrapListError(err, "badges")
	}

	return badges, total, nil
}

// FindEligible finds badges a user is eligible for based on their stats
// Returns badges that:
// 1. User hasn't earned yet
// 2. User meets points/completion threshold
func (r *BadgeRepository) FindEligible(ctx context.Context, tenantID, userID uuid.UUID, userStats UserStats) ([]models.Badge, error) {
	var badges []models.Badge

	// Find badges user hasn't earned yet
	// Optimized: Pre-filter badges with points_threshold to reduce in-memory processing
	err := r.db.WithContext(ctx).
		Where("tenant_id = ? AND points_threshold <= ? AND id NOT IN (?)",
			tenantID,
			userStats.TotalXP,
			r.db.Model(&models.UserBadge{}).
				Select("badge_id").
				Where("tenant_id = ? AND user_id = ?", tenantID, userID),
		).
		Find(&badges).Error

	if err != nil {
		return nil, utils.WrapListError(err, "eligible badges")
	} // Filter badges based on eligibility criteria
	// NOTE: In-memory filtering allows for complex business logic beyond simple SQL comparisons
	// TODO: Expand logic in BadgeService.CheckEligibility() for complex criteria (category-specific rules)
	eligible := make([]models.Badge, 0, len(badges))
	for _, badge := range badges {
		// Basic XP threshold check (already filtered in SQL)
		// Service layer can add more complex criteria (e.g., quest completion, achievements)
		if userStats.TotalXP >= badge.PointsThreshold {
			eligible = append(eligible, badge)
		}
	}

	return eligible, nil
}

// FindByUser retrieves all badges earned by a user
// T084: Now includes instructor attribution via ApprovedByUser preload
func (r *BadgeRepository) FindByUser(ctx context.Context, tenantID, userID uuid.UUID, statusFilter string) ([]models.UserBadge, error) {
	var userBadges []models.UserBadge

	query := r.db.WithContext(ctx).
		Preload("Badge").
		Preload("ApprovedByUser"). // T084: Include instructor info for awarded badges
		Where("user_badges.tenant_id = ? AND user_badges.user_id = ?", tenantID, userID)

	// Apply status filter
	if statusFilter != "" {
		query = query.Where("user_badges.approval_status = ?", statusFilter)
	}

	if err := query.Find(&userBadges).Error; err != nil {
		return nil, utils.WrapListError(err, "user badges")
	}

	return userBadges, nil
}

// CreateUserBadge awards a badge to a user
func (r *BadgeRepository) CreateUserBadge(ctx context.Context, userBadge *models.UserBadge) error {
	// Check for duplicate (unique constraint: tenant_id, user_id, badge_id)
	var existing models.UserBadge
	err := r.db.WithContext(ctx).
		Where("tenant_id = ? AND user_id = ? AND badge_id = ?",
			userBadge.TenantID, userBadge.UserID, userBadge.BadgeID).
		First(&existing).Error

	if err == nil {
		return utils.WrapCreateError(gorm.ErrDuplicatedKey, "user_badge (duplicate)")
	}
	if err != gorm.ErrRecordNotFound {
		return utils.WrapFindError(err, "user_badge", "duplicate check")
	}

	// Create badge award
	if err := r.db.WithContext(ctx).Create(userBadge).Error; err != nil {
		return utils.WrapCreateError(err, "user_badge")
	}

	return nil
}

// UpdateUserBadge updates a user badge (e.g., approval status)
func (r *BadgeRepository) UpdateUserBadge(ctx context.Context, userBadge *models.UserBadge) error {
	return utils.WrapUpdateError(r.db.WithContext(ctx).Save(userBadge).Error, "user_badge")
}

// FindUserBadgeByID retrieves a specific user badge by ID
func (r *BadgeRepository) FindUserBadgeByID(ctx context.Context, tenantID, userBadgeID uuid.UUID) (*models.UserBadge, error) {
	var userBadge models.UserBadge
	err := r.db.WithContext(ctx).
		Preload("Badge").
		Where("tenant_id = ? AND id = ?", tenantID, userBadgeID).
		First(&userBadge).Error

	if err == gorm.ErrRecordNotFound {
		return nil, utils.WrapNotFoundError("user_badge", userBadgeID.String())
	}
	if err != nil {
		return nil, utils.WrapFindError(err, "user_badge", userBadgeID.String())
	}

	return &userBadge, nil
}

// BadgeFilters contains optional filters for badge queries
type BadgeFilters struct {
	Category string
	Tier     string
	Page     int
	Limit    int
}

// UserStats contains user statistics for eligibility checks
type UserStats struct {
	TotalXP          int
	QuestsCompleted  int
	CoursesCompleted int
	// Add more as needed for eligibility logic
}

// Update updates an existing badge's fields (interface-compliant method).
// Delegates to GenericRepository for tenant-scoped update.
func (r *BadgeRepository) Update(ctx context.Context, badge *models.Badge) error {
	tenantCtx := withTenantContext(ctx, badge.TenantID)
	if err := r.GenericRepository.Update(tenantCtx, badge); err != nil {
		return utils.WrapUpdateError(err, "badge")
	}
	return nil
}

// Delete soft-deletes a badge by ID (interface-compliant method).
// Delegates to GenericRepository for tenant-scoped deletion.
func (r *BadgeRepository) Delete(ctx context.Context, tenantID uuid.UUID, badgeID uuid.UUID) error {
	tenantCtx := withTenantContext(ctx, tenantID)
	if err := r.GenericRepository.Delete(tenantCtx, badgeID); err != nil {
		return utils.WrapDeleteError(err, "badge")
	}
	return nil
}

// GetBadgesByType retrieves all badges of a specific type
func (r *BadgeRepository) GetBadgesByType(ctx context.Context, tenantID uuid.UUID, badgeType string) ([]models.Badge, error) {
	var badges []models.Badge

	err := r.db.WithContext(ctx).
		Where("tenant_id = ? AND category = ?", tenantID, badgeType).
		Order("tier ASC").
		Find(&badges).Error

	if err != nil {
		return nil, utils.WrapListError(err, "badges by type")
	}

	return badges, nil
}

// GetUserBadges retrieves all badges earned by a specific user (interface-compliant method)
func (r *BadgeRepository) GetUserBadges(ctx context.Context, tenantID uuid.UUID, userID uuid.UUID) ([]models.UserBadge, error) {
	return r.FindByUser(ctx, tenantID, userID, "")
}

// AwardBadgeToUser awards a badge to a user (interface-compliant method)
func (r *BadgeRepository) AwardBadgeToUser(ctx context.Context, userBadge *models.UserBadge) error {
	return r.CreateUserBadge(ctx, userBadge)
}

// HasUserEarnedBadge checks if a user has earned a specific badge
func (r *BadgeRepository) HasUserEarnedBadge(ctx context.Context, tenantID uuid.UUID, userID uuid.UUID, badgeID uuid.UUID) (bool, error) {
	var count int64

	err := r.db.WithContext(ctx).
		Model(&models.UserBadge{}).
		Where("tenant_id = ? AND user_id = ? AND badge_id = ?", tenantID, userID, badgeID).
		Count(&count).Error

	if err != nil {
		return false, utils.WrapListError(err, "user badge check")
	}

	return count > 0, nil
}

// GetUserBadge retrieves a specific badge for a user (T081)
func (r *BadgeRepository) GetUserBadge(ctx context.Context, tenantID uuid.UUID, userID uuid.UUID, badgeID uuid.UUID) (*models.UserBadge, error) {
	var userBadge models.UserBadge

	err := r.db.WithContext(ctx).
		Preload("Badge").
		Where("tenant_id = ? AND user_id = ? AND badge_id = ?", tenantID, userID, badgeID).
		First(&userBadge).Error

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, models.ErrBadgeNotFound
		}
		return nil, utils.WrapFindError(err, "user badge", badgeID.String())
	}

	return &userBadge, nil
}

// GetBadgeEarnCount retrieves the number of times a badge has been earned
func (r *BadgeRepository) GetBadgeEarnCount(ctx context.Context, tenantID uuid.UUID, badgeID uuid.UUID) (int64, error) {
	var count int64

	err := r.db.WithContext(ctx).
		Model(&models.UserBadge{}).
		Where("tenant_id = ? AND badge_id = ?", tenantID, badgeID).
		Count(&count).Error

	if err != nil {
		return 0, utils.WrapCountError(err, "badge earn count")
	}

	return count, nil
}

// RevokeBadgeFromUser removes a badge from a user
func (r *BadgeRepository) RevokeBadgeFromUser(ctx context.Context, tenantID uuid.UUID, userID uuid.UUID, badgeID uuid.UUID) error {
	result := r.db.WithContext(ctx).
		Where("tenant_id = ? AND user_id = ? AND badge_id = ?", tenantID, userID, badgeID).
		Delete(&models.UserBadge{})

	if result.Error != nil {
		return utils.WrapDeleteError(result.Error, "user badge")
	}

	if result.RowsAffected == 0 {
		return utils.WrapNotFoundError("user badge", fmt.Sprintf("user:%s badge:%s", userID, badgeID))
	}

	return nil
}
