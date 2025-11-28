// Package framework provides integration tests for framework components.
package framework

import (
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/valyala/fasthttp"

	"github.com/keshablive/quester/internal/framework/controller"
)

// TestGetAuthContext_Success tests successful auth context extraction
func TestGetAuthContext_Success(t *testing.T) {
	// Arrange
	app := fiber.New()
	userID := uuid.New()
	tenantID := uuid.New()

	app.Get("/test", func(c *fiber.Ctx) error {
		// Set values in locals (simulating FiberAuthMiddleware)
		c.Locals(controller.FiberUserIDKey, userID)
		c.Locals(controller.FiberTenantIDKey, tenantID)
		c.Locals(controller.FiberRoleKey, "Admin")

		// Act
		auth, err := controller.GetAuthContext(c)

		// Assert
		assert.NoError(t, err)
		assert.NotNil(t, auth)
		assert.Equal(t, userID, auth.UserID)
		assert.Equal(t, tenantID, auth.TenantID)
		assert.Equal(t, "Admin", auth.Role)
		return nil
	})

	// Execute
	req := &fasthttp.RequestCtx{}
	req.Request.Header.SetMethod("GET")
	req.Request.SetRequestURI("/test")
	app.Handler()(req)
}

// TestGetAuthContext_MissingClaims tests error when claims are missing
func TestGetAuthContext_MissingClaims(t *testing.T) {
	// Arrange
	app := fiber.New()

	app.Get("/test", func(c *fiber.Ctx) error {
		// No claims set

		// Act
		auth, err := controller.GetAuthContext(c)

		// Assert
		assert.Error(t, err)
		assert.Nil(t, auth)
		assert.True(t, controller.IsAuthError(err))
		return nil
	})

	// Execute
	req := &fasthttp.RequestCtx{}
	req.Request.Header.SetMethod("GET")
	req.Request.SetRequestURI("/test")
	app.Handler()(req)
}

// TestGetAuthContext_InvalidUserID tests error when user ID is invalid
func TestGetAuthContext_InvalidUserID(t *testing.T) {
	// Arrange
	app := fiber.New()
	tenantID := uuid.New()

	app.Get("/test", func(c *fiber.Ctx) error {
		c.Locals(controller.FiberUserIDKey, "invalid-uuid")
		c.Locals(controller.FiberTenantIDKey, tenantID)
		c.Locals(controller.FiberRoleKey, "Admin")

		// Act
		auth, err := controller.GetAuthContext(c)

		// Assert
		assert.Error(t, err)
		assert.Nil(t, auth)
		return nil
	})

	// Execute
	req := &fasthttp.RequestCtx{}
	req.Request.Header.SetMethod("GET")
	req.Request.SetRequestURI("/test")
	app.Handler()(req)
}

// TestGetAuthContext_InvalidTenantID tests error when tenant ID is invalid
func TestGetAuthContext_InvalidTenantID(t *testing.T) {
	// Arrange
	app := fiber.New()
	userID := uuid.New()

	app.Get("/test", func(c *fiber.Ctx) error {
		c.Locals(controller.FiberUserIDKey, userID)
		c.Locals(controller.FiberTenantIDKey, "invalid-uuid")
		c.Locals(controller.FiberRoleKey, "Admin")

		// Act
		auth, err := controller.GetAuthContext(c)

		// Assert
		assert.Error(t, err)
		assert.Nil(t, auth)
		return nil
	})

	// Execute
	req := &fasthttp.RequestCtx{}
	req.Request.Header.SetMethod("GET")
	req.Request.SetRequestURI("/test")
	app.Handler()(req)
}

// TestGetAuthContext_NilUserID tests error when user ID is nil UUID
func TestGetAuthContext_NilUserID(t *testing.T) {
	// Arrange
	app := fiber.New()
	tenantID := uuid.New()

	app.Get("/test", func(c *fiber.Ctx) error {
		c.Locals(controller.FiberUserIDKey, uuid.Nil)
		c.Locals(controller.FiberTenantIDKey, tenantID)
		c.Locals(controller.FiberRoleKey, "Admin")

		// Act
		auth, err := controller.GetAuthContext(c)

		// Assert
		assert.Error(t, err)
		assert.Nil(t, auth)
		return nil
	})

	// Execute
	req := &fasthttp.RequestCtx{}
	req.Request.Header.SetMethod("GET")
	req.Request.SetRequestURI("/test")
	app.Handler()(req)
}
