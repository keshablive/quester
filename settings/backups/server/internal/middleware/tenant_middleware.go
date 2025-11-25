package middleware

import (
	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
)

// TenantMiddleware extracts tenant_id from JWT claims and injects into request context
// CONSTITUTION: Multi-Tenant Architecture - ALL routes MUST be tenant-scoped
func TenantMiddleware() fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Extract JWT from context (assumes JWT middleware ran first)
		user := c.Locals("user")
		if user == nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Unauthorized - no JWT token found",
			})
		}

		// Extract claims
		token, ok := user.(*jwt.Token)
		if !ok {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Invalid JWT token format",
			})
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Invalid JWT claims",
			})
		}

		// Extract tenant_id from claims
		tenantID, ok := claims["tenant_id"]
		if !ok {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "Forbidden - no tenant_id in JWT claims",
			})
		}

		// Validate tenant_id is not empty
		tenantIDStr, ok := tenantID.(string)
		if !ok || tenantIDStr == "" {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "Forbidden - invalid tenant_id format",
			})
		}

		// Inject tenant_id into context for downstream handlers
		c.Locals("tenant_id", tenantIDStr)

		return c.Next()
	}
}

// GetTenantID retrieves tenant_id from request context
// Returns empty string if not found
func GetTenantID(c *fiber.Ctx) string {
	tenantID := c.Locals("tenant_id")
	if tenantID == nil {
		return ""
	}

	tenantIDStr, ok := tenantID.(string)
	if !ok {
		return ""
	}

	return tenantIDStr
}

// RequireTenant ensures tenant_id exists in context, returns 403 if missing
func RequireTenant() fiber.Handler {
	return func(c *fiber.Ctx) error {
		tenantID := GetTenantID(c)
		if tenantID == "" {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "Forbidden - tenant context required",
			})
		}
		return c.Next()
	}
}
