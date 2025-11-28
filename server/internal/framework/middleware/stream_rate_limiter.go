package middleware

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
)

// StreamRateLimiterConfig holds configuration for stream rate limiting
type StreamRateLimiterConfig struct {
	// MaxStreamsPerHour is the maximum number of stream creations per hour per user
	MaxStreamsPerHour int

	// Redis client for storing rate limit data
	Redis *redis.Client

	// Window duration (default: 1 hour)
	Window time.Duration

	// BypassForPremium allows premium users to bypass rate limiting
	BypassForPremium bool
}

// streamRateLimitLog represents structured log data for rate limiting events
type streamRateLimitLog struct {
	Timestamp string                 `json:"timestamp"`
	Level     string                 `json:"level"`
	Event     string                 `json:"event"`
	RequestID string                 `json:"request_id,omitempty"`
	UserID    string                 `json:"user_id,omitempty"`
	Remaining int                    `json:"remaining,omitempty"`
	ResetAt   string                 `json:"reset_at,omitempty"`
	Error     string                 `json:"error,omitempty"`
	Details   map[string]interface{} `json:"details,omitempty"`
}

// logRateLimitEvent logs a rate limiting event in structured JSON format
func logRateLimitEvent(level, event string, data streamRateLimitLog) {
	data.Timestamp = time.Now().UTC().Format(time.RFC3339)
	data.Level = level
	data.Event = event

	jsonLog, err := json.Marshal(data)
	if err != nil {
		log.Printf("ERROR marshaling rate limit log: %v", err)
		return
	}

	log.Println(string(jsonLog))
}

// StreamCreationRateLimiter creates a middleware to limit stream creation rate
// T559: Rate limiting middleware - 10 streams per hour per user
func StreamCreationRateLimiter(config StreamRateLimiterConfig) fiber.Handler {
	// Set defaults
	if config.MaxStreamsPerHour == 0 {
		config.MaxStreamsPerHour = 10
	}
	if config.Window == 0 {
		config.Window = time.Hour
	}

	return func(c *fiber.Ctx) error {
		// Only apply to stream creation endpoint
		if c.Method() != fiber.MethodPost || c.Path() != "/api/v1/streams" {
			return c.Next()
		}

		requestID := c.Get("X-Request-ID", "unknown")

		// Get authenticated user ID
		userIDStr := c.Locals("user_id")
		if userIDStr == nil {
			// Let auth middleware handle unauthorized requests
			return c.Next()
		}

		userID, err := uuid.Parse(userIDStr.(string))
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "Invalid user ID",
			})
		}

		// Check if user has premium role (bypass rate limiting)
		if config.BypassForPremium {
			userRole := c.Locals("user_role")
			if userRole != nil && (userRole == "premium" || userRole == "admin") {
				logRateLimitEvent("INFO", "rate_limit_bypassed", streamRateLimitLog{
					RequestID: requestID,
					UserID:    userID.String(),
					Details: map[string]interface{}{
						"role": userRole,
					},
				})
				return c.Next()
			}
		}

		// Check rate limit using Redis
		if config.Redis == nil {
			logRateLimitEvent("WARN", "rate_limiter_redis_not_configured", streamRateLimitLog{
				RequestID: requestID,
			})
			// Allow request to proceed if Redis is not configured
			return c.Next()
		}

		ctx := context.Background()
		redisKey := fmt.Sprintf("rate_limit:stream_create:%s", userID.String())

		// Use Redis sorted set with sliding window
		now := time.Now().Unix()
		windowStart := now - int64(config.Window.Seconds())

		pipe := config.Redis.Pipeline()

		// Remove old entries outside the window
		pipe.ZRemRangeByScore(ctx, redisKey, "0", fmt.Sprintf("%d", windowStart))

		// Count entries in the current window
		countCmd := pipe.ZCount(ctx, redisKey, fmt.Sprintf("%d", windowStart), fmt.Sprintf("%d", now))

		// Execute pipeline
		if _, err := pipe.Exec(ctx); err != nil {
			logRateLimitEvent("ERROR", "rate_limiter_redis_error", streamRateLimitLog{
				RequestID: requestID,
				UserID:    userID.String(),
				Error:     err.Error(),
			})
			// Allow request on Redis error (fail open)
			return c.Next()
		}

		currentCount, err := countCmd.Result()
		if err != nil {
			logRateLimitEvent("ERROR", "rate_limiter_count_error", streamRateLimitLog{
				RequestID: requestID,
				UserID:    userID.String(),
				Error:     err.Error(),
			})
			// Allow request on error
			return c.Next()
		}

		// Check if limit exceeded
		if int(currentCount) >= config.MaxStreamsPerHour {
			// Get oldest timestamp in window for reset calculation
			oldestResult, err := config.Redis.ZRangeWithScores(ctx, redisKey, 0, 0).Result()
			var resetAt time.Time
			if err == nil && len(oldestResult) > 0 {
				oldestTimestamp := int64(oldestResult[0].Score)
				resetAt = time.Unix(oldestTimestamp, 0).Add(config.Window)
			} else {
				resetAt = time.Now().Add(config.Window)
			}

			retryAfter := int(time.Until(resetAt).Seconds())
			if retryAfter < 0 {
				retryAfter = int(config.Window.Seconds())
			}

			logRateLimitEvent("WARN", "rate_limit_exceeded", streamRateLimitLog{
				RequestID: requestID,
				UserID:    userID.String(),
				Remaining: 0,
				ResetAt:   resetAt.Format(time.RFC3339),
				Details: map[string]interface{}{
					"current_count": currentCount,
					"limit":         config.MaxStreamsPerHour,
					"window":        config.Window.String(),
				},
			})

			c.Set("Retry-After", fmt.Sprintf("%d", retryAfter))
			c.Set("X-RateLimit-Limit", fmt.Sprintf("%d", config.MaxStreamsPerHour))
			c.Set("X-RateLimit-Remaining", "0")
			c.Set("X-RateLimit-Reset", resetAt.Format(time.RFC3339))

			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
				"error":           "Rate limit exceeded",
				"message":         fmt.Sprintf("You can only create %d streams per hour", config.MaxStreamsPerHour),
				"retry_after":     retryAfter,
				"reset_at":        resetAt.Format(time.RFC3339),
				"current_count":   currentCount,
				"limit":           config.MaxStreamsPerHour,
				"window_duration": config.Window.String(),
			})
		}

		// Add current request timestamp to sorted set
		if err := config.Redis.ZAdd(ctx, redisKey, redis.Z{
			Score:  float64(now),
			Member: fmt.Sprintf("%d-%s", now, uuid.New().String()),
		}).Err(); err != nil {
			logRateLimitEvent("ERROR", "rate_limiter_add_error", streamRateLimitLog{
				RequestID: requestID,
				UserID:    userID.String(),
				Error:     err.Error(),
			})
			// Continue anyway
		}

		// Set expiration on the key
		if err := config.Redis.Expire(ctx, redisKey, config.Window*2).Err(); err != nil {
			logRateLimitEvent("ERROR", "rate_limiter_expire_error", streamRateLimitLog{
				RequestID: requestID,
				UserID:    userID.String(),
				Error:     err.Error(),
			})
		}

		// Calculate remaining requests
		remaining := config.MaxStreamsPerHour - int(currentCount) - 1
		if remaining < 0 {
			remaining = 0
		}

		// Set rate limit headers
		c.Set("X-RateLimit-Limit", fmt.Sprintf("%d", config.MaxStreamsPerHour))
		c.Set("X-RateLimit-Remaining", fmt.Sprintf("%d", remaining))

		logRateLimitEvent("INFO", "rate_limit_allowed", streamRateLimitLog{
			RequestID: requestID,
			UserID:    userID.String(),
			Remaining: remaining,
			Details: map[string]interface{}{
				"current_count": currentCount + 1,
				"limit":         config.MaxStreamsPerHour,
			},
		})

		return c.Next()
	}
}
