// Package middleware provides HTTP middleware for the Quester platform.
// Task Reference: 009-database-query-optimization T056
package middleware

import (
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/keshablive/quester/internal/framework/database"
	"github.com/keshablive/quester/internal/framework/metrics"
)

// ReplicaRoutingContextKey is the context key for database routing
const ReplicaRoutingContextKey = "db_use_primary"

// ReplicaRoutingConfig holds configuration for replica routing middleware
type ReplicaRoutingConfig struct {
	// Enabled controls whether replica routing is active
	Enabled bool

	// ForceReadPrimaryPaths are paths that always use primary even for GET
	// e.g., "/api/v1/admin" routes might need immediate consistency
	ForceReadPrimaryPaths []string

	// ForceReadPrimaryHeaders are headers that force reading from primary
	// e.g., "X-Read-Primary: true"
	ForceReadPrimaryHeaders []string
}

// DefaultReplicaRoutingConfig returns sensible defaults
func DefaultReplicaRoutingConfig() ReplicaRoutingConfig {
	return ReplicaRoutingConfig{
		Enabled:                 true,
		ForceReadPrimaryPaths:   []string{"/api/v1/admin"},
		ForceReadPrimaryHeaders: []string{"X-Read-Primary"},
	}
}

// ReplicaRouting returns middleware that routes read requests to replicas
// and write requests to primary.
//
// Routing Rules:
// - GET, HEAD, OPTIONS → Replica (read)
// - POST, PUT, PATCH, DELETE → Primary (write)
// - Requests with ForceReadPrimary header → Primary
// - Requests to admin paths → Primary
//
// Task Reference: 009-database-query-optimization T056
// Implements: FR-011 (read replica support)
func ReplicaRouting(config ...ReplicaRoutingConfig) fiber.Handler {
	cfg := DefaultReplicaRoutingConfig()
	if len(config) > 0 {
		cfg = config[0]
	}

	return func(c *fiber.Ctx) error {
		if !cfg.Enabled {
			return c.Next()
		}

		// Determine if this request should use primary
		usePrimary := shouldUsePrimary(c, cfg)

		// Store routing decision in context
		c.Locals(ReplicaRoutingContextKey, usePrimary)

		// Update the context with ForceReadPrimary if needed
		if usePrimary {
			ctx := database.WithForceReadPrimary(c.UserContext())
			c.SetUserContext(ctx)
		}

		// Record routing decision in metrics
		if usePrimary {
			metrics.RecordReplicaRouting("primary")
		} else {
			metrics.RecordReplicaRouting("replica")
		}

		return c.Next()
	}
}

// shouldUsePrimary determines if a request should use the primary database
func shouldUsePrimary(c *fiber.Ctx, cfg ReplicaRoutingConfig) bool {
	method := c.Method()
	path := c.Path()

	// Write operations always go to primary
	if !isReadOnlyMethod(method) {
		return true
	}

	// Check for force-primary header
	for _, header := range cfg.ForceReadPrimaryHeaders {
		if c.Get(header) != "" {
			return true
		}
	}

	// Check for admin/critical paths
	for _, prefix := range cfg.ForceReadPrimaryPaths {
		if strings.HasPrefix(path, prefix) {
			return true
		}
	}

	// Read operations can go to replica
	return false
}

// isReadOnlyMethod returns true for HTTP methods that don't modify data
func isReadOnlyMethod(method string) bool {
	switch method {
	case fiber.MethodGet, fiber.MethodHead, fiber.MethodOptions:
		return true
	default:
		return false
	}
}

// ShouldUsePrimary checks if the current request should use primary database
// Helper function for use in handlers
func ShouldUsePrimary(c *fiber.Ctx) bool {
	if usePrimary, ok := c.Locals(ReplicaRoutingContextKey).(bool); ok {
		return usePrimary
	}
	// Default to primary if not set
	return true
}
