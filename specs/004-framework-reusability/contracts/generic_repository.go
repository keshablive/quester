// Package repository provides the generic repository interface and TenantModel constraint.
// This is the CONTRACT file - actual implementation will be in server/internal/framework/repository/
package contracts

import (
	"context"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// TenantModel is a type constraint for models that support multi-tenancy.
// CONSTITUTION: Multi-Tenancy (NON-NEGOTIABLE) - All models MUST implement this interface.
//
// Any model used with GenericRepository MUST:
// - Have a TenantID field of type uuid.UUID
// - Implement these methods for tenant scope enforcement
//
// Example implementation:
//
//	type Badge struct {
//	    ID        uuid.UUID `gorm:"type:uuid;primaryKey"`
//	    TenantID  uuid.UUID `gorm:"type:uuid;not null;index"`
//	    Name      string
//	    CreatedAt time.Time
//	    UpdatedAt time.Time
//	}
//
//	func (b *Badge) GetID() uuid.UUID       { return b.ID }
//	func (b *Badge) GetTenantID() uuid.UUID { return b.TenantID }
//	func (b *Badge) SetTenantID(id uuid.UUID) { b.TenantID = id }
//	func (b *Badge) TableName() string      { return "badges" }
type TenantModel interface {
	// GetID returns the primary key as UUID
	GetID() uuid.UUID

	// GetTenantID returns the tenant scope identifier
	GetTenantID() uuid.UUID

	// SetTenantID sets the tenant scope identifier (called during Create)
	SetTenantID(id uuid.UUID)

	// TableName returns the database table name (GORM convention)
	TableName() string
}

// QueryOption is a functional option for customizing repository queries.
type QueryOption func(*gorm.DB) *gorm.DB

// Repository defines the contract for generic CRUD operations.
// All methods are tenant-scoped - TenantID is extracted from context.
type Repository[T TenantModel] interface {
	// Create inserts a new entity. TenantID is set automatically from context.
	// Returns ErrTenantIDMissing if tenant_id not in context.
	Create(ctx context.Context, entity *T) error

	// FindByID retrieves an entity by its primary key within the tenant scope.
	// Returns ErrRecordNotFound if entity doesn't exist or belongs to different tenant.
	FindByID(ctx context.Context, id uuid.UUID) (*T, error)

	// FindAll retrieves all entities for the current tenant with optional query options.
	// Returns entities slice, total count (for pagination), and error.
	FindAll(ctx context.Context, opts ...QueryOption) ([]T, int64, error)

	// Update saves changes to an existing entity.
	// Verifies entity belongs to current tenant before update.
	// Returns ErrRecordNotFound if entity doesn't exist or tenant mismatch.
	Update(ctx context.Context, entity *T) error

	// Delete removes an entity by ID within tenant scope.
	// Uses soft delete if model has DeletedAt field (GORM convention).
	// Returns ErrRecordNotFound if entity doesn't exist or tenant mismatch.
	Delete(ctx context.Context, id uuid.UUID) error

	// FindByCondition retrieves entities matching a condition within tenant scope.
	// Condition uses GORM where clause syntax.
	FindByCondition(ctx context.Context, condition interface{}, args ...interface{}) ([]T, error)

	// Count returns the total number of entities for the current tenant.
	Count(ctx context.Context) (int64, error)

	// Exists checks if an entity exists by ID within tenant scope.
	Exists(ctx context.Context, id uuid.UUID) (bool, error)

	// WithTransaction returns a new repository instance using the provided transaction.
	// Use this for operations that span multiple repositories in a single transaction.
	WithTransaction(tx *gorm.DB) Repository[T]
}

// Common QueryOptions

// WithPagination returns a QueryOption that applies pagination.
func WithPagination(page, pageSize int) QueryOption {
	return func(db *gorm.DB) *gorm.DB {
		offset := (page - 1) * pageSize
		return db.Offset(offset).Limit(pageSize)
	}
}

// WithOrder returns a QueryOption that applies ordering.
func WithOrder(column string, desc bool) QueryOption {
	return func(db *gorm.DB) *gorm.DB {
		order := column
		if desc {
			order += " DESC"
		}
		return db.Order(order)
	}
}

// WithPreload returns a QueryOption that preloads associations.
func WithPreload(association string) QueryOption {
	return func(db *gorm.DB) *gorm.DB {
		return db.Preload(association)
	}
}

// WithCondition returns a QueryOption that adds a where condition.
func WithCondition(query interface{}, args ...interface{}) QueryOption {
	return func(db *gorm.DB) *gorm.DB {
		return db.Where(query, args...)
	}
}
