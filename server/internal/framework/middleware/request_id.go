// Package middleware provides HTTP middleware for the Quester API.
// 008-api-response-optimization T004: X-Request-ID middleware
package middleware

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

// RequestIDConfig holds configuration for the Request ID middleware
type RequestIDConfig struct {
	// Header is the header key to use for request ID (default: X-Request-ID)
	Header string

	// Generator is a function to generate request IDs (default: UUID v4)
	Generator func() string

	// ContextKey is the key used to store request ID in context (default: "requestid")
	ContextKey string
}

// DefaultRequestIDConfig returns the default configuration
func DefaultRequestIDConfig() RequestIDConfig {
	return RequestIDConfig{
		Header:     "X-Request-ID",
		ContextKey: "requestid",
		Generator: func() string {
			return uuid.New().String()
		},
	}
}

// RequestID creates a middleware that handles request ID generation and propagation.
// FR-014: Include request ID in all response metadata
// FR-014a: Return request ID in X-Request-ID response header
//
// Behavior:
// - If client provides X-Request-ID header, use that value
// - Otherwise, generate a new UUID v4
// - Store in c.Locals("requestid") for downstream access
// - Set X-Request-ID response header for tracing correlation
func RequestID(config ...RequestIDConfig) fiber.Handler {
	cfg := DefaultRequestIDConfig()
	if len(config) > 0 {
		cfg = config[0]
		// Apply defaults for empty values
		if cfg.Header == "" {
			cfg.Header = "X-Request-ID"
		}
		if cfg.ContextKey == "" {
			cfg.ContextKey = "requestid"
		}
		if cfg.Generator == nil {
			cfg.Generator = func() string {
				return uuid.New().String()
			}
		}
	}

	return func(c *fiber.Ctx) error {
		// Check for client-provided request ID (FR-014: honor X-Request-ID)
		rid := c.Get(cfg.Header)
		if rid == "" {
			// Generate new UUID if not provided
			rid = cfg.Generator()
		}

		// Store in context for downstream handlers
		c.Locals(cfg.ContextKey, rid)

		// Set response header for tracing correlation (FR-014a)
		c.Set(cfg.Header, rid)

		return c.Next()
	}
}

// GetRequestID extracts the request ID from Fiber context.
// Returns empty string if not found.
func GetRequestID(c *fiber.Ctx) string {
	if rid, ok := c.Locals("requestid").(string); ok {
		return rid
	}
	// Fallback to response header if set
	if rid := c.GetRespHeader("X-Request-ID"); rid != "" {
		return rid
	}
	// Fallback to request header
	return c.Get("X-Request-ID")
}
