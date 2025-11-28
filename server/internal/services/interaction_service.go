package services

import (
	"fmt"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/keshablive/quester/internal/models"
)

// InteractionService handles social interaction business logic
type InteractionService struct {
	db                *gorm.DB
	moderationService *ModerationService
	rateLimiter       *RateLimiter
}

// InteractionFilters represents filtering options for interactions
type InteractionFilters struct {
	TenantID        uuid.UUID `json:"tenant_id"`
	TargetType      string    `json:"target_type"`
	TargetID        uuid.UUID `json:"target_id"`
	InteractionType string    `json:"interaction_type,omitempty"`
	UserID          uuid.UUID `json:"user_id,omitempty"`
	ParentID        uuid.UUID `json:"parent_id,omitempty"`
	Limit           int       `json:"limit"`
	Offset          int       `json:"offset"`
}

// RateLimiter tracks user interaction rates
type RateLimiter struct {
	db *gorm.DB
}

// RateLimit represents rate limiting configuration
type RateLimit struct {
	MaxActions int           // Maximum actions allowed
	Window     time.Duration // Time window
}

// NewInteractionService creates a new interaction service instance
func NewInteractionService(db *gorm.DB, moderationService *ModerationService) *InteractionService {
	return &InteractionService{
		db:                db,
		moderationService: moderationService,
		rateLimiter:       NewRateLimiter(db),
	}
}

// NewRateLimiter creates a new rate limiter instance
func NewRateLimiter(db *gorm.DB) *RateLimiter {
	return &RateLimiter{db: db}
}

// CheckRateLimit checks if user has exceeded rate limit for comments
// Rate limit: 5 comments per 5 minutes
func (rl *RateLimiter) CheckRateLimit(tenantID, userID uuid.UUID, interactionType string) error {
	// Only apply rate limiting to comments (prevent spam)
	if interactionType != string(models.InteractionTypeComment) {
		return nil
	}

	// Count comments in last 5 minutes
	fiveMinutesAgo := time.Now().Add(-5 * time.Minute)
	var count int64

	err := rl.db.Model(&models.Interaction{}).
		Where("tenant_id = ? AND user_id = ? AND interaction_type = ? AND created_at >= ?",
			tenantID, userID, models.InteractionTypeComment, fiveMinutesAgo).
		Count(&count).Error

	if err != nil {
		return fmt.Errorf("failed to check rate limit: %w", err)
	}

	if count >= 5 {
		return models.ErrRateLimitExceeded
	}

	return nil
}

// Create creates a new interaction with AI moderation
func (is *InteractionService) Create(interaction *models.Interaction) (*models.Interaction, error) {
	// Validate interaction
	if err := interaction.Validate(); err != nil {
		return nil, err
	}

	// Check rate limit
	if err := is.rateLimiter.CheckRateLimit(interaction.TenantID, interaction.UserID, string(interaction.InteractionType)); err != nil {
		return nil, err
	}

	// Calculate depth for nested comments
	if interaction.IsNested() {
		var parent models.Interaction
		if err := is.db.First(&parent, *interaction.ParentInteractionID).Error; err != nil {
			return nil, fmt.Errorf("parent interaction not found: %w", err)
		}
		interaction.Depth = parent.Depth + 1
	} else {
		interaction.Depth = 0
	}

	// Auto-approve types that don't need moderation (likes, ratings)
	if interaction.IsAutoApproved() {
		interaction.ModerationStatus = models.ModerationStatusApproved
		interaction.ModerationConfidence = 0.0

		if err := is.db.Create(interaction).Error; err != nil {
			return nil, fmt.Errorf("failed to create interaction: %w", err)
		}

		return interaction, nil
	}

	// Perform AI moderation for content with text (comments, shares)
	decision, err := is.moderationService.PreFilter(interaction)
	if err != nil {
		// On moderation error, create as pending
		interaction.ModerationStatus = models.ModerationStatusPending
		interaction.ModerationConfidence = 0.0
	} else {
		// Apply moderation decision
		interaction.ModerationStatus = models.ModerationStatus(decision.Status)
		interaction.ModerationConfidence = decision.Confidence

		// If flagged or rejected, create queue item
		if decision.Status == string(models.ModerationStatusFlagged) ||
			decision.Status == string(models.ModerationStatusRejected) {

			// Create interaction first
			if err := is.db.Create(interaction).Error; err != nil {
				return nil, fmt.Errorf("failed to create interaction: %w", err)
			}

			// Create moderation queue entry
			if err := is.moderationService.CreateQueueItem(interaction, decision.Reason, decision.Categories); err != nil {
				// Log error but don't fail - interaction already created
				fmt.Printf("WARNING: Failed to create moderation queue item: %v\n", err)
			}

			return interaction, nil
		}
	}

	// Create interaction
	if err := is.db.Create(interaction).Error; err != nil {
		return nil, fmt.Errorf("failed to create interaction: %w", err)
	}

	return interaction, nil
}

// GetByTarget retrieves interactions for a specific target entity
func (is *InteractionService) GetByTarget(filters InteractionFilters) ([]models.Interaction, int64, error) {
	var interactions []models.Interaction
	var total int64

	// Build query
	query := is.db.Model(&models.Interaction{}).
		Where("tenant_id = ? AND target_type = ? AND target_id = ?",
			filters.TenantID, filters.TargetType, filters.TargetID)

	// Apply optional filters
	if filters.InteractionType != "" {
		query = query.Where("interaction_type = ?", filters.InteractionType)
	}

	if filters.UserID != uuid.Nil {
		query = query.Where("user_id = ?", filters.UserID)
	}

	if filters.ParentID != uuid.Nil {
		query = query.Where("parent_interaction_id = ?", filters.ParentID)
	} else {
		// By default, only get top-level interactions (depth = 0)
		// Nested comments should be fetched separately
		query = query.Where("parent_interaction_id IS NULL")
	}

	// Only show approved content (hide rejected/flagged)
	query = query.Where("moderation_status = ?", models.ModerationStatusApproved)

	// Count total
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("failed to count interactions: %w", err)
	}

	// Apply pagination
	if filters.Limit > 0 {
		query = query.Limit(filters.Limit)
	}
	if filters.Offset > 0 {
		query = query.Offset(filters.Offset)
	}

	// Order by newest first
	query = query.Order("created_at DESC")

	// Preload user data
	query = query.Preload("User", func(db *gorm.DB) *gorm.DB {
		return db.Select("id, username, full_name, avatar_url")
	})

	// Execute query
	if err := query.Find(&interactions).Error; err != nil {
		return nil, 0, fmt.Errorf("failed to fetch interactions: %w", err)
	}

	return interactions, total, nil
}

// GetByID retrieves a single interaction by ID
func (is *InteractionService) GetByID(tenantID, interactionID uuid.UUID) (*models.Interaction, error) {
	var interaction models.Interaction

	err := is.db.Where("tenant_id = ? AND id = ?", tenantID, interactionID).
		Preload("User", func(db *gorm.DB) *gorm.DB {
			return db.Select("id, username, full_name, avatar_url")
		}).
		First(&interaction, interactionID).Error

	if err != nil {
		return nil, fmt.Errorf("interaction not found: %w", err)
	}

	return &interaction, nil
}

// GetChildInteractions retrieves nested comments for a parent interaction
func (is *InteractionService) GetChildInteractions(tenantID, parentID uuid.UUID, limit, offset int) ([]models.Interaction, int64, error) {
	var interactions []models.Interaction
	var total int64

	query := is.db.Model(&models.Interaction{}).
		Where("tenant_id = ? AND parent_interaction_id = ? AND moderation_status = ?",
			tenantID, parentID, models.ModerationStatusApproved)

	// Count total
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("failed to count child interactions: %w", err)
	}

	// Apply pagination
	if limit > 0 {
		query = query.Limit(limit)
	}
	if offset > 0 {
		query = query.Offset(offset)
	}

	// Order by oldest first for nested comments
	query = query.Order("created_at ASC")

	// Preload user data
	query = query.Preload("User", func(db *gorm.DB) *gorm.DB {
		return db.Select("id, username, full_name, avatar_url")
	})

	if err := query.Find(&interactions).Error; err != nil {
		return nil, 0, fmt.Errorf("failed to fetch child interactions: %w", err)
	}

	return interactions, total, nil
}

// Delete soft deletes an interaction (only owner can delete)
func (is *InteractionService) Delete(tenantID, interactionID, userID uuid.UUID) error {
	// Verify ownership
	var interaction models.Interaction
	if err := is.db.Where("tenant_id = ? AND id = ?", tenantID, interactionID).
		First(&interaction).Error; err != nil {
		return fmt.Errorf("interaction not found: %w", err)
	}

	if interaction.UserID != userID {
		return fmt.Errorf("unauthorized: user does not own this interaction")
	}

	// Soft delete (set moderation_status to rejected)
	if err := is.db.Model(&interaction).
		Update("moderation_status", models.ModerationStatusRejected).Error; err != nil {
		return fmt.Errorf("failed to delete interaction: %w", err)
	}

	return nil
}

// GetInteractionCounts retrieves aggregated counts for a target
func (is *InteractionService) GetInteractionCounts(tenantID uint, targetType string, targetID uint) (map[string]int64, error) {
	counts := make(map[string]int64)

	// Count likes
	var likeCount int64
	is.db.Model(&models.Interaction{}).
		Where("tenant_id = ? AND target_type = ? AND target_id = ? AND interaction_type = ? AND moderation_status = ?",
			tenantID, targetType, targetID, models.InteractionTypeLike, models.ModerationStatusApproved).
		Count(&likeCount)
	counts["likes"] = likeCount

	// Count comments
	var commentCount int64
	is.db.Model(&models.Interaction{}).
		Where("tenant_id = ? AND target_type = ? AND target_id = ? AND interaction_type = ? AND moderation_status = ?",
			tenantID, targetType, targetID, models.InteractionTypeComment, models.ModerationStatusApproved).
		Count(&commentCount)
	counts["comments"] = commentCount

	// Count shares
	var shareCount int64
	is.db.Model(&models.Interaction{}).
		Where("tenant_id = ? AND target_type = ? AND target_id = ? AND interaction_type = ? AND moderation_status = ?",
			tenantID, targetType, targetID, models.InteractionTypeShare, models.ModerationStatusApproved).
		Count(&shareCount)
	counts["shares"] = shareCount

	// Calculate average rating
	var avgRating float64
	is.db.Model(&models.Interaction{}).
		Select("AVG(rating) as avg_rating").
		Where("tenant_id = ? AND target_type = ? AND target_id = ? AND interaction_type = ? AND moderation_status = ?",
			tenantID, targetType, targetID, models.InteractionTypeRate, models.ModerationStatusApproved).
		Scan(&avgRating)
	counts["avg_rating"] = int64(avgRating * 10) // Store as 1-50 (multiply by 10 for half-star precision)

	// Count ratings
	var ratingCount int64
	is.db.Model(&models.Interaction{}).
		Where("tenant_id = ? AND target_type = ? AND target_id = ? AND interaction_type = ? AND moderation_status = ?",
			tenantID, targetType, targetID, models.InteractionTypeRate, models.ModerationStatusApproved).
		Count(&ratingCount)
	counts["ratings"] = ratingCount

	return counts, nil
}

// HasUserLiked checks if a user has liked a specific target
func (is *InteractionService) HasUserLiked(tenantID, userID uint, targetType string, targetID uint) (bool, error) {
	var count int64
	err := is.db.Model(&models.Interaction{}).
		Where("tenant_id = ? AND user_id = ? AND target_type = ? AND target_id = ? AND interaction_type = ?",
			tenantID, userID, targetType, targetID, models.InteractionTypeLike).
		Count(&count).Error

	if err != nil {
		return false, err
	}

	return count > 0, nil
}

// GetUserRating retrieves a user's rating for a specific target
func (is *InteractionService) GetUserRating(tenantID, userID uint, targetType string, targetID uint) (*int, error) {
	var interaction models.Interaction
	err := is.db.Where("tenant_id = ? AND user_id = ? AND target_type = ? AND target_id = ? AND interaction_type = ?",
		tenantID, userID, targetType, targetID, models.InteractionTypeRate).
		First(&interaction).Error

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil // No rating found
		}
		return nil, err
	}

	return interaction.Rating, nil
}
