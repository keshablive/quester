// Package middleware provides HTTP middleware for the Quester API.
// 008-api-response-optimization T038-T042: Cache-Control middleware
package middleware

import (
	"strings"

	"github.com/gofiber/fiber/v2"
)

// CacheVisibility defines cache visibility
type CacheVisibility string

const (
	// CachePublic allows caching by any cache (CDN, proxy, browser)
	CachePublic CacheVisibility = "public"

	// CachePrivate allows caching only by browser, not by CDN/proxy
	CachePrivate CacheVisibility = "private"

	// CacheNoStore prevents any caching
	CacheNoStore CacheVisibility = "no-store"

	// CacheNoCache requires revalidation before using cached response
	CacheNoCache CacheVisibility = "no-cache"
)

// CachePolicy defines Cache-Control behavior for a route
// FR-019: public, max-age=300 for public list endpoints
// FR-020: private, no-store for user-specific endpoints
// FR-021: no-cache for real-time endpoints
type CachePolicy struct {
	// Visibility: "public", "private", or ""
	Visibility CacheVisibility

	// MaxAge in seconds (0 = no max-age directive)
	MaxAge int

	// NoStore prevents any caching
	NoStore bool

	// NoCache requires revalidation before using cached response
	NoCache bool

	// MustRevalidate forces cache validation when stale
	MustRevalidate bool

	// SMaxAge sets shared cache (CDN) max age
	SMaxAge int

	// Immutable indicates resource won't change
	Immutable bool
}

// String generates the Cache-Control header value
func (p CachePolicy) String() string {
	var parts []string

	// Visibility
	if p.Visibility != "" {
		parts = append(parts, string(p.Visibility))
	}

	// NoStore takes precedence
	if p.NoStore {
		parts = append(parts, "no-store")
	}

	// NoCache
	if p.NoCache {
		parts = append(parts, "no-cache")
	}

	// MaxAge
	if p.MaxAge > 0 {
		parts = append(parts, "max-age="+itoa(p.MaxAge))
	}

	// SMaxAge (for shared/CDN caches)
	if p.SMaxAge > 0 {
		parts = append(parts, "s-maxage="+itoa(p.SMaxAge))
	}

	// MustRevalidate
	if p.MustRevalidate {
		parts = append(parts, "must-revalidate")
	}

	// Immutable
	if p.Immutable {
		parts = append(parts, "immutable")
	}

	return strings.Join(parts, ", ")
}

// Predefined cache policies
var (
	// PublicCachePolicy for public list endpoints (courses, quests catalog)
	// FR-019: Cache-Control: public, max-age=300
	PublicCachePolicy = CachePolicy{
		Visibility: CachePublic,
		MaxAge:     300, // 5 minutes
	}

	// PrivateCachePolicy for user-specific endpoints
	// FR-020: Cache-Control: private, no-store
	PrivateCachePolicy = CachePolicy{
		Visibility: CachePrivate,
		NoStore:    true,
	}

	// NoCachePolicy for real-time endpoints (notifications, messages)
	// FR-021: Cache-Control: no-cache
	NoCachePolicy = CachePolicy{
		NoCache: true,
	}

	// NoStorePolicy for sensitive data (transactions, auth)
	NoStorePolicy = CachePolicy{
		NoStore: true,
	}

	// StaticCachePolicy for static assets
	StaticCachePolicy = CachePolicy{
		Visibility: CachePublic,
		MaxAge:     86400, // 24 hours
		Immutable:  true,
	}
)

// CachePolicyConfig maps route patterns to cache policies
type CachePolicyConfig struct {
	// Policies maps route patterns to their cache policies
	// Patterns support wildcards: "/api/v1/courses/*"
	Policies map[string]CachePolicy

	// Default policy for unmatched routes
	Default CachePolicy

	// Skipper defines a function to skip middleware
	Skipper func(c *fiber.Ctx) bool
}

// DefaultCachePolicyConfig returns the default configuration with predefined policies
// T041: Define default policies for known endpoints
func DefaultCachePolicyConfig() CachePolicyConfig {
	return CachePolicyConfig{
		Policies: map[string]CachePolicy{
			// Public endpoints (can be cached by CDN)
			"/api/v1/courses":      PublicCachePolicy,
			"/api/v1/courses/*":    PublicCachePolicy,
			"/api/v1/quests":       PublicCachePolicy,
			"/api/v1/badges":       PublicCachePolicy,
			"/api/v1/achievements": PublicCachePolicy,

			// User-specific endpoints (private, no CDN caching)
			"/api/v1/users/me":         PrivateCachePolicy,
			"/api/v1/users/me/*":       PrivateCachePolicy,
			"/api/v1/profile":          PrivateCachePolicy,
			"/api/v1/profile/*":        PrivateCachePolicy,
			"/api/v1/transactions":     PrivateCachePolicy,
			"/api/v1/transactions/*":   PrivateCachePolicy,
			"/api/v1/marketplace/mine": PrivateCachePolicy,

			// Real-time endpoints (no caching)
			"/api/v1/notifications":   NoCachePolicy,
			"/api/v1/notifications/*": NoCachePolicy,
			"/api/v1/messages":        NoCachePolicy,
			"/api/v1/messages/*":      NoCachePolicy,
			"/api/v1/chat":            NoCachePolicy,
			"/api/v1/chat/*":          NoCachePolicy,

			// Sensitive endpoints (no store)
			"/api/v1/auth/*":     NoStorePolicy,
			"/api/v1/2fa/*":      NoStorePolicy,
			"/api/v1/payments/*": NoStorePolicy,
		},
		Default: CachePolicy{}, // No cache header by default
	}
}

// CacheControl creates middleware that sets Cache-Control headers based on route.
// Uses pattern matching to determine appropriate cache policy.
func CacheControl(config ...CachePolicyConfig) fiber.Handler {
	cfg := DefaultCachePolicyConfig()
	if len(config) > 0 {
		cfg = config[0]
		// Merge with defaults if policies map is empty
		if cfg.Policies == nil {
			cfg.Policies = DefaultCachePolicyConfig().Policies
		}
	}

	return func(c *fiber.Ctx) error {
		// Check skipper
		if cfg.Skipper != nil && cfg.Skipper(c) {
			return c.Next()
		}

		// Only apply to GET/HEAD requests
		if c.Method() != fiber.MethodGet && c.Method() != fiber.MethodHead {
			return c.Next()
		}

		// Execute handler first
		if err := c.Next(); err != nil {
			return err
		}

		// Only set Cache-Control for successful responses
		if c.Response().StatusCode() < 200 || c.Response().StatusCode() >= 300 {
			return nil
		}

		// Find matching policy
		policy := findMatchingPolicy(c.Path(), cfg.Policies, cfg.Default)

		// Set Cache-Control header if policy defines any directives
		if header := policy.String(); header != "" {
			c.Set("Cache-Control", header)
		}

		return nil
	}
}

// findMatchingPolicy finds the best matching cache policy for a path
func findMatchingPolicy(path string, policies map[string]CachePolicy, defaultPolicy CachePolicy) CachePolicy {
	// Normalize path
	path = strings.TrimSuffix(path, "/")

	// Try exact match first
	if policy, ok := policies[path]; ok {
		return policy
	}

	// Try wildcard matches (longest match wins)
	var bestMatch string
	var bestPolicy CachePolicy

	for pattern, policy := range policies {
		if matchPattern(path, pattern) {
			// Use longest matching pattern
			if len(pattern) > len(bestMatch) {
				bestMatch = pattern
				bestPolicy = policy
			}
		}
	}

	if bestMatch != "" {
		return bestPolicy
	}

	return defaultPolicy
}

// matchPattern checks if path matches pattern with wildcard support
// Pattern examples: "/api/v1/courses/*", "/api/v1/users/me"
func matchPattern(path, pattern string) bool {
	// Exact match
	if path == pattern {
		return true
	}

	// Wildcard match
	if strings.HasSuffix(pattern, "/*") {
		prefix := strings.TrimSuffix(pattern, "/*")
		// Match if path equals prefix or starts with prefix/
		return path == prefix || strings.HasPrefix(path, prefix+"/")
	}

	return false
}

// SetCachePolicy allows handlers to override cache policy for current request
func SetCachePolicy(c *fiber.Ctx, policy CachePolicy) {
	c.Locals("cachePolicy", policy)
}

// itoa converts int to string without importing strconv
func itoa(n int) string {
	if n == 0 {
		return "0"
	}

	negative := n < 0
	if negative {
		n = -n
	}

	digits := make([]byte, 0, 10)
	for n > 0 {
		digits = append(digits, byte('0'+n%10))
		n /= 10
	}

	// Reverse digits
	for i, j := 0, len(digits)-1; i < j; i, j = i+1, j-1 {
		digits[i], digits[j] = digits[j], digits[i]
	}

	if negative {
		return "-" + string(digits)
	}
	return string(digits)
}
