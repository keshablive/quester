package repository

import (
	"context"
	"errors"
	"fmt"

	"gorm.io/gorm"
)

// BaseRepository provides tenant-scoped database operations
// CONSTITUTION: Multi-Tenant Architecture - All queries MUST be tenant-scoped
type BaseRepository struct {
	DB *gorm.DB
}

// NewBaseRepository creates a new base repository instance
func NewBaseRepository(db *gorm.DB) *BaseRepository {
	return &BaseRepository{DB: db}
}

// ValidateDB ensures database connection is not nil (fail-fast pattern)
// This should be called in all repository constructors to enforce explicit DI
func ValidateDB(db *gorm.DB, repositoryName string) {
	if db == nil {
		panic(fmt.Sprintf("database connection is nil for %s - ensure database is initialized before creating repositories", repositoryName))
	}
}

// WithTenant returns a GORM DB instance scoped to a specific tenant
// This MUST be called before any database query to ensure tenant isolation
func (r *BaseRepository) WithTenant(tenantID string) *gorm.DB {
	if tenantID == "" {
		// Return DB with error to prevent accidental non-scoped queries
		return r.DB.Where("1 = 0") // Returns no results
	}
	return r.DB.Where("tenant_id = ?", tenantID)
}

// WithTenantContext extracts tenant_id from context and scopes the query
func (r *BaseRepository) WithTenantContext(ctx context.Context) *gorm.DB {
	tenantID := GetTenantIDFromContext(ctx)
	if tenantID == "" {
		return r.DB.Where("1 = 0") // Returns no results for safety
	}
	return r.DB.WithContext(ctx).Where("tenant_id = ?", tenantID)
}

// GetTenantIDFromContext extracts tenant_id from context
func GetTenantIDFromContext(ctx context.Context) string {
	if tenantID, ok := ctx.Value("tenant_id").(string); ok {
		return tenantID
	}
	return ""
}

// Create inserts a new record with tenant_id
func (r *BaseRepository) Create(ctx context.Context, model interface{}) error {
	tenantID := GetTenantIDFromContext(ctx)
	if tenantID == "" {
		return errors.New("tenant_id not found in context")
	}

	// Set tenant_id on model if it has the field
	if err := setTenantID(model, tenantID); err != nil {
		return err
	}

	return r.DB.WithContext(ctx).Create(model).Error
}

// FindByID retrieves a record by ID with tenant scoping
func (r *BaseRepository) FindByID(ctx context.Context, model interface{}, id uint) error {
	return r.WithTenantContext(ctx).First(model, id).Error
}

// FindAll retrieves all records for a tenant with optional conditions
func (r *BaseRepository) FindAll(ctx context.Context, models interface{}, conditions ...interface{}) error {
	query := r.WithTenantContext(ctx)

	if len(conditions) > 0 {
		query = query.Where(conditions[0], conditions[1:]...)
	}

	return query.Find(models).Error
}

// Update updates a record with tenant verification
func (r *BaseRepository) Update(ctx context.Context, model interface{}) error {
	tenantID := GetTenantIDFromContext(ctx)
	if tenantID == "" {
		return errors.New("tenant_id not found in context")
	}

	// Verify model belongs to tenant before update
	if err := verifyTenantOwnership(model, tenantID); err != nil {
		return err
	}

	return r.DB.WithContext(ctx).Save(model).Error
}

// Delete soft-deletes a record with tenant verification
func (r *BaseRepository) Delete(ctx context.Context, model interface{}, id uint) error {
	tenantID := GetTenantIDFromContext(ctx)
	if tenantID == "" {
		return errors.New("tenant_id not found in context")
	}

	// Delete with tenant scoping to prevent cross-tenant deletion
	return r.WithTenant(tenantID).Delete(model, id).Error
}

// Count counts records for a tenant with optional conditions
func (r *BaseRepository) Count(ctx context.Context, model interface{}, conditions ...interface{}) (int64, error) {
	var count int64
	query := r.WithTenantContext(ctx).Model(model)

	if len(conditions) > 0 {
		query = query.Where(conditions[0], conditions[1:]...)
	}

	err := query.Count(&count).Error
	return count, err
}

// Exists checks if a record exists for a tenant
func (r *BaseRepository) Exists(ctx context.Context, model interface{}, conditions ...interface{}) (bool, error) {
	count, err := r.Count(ctx, model, conditions...)
	return count > 0, err
}

// Paginate returns paginated results for a tenant
func (r *BaseRepository) Paginate(ctx context.Context, models interface{}, page, pageSize int, conditions ...interface{}) (int64, error) {
	query := r.WithTenantContext(ctx)

	if len(conditions) > 0 {
		query = query.Where(conditions[0], conditions[1:]...)
	}

	// Get total count
	var total int64
	if err := query.Model(models).Count(&total).Error; err != nil {
		return 0, err
	}

	// Get paginated results
	offset := (page - 1) * pageSize
	if err := query.Offset(offset).Limit(pageSize).Find(models).Error; err != nil {
		return 0, err
	}

	return total, nil
}

// Transaction executes a function within a database transaction
func (r *BaseRepository) Transaction(ctx context.Context, fn func(*gorm.DB) error) error {
	return r.DB.WithContext(ctx).Transaction(fn)
}

// Helper functions

// setTenantID sets tenant_id field on a model using reflection
func setTenantID(model interface{}, tenantID string) error {
	// This is a simplified version - in production, use reflection
	// or ensure models implement a TenantScoped interface
	type TenantScoped interface {
		SetTenantID(string)
	}

	if ts, ok := model.(TenantScoped); ok {
		ts.SetTenantID(tenantID)
		return nil
	}

	// If model doesn't implement interface, assume GORM will handle it
	return nil
}

// verifyTenantOwnership checks if a model belongs to the tenant
func verifyTenantOwnership(model interface{}, tenantID string) error {
	// This is a simplified version - in production, use reflection
	type TenantScoped interface {
		GetTenantID() string
	}

	if ts, ok := model.(TenantScoped); ok {
		if ts.GetTenantID() != tenantID {
			return errors.New("access denied: resource belongs to different tenant")
		}
	}

	return nil
}

// TenantScopedModel provides base fields for all tenant-scoped models
type TenantScopedModel struct {
	TenantID string `gorm:"not null;index" json:"tenant_id"`
}

// SetTenantID implements TenantScoped interface
func (m *TenantScopedModel) SetTenantID(tenantID string) {
	m.TenantID = tenantID
}

// GetTenantID implements TenantScoped interface
func (m *TenantScopedModel) GetTenantID() string {
	return m.TenantID
}

// Repository interface for dependency injection
type Repository interface {
	WithTenant(tenantID string) *gorm.DB
	WithTenantContext(ctx context.Context) *gorm.DB
	Create(ctx context.Context, model interface{}) error
	FindByID(ctx context.Context, model interface{}, id uint) error
	FindAll(ctx context.Context, models interface{}, conditions ...interface{}) error
	Update(ctx context.Context, model interface{}) error
	Delete(ctx context.Context, model interface{}, id uint) error
	Count(ctx context.Context, model interface{}, conditions ...interface{}) (int64, error)
	Exists(ctx context.Context, model interface{}, conditions ...interface{}) (bool, error)
	Paginate(ctx context.Context, models interface{}, page, pageSize int, conditions ...interface{}) (int64, error)
	Transaction(ctx context.Context, fn func(*gorm.DB) error) error
}
