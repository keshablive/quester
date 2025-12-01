// Fiber-compatible authentication and authorization middleware
package middleware

import (
	"context"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/keshablive/quester/internal/framework/auth"
	"github.com/keshablive/quester/internal/framework/contextkeys"
)

// TenantViolationLogger is an interface for logging tenant isolation violations
// Implement this interface in your app layer and set it via SetTenantViolationLogger
type TenantViolationLogger interface {
	LogViolation(ctx context.Context, userID, userTenantID, resourceTenantID uuid.UUID, resourceType string, resourceID uuid.UUID, action, ip, userAgent string)
}

// tenantViolationLogger holds the injected logger for tenant violations
var tenantViolationLogger TenantViolationLogger

// SetTenantViolationLogger sets the tenant violation logger
// This should be called during application initialization
func SetTenantViolationLogger(logger TenantViolationLogger) {
	tenantViolationLogger = logger
}

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
		claims, err := auth.ValidateToken(tokenString)
		if err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error":   "invalid or expired token",
				"message": err.Error(),
			})
		}

		// Parse user ID from claims
		userID, err := auth.ParseUserID(claims)
		if err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error":   "invalid user ID in token",
				"message": err.Error(),
			})
		}

		// Parse tenant ID from claims
		tenantID, err := auth.ParseTenantID(claims)
		if err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error":   "invalid tenant ID in token",
				"message": err.Error(),
			})
		}

		// Parse role from claims - store as string to allow app-layer type conversion
		role := claims.Role
		if role == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error":   "invalid role in token",
				"message": "",
			})
		}

		// Store claims in Fiber context using controller constants for consistency
		c.Locals(contextkeys.UserIDKey, userID)
		c.Locals(contextkeys.TenantIDKey, tenantID)
		c.Locals(contextkeys.RoleKey, role) // Store as string for flexibility

		// Continue to next handler
		return c.Next()
	}
}

// FiberRoleMiddlewareString enforces role-based access control for Fiber using string roles
// Requires FiberAuthMiddleware to be applied first
// "ADMIN" role bypasses all role checks
func FiberRoleMiddlewareString(requiredRole string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Extract role from Fiber context (set by FiberAuthMiddleware)
		role, ok := c.Locals(contextkeys.RoleKey).(string)
		if !ok {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error":   "unauthorized",
				"message": "role not found in context - ensure FiberAuthMiddleware is applied",
			})
		}

		// ADMIN bypasses all role checks (per spec FR-019)
		if role == "ADMIN" {
			return c.Next()
		}

		// Check if role matches required role
		if role != requiredRole {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error":   "forbidden",
				"message": "insufficient permissions - requires " + requiredRole + " role",
			})
		}

		// Role matches - allow access
		return c.Next()
	}
}

// GetUserIDFromFiberContext extracts the user ID from Fiber context
func GetUserIDFromFiberContext(c *fiber.Ctx) (uuid.UUID, bool) {
	userID, ok := c.Locals(contextkeys.UserIDKey).(uuid.UUID)
	return userID, ok
}

// GetTenantIDFromFiberContext extracts the tenant ID from Fiber context
func GetTenantIDFromFiberContext(c *fiber.Ctx) (uuid.UUID, bool) {
	tenantID, ok := c.Locals(contextkeys.TenantIDKey).(uuid.UUID)
	return tenantID, ok
}

// GetRoleFromFiberContext extracts the role string from Fiber context
func GetRoleFromFiberContext(c *fiber.Ctx) (string, bool) {
	role, ok := c.Locals(contextkeys.RoleKey).(string)
	return role, ok
}

// FiberTenantIsolationMiddleware enforces tenant isolation for Fiber
// Requires FiberAuthMiddleware to be applied first
// ADMIN role bypasses tenant isolation (per spec FR-019)
// Validates that the tenant_id in the request matches the authenticated user's tenant_id
func FiberTenantIsolationMiddleware() fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Extract role from context (set by FiberAuthMiddleware)
		role, ok := c.Locals(contextkeys.RoleKey).(string)
		if !ok {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error":   "unauthorized",
				"message": "authentication required - ensure FiberAuthMiddleware is applied",
			})
		}

		// ADMIN bypasses tenant isolation (per spec FR-019)
		if role == "ADMIN" {
			return c.Next()
		}

		// Extract tenant_id from JWT claims (set by FiberAuthMiddleware)
		userTenantID, ok := c.Locals(contextkeys.TenantIDKey).(uuid.UUID)
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
			// Log violation if logger is configured
			if tenantViolationLogger != nil {
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

				// Non-blocking: log violation asynchronously
				go tenantViolationLogger.LogViolation(
					context.Background(),
					userID,
					userTenantID,
					resourceTenantID,
					"resource",
					resourceUUID,
					"access_attempt",
					ip,
					ua,
				)
			}

			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error":   "forbidden",
				"message": "access denied - cross-tenant access not allowed",
			})
		}

		// Tenant matches - allow access
		return c.Next()
	}
}
