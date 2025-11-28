// Package middleware provides HTTP middleware for the Quester API.
// 008-api-response-optimization T005: API version detection middleware
package middleware

import (
	"strings"

	"github.com/gofiber/fiber/v2"
)

// API version constants
const (
	// APIVersionV1 represents the legacy API format (default)
	APIVersionV1 = "v1"
	// APIVersionV2 represents the new envelope format
	APIVersionV2 = "v2"

	// V2AcceptHeader is the Accept header value for v2 envelope format
	// FR-011: Wrap responses in envelope when client sends this header
	V2AcceptHeader = "application/vnd.quester.v2+json"

	// ContextKeyAPIVersion is the key used to store API version in context
	ContextKeyAPIVersion = "apiVersion"
)

// ResponseVersionConfig holds configuration for the response version middleware
type ResponseVersionConfig struct {
	// DefaultVersion is the API version to use when Accept header is not specified
	DefaultVersion string

	// V2AcceptType is the Accept header media type for v2 format
	V2AcceptType string
}

// DefaultResponseVersionConfig returns the default configuration
func DefaultResponseVersionConfig() ResponseVersionConfig {
	return ResponseVersionConfig{
		DefaultVersion: APIVersionV1,
		V2AcceptType:   V2AcceptHeader,
	}
}

// ResponseVersion creates a middleware that detects requested API version from Accept header.
// FR-011: Wrap responses in envelope when client sends Accept: application/vnd.quester.v2+json
// FR-011a: Return legacy format for standard Accept: application/json (backward compatible)
//
// Behavior:
// - Parses Accept header to detect API version preference
// - Sets c.Locals("apiVersion", "v2") for v2 Accept header
// - Sets c.Locals("apiVersion", "v1") for standard JSON or no Accept header
// - Downstream handlers check this to apply appropriate response format
func ResponseVersion(config ...ResponseVersionConfig) fiber.Handler {
	cfg := DefaultResponseVersionConfig()
	if len(config) > 0 {
		cfg = config[0]
		if cfg.DefaultVersion == "" {
			cfg.DefaultVersion = APIVersionV1
		}
		if cfg.V2AcceptType == "" {
			cfg.V2AcceptType = V2AcceptHeader
		}
	}

	return func(c *fiber.Ctx) error {
		acceptHeader := c.Get("Accept")
		version := cfg.DefaultVersion

		// Check if client requests v2 envelope format
		// Accept header can contain multiple types: "application/json, application/vnd.quester.v2+json"
		if strings.Contains(acceptHeader, cfg.V2AcceptType) {
			version = APIVersionV2
		}

		// Store version in context for downstream handlers
		c.Locals(ContextKeyAPIVersion, version)

		return c.Next()
	}
}

// GetAPIVersion extracts the API version from Fiber context.
// Returns "v1" as default if not found.
func GetAPIVersion(c *fiber.Ctx) string {
	if version, ok := c.Locals(ContextKeyAPIVersion).(string); ok {
		return version
	}
	return APIVersionV1
}

// IsV2Request returns true if the request is using v2 API format
func IsV2Request(c *fiber.Ctx) bool {
	return GetAPIVersion(c) == APIVersionV2
}
