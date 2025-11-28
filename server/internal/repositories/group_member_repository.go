package repositories

import (
	"context"

	"gorm.io/gorm"

	"github.com/keshablive/quester/internal/framework/utils"
	"github.com/keshablive/quester/internal/models"
)

// GroupMemberRepository handles group member data access
type GroupMemberRepository struct {
	db *gorm.DB
}

// NewGroupMemberRepository creates a new group member repository
func NewGroupMemberRepository(db *gorm.DB) *GroupMemberRepository {
	return &GroupMemberRepository{db: db}
}

// Create creates a new group member
func (r *GroupMemberRepository) Create(ctx context.Context, member *models.GroupMember) error {
	return r.db.WithContext(ctx).Create(member).Error
}

// FindByID finds a group member by ID
func (r *GroupMemberRepository) FindByID(ctx context.Context, id string) (*models.GroupMember, error) {
	var member models.GroupMember
	err := r.db.WithContext(ctx).
		Preload("Group").
		Preload("User").
		First(&member, "id = ?", id).Error
	return &member, err
}

// FindByGroupAndUser finds a group member by group ID and user ID
func (r *GroupMemberRepository) FindByGroupAndUser(ctx context.Context, groupID, userID string) (*models.GroupMember, error) {
	var member models.GroupMember
	err := r.db.WithContext(ctx).
		Preload("Group").
		Preload("User").
		Where("group_id = ? AND user_id = ? AND left_at IS NULL", groupID, userID).
		First(&member).Error
	return &member, err
}

// Update updates a group member
func (r *GroupMemberRepository) Update(ctx context.Context, member *models.GroupMember) error {
	return r.db.WithContext(ctx).Save(member).Error
}

// Delete soft deletes a group member
func (r *GroupMemberRepository) Delete(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Delete(&models.GroupMember{}, "id = ?", id).Error
}

// FindByGroup finds all members of a group with pagination
// Optimized to build base query once and reuse for count and fetch
func (r *GroupMemberRepository) FindByGroup(ctx context.Context, tenantID, groupID string, page, limit int) ([]*models.GroupMember, int64, error) {
	var members []*models.GroupMember
	var total int64

	// Build base query with common conditions
	baseQuery := r.db.WithContext(ctx).
		Model(&models.GroupMember{}).
		Where("tenant_id = ? AND group_id = ? AND left_at IS NULL", tenantID, groupID)

	// Get total count using base query
	if err := baseQuery.Count(&total).Error; err != nil {
		return nil, 0, utils.WrapCountError(err, "group members")
	}

	// Get paginated results, reusing base query
	offset := (page - 1) * limit
	err := baseQuery.
		Preload("User").
		Order("joined_at ASC").
		Limit(limit).
		Offset(offset).
		Find(&members).Error

	if err != nil {
		return nil, 0, utils.WrapListError(err, "group member")
	}

	return members, total, nil
}

// FindByUser finds all group memberships for a user
// Optimized to build base query once and reuse for count and fetch
func (r *GroupMemberRepository) FindByUser(ctx context.Context, tenantID, userID string, page, limit int) ([]*models.GroupMember, int64, error) {
	var members []*models.GroupMember
	var total int64

	// Build base query with common conditions
	baseQuery := r.db.WithContext(ctx).
		Model(&models.GroupMember{}).
		Where("tenant_id = ? AND user_id = ? AND left_at IS NULL", tenantID, userID)

	// Get total count using base query
	if err := baseQuery.Count(&total).Error; err != nil {
		return nil, 0, utils.WrapCountError(err, "group members")
	}

	// Get paginated results, reusing base query
	offset := (page - 1) * limit
	err := baseQuery.
		Preload("Group").
		Order("joined_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&members).Error

	if err != nil {
		return nil, 0, utils.WrapListError(err, "group member")
	}

	return members, total, nil
}

// IsUserMember checks if a user is a member of a group
func (r *GroupMemberRepository) IsUserMember(ctx context.Context, groupID, userID string) (bool, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Model(&models.GroupMember{}).
		Where("group_id = ? AND user_id = ? AND left_at IS NULL", groupID, userID).
		Count(&count).Error
	return count > 0, err
}

// GetMemberCount gets the count of active members in a group
func (r *GroupMemberRepository) GetMemberCount(ctx context.Context, groupID string) (int, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Model(&models.GroupMember{}).
		Where("group_id = ? AND left_at IS NULL", groupID).
		Count(&count).Error
	return int(count), err
}

// GetAdmins gets all admins of a group
func (r *GroupMemberRepository) GetAdmins(ctx context.Context, groupID string) ([]*models.GroupMember, error) {
	var members []*models.GroupMember
	err := r.db.WithContext(ctx).
		Where("group_id = ? AND role = ? AND left_at IS NULL", groupID, models.GroupRoleAdmin).
		Preload("User").
		Find(&members).Error
	return members, err
}

// GetModerators gets all moderators of a group
func (r *GroupMemberRepository) GetModerators(ctx context.Context, groupID string) ([]*models.GroupMember, error) {
	var members []*models.GroupMember
	err := r.db.WithContext(ctx).
		Where("group_id = ? AND role IN (?, ?) AND left_at IS NULL", groupID, models.GroupRoleAdmin, models.GroupRoleModerator).
		Preload("User").
		Find(&members).Error
	return members, err
}
