// Package controller provides controller helper functions for request handling.
// CONSTITUTION: Context Propagation (MANDATORY) - Auth context MUST be extracted consistently.
package controller

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

// AuthContext contains validated user identity extracted from JWT claims.
// This struct is immutable after creation - all fields are set during parsing.
//
// CONSTITUTION: Context Propagation (MANDATORY) - Auth context MUST be extracted
// consistently across all controllers using GetAuthContext().
type AuthContext struct {
	// UserID is the authenticated user's primary key
	UserID uuid.UUID

	// TenantID is the user's tenant scope - required for all queries
	TenantID uuid.UUID

	// Role is the user's permission level
	// Valid values: Admin, Moderator, Instructor, Player, Partner
	Role string

	// Email is the user's email address (from JWT claims, may be empty)
	Email string
}

// Fiber context keys for storing authenticated user data
// These match the keys used by FiberAuthMiddleware
const (
	FiberUserIDKey   = "user_id"
	FiberTenantIDKey = "tenant_id"
	FiberRoleKey     = "role"
	FiberEmailKey    = "email"
)

// GetAuthContext extracts and validates auth context from Fiber context.
// Returns ErrUnauthorized if claims are missing or invalid.
// Returns ErrInvalidUserID or ErrInvalidTenantID if UUIDs fail parsing.
//
// This function provides a single consistent pattern for auth extraction,
// replacing the multiple scattered extraction patterns across controllers.
//
// Example:
//
//	auth, err := controller.GetAuthContext(c)
//	if err != nil {
//	    return responses.Unauthorized(c, err.Error())
//	}
//	// Use auth.UserID, auth.TenantID, auth.Role
func GetAuthContext(c *fiber.Ctx) (*AuthContext, error) {
	// Extract UserID from context (set by FiberAuthMiddleware)
	userID, ok := c.Locals(FiberUserIDKey).(uuid.UUID)
	if !ok {
		// Try string conversion as fallback
		userIDStr, ok := c.Locals(FiberUserIDKey).(string)
		if !ok || userIDStr == "" {
			return nil, ErrUnauthorized
		}
		var err error
		userID, err = uuid.Parse(userIDStr)
		if err != nil {
			return nil, ErrInvalidUserID
		}
	}
	if userID == uuid.Nil {
		return nil, ErrInvalidUserID
	}

	// Extract TenantID from context
	tenantID, ok := c.Locals(FiberTenantIDKey).(uuid.UUID)
	if !ok {
		// Try string conversion as fallback
		tenantIDStr, ok := c.Locals(FiberTenantIDKey).(string)
		if !ok || tenantIDStr == "" {
			return nil, ErrUnauthorized
		}
		var err error
		tenantID, err = uuid.Parse(tenantIDStr)
		if err != nil {
			return nil, ErrInvalidTenantID
		}
	}
	if tenantID == uuid.Nil {
		return nil, ErrInvalidTenantID
	}

	// Extract Role from context (can be string or custom Role type)
	var role string
	if r, ok := c.Locals(FiberRoleKey).(string); ok {
		role = r
	} else if r := c.Locals(FiberRoleKey); r != nil {
		// Handle custom Role type by getting string representation
		role = stringValue(r)
	}

	// Extract Email if available (optional)
	email, _ := c.Locals(FiberEmailKey).(string)

	return &AuthContext{
		UserID:   userID,
		TenantID: tenantID,
		Role:     role,
		Email:    email,
	}, nil
}

// stringValue converts any value to string using Stringer interface or %v
func stringValue(v interface{}) string {
	if s, ok := v.(interface{ String() string }); ok {
		return s.String()
	}
	if s, ok := v.(string); ok {
		return s
	}
	return ""
}

// MustGetAuthContext extracts auth context and panics on error.
// Use only when auth middleware is guaranteed to be applied.
// Prefer GetAuthContext for explicit error handling.
func MustGetAuthContext(c *fiber.Ctx) *AuthContext {
	auth, err := GetAuthContext(c)
	if err != nil {
		panic("auth context required but not available: " + err.Error())
	}
	return auth
}
