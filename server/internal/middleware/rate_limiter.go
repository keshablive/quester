package middleware

import (
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/limiter"
)

// RateLimiterConfig holds rate limiting configuration
type RateLimiterConfig struct {
	Max        int           // Max requests per window
	Expiration time.Duration // Time window
	Message    string        // Error message when limit exceeded
}

// DefaultRateLimiterConfig returns constitution-compliant rate limit (100 req/min)
// CONSTITUTION: Security by Design - 100 requests per minute per IP
func DefaultRateLimiterConfig() RateLimiterConfig {
	return RateLimiterConfig{
		Max:        100,
		Expiration: 1 * time.Minute,
		Message:    "Rate limit exceeded. Maximum 100 requests per minute.",
	}
}

// RateLimiter creates a rate limiting middleware
func RateLimiter(config ...RateLimiterConfig) fiber.Handler {
	cfg := DefaultRateLimiterConfig()
	if len(config) > 0 {
		cfg = config[0]
	}

	return limiter.New(limiter.Config{
		Max:        cfg.Max,
		Expiration: cfg.Expiration,
		KeyGenerator: func(c *fiber.Ctx) string {
			// Rate limit by IP address
			return c.IP()
		},
		LimitReached: func(c *fiber.Ctx) error {
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
				"error":       cfg.Message,
				"retry_after": cfg.Expiration.Seconds(),
			})
		},
	})
}

// StrictRateLimiter for sensitive endpoints (auth, registration, password reset)
// CONSTITUTION: Security by Design - stricter limits for auth endpoints
func StrictRateLimiter() fiber.Handler {
	return RateLimiter(RateLimiterConfig{
		Max:        10,
		Expiration: 1 * time.Minute,
		Message:    "Too many authentication attempts. Please try again later.",
	})
}

// BurstRateLimiter for high-traffic endpoints (search, feed, leaderboards)
func BurstRateLimiter() fiber.Handler {
	return RateLimiter(RateLimiterConfig{
		Max:        200,
		Expiration: 1 * time.Minute,
		Message:    "Rate limit exceeded for this endpoint.",
	})
}

// TenantRateLimiter applies rate limits per tenant instead of per IP
func TenantRateLimiter(config ...RateLimiterConfig) fiber.Handler {
	cfg := DefaultRateLimiterConfig()
	if len(config) > 0 {
		cfg = config[0]
	}

	return limiter.New(limiter.Config{
		Max:        cfg.Max,
		Expiration: cfg.Expiration,
		KeyGenerator: func(c *fiber.Ctx) string {
			// Rate limit by tenant_id (requires TenantMiddleware to run first)
			tenantID := GetTenantID(c)
			if tenantID == "" {
				// Fallback to IP if tenant not available
				return c.IP()
			}
			return "tenant:" + tenantID
		},
		LimitReached: func(c *fiber.Ctx) error {
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
				"error":       "Tenant rate limit exceeded",
				"retry_after": cfg.Expiration.Seconds(),
			})
		},
	})
}
