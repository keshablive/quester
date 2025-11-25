// Rate limiting middleware for Fiber
package middleware

import (
	"context"
	"fmt"
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/yourusername/quester/internal/framework/cache"
)

// FiberRateLimitMiddleware creates a rate limiting middleware with a fixed key
// limit: maximum number of requests allowed
// window: time window for the rate limit
func FiberRateLimitMiddleware(key string, limit int64, window time.Duration) fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Build rate limit key
		rateLimitKey := fmt.Sprintf("rate_limit:%s", key)

		// Increment counter with expiry
		ctx := context.Background()
		count, err := cache.IncrementWithExpiry(ctx, rateLimitKey, window)
		if err != nil {
			// On cache error, allow request but log error
			// (fail open to avoid blocking legitimate traffic)
			return c.Next()
		}

		// Check if limit exceeded
		if count > limit {
			// Get TTL for Retry-After header
			ttl, err := cache.Client.TTL(ctx, rateLimitKey).Result()
			if err != nil {
				ttl = window // fallback to window duration
			}

			// Set Retry-After header (in seconds)
			retryAfterSeconds := int(ttl.Seconds())
			if retryAfterSeconds < 1 {
				retryAfterSeconds = 1
			}
			c.Set("Retry-After", strconv.Itoa(retryAfterSeconds))

			// Return 429 Too Many Requests
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
				"error":   "too many requests",
				"message": fmt.Sprintf("rate limit exceeded, retry after %d seconds", retryAfterSeconds),
			})
		}

		// Set rate limit headers
		c.Set("X-RateLimit-Limit", strconv.FormatInt(limit, 10))
		c.Set("X-RateLimit-Remaining", strconv.FormatInt(limit-count, 10))

		// Allow request
		return c.Next()
	}
}

// FiberRateLimitByIP creates a rate limiting middleware that uses client IP as the key
// limit: maximum number of requests allowed
// window: time window for the rate limit
func FiberRateLimitByIP(limit int64, window time.Duration) fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Extract client IP
		ip := c.IP()

		// Check X-Forwarded-For header for proxy scenarios
		forwardedFor := c.Get("X-Forwarded-For")
		if forwardedFor != "" {
			ip = forwardedFor
		}

		// Build rate limit key with IP
		rateLimitKey := fmt.Sprintf("rate_limit:ip:%s", ip)

		// Increment counter with expiry
		ctx := context.Background()
		count, err := cache.IncrementWithExpiry(ctx, rateLimitKey, window)
		if err != nil {
			// On cache error, allow request (fail open)
			return c.Next()
		}

		// Check if limit exceeded
		if count > limit {
			// Get TTL for Retry-After header
			ttl, err := cache.Client.TTL(ctx, rateLimitKey).Result()
			if err != nil {
				ttl = window
			}

			// Set Retry-After header
			retryAfterSeconds := int(ttl.Seconds())
			if retryAfterSeconds < 1 {
				retryAfterSeconds = 1
			}
			c.Set("Retry-After", strconv.Itoa(retryAfterSeconds))

			// Return 429 Too Many Requests
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
				"error":   "too many requests",
				"message": fmt.Sprintf("rate limit exceeded, retry after %d seconds", retryAfterSeconds),
			})
		}

		// Set rate limit headers
		c.Set("X-RateLimit-Limit", strconv.FormatInt(limit, 10))
		c.Set("X-RateLimit-Remaining", strconv.FormatInt(limit-count, 10))

		// Allow request
		return c.Next()
	}
}

// FiberRateLimitByEmail creates a rate limiting middleware that uses email from request body as the key
// Useful for login endpoints
func FiberRateLimitByEmail(limit int64, window time.Duration) fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Parse request body to extract email
		var body struct {
			Email string `json:"email"`
		}

		if err := c.BodyParser(&body); err != nil {
			// If we can't parse email, fall back to IP-based rate limiting
			ip := c.IP()
			rateLimitKey := fmt.Sprintf("rate_limit:ip:%s", ip)

			ctx := context.Background()
			count, err := cache.IncrementWithExpiry(ctx, rateLimitKey, window)
			if err != nil {
				return c.Next()
			}

			if count > limit {
				ttl, _ := cache.Client.TTL(ctx, rateLimitKey).Result()
				retryAfterSeconds := int(ttl.Seconds())
				if retryAfterSeconds < 1 {
					retryAfterSeconds = 1
				}
				c.Set("Retry-After", strconv.Itoa(retryAfterSeconds))

				return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
					"error":   "too many requests",
					"message": fmt.Sprintf("rate limit exceeded, retry after %d seconds", retryAfterSeconds),
				})
			}

			return c.Next()
		}

		// Build rate limit key with email
		rateLimitKey := fmt.Sprintf("rate_limit:email:%s", body.Email)

		// Increment counter with expiry
		ctx := context.Background()
		count, err := cache.IncrementWithExpiry(ctx, rateLimitKey, window)
		if err != nil {
			// On cache error, allow request
			return c.Next()
		}

		// Check if limit exceeded
		if count > limit {
			// Get TTL for Retry-After header
			ttl, err := cache.Client.TTL(ctx, rateLimitKey).Result()
			if err != nil {
				ttl = window
			}

			// Set Retry-After header
			retryAfterSeconds := int(ttl.Seconds())
			if retryAfterSeconds < 1 {
				retryAfterSeconds = 1
			}
			c.Set("Retry-After", strconv.Itoa(retryAfterSeconds))

			// Return 429 Too Many Requests
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
				"error":   "too many requests",
				"message": fmt.Sprintf("rate limit exceeded for email %s, retry after %d seconds", body.Email, retryAfterSeconds),
			})
		}

		// Set rate limit headers
		c.Set("X-RateLimit-Limit", strconv.FormatInt(limit, 10))
		c.Set("X-RateLimit-Remaining", strconv.FormatInt(limit-count, 10))

		// Allow request
		return c.Next()
	}
}
