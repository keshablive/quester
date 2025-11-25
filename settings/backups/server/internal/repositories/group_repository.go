package repositories

import (
	"context"

	"gorm.io/gorm"

	"github.com/yourusername/quester/internal/models"
)

// GroupRepository handles group data access
type GroupRepository struct {
	db *gorm.DB
}

// NewGroupRepository creates a new group repository
func NewGroupRepository(db *gorm.DB) *GroupRepository {
	return &GroupRepository{db: db}
}

// Create creates a new group
func (r *GroupRepository) Create(ctx context.Context, group *models.Group) error {
	return r.db.WithContext(ctx).Create(group).Error
}

// FindByID finds a group by ID
func (r *GroupRepository) FindByID(ctx context.Context, id string) (*models.Group, error) {
	var group models.Group
	err := r.db.WithContext(ctx).
		Preload("Creator").
		Preload("Members").
		First(&group, "id = ?", id).Error
	return &group, err
}

// Update updates a group
func (r *GroupRepository) Update(ctx context.Context, group *models.Group) error {
	return r.db.WithContext(ctx).Save(group).Error
}

// Delete soft deletes a group
func (r *GroupRepository) Delete(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Delete(&models.Group{}, "id = ?", id).Error
}

// FindByUser finds all groups a user is a member of
func (r *GroupRepository) FindByUser(ctx context.Context, tenantID, userID string, page, limit int) ([]*models.Group, int64, error) {
	var groups []*models.Group
	var total int64

	query := r.db.WithContext(ctx).
		Joins("JOIN group_members ON group_members.group_id = groups.id").
		Where("groups.tenant_id = ?", tenantID).
		Where("group_members.user_id = ?", userID).
		Where("group_members.left_at IS NULL").
		Preload("Creator").
		Preload("Members")

	// Get total count
	if err := query.Model(&models.Group{}).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Get paginated results
	offset := (page - 1) * limit
	err := query.
		Order("groups.created_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&groups).Error

	return groups, total, err
}

// FindByTenant finds all groups in a tenant
func (r *GroupRepository) FindByTenant(ctx context.Context, tenantID string, page, limit int) ([]*models.Group, int64, error) {
	var groups []*models.Group
	var total int64

	query := r.db.WithContext(ctx).
		Where("tenant_id = ?", tenantID).
		Preload("Creator")

	// Get total count
	if err := query.Model(&models.Group{}).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Get paginated results
	offset := (page - 1) * limit
	err := query.
		Order("created_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&groups).Error

	return groups, total, err
}

// Search searches for groups by name
func (r *GroupRepository) Search(ctx context.Context, tenantID, keyword string, page, limit int) ([]*models.Group, int64, error) {
	var groups []*models.Group
	var total int64

	query := r.db.WithContext(ctx).
		Where("tenant_id = ?", tenantID).
		Where("name ILIKE ?", "%"+keyword+"%").
		Preload("Creator")

	// Get total count
	if err := query.Model(&models.Group{}).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Get paginated results
	offset := (page - 1) * limit
	err := query.
		Order("created_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&groups).Error

	return groups, total, err
}
