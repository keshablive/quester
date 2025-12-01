// Package contextkeys provides shared context key constants used by both
// controllers and middleware. This package exists to break import cycles
// between the controller and middleware packages.
package contextkeys

// Fiber context keys for storing authenticated user data.
// These are set by FiberAuthMiddleware and read by controllers.
const (
	// UserIDKey is the Fiber context key for the authenticated user's UUID
	UserIDKey = "user_id"

	// TenantIDKey is the Fiber context key for the user's tenant UUID
	TenantIDKey = "tenant_id"

	// RoleKey is the Fiber context key for the user's role string
	RoleKey = "role"

	// EmailKey is the Fiber context key for the user's email (optional)
	EmailKey = "email"
)
