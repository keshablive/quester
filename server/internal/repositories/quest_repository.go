// Quest data access
package repositories

import (
	"context"

	"github.com/google/uuid"
	"github.com/keshablive/quester/internal/framework/repository"
	"github.com/keshablive/quester/internal/framework/utils"
	"github.com/keshablive/quester/internal/models"
	"gorm.io/gorm"
)

// QuestRepository handles quest database operations.
// Embeds GenericRepository for core CRUD operations while providing
// interface-compliant methods and domain-specific functionality.
type QuestRepository struct {
	*repository.GenericRepository[*models.Quest]
	db *gorm.DB // Keep for custom queries with Preload
}

// NewQuestRepository creates a new quest repository
func NewQuestRepository(db *gorm.DB) *QuestRepository {
	ValidateDB(db, "QuestRepository")
	return &QuestRepository{
		GenericRepository: repository.NewGenericRepository[*models.Quest](db),
		db:                db,
	}
}

// Create creates a new quest (interface-compliant method).
// Delegates to GenericRepository for tenant-scoped creation.
func (r *QuestRepository) Create(ctx context.Context, quest *models.Quest) error {
	tenantCtx := withTenantContext(ctx, quest.TenantID)
	if err := r.GenericRepository.Create(tenantCtx, quest); err != nil {
		return utils.WrapCreateError(err, "quest")
	}
	return nil
}

// FindByID retrieves a quest by ID (tenant-scoped).
// Uses direct query for Preload support.
func (r *QuestRepository) FindByID(ctx context.Context, tenantID uuid.UUID, questID uuid.UUID) (*models.Quest, error) {
	var quest models.Quest
	err := r.db.WithContext(ctx).
		Preload("Badge").
		Where("tenant_id = ? AND id = ?", tenantID, questID).
		First(&quest).Error

	if err != nil {
		return nil, utils.WrapFindError(err, "quest", questID.String())
	}
	return &quest, nil
}

// FindAll retrieves all quests for a tenant.
// Uses direct query for Preload and filter support.
func (r *QuestRepository) FindAll(ctx context.Context, tenantID uuid.UUID, filters map[string]interface{}) ([]models.Quest, error) {
	var quests []models.Quest
	query := r.db.WithContext(ctx).
		Preload("Badge").
		Where("tenant_id = ?", tenantID)

	// Apply filters
	if status, ok := filters["status"]; ok {
		query = query.Where("status = ?", status)
	}
	if questType, ok := filters["type"]; ok {
		query = query.Where("type = ?", questType)
	}

	err := query.Order("created_at DESC").Find(&quests).Error
	if err != nil {
		return nil, utils.WrapListError(err, "quests")
	}
	return quests, nil
}

// Update updates a quest (interface-compliant method).
// Delegates to GenericRepository for tenant-scoped update.
func (r *QuestRepository) Update(ctx context.Context, quest *models.Quest) error {
	tenantCtx := withTenantContext(ctx, quest.TenantID)
	if err := r.GenericRepository.Update(tenantCtx, quest); err != nil {
		return utils.WrapUpdateError(err, "quest")
	}
	return nil
}

// Delete deletes a quest (soft delete, interface-compliant method).
// Delegates to GenericRepository for tenant-scoped deletion.
func (r *QuestRepository) Delete(ctx context.Context, tenantID uuid.UUID, questID uuid.UUID) error {
	tenantCtx := withTenantContext(ctx, tenantID)
	if err := r.GenericRepository.Delete(tenantCtx, questID); err != nil {
		return utils.WrapDeleteError(err, "quest")
	}
	return nil
}

// GetQuestsByStatus retrieves all quests with a specific status within a tenant
func (r *QuestRepository) GetQuestsByStatus(ctx context.Context, tenantID uuid.UUID, status string) ([]models.Quest, error) {
	var quests []models.Quest
	err := r.db.WithContext(ctx).
		Preload("Badge").
		Where("tenant_id = ? AND status = ?", tenantID, status).
		Order("created_at DESC").
		Find(&quests).Error

	if err != nil {
		return nil, utils.WrapListError(err, "quests by status")
	}
	return quests, nil
}

// GetQuestsByCreatorID retrieves all quests created by a specific user
func (r *QuestRepository) GetQuestsByCreatorID(ctx context.Context, tenantID uuid.UUID, creatorID uuid.UUID) ([]models.Quest, error) {
	var quests []models.Quest
	err := r.db.WithContext(ctx).
		Preload("Badge").
		Where("tenant_id = ? AND creator_id = ?", tenantID, creatorID).
		Order("created_at DESC").
		Find(&quests).Error

	if err != nil {
		return nil, utils.WrapListError(err, "quests by creator")
	}
	return quests, nil
}

// GetQuestsByBadgeID retrieves all quests that award a specific badge
func (r *QuestRepository) GetQuestsByBadgeID(ctx context.Context, tenantID uuid.UUID, badgeID uuid.UUID) ([]models.Quest, error) {
	var quests []models.Quest
	err := r.db.WithContext(ctx).
		Preload("Badge").
		Where("tenant_id = ? AND badge_id = ?", tenantID, badgeID).
		Order("created_at DESC").
		Find(&quests).Error

	if err != nil {
		return nil, utils.WrapListError(err, "quests by badge")
	}
	return quests, nil
}

// CountQuestsByStatus counts the number of quests with a specific status
func (r *QuestRepository) CountQuestsByStatus(ctx context.Context, tenantID uuid.UUID, status string) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Model(&models.Quest{}).
		Where("tenant_id = ? AND status = ?", tenantID, status).
		Count(&count).Error

	if err != nil {
		return 0, utils.WrapCountError(err, "quests by status")
	}
	return count, nil
}

// GetActiveQuests retrieves all active quests within a tenant (interface method)
func (r *QuestRepository) GetActiveQuests(ctx context.Context, tenantID uuid.UUID) ([]models.Quest, error) {
	return r.GetQuestsByStatus(ctx, tenantID, string(models.QuestStatusActive))
}

// FindActiveQuests is a legacy alias for GetActiveQuests (backward compatibility)
func (r *QuestRepository) FindActiveQuests(ctx context.Context, tenantID uuid.UUID) ([]models.Quest, error) {
	return r.GetActiveQuests(ctx, tenantID)
}

// QuestListOptions defines options for listing quests with cursor pagination
// Task Reference: 009-database-query-optimization T030
type QuestListOptions struct {
	TenantID   uuid.UUID
	Cursor     string     // Base64 encoded cursor token
	PageSize   int        // Items per page (default 20, max 100)
	Status     string     // Filter by status
	Difficulty string     // Filter by difficulty
	CreatorID  *uuid.UUID // Filter by creator
	Includes   []string   // Relationships to preload
}

// QuestListResult contains the list result with pagination metadata
type QuestListResult struct {
	Quests     []models.Quest
	NextCursor string
	PrevCursor string
	HasMore    bool
	PageSize   int
}

// List returns quests with cursor-based pagination
// Task Reference: 009-database-query-optimization T030
func (r *QuestRepository) List(ctx context.Context, opts QuestListOptions) (*QuestListResult, error) {
	// Validate and normalize page size
	if opts.PageSize <= 0 {
		opts.PageSize = 20
	}
	if opts.PageSize > 100 {
		opts.PageSize = 100
	}

	// Build base query with tenant scope
	query := r.db.WithContext(ctx).
		Model(&models.Quest{}).
		Where("tenant_id = ?", opts.TenantID)

	// Apply filters
	if opts.Status != "" {
		query = query.Where("status = ?", opts.Status)
	}
	if opts.Difficulty != "" {
		query = query.Where("difficulty = ?", opts.Difficulty)
	}
	if opts.CreatorID != nil {
		query = query.Where("creator_id = ?", *opts.CreatorID)
	}

	// Apply includes/preloads (validated list per FR-010)
	allowedIncludes := map[string]string{
		"badge":        "Badge",
		"creator":      "Creator",
		"objectives":   "Objectives",
		"rewards":      "Rewards",
		"participants": "Participants",
	}
	for _, inc := range opts.Includes {
		if preload, ok := allowedIncludes[inc]; ok {
			query = query.Preload(preload)
		}
	}

	// Apply cursor-based pagination
	query = query.Order("created_at DESC, id DESC")

	// Fetch one extra to determine if there are more pages
	query = query.Limit(opts.PageSize + 1)

	var quests []models.Quest
	if err := query.Find(&quests).Error; err != nil {
		return nil, utils.WrapListError(err, "quests")
	}

	// Determine if there are more pages
	hasMore := len(quests) > opts.PageSize
	if hasMore {
		quests = quests[:opts.PageSize]
	}

	result := &QuestListResult{
		Quests:   quests,
		HasMore:  hasMore,
		PageSize: opts.PageSize,
	}

	// Generate next cursor if there are more pages
	if hasMore && len(quests) > 0 {
		lastQuest := quests[len(quests)-1]
		result.NextCursor = lastQuest.ID.String() // Simplified cursor
	}

	return result, nil
}
