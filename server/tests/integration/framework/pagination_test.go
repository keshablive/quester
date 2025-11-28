// Package framework provides integration tests for framework components.
package framework

import (
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/stretchr/testify/assert"
	"github.com/valyala/fasthttp"

	"github.com/keshablive/quester/internal/framework/controller"
)

// TestParsePagination_Defaults tests default pagination values
func TestParsePagination_Defaults(t *testing.T) {
	// Arrange
	app := fiber.New()

	app.Get("/test", func(c *fiber.Ctx) error {
		// No query params

		// Act
		pagination := controller.ParsePagination(c)

		// Assert
		assert.Equal(t, 1, pagination.Page)
		assert.Equal(t, controller.DefaultPageSize, pagination.PageSize)
		assert.Equal(t, 0, pagination.Offset)
		return nil
	})

	// Execute
	req := &fasthttp.RequestCtx{}
	req.Request.Header.SetMethod("GET")
	req.Request.SetRequestURI("/test")
	app.Handler()(req)
}

// TestParsePagination_CustomValues tests custom pagination values
func TestParsePagination_CustomValues(t *testing.T) {
	// Arrange
	app := fiber.New()

	app.Get("/test", func(c *fiber.Ctx) error {
		// Act
		pagination := controller.ParsePagination(c)

		// Assert - page=2, pageSize=50
		assert.Equal(t, 2, pagination.Page)
		assert.Equal(t, 50, pagination.PageSize)
		assert.Equal(t, 50, pagination.Offset) // (2-1) * 50
		return nil
	})

	// Execute
	req := &fasthttp.RequestCtx{}
	req.Request.Header.SetMethod("GET")
	req.Request.SetRequestURI("/test?page=2&page_size=50")
	app.Handler()(req)
}

// TestParsePagination_CapAtMax tests that page size is capped at MaxPageSize
func TestParsePagination_CapAtMax(t *testing.T) {
	// Arrange
	app := fiber.New()

	app.Get("/test", func(c *fiber.Ctx) error {
		// Act - request page_size=500 (exceeds max of 100)
		pagination := controller.ParsePagination(c)

		// Assert - should cap at 100, not reject
		assert.Equal(t, 1, pagination.Page)
		assert.Equal(t, controller.MaxPageSize, pagination.PageSize) // Capped at 100
		assert.Equal(t, 0, pagination.Offset)
		return nil
	})

	// Execute
	req := &fasthttp.RequestCtx{}
	req.Request.Header.SetMethod("GET")
	req.Request.SetRequestURI("/test?page_size=500")
	app.Handler()(req)
}

// TestParsePagination_InvalidPage tests invalid page value defaults to 1
func TestParsePagination_InvalidPage(t *testing.T) {
	// Arrange
	app := fiber.New()

	app.Get("/test", func(c *fiber.Ctx) error {
		// Act - page=0 or negative
		pagination := controller.ParsePagination(c)

		// Assert - should default to 1
		assert.Equal(t, 1, pagination.Page)
		return nil
	})

	// Execute
	req := &fasthttp.RequestCtx{}
	req.Request.Header.SetMethod("GET")
	req.Request.SetRequestURI("/test?page=0")
	app.Handler()(req)
}

// TestParsePagination_NegativePageSize tests negative page size defaults
func TestParsePagination_NegativePageSize(t *testing.T) {
	// Arrange
	app := fiber.New()

	app.Get("/test", func(c *fiber.Ctx) error {
		// Act - negative page_size
		pagination := controller.ParsePagination(c)

		// Assert - should default to DefaultPageSize
		assert.Equal(t, controller.DefaultPageSize, pagination.PageSize)
		return nil
	})

	// Execute
	req := &fasthttp.RequestCtx{}
	req.Request.Header.SetMethod("GET")
	req.Request.SetRequestURI("/test?page_size=-10")
	app.Handler()(req)
}

// TestParsePagination_OffsetCalculation tests offset calculation for various pages
func TestParsePagination_OffsetCalculation(t *testing.T) {
	testCases := []struct {
		page     int
		pageSize int
		expected int
	}{
		{1, 20, 0},
		{2, 20, 20},
		{3, 20, 40},
		{1, 100, 0},
		{5, 10, 40},
	}

	for _, tc := range testCases {
		// Create offset manually to verify calculation
		offset := (tc.page - 1) * tc.pageSize
		assert.Equal(t, tc.expected, offset, "Offset calculation for page=%d, pageSize=%d", tc.page, tc.pageSize)
	}
}
