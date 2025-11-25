package repositories

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/yourusername/quester/internal/models"
)

// BadgeRepository handles database operations for badges
type BadgeRepository struct {
	db *gorm.DB
}

// NewBadgeRepository creates a new badge repository
func NewBadgeRepository(db *gorm.DB) *BadgeRepository {
	return &BadgeRepository{db: db}
}

// Create creates a new badge
func (r *BadgeRepository) Create(ctx context.Context, badge *models.Badge) error {
	// Validate business rules
	if err := badge.Validate(); err != nil {
		return fmt.Errorf("badge validation failed: %w", err)
	}

	if err := r.db.WithContext(ctx).Create(badge).Error; err != nil {
		return fmt.Errorf("failed to create badge: %w", err)
	}
	return nil
}

// FindByID retrieves a badge by ID with tenant isolation
func (r *BadgeRepository) FindByID(ctx context.Context, tenantID, badgeID uuid.UUID) (*models.Badge, error) {
	var badge models.Badge
	err := r.db.WithContext(ctx).
		Where("tenant_id = ? AND id = ?", tenantID, badgeID).
		First(&badge).Error

	if err == gorm.ErrRecordNotFound {
		return nil, fmt.Errorf("badge not found: %s", badgeID)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to find badge: %w", err)
	}

	return &badge, nil
}

// FindAll retrieves all badges for a tenant with optional filtering
func (r *BadgeRepository) FindAll(ctx context.Context, tenantID uuid.UUID, filters BadgeFilters) ([]models.Badge, int64, error) {
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
		return nil, 0, fmt.Errorf("failed to count badges: %w", err)
	}

	// Apply pagination
	offset := (filters.Page - 1) * filters.Limit
	if err := query.Offset(offset).Limit(filters.Limit).Find(&badges).Error; err != nil {
		return nil, 0, fmt.Errorf("failed to find badges: %w", err)
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
	err := r.db.WithContext(ctx).
		Where("tenant_id = ? AND id NOT IN (?)",
			tenantID,
			r.db.Model(&models.UserBadge{}).
				Select("badge_id").
				Where("tenant_id = ? AND user_id = ?", tenantID, userID),
		).
		Find(&badges).Error

	if err != nil {
		return nil, fmt.Errorf("failed to find eligible badges: %w", err)
	}

	// Filter badges based on eligibility criteria
	// TODO: This is a simple implementation checking points_threshold
	// Expand logic in BadgeService.CheckEligibility() for complex criteria
	eligible := make([]models.Badge, 0)
	for _, badge := range badges {
		// For now, just check if user has enough XP (simplification)
		// Real logic should be in service layer based on badge category
		if userStats.TotalXP >= badge.PointsThreshold {
			eligible = append(eligible, badge)
		}
	}

	return eligible, nil
}

// FindByUser retrieves all badges earned by a user
func (r *BadgeRepository) FindByUser(ctx context.Context, tenantID, userID uuid.UUID, statusFilter string) ([]models.UserBadge, error) {
	var userBadges []models.UserBadge

	query := r.db.WithContext(ctx).
		Preload("Badge").
		Where("user_badges.tenant_id = ? AND user_badges.user_id = ?", tenantID, userID)

	// Apply status filter
	if statusFilter != "" {
		query = query.Where("user_badges.approval_status = ?", statusFilter)
	}

	if err := query.Find(&userBadges).Error; err != nil {
		return nil, fmt.Errorf("failed to find user badges: %w", err)
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
		return fmt.Errorf("user already has this badge")
	}
	if err != gorm.ErrRecordNotFound {
		return fmt.Errorf("failed to check for duplicate badge: %w", err)
	}

	// Create badge award
	if err := r.db.WithContext(ctx).Create(userBadge).Error; err != nil {
		return fmt.Errorf("failed to create user badge: %w", err)
	}

	return nil
}

// UpdateUserBadge updates a user badge (e.g., approval status)
func (r *BadgeRepository) UpdateUserBadge(ctx context.Context, userBadge *models.UserBadge) error {
	if err := r.db.WithContext(ctx).Save(userBadge).Error; err != nil {
		return fmt.Errorf("failed to update user badge: %w", err)
	}
	return nil
}

// FindUserBadgeByID retrieves a specific user badge by ID
func (r *BadgeRepository) FindUserBadgeByID(ctx context.Context, tenantID, userBadgeID uuid.UUID) (*models.UserBadge, error) {
	var userBadge models.UserBadge
	err := r.db.WithContext(ctx).
		Preload("Badge").
		Where("tenant_id = ? AND id = ?", tenantID, userBadgeID).
		First(&userBadge).Error

	if err == gorm.ErrRecordNotFound {
		return nil, fmt.Errorf("user badge not found: %s", userBadgeID)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to find user badge: %w", err)
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
