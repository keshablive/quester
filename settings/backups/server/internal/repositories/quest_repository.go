// Quest data access
package repositories

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/yourusername/quester/internal/models"
	"gorm.io/gorm"
)

// QuestRepository handles quest database operations
type QuestRepository struct {
	db *gorm.DB
}

// NewQuestRepository creates a new quest repository
func NewQuestRepository(db *gorm.DB) *QuestRepository {
	return &QuestRepository{db: db}
}

// Create creates a new quest
func (r *QuestRepository) Create(ctx context.Context, quest *models.Quest) error {
	if err := r.db.WithContext(ctx).Create(quest).Error; err != nil {
		return fmt.Errorf("failed to create quest: %w", err)
	}
	return nil
}

// FindByID retrieves a quest by ID (tenant-scoped)
func (r *QuestRepository) FindByID(ctx context.Context, tenantID uuid.UUID, questID uuid.UUID) (*models.Quest, error) {
	var quest models.Quest
	err := r.db.WithContext(ctx).
		Preload("Badge").
		Where("tenant_id = ? AND id = ?", tenantID, questID).
		First(&quest).Error

	if err != nil {
		return nil, fmt.Errorf("failed to find quest: %w", err)
	}
	return &quest, nil
}

// FindAll retrieves all quests for a tenant
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
		return nil, fmt.Errorf("failed to find quests: %w", err)
	}
	return quests, nil
}

// Update updates a quest
func (r *QuestRepository) Update(ctx context.Context, quest *models.Quest) error {
	if err := r.db.WithContext(ctx).Save(quest).Error; err != nil {
		return fmt.Errorf("failed to update quest: %w", err)
	}
	return nil
}

// Delete deletes a quest (soft delete)
func (r *QuestRepository) Delete(ctx context.Context, tenantID uuid.UUID, questID uuid.UUID) error {
	result := r.db.WithContext(ctx).
		Where("tenant_id = ? AND id = ?", tenantID, questID).
		Delete(&models.Quest{})

	if result.Error != nil {
		return fmt.Errorf("failed to delete quest: %w", result.Error)
	}
	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}

// FindActiveQuests retrieves all active quests for a tenant
func (r *QuestRepository) FindActiveQuests(ctx context.Context, tenantID uuid.UUID) ([]models.Quest, error) {
	var quests []models.Quest
	err := r.db.WithContext(ctx).
		Preload("Badge").
		Where("tenant_id = ? AND status = ?", tenantID, models.QuestStatusActive).
		Order("created_at DESC").
		Find(&quests).Error

	if err != nil {
		return nil, fmt.Errorf("failed to find active quests: %w", err)
	}
	return quests, nil
}
