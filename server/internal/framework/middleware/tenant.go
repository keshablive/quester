// Tenant context injection
package middleware

import (
	"github.com/gofiber/fiber/v2"
	"github.com/keshablive/quester/internal/framework/contextkeys"
)

// FiberTenantMiddleware extracts and validates tenant context for Fiber
// Requires FiberAuthMiddleware to be applied first
func FiberTenantMiddleware() fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Tenant ID should already be in context from auth middleware
		// Just validate it exists
		tenantID := c.Locals(contextkeys.TenantIDKey)
		if tenantID == nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "missing tenant context",
			})
		}
		return c.Next()
	}
}
