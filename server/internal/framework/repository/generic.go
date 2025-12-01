// Package repository provides generic repository patterns with multi-tenant support.
// CONSTITUTION: Multi-Tenancy (NON-NEGOTIABLE) - All queries MUST filter by TenantID.
package repository

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// GenericRepository provides tenant-scoped CRUD operations for any TenantModel.
// CONSTITUTION: Multi-Tenancy - All queries MUST filter by TenantID.
//
// Usage:
//
//	type BadgeRepository struct {
//	    *GenericRepository[*models.Badge]
//	}
//
//	func NewBadgeRepository(db *gorm.DB) *BadgeRepository {
//	    return &BadgeRepository{
//	        GenericRepository: NewGenericRepository[*models.Badge](db),
//	    }
//	}
type GenericRepository[T TenantModel] struct {
	db *gorm.DB
}

// NewGenericRepository creates a new GenericRepository for the given model type.
func NewGenericRepository[T TenantModel](db *gorm.DB) *GenericRepository[T] {
	return &GenericRepository[T]{db: db}
}

// getTenantID extracts TenantID from context.
// Returns ErrTenantIDMissing if not present.
func getTenantID(ctx context.Context) (uuid.UUID, error) {
	tenantID, ok := ctx.Value(TenantIDKey{}).(uuid.UUID)
	if !ok || tenantID == uuid.Nil {
		return uuid.Nil, ErrTenantIDMissing
	}
	return tenantID, nil
}

// Create inserts a new entity. TenantID is set automatically from context.
// Returns ErrTenantIDMissing if tenant_id not in context.
func (r *GenericRepository[T]) Create(ctx context.Context, entity T) error {
	tenantID, err := getTenantID(ctx)
	if err != nil {
		return fmt.Errorf("create failed: %w", err)
	}

	// Set TenantID on entity before creation
	entity.SetTenantID(tenantID)

	// Validate TenantID was set correctly
	if entity.GetTenantID() == uuid.Nil {
		return fmt.Errorf("create failed: %w", ErrModelNotTenantScoped)
	}

	result := r.db.WithContext(ctx).Create(entity)
	if result.Error != nil {
		return r.wrapDBError(result.Error, "create")
	}
	return nil
}

// FindByID retrieves an entity by its primary key within the tenant scope.
// Returns ErrRecordNotFound if entity doesn't exist or belongs to different tenant.
func (r *GenericRepository[T]) FindByID(ctx context.Context, id uuid.UUID) (T, error) {
	var zero T
	tenantID, err := getTenantID(ctx)
	if err != nil {
		return zero, fmt.Errorf("find by id failed: %w", err)
	}

	var entity T
	result := r.db.WithContext(ctx).
		Where("id = ? AND tenant_id = ?", id, tenantID).
		First(&entity)

	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return zero, ErrRecordNotFound
		}
		return zero, r.wrapDBError(result.Error, "find by id")
	}
	return entity, nil
}

// FindAll retrieves all entities for the current tenant with optional query options.
// Returns entities slice, total count (for pagination), and error.
func (r *GenericRepository[T]) FindAll(ctx context.Context, opts ...QueryOption) ([]T, int64, error) {
	tenantID, err := getTenantID(ctx)
	if err != nil {
		return nil, 0, fmt.Errorf("find all failed: %w", err)
	}

	var entities []T
	var count int64

	// Build base query with tenant scope
	query := r.db.WithContext(ctx).Where("tenant_id = ?", tenantID)

	// Count total before pagination
	var zero T
	if err := query.Model(&zero).Count(&count).Error; err != nil {
		return nil, 0, r.wrapDBError(err, "find all count")
	}

	// Apply options (pagination, ordering, etc.)
	for _, opt := range opts {
		query = opt(query)
	}

	// Execute query
	result := query.Find(&entities)
	if result.Error != nil {
		return nil, 0, r.wrapDBError(result.Error, "find all")
	}

	return entities, count, nil
}

// Update saves changes to an existing entity.
// Verifies entity belongs to current tenant before update.
// Returns ErrRecordNotFound if entity doesn't exist or tenant mismatch.
func (r *GenericRepository[T]) Update(ctx context.Context, entity T) error {
	tenantID, err := getTenantID(ctx)
	if err != nil {
		return fmt.Errorf("update failed: %w", err)
	}

	// Verify tenant match
	if entity.GetTenantID() != tenantID {
		return fmt.Errorf("update failed: %w", ErrTenantIDMismatch)
	}

	// Use UpdateColumn to avoid updating tenant_id
	result := r.db.WithContext(ctx).
		Where("id = ? AND tenant_id = ?", entity.GetID(), tenantID).
		Save(entity)

	if result.Error != nil {
		return r.wrapDBError(result.Error, "update")
	}
	if result.RowsAffected == 0 {
		return ErrRecordNotFound
	}
	return nil
}

// Delete removes an entity by ID within tenant scope.
// Uses soft delete if model has DeletedAt field (GORM convention).
// Returns ErrRecordNotFound if entity doesn't exist or tenant mismatch.
func (r *GenericRepository[T]) Delete(ctx context.Context, id uuid.UUID) error {
	tenantID, err := getTenantID(ctx)
	if err != nil {
		return fmt.Errorf("delete failed: %w", err)
	}

	var zero T
	result := r.db.WithContext(ctx).
		Where("id = ? AND tenant_id = ?", id, tenantID).
		Delete(&zero)

	if result.Error != nil {
		return r.wrapDBError(result.Error, "delete")
	}
	if result.RowsAffected == 0 {
		return ErrRecordNotFound
	}
	return nil
}

// FindByCondition retrieves entities matching a condition within tenant scope.
// Condition uses GORM where clause syntax.
func (r *GenericRepository[T]) FindByCondition(ctx context.Context, condition interface{}, args ...interface{}) ([]T, error) {
	tenantID, err := getTenantID(ctx)
	if err != nil {
		return nil, fmt.Errorf("find by condition failed: %w", err)
	}

	var entities []T
	result := r.db.WithContext(ctx).
		Where("tenant_id = ?", tenantID).
		Where(condition, args...).
		Find(&entities)

	if result.Error != nil {
		return nil, r.wrapDBError(result.Error, "find by condition")
	}
	return entities, nil
}

// Count returns the total number of entities for the current tenant.
func (r *GenericRepository[T]) Count(ctx context.Context) (int64, error) {
	tenantID, err := getTenantID(ctx)
	if err != nil {
		return 0, fmt.Errorf("count failed: %w", err)
	}

	var count int64
	var zero T
	result := r.db.WithContext(ctx).
		Model(&zero).
		Where("tenant_id = ?", tenantID).
		Count(&count)

	if result.Error != nil {
		return 0, r.wrapDBError(result.Error, "count")
	}
	return count, nil
}

// Exists checks if an entity exists by ID within tenant scope.
func (r *GenericRepository[T]) Exists(ctx context.Context, id uuid.UUID) (bool, error) {
	tenantID, err := getTenantID(ctx)
	if err != nil {
		return false, fmt.Errorf("exists failed: %w", err)
	}

	var count int64
	var zero T
	result := r.db.WithContext(ctx).
		Model(&zero).
		Where("id = ? AND tenant_id = ?", id, tenantID).
		Count(&count)

	if result.Error != nil {
		return false, r.wrapDBError(result.Error, "exists")
	}
	return count > 0, nil
}

// WithTransaction returns a new repository instance using the provided transaction.
// Use this for operations that span multiple repositories in a single transaction.
//
// Example:
//
//	err := txManager.RunInTransaction(ctx, func(tx *gorm.DB) error {
//	    txRepo := repo.WithTransaction(tx)
//	    return txRepo.Create(ctx, entity)
//	})
func (r *GenericRepository[T]) WithTransaction(tx *gorm.DB) *GenericRepository[T] {
	return &GenericRepository[T]{db: tx}
}

// wrapDBError wraps database errors with context.
func (r *GenericRepository[T]) wrapDBError(err error, operation string) error {
	if err == nil {
		return nil
	}

	// Check for specific error types
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return ErrRecordNotFound
	}

	// Check for PostgreSQL-specific errors
	errStr := err.Error()
	if contains(errStr, "duplicate key") || contains(errStr, "unique constraint") {
		return fmt.Errorf("%s failed: %w: %v", operation, ErrDuplicateKey, err)
	}
	if contains(errStr, "foreign key") {
		return fmt.Errorf("%s failed: %w: %v", operation, ErrForeignKeyViolation, err)
	}

	return fmt.Errorf("%s failed: %w: %v", operation, ErrDatabaseError, err)
}

// contains is a helper for string containment check
func contains(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(s) > 0 && containsHelper(s, substr))
}

func containsHelper(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
