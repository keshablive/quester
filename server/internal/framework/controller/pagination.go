// Package controller provides controller helper functions for request handling.
package controller

import (
	"github.com/gofiber/fiber/v2"
)

// Pagination constants
const (
	// DefaultPageSize is the default number of items per page
	DefaultPageSize = 20

	// MaxPageSize is the maximum allowed page size (caps, doesn't reject)
	MaxPageSize = 100
)

// PaginationParams holds validated pagination parameters.
// PageSize is capped at MaxPageSize (100), never exceeds.
//
// Usage:
//
//	pagination := controller.ParsePagination(c)
//	results, total, err := repo.FindAll(ctx, repository.WithPagination(pagination.Page, pagination.PageSize))
type PaginationParams struct {
	// Page is the current page number (1-based, default: 1)
	Page int

	// PageSize is the number of items per page (default: 20, max: 100)
	PageSize int

	// Offset is the computed offset for database queries: (Page - 1) * PageSize
	Offset int
}

// ParsePagination extracts and validates pagination from query parameters.
// - Page defaults to 1 if missing or < 1
// - PageSize defaults to 20 if missing or < 1
// - PageSize is capped at 100 if > 100 (not rejected, per spec clarification)
//
// Query parameters: page, page_size (also accepts pageSize and limit)
//
// Example:
//
//	GET /api/badges?page=2&page_size=50
//	pagination := controller.ParsePagination(c)
//	// pagination.Page = 2, pagination.PageSize = 50, pagination.Offset = 50
func ParsePagination(c *fiber.Ctx) PaginationParams {
	// Parse page with default of 1
	page := c.QueryInt("page", 1)
	if page < 1 {
		page = 1
	}

	// Parse pageSize from multiple parameter names (page_size, pageSize, limit)
	pageSize := c.QueryInt("page_size", 0)
	if pageSize == 0 {
		pageSize = c.QueryInt("pageSize", 0)
	}
	if pageSize == 0 {
		pageSize = c.QueryInt("limit", 0)
	}
	if pageSize == 0 {
		pageSize = DefaultPageSize
	}

	// Apply bounds
	if pageSize < 1 {
		pageSize = DefaultPageSize
	}
	if pageSize > MaxPageSize {
		pageSize = MaxPageSize // Cap, don't reject
	}

	// Calculate offset
	offset := (page - 1) * pageSize

	return PaginationParams{
		Page:     page,
		PageSize: pageSize,
		Offset:   offset,
	}
}

// NewPaginationParams creates PaginationParams with given values.
// Applies the same validation rules as ParsePagination.
func NewPaginationParams(page, pageSize int) PaginationParams {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = DefaultPageSize
	}
	if pageSize > MaxPageSize {
		pageSize = MaxPageSize
	}

	return PaginationParams{
		Page:     page,
		PageSize: pageSize,
		Offset:   (page - 1) * pageSize,
	}
}
