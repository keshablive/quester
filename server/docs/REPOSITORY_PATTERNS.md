# Repository Pattern Optimization Guide

## Overview

This guide documents repository patterns, optimizations, and best practices for the Quester platform.

## Core Principles

### 1. Multi-Tenancy (NON-NEGOTIABLE)

Every query MUST filter by `tenant_id` except for:

- Token validation (FindByID for refresh tokens)
- Global admin operations (explicitly documented)

```go
// ✅ CORRECT - Tenant-scoped query
func (r *Repository) FindByID(ctx context.Context, tenantID, id uuid.UUID) (*Model, error) {
    var model Model
    err := r.db.WithContext(ctx).
        Where("tenant_id = ? AND id = ?", tenantID, id).
        First(&model).Error
    return &model, err
}

// ❌ WRONG - Missing tenant filter
func (r *Repository) FindByID(ctx context.Context, id uuid.UUID) (*Model, error) {
    var model Model
    err := r.db.WithContext(ctx).First(&model, "id = ?", id).Error
    return &model, err
}
```

### 2. Context Propagation

Always pass `context.Context` as the first parameter.

```go
// ✅ CORRECT
func (r *Repository) Create(ctx context.Context, tenantID uuid.UUID, model *Model) error {
    return r.db.WithContext(ctx).Create(model).Error
}
```

### 3. Error Handling

- Wrap errors with context using `fmt.Errorf`
- Distinguish between not found vs database errors
- Return meaningful error messages

```go
// ✅ CORRECT
func (r *Repository) FindByID(ctx context.Context, tenantID, id uuid.UUID) (*Model, error) {
    var model Model
    err := r.db.WithContext(ctx).
        Where("tenant_id = ? AND id = ?", tenantID, id).
        First(&model).Error
    
    if err != nil {
        if err == gorm.ErrRecordNotFound {
            return nil, fmt.Errorf("model not found: %s", id)
        }
        return nil, fmt.Errorf("failed to find model: %w", err)
    }
    
    return &model, nil
}
```

## Standard Repository Structure

```go
package repositories

import (
    "context"
    "fmt"
    
    "github.com/google/uuid"
    "github.com/keshablive/quester/internal/framework/database"
    "github.com/keshablive/quester/internal/models"
    "gorm.io/gorm"
)

// FeatureRepository handles feature data persistence
type FeatureRepository struct {
    db *gorm.DB
}

// NewFeatureRepository creates a new repository instance
func NewFeatureRepository(db *gorm.DB) *FeatureRepository {
    if db == nil {
        db = database.DB
    }
    return &FeatureRepository{db: db}
}

// Create inserts a new feature
func (r *FeatureRepository) Create(ctx context.Context, tenantID uuid.UUID, feature *models.Feature) error {
    feature.TenantID = tenantID
    
    if err := r.db.WithContext(ctx).Create(feature).Error; err != nil {
        return fmt.Errorf("failed to create feature: %w", err)
    }
    
    return nil
}

// FindByID retrieves a feature by ID (tenant-scoped)
func (r *FeatureRepository) FindByID(ctx context.Context, tenantID, id uuid.UUID) (*models.Feature, error) {
    var feature models.Feature
    err := r.db.WithContext(ctx).
        Where("tenant_id = ? AND id = ?", tenantID, id).
        First(&feature).Error
    
    if err != nil {
        if err == gorm.ErrRecordNotFound {
            return nil, fmt.Errorf("feature not found: %s", id)
        }
        return nil, fmt.Errorf("failed to find feature: %w", err)
    }
    
    return &feature, nil
}

// List retrieves paginated features (tenant-scoped)
func (r *FeatureRepository) List(ctx context.Context, tenantID uuid.UUID, limit, offset int) ([]*models.Feature, error) {
    var features []*models.Feature
    
    err := r.db.WithContext(ctx).
        Where("tenant_id = ?", tenantID).
        Limit(limit).
        Offset(offset).
        Order("created_at DESC").
        Find(&features).Error
    
    if err != nil {
        return nil, fmt.Errorf("failed to list features: %w", err)
    }
    
    return features, nil
}

// Count returns total count (tenant-scoped)
func (r *FeatureRepository) Count(ctx context.Context, tenantID uuid.UUID) (int64, error) {
    var count int64
    
    err := r.db.WithContext(ctx).
        Model(&models.Feature{}).
        Where("tenant_id = ?", tenantID).
        Count(&count).Error
    
    if err != nil {
        return 0, fmt.Errorf("failed to count features: %w", err)
    }
    
    return count, nil
}

// Update updates feature fields
func (r *FeatureRepository) Update(ctx context.Context, feature *models.Feature) error {
    result := r.db.WithContext(ctx).
        Where("tenant_id = ?", feature.TenantID).
        Save(feature)
    
    if result.Error != nil {
        return fmt.Errorf("failed to update feature: %w", result.Error)
    }
    
    if result.RowsAffected == 0 {
        return fmt.Errorf("feature not found: %s", feature.ID)
    }
    
    return nil
}

// Delete soft-deletes a feature
func (r *FeatureRepository) Delete(ctx context.Context, tenantID, id uuid.UUID) error {
    result := r.db.WithContext(ctx).
        Where("tenant_id = ? AND id = ?", tenantID, id).
        Delete(&models.Feature{})
    
    if result.Error != nil {
        return fmt.Errorf("failed to delete feature: %w", result.Error)
    }
    
    if result.RowsAffected == 0 {
        return fmt.Errorf("feature not found: %s", id)
    }
    
    return nil
}
```

## Query Optimization

### 1. Eager Loading (Preload)

Load related associations to avoid N+1 queries.

```go
// ✅ OPTIMIZED - Single query with preload
func (r *QuestRepository) FindWithBadge(ctx context.Context, tenantID, id uuid.UUID) (*models.Quest, error) {
    var quest models.Quest
    err := r.db.WithContext(ctx).
        Preload("Badge").
        Where("tenant_id = ? AND id = ?", tenantID, id).
        First(&quest).Error
    
    return &quest, err
}

// ❌ UNOPTIMIZED - N+1 query problem
func (r *QuestRepository) FindWithBadge(ctx context.Context, tenantID, id uuid.UUID) (*models.Quest, error) {
    var quest models.Quest
    err := r.db.WithContext(ctx).
        Where("tenant_id = ? AND id = ?", tenantID, id).
        First(&quest).Error
    
    // Separate query for badge (N+1 problem)
    if quest.BadgeID != nil {
        r.db.First(&quest.Badge, *quest.BadgeID)
    }
    
    return &quest, err
}
```

### 2. Selective Field Loading

Load only needed fields to reduce memory and network usage.

```go
// ✅ OPTIMIZED - Select specific fields
func (r *UserRepository) ListUsernames(ctx context.Context, tenantID uuid.UUID) ([]string, error) {
    var usernames []string
    err := r.db.WithContext(ctx).
        Model(&models.User{}).
        Where("tenant_id = ?", tenantID).
        Pluck("username", &usernames).Error
    
    return usernames, err
}
```

### 3. Batch Operations

Use batch inserts for multiple records.

```go
// ✅ OPTIMIZED - Batch insert
func (r *BadgeRepository) CreateBatch(ctx context.Context, tenantID uuid.UUID, badges []*models.Badge) error {
    for _, badge := range badges {
        badge.TenantID = tenantID
    }
    
    if err := r.db.WithContext(ctx).CreateInBatches(badges, 100).Error; err != nil {
        return fmt.Errorf("failed to create badges: %w", err)
    }
    
    return nil
}

// ❌ UNOPTIMIZED - Individual inserts
func (r *BadgeRepository) CreateBatch(ctx context.Context, tenantID uuid.UUID, badges []*models.Badge) error {
    for _, badge := range badges {
        badge.TenantID = tenantID
        if err := r.db.WithContext(ctx).Create(badge).Error; err != nil {
            return err
        }
    }
    return nil
}
```

### 4. Use Indexes Effectively

Always filter by indexed columns first.

```go
// ✅ OPTIMIZED - Uses composite index (tenant_id, created_at)
func (r *Repository) ListRecent(ctx context.Context, tenantID uuid.UUID, limit int) ([]*Model, error) {
    var models []*Model
    err := r.db.WithContext(ctx).
        Where("tenant_id = ?", tenantID).  // Indexed
        Order("created_at DESC").          // Indexed (composite)
        Limit(limit).
        Find(&models).Error
    
    return models, err
}
```

### 5. Pagination Best Practices

```go
// ✅ OPTIMIZED - Cursor-based pagination (preferred for large datasets)
func (r *Repository) ListCursor(ctx context.Context, tenantID uuid.UUID, lastID uuid.UUID, limit int) ([]*Model, error) {
    query := r.db.WithContext(ctx).Where("tenant_id = ?", tenantID)
    
    if lastID != uuid.Nil {
        query = query.Where("id > ?", lastID)
    }
    
    var models []*Model
    err := query.Order("id ASC").Limit(limit).Find(&models).Error
    
    return models, err
}

// ✅ ACCEPTABLE - Offset pagination (for small datasets)
func (r *Repository) ListOffset(ctx context.Context, tenantID uuid.UUID, page, pageSize int) ([]*Model, error) {
    var models []*Model
    offset := (page - 1) * pageSize
    
    err := r.db.WithContext(ctx).
        Where("tenant_id = ?", tenantID).
        Limit(pageSize).
        Offset(offset).
        Find(&models).Error
    
    return models, err
}
```

## Advanced Patterns

### 1. Transactions

Use transactions for operations that must succeed or fail together.

```go
func (r *Repository) CreateWithRelations(ctx context.Context, tenantID uuid.UUID, parent *Model, children []*ChildModel) error {
    return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
        parent.TenantID = tenantID
        
        // Create parent
        if err := tx.Create(parent).Error; err != nil {
            return fmt.Errorf("failed to create parent: %w", err)
        }
        
        // Create children
        for _, child := range children {
            child.TenantID = tenantID
            child.ParentID = parent.ID
            
            if err := tx.Create(child).Error; err != nil {
                return fmt.Errorf("failed to create child: %w", err)
            }
        }
        
        return nil
    })
}
```

### 2. Raw SQL for Complex Queries

Use raw SQL when GORM becomes cumbersome.

```go
func (r *Repository) GetStatistics(ctx context.Context, tenantID uuid.UUID) (*Statistics, error) {
    var stats Statistics
    
    err := r.db.WithContext(ctx).Raw(`
        SELECT 
            COUNT(*) as total_count,
            COUNT(DISTINCT user_id) as unique_users,
            AVG(score) as average_score
        FROM features
        WHERE tenant_id = ? AND deleted_at IS NULL
    `, tenantID).Scan(&stats).Error
    
    if err != nil {
        return nil, fmt.Errorf("failed to get statistics: %w", err)
    }
    
    return &stats, nil
}
```

### 3. Conditional Queries

Build dynamic queries based on filters.

```go
func (r *Repository) Search(ctx context.Context, tenantID uuid.UUID, filters *SearchFilters) ([]*Model, error) {
    query := r.db.WithContext(ctx).Where("tenant_id = ?", tenantID)
    
    if filters.Name != "" {
        query = query.Where("name ILIKE ?", "%"+filters.Name+"%")
    }
    
    if filters.Status != "" {
        query = query.Where("status = ?", filters.Status)
    }
    
    if filters.MinScore > 0 {
        query = query.Where("score >= ?", filters.MinScore)
    }
    
    if filters.StartDate != nil {
        query = query.Where("created_at >= ?", filters.StartDate)
    }
    
    var models []*Model
    err := query.Order("created_at DESC").Find(&models).Error
    
    return models, err
}
```

## Performance Monitoring

### 1. Enable Query Logging (Development)

```go
// In config
DBLogQueries: true
```

### 2. Use EXPLAIN ANALYZE

```sql
EXPLAIN ANALYZE 
SELECT * FROM features 
WHERE tenant_id = 'xxx' AND created_at > '2025-01-01'
ORDER BY created_at DESC
LIMIT 10;
```

### 3. Monitor Slow Queries

```sql
-- Enable slow query logging in PostgreSQL
ALTER DATABASE quester SET log_min_duration_statement = 1000; -- Log queries > 1s
```

## Common Anti-Patterns

### ❌ 1. Missing Tenant Filter

```go
// WRONG - No tenant isolation
func (r *Repository) FindByID(ctx context.Context, id uuid.UUID) (*Model, error) {
    var model Model
    r.db.WithContext(ctx).First(&model, id)
    return &model, nil
}
```

### ❌ 2. Ignoring Context

```go
// WRONG - Not using context
func (r *Repository) List() ([]*Model, error) {
    var models []*Model
    r.db.Find(&models)
    return models, nil
}
```

### ❌ 3. Swallowing Errors

```go
// WRONG - Ignoring errors
func (r *Repository) Delete(id uuid.UUID) {
    r.db.Delete(&Model{}, id)
}
```

### ❌ 4. N+1 Query Problem

```go
// WRONG - Causes N+1 queries
func (r *Repository) GetPostsWithAuthors(ctx context.Context, tenantID uuid.UUID) ([]*Post, error) {
    var posts []*Post
    r.db.WithContext(ctx).Where("tenant_id = ?", tenantID).Find(&posts)
    
    // N+1: Separate query for each post's author
    for i := range posts {
        r.db.First(&posts[i].Author, posts[i].AuthorID)
    }
    
    return posts, nil
}

// CORRECT - Single query with preload
func (r *Repository) GetPostsWithAuthors(ctx context.Context, tenantID uuid.UUID) ([]*Post, error) {
    var posts []*Post
    err := r.db.WithContext(ctx).
        Preload("Author").
        Where("tenant_id = ?", tenantID).
        Find(&posts).Error
    
    return posts, err
}
```

## Testing Repositories

```go
func TestRepository_MultiTenantIsolation(t *testing.T) {
    tenant1 := uuid.New()
    tenant2 := uuid.New()
    ctx := context.Background()
    
    // Create record for tenant1
    model := &Model{Name: "Test"}
    err := repo.Create(ctx, tenant1, model)
    assert.NoError(t, err)
    
    // Verify tenant2 cannot access tenant1's data
    result, err := repo.FindByID(ctx, tenant2, model.ID)
    assert.Error(t, err)
    assert.Nil(t, result)
    assert.Contains(t, err.Error(), "not found")
}
```

## Migration Checklist

When creating a new repository:

- [ ] Struct with `db *gorm.DB` field
- [ ] Constructor accepting `db *gorm.DB` (nil-safe with database.DB fallback)
- [ ] All methods accept `context.Context` as first parameter
- [ ] All queries filter by `tenant_id` (except documented exceptions)
- [ ] Errors wrapped with context using `fmt.Errorf`
- [ ] Distinguish `ErrRecordNotFound` from other errors
- [ ] Use `WithContext(ctx)` on all queries
- [ ] Return meaningful error messages
- [ ] Follow naming conventions (Create, FindByID, List, Update, Delete)
- [ ] Add tests for multi-tenant isolation

---

**Remember**: Multi-tenancy is non-negotiable. Every query must be tenant-scoped unless explicitly documented otherwise.
