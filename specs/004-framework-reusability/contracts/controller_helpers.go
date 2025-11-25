// Package controller provides controller helper contracts.
// This is the CONTRACT file - actual implementation will be in server/internal/framework/controller/
package contracts

import (
	"github.com/go-playground/validator/v10"
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

	// Email is the user's email address (from JWT claims)
	Email string
}

// PaginationParams holds validated pagination parameters.
// PageSize is capped at MaxPageSize (100), never exceeds.
//
// Usage:
//
//	pagination := ParsePagination(c)
//	results, total, err := repo.FindAll(ctx, WithPagination(pagination.Page, pagination.PageSize))
type PaginationParams struct {
	// Page is the current page number (1-based, default: 1)
	Page int

	// PageSize is the number of items per page (default: 20, max: 100)
	PageSize int

	// Offset is the computed offset for database queries: (Page - 1) * PageSize
	Offset int
}

// Pagination constants
const (
	DefaultPageSize = 20
	MaxPageSize     = 100
)

// ControllerHelpers defines the contract for controller utility functions.
// Implementation provides these as standalone functions, not interface methods.
type ControllerHelpers interface {
	// GetAuthContext extracts and validates auth context from Fiber context.
	// Returns ErrUnauthorized if claims are missing or invalid.
	// Returns ErrInvalidUserID or ErrInvalidTenantID if UUIDs fail parsing.
	//
	// Example:
	//   auth, err := GetAuthContext(c)
	//   if err != nil {
	//       return responses.Unauthorized(c, err.Error())
	//   }
	GetAuthContext(c *fiber.Ctx) (*AuthContext, error)

	// ParseAndValidate parses JSON request body into T and validates using go-playground/validator.
	// Returns the parsed struct and any validation errors.
	// On error, automatically returns appropriate error response.
	//
	// Example:
	//   var req CreateBadgeRequest
	//   if err := ParseAndValidate(c, &req); err != nil {
	//       return err // Already sent response
	//   }
	ParseAndValidate(c *fiber.Ctx, out interface{}) error

	// ParsePagination extracts and validates pagination from query parameters.
	// - Page defaults to 1 if missing or < 1
	// - PageSize defaults to 20 if missing or < 1
	// - PageSize is capped at 100 if > 100 (not rejected)
	//
	// Example:
	//   pagination := ParsePagination(c)
	//   // pagination.Page, pagination.PageSize, pagination.Offset are all valid
	ParsePagination(c *fiber.Ctx) PaginationParams
}

// ValidateStruct validates a struct using go-playground/validator.
// This is used by ParseAndValidate internally.
func ValidateStruct(v *validator.Validate, s interface{}) error {
	return v.Struct(s)
}

// Controller helper errors (defined in actual implementation)
// var (
//     ErrUnauthorized     = errors.New("unauthorized: missing or invalid claims")
//     ErrInvalidUserID    = errors.New("invalid user ID in claims")
//     ErrInvalidTenantID  = errors.New("invalid tenant ID in claims")
//     ErrInvalidRequest   = errors.New("invalid request body")
//     ErrValidationFailed = errors.New("validation failed")
// )
