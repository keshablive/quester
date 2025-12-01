// Middleware aliases and helpers for backward compatibility
package middleware

import (
	"github.com/gofiber/fiber/v2"
	"github.com/keshablive/quester/internal/framework/controller"
)

// Auth is an alias for FiberAuthMiddleware for backward compatibility
func Auth() fiber.Handler {
	return FiberAuthMiddleware()
}

// RateLimit is a legacy stub function - DO NOT USE
// Use FiberRateLimitByIP(), FiberRateLimitByEmail(), or FiberRateLimitMiddleware() instead
// from rate_limit.go which implements proper Redis-backed rate limiting
// Example: middleware.FiberRateLimitByIP(100, 1*time.Minute)
func RateLimit(requestsPerMinute int) fiber.Handler {
	// This function is deprecated and should not be used
	// It exists only for backward compatibility
	// All routes should use FiberRateLimitByIP() from rate_limit.go
	return func(c *fiber.Ctx) error {
		return c.Next()
	}
}

// RateLimiter is a legacy stub - DO NOT USE
// Use FiberRateLimitByIP() from rate_limit.go instead
func RateLimiter() fiber.Handler {
	return RateLimit(60)
}

// TenantMiddleware extracts and validates tenant context
func TenantMiddleware() fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Tenant ID should already be in context from auth middleware
		// Just validate it exists
		tenantID := c.Locals(controller.FiberTenantIDKey)
		if tenantID == nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "missing tenant context",
			})
		}
		return c.Next()
	}
}
