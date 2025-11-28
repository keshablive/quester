package utils

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// TenantQuery adds tenant filtering to a GORM query
// This helper ensures consistent tenant isolation across all repositories
func TenantQuery(db *gorm.DB, ctx context.Context, tenantID uuid.UUID) *gorm.DB {
	return db.WithContext(ctx).Where("tenant_id = ?", tenantID)
}

// TenantQueryString is a variant for string-based tenant IDs
func TenantQueryString(db *gorm.DB, ctx context.Context, tenantID string) *gorm.DB {
	return db.WithContext(ctx).Where("tenant_id = ?", tenantID)
}

// BuildPaginatedQuery creates a reusable base query for pagination
// This prevents N+1 query problems by building the query once
//
// Usage:
//   baseQuery := BuildPaginatedQuery(db, ctx, tenantID, filters)
//   total, err := CountQuery(baseQuery, &Model{})
//   results, err := FetchPaginatedResults(baseQuery, page, pageSize, &results)
func BuildPaginatedQuery(db *gorm.DB, ctx context.Context, tenantID uuid.UUID, filters map[string]interface{}) *gorm.DB {
	query := TenantQuery(db, ctx, tenantID)

	// Apply additional filters
	for key, value := range filters {
		query = query.Where(fmt.Sprintf("%s = ?", key), value)
	}

	return query
}

// BuildPaginatedQueryString is a variant for string-based tenant IDs
func BuildPaginatedQueryString(db *gorm.DB, ctx context.Context, tenantID string, filters map[string]interface{}) *gorm.DB {
	query := TenantQueryString(db, ctx, tenantID)

	// Apply additional filters
	for key, value := range filters {
		query = query.Where(fmt.Sprintf("%s = ?", key), value)
	}

	return query
}

// CountQuery executes a count query on the base query
func CountQuery(query *gorm.DB, model interface{}) (int64, error) {
	var total int64
	if err := query.Model(model).Count(&total).Error; err != nil {
		return 0, fmt.Errorf("failed to count entities: %w", err)
	}
	return total, nil
}

// FetchPaginatedResults fetches paginated results from the base query
func FetchPaginatedResults(query *gorm.DB, page, pageSize int, results interface{}) error {
	offset := (page - 1) * pageSize
	if err := query.Offset(offset).Limit(pageSize).Find(results).Error; err != nil {
		return fmt.Errorf("failed to fetch paginated results: %w", err)
	}
	return nil
}

// ValidatePaginationParams validates page and pageSize parameters
func ValidatePaginationParams(page, pageSize int) error {
	if page < 1 {
		return fmt.Errorf("page must be >= 1, got %d", page)
	}
	if pageSize < 1 {
		return fmt.Errorf("pageSize must be >= 1, got %d", pageSize)
	}
	if pageSize > 100 {
		return fmt.Errorf("pageSize must be <= 100, got %d", pageSize)
	}
	return nil
}
