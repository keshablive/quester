// Package middleware provides HTTP middleware for the Quester API.
// 008-api-response-optimization T013: Fields middleware for sparse fieldsets
package middleware

import (
	"strings"

	"github.com/gofiber/fiber/v2"
)

// Field selection constants
const (
	// FieldsQueryParam is the query parameter name for field selection
	FieldsQueryParam = "fields"

	// ContextKeyFields is the key used to store requested fields in context
	ContextKeyFields = "requestedFields"
)

// FieldsConfig holds configuration for the fields middleware
type FieldsConfig struct {
	// QueryParam is the query parameter name (default: "fields")
	QueryParam string

	// ContextKey is the key used to store fields in context (default: "requestedFields")
	ContextKey string
}

// DefaultFieldsConfig returns the default configuration
func DefaultFieldsConfig() FieldsConfig {
	return FieldsConfig{
		QueryParam: FieldsQueryParam,
		ContextKey: ContextKeyFields,
	}
}

// Fields creates a middleware that extracts and parses the ?fields= query parameter.
// FR-001: Support ?fields=field1,field2,field3 query parameter on all GET endpoints
// FR-004: Return full response when fields parameter is omitted (backward compatible)
//
// Behavior:
// - Extracts ?fields= query parameter
// - Parses comma-separated field names
// - Stores parsed fields in c.Locals("requestedFields") as []string
// - If no fields specified, stores nil (indicates full response)
func Fields(config ...FieldsConfig) fiber.Handler {
	cfg := DefaultFieldsConfig()
	if len(config) > 0 {
		cfg = config[0]
		if cfg.QueryParam == "" {
			cfg.QueryParam = FieldsQueryParam
		}
		if cfg.ContextKey == "" {
			cfg.ContextKey = ContextKeyFields
		}
	}

	return func(c *fiber.Ctx) error {
		fieldsParam := c.Query(cfg.QueryParam)

		// FR-004: Empty or missing fields parameter means full response
		if fieldsParam == "" {
			c.Locals(cfg.ContextKey, nil)
			return c.Next()
		}

		// Parse comma-separated field names
		fields := parseFieldsParameter(fieldsParam)
		c.Locals(cfg.ContextKey, fields)

		return c.Next()
	}
}

// parseFieldsParameter splits the fields parameter and trims whitespace
func parseFieldsParameter(param string) []string {
	parts := strings.Split(param, ",")
	fields := make([]string, 0, len(parts))

	for _, part := range parts {
		field := strings.TrimSpace(part)
		if field != "" {
			fields = append(fields, field)
		}
	}

	return fields
}

// GetRequestedFields extracts the requested fields from Fiber context.
// Returns nil if no fields were specified (full response).
// Returns empty slice if fields parameter was provided but empty.
func GetRequestedFields(c *fiber.Ctx) []string {
	if fields, ok := c.Locals(ContextKeyFields).([]string); ok {
		return fields
	}
	return nil
}

// HasFieldSelection returns true if client specified fields to select
func HasFieldSelection(c *fiber.Ctx) bool {
	return c.Locals(ContextKeyFields) != nil
}
