// Package repository provides generic repository patterns with multi-tenant support.
package repository

import "gorm.io/gorm"

// QueryOption is a functional option for customizing repository queries.
// Use query options to add filtering, ordering, pagination, and other query modifiers.
//
// Example usage:
//
//	results, total, err := repo.FindAll(ctx,
//	    WithPagination(page, pageSize),
//	    WithOrder("created_at DESC"),
//	    WithPreload("User"),
//	)
type QueryOption func(*gorm.DB) *gorm.DB

// WithPagination returns a QueryOption that applies pagination.
// Page is 1-based. Offset is calculated as (page - 1) * pageSize.
func WithPagination(page, pageSize int) QueryOption {
	return func(db *gorm.DB) *gorm.DB {
		if page < 1 {
			page = 1
		}
		if pageSize < 1 {
			pageSize = 20
		}
		offset := (page - 1) * pageSize
		return db.Offset(offset).Limit(pageSize)
	}
}

// WithOrder returns a QueryOption that applies ordering.
// Order string uses GORM syntax, e.g., "created_at DESC", "name ASC".
func WithOrder(order string) QueryOption {
	return func(db *gorm.DB) *gorm.DB {
		if order == "" {
			return db
		}
		return db.Order(order)
	}
}

// WithPreload returns a QueryOption that preloads an association.
// Use for eager loading related entities.
func WithPreload(association string, args ...interface{}) QueryOption {
	return func(db *gorm.DB) *gorm.DB {
		return db.Preload(association, args...)
	}
}

// WithWhere returns a QueryOption that adds a WHERE condition.
// Condition uses GORM where clause syntax.
func WithWhere(query interface{}, args ...interface{}) QueryOption {
	return func(db *gorm.DB) *gorm.DB {
		return db.Where(query, args...)
	}
}

// WithSelect returns a QueryOption that specifies columns to select.
// Use to limit returned fields for performance.
func WithSelect(columns ...string) QueryOption {
	return func(db *gorm.DB) *gorm.DB {
		return db.Select(columns)
	}
}

// WithJoin returns a QueryOption that adds a JOIN clause.
func WithJoin(query string, args ...interface{}) QueryOption {
	return func(db *gorm.DB) *gorm.DB {
		return db.Joins(query, args...)
	}
}

// WithDistinct returns a QueryOption that adds DISTINCT to the query.
func WithDistinct() QueryOption {
	return func(db *gorm.DB) *gorm.DB {
		return db.Distinct()
	}
}

// WithGroup returns a QueryOption that adds GROUP BY clause.
func WithGroup(name string) QueryOption {
	return func(db *gorm.DB) *gorm.DB {
		return db.Group(name)
	}
}

// WithHaving returns a QueryOption that adds HAVING clause.
func WithHaving(query interface{}, args ...interface{}) QueryOption {
	return func(db *gorm.DB) *gorm.DB {
		return db.Having(query, args...)
	}
}
