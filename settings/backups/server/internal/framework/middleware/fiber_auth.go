// Fiber-compatible authentication and authorization middleware
package middleware

import (
	"context"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/yourusername/quester/internal/framework/metrics"
	"github.com/yourusername/quester/internal/models"
	"github.com/yourusername/quester/internal/services"
)

// Fiber context keys for storing authenticated user data
const (
	FiberUserIDKey   = "user_id"
	FiberTenantIDKey = "tenant_id"
	FiberRoleKey     = "role"
)

// FiberAuthMiddleware validates JWT tokens for Fiber framework
// Returns 401 Unauthorized if token is missing, invalid, or expired
func FiberAuthMiddleware() fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Extract Authorization header
		authHeader := c.Get("Authorization")
		if authHeader == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error":   "missing authorization header",
				"message": "",
			})
		}

		// Validate Bearer format
		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error":   "invalid authorization format",
				"message": "expected 'Bearer <token>'",
			})
		}

		tokenString := parts[1]

		// Validate token and extract claims
		claims, err := services.ValidateToken(tokenString)
		if err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error":   "invalid or expired token",
				"message": err.Error(),
			})
		}

		// Parse user ID from claims
		userID, err := services.ParseUserID(claims)
		if err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error":   "invalid user ID in token",
				"message": err.Error(),
			})
		}

		// Parse tenant ID from claims
		tenantID, err := services.ParseTenantID(claims)
		if err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error":   "invalid tenant ID in token",
				"message": err.Error(),
			})
		}

		// Parse role from claims
		role := models.Role(claims.Role)
		if !role.IsValid() {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error":   "invalid role in token",
				"message": "",
			})
		}

		// Store claims in Fiber context
		c.Locals(FiberUserIDKey, userID)
		c.Locals(FiberTenantIDKey, tenantID)
		c.Locals(FiberRoleKey, role)

		// Continue to next handler
		return c.Next()
	}
}

// FiberRoleMiddleware enforces role-based access control for Fiber
// Requires FiberAuthMiddleware to be applied first
// ADMIN role bypasses all role checks
func FiberRoleMiddleware(requiredRole models.Role) fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Extract role from Fiber context (set by FiberAuthMiddleware)
		role, ok := c.Locals(FiberRoleKey).(models.Role)
		if !ok {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error":   "unauthorized",
				"message": "role not found in context - ensure FiberAuthMiddleware is applied",
			})
		}

		// ADMIN bypasses all role checks (per spec FR-019)
		if role == models.RoleAdmin {
			return c.Next()
		}

		// Check if role matches required role
		if role != requiredRole {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error":   "forbidden",
				"message": "insufficient permissions - requires " + string(requiredRole) + " role",
			})
		}

		// Role matches - allow access
		return c.Next()
	}
}

// GetUserIDFromFiberContext extracts the user ID from Fiber context
func GetUserIDFromFiberContext(c *fiber.Ctx) (uuid.UUID, bool) {
	userID, ok := c.Locals(FiberUserIDKey).(uuid.UUID)
	return userID, ok
}

// GetTenantIDFromFiberContext extracts the tenant ID from Fiber context
func GetTenantIDFromFiberContext(c *fiber.Ctx) (uuid.UUID, bool) {
	tenantID, ok := c.Locals(FiberTenantIDKey).(uuid.UUID)
	return tenantID, ok
}

// GetRoleFromFiberContext extracts the role from Fiber context
func GetRoleFromFiberContext(c *fiber.Ctx) (models.Role, bool) {
	role, ok := c.Locals(FiberRoleKey).(models.Role)
	return role, ok
}

// FiberTenantIsolationMiddleware enforces tenant isolation for Fiber
// Requires FiberAuthMiddleware to be applied first
// ADMIN role bypasses tenant isolation (per spec FR-019)
// Validates that the tenant_id in the request matches the authenticated user's tenant_id
func FiberTenantIsolationMiddleware() fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Extract role from context (set by FiberAuthMiddleware)
		role, ok := c.Locals(FiberRoleKey).(models.Role)
		if !ok {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error":   "unauthorized",
				"message": "authentication required - ensure FiberAuthMiddleware is applied",
			})
		}

		// ADMIN bypasses tenant isolation (per spec FR-019)
		if role == models.RoleAdmin {
			return c.Next()
		}

		// Extract tenant_id from JWT claims (set by FiberAuthMiddleware)
		userTenantID, ok := c.Locals(FiberTenantIDKey).(uuid.UUID)
		if !ok {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error":   "unauthorized",
				"message": "tenant_id not found in context",
			})
		}

		// Extract tenant_id from URL params (if present)
		tenantIDParam := c.Params("tenant_id")
		if tenantIDParam == "" {
			// No tenant_id in URL params - skip validation
			// This allows non-tenant-scoped endpoints to pass through
			return c.Next()
		}

		// Parse tenant_id from URL param
		resourceTenantID, err := uuid.Parse(tenantIDParam)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error":   "invalid tenant_id parameter",
				"message": "tenant_id must be a valid UUID",
			})
		}

		// Verify user's tenant matches resource tenant
		if userTenantID != resourceTenantID {
			// Capture request info now (before goroutine) to avoid accessing c in another goroutine
			userID, _ := GetUserIDFromFiberContext(c)
			ip := c.IP()
			ua := c.Get("User-Agent")
			resourceIDParam := c.Params("id")
			var resourceUUID uuid.UUID
			if resourceIDParam != "" {
				if parsed, err := uuid.Parse(resourceIDParam); err == nil {
					resourceUUID = parsed
				}
			}

			// Log violation for audit (FR-015)
			// Non-blocking: record audit entry and increment metrics, but still return 403 immediately
			go func() {
				// Safely attempt to log the violation; do not affect response path
				auditSvc := services.NewAuditLogService()

				// Fire-and-forget
				_ = auditSvc.LogTenantViolation(context.Background(), userID, userTenantID, resourceTenantID, "resource", resourceUUID, "access_attempt", ip, ua)

				// Increment Prometheus metric if available
				metrics.IncTenantViolation()
			}()

			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error":   "forbidden",
				"message": "access denied - cross-tenant access not allowed",
			})
		}

		// Tenant matches - allow access
		return c.Next()
	}
}
