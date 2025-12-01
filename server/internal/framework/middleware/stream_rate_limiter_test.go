package middleware_test

import (
	"context"
	"fmt"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/keshablive/quester/internal/framework/middleware"
)

// setupTestRedis creates an in-memory Redis client for testing
// Uses miniredis for testing without requiring actual Redis server
func setupTestRedis(t *testing.T) *redis.Client {
	// For real tests, use miniredis or testcontainers
	// For now, we'll mock the behavior
	client := redis.NewClient(&redis.Options{
		Addr: "localhost:6379", // This would be mock/test Redis
	})

	// In real tests, check connection or use miniredis
	return client
}

// setupRateLimiterApp creates a test Fiber app with rate limiting
func setupRateLimiterApp(t *testing.T, config middleware.StreamRateLimiterConfig) *fiber.App {
	app := fiber.New()

	// Mock auth middleware
	app.Use(func(c *fiber.Ctx) error {
		// Set test user ID from header or default
		userID := c.Get("X-User-ID", "550e8400-e29b-41d4-a716-446655440000")
		userRole := c.Get("X-User-Role", "user")

		c.Locals("user_id", userID)
		c.Locals("user_role", userRole)
		return c.Next()
	})

	// Apply rate limiter
	app.Use(middleware.StreamCreationRateLimiter(config))

	// Mock stream creation endpoint
	app.Post("/api/v1/streams", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"message":   "Stream created",
			"stream_id": uuid.New().String(),
		})
	})

	// Other endpoints should not be rate limited
	app.Get("/api/v1/streams", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"streams": []string{}})
	})

	return app
}

// TestStreamRateLimiterBasic tests basic rate limiting functionality
func TestStreamRateLimiterBasic(t *testing.T) {
	// Skip if Redis is not available
	client := redis.NewClient(&redis.Options{
		Addr: "localhost:6379",
	})
	ctx := context.Background()
	if err := client.Ping(ctx).Err(); err != nil {
		t.Skip("Redis not available, skipping rate limiter tests")
	}
	defer client.Close()

	// Clean up test data
	defer client.FlushDB(ctx)

	config := middleware.StreamRateLimiterConfig{
		MaxStreamsPerHour: 3,
		Redis:             client,
		Window:            time.Hour,
	}

	app := setupRateLimiterApp(t, config)

	userID := "550e8400-e29b-41d4-a716-446655440000"

	t.Run("Allow requests within limit", func(t *testing.T) {
		// Clean up before test
		client.Del(ctx, fmt.Sprintf("rate_limit:stream_create:%s", userID))

		// First request should succeed
		req1 := httptest.NewRequest("POST", "/api/v1/streams", strings.NewReader("{}"))
		req1.Header.Set("Content-Type", "application/json")
		resp1, err := app.Test(req1)
		require.NoError(t, err)
		assert.Equal(t, fiber.StatusOK, resp1.StatusCode)
		assert.Equal(t, "3", resp1.Header.Get("X-RateLimit-Limit"))
		assert.Equal(t, "2", resp1.Header.Get("X-RateLimit-Remaining"))

		// Second request should succeed
		req2 := httptest.NewRequest("POST", "/api/v1/streams", strings.NewReader("{}"))
		req2.Header.Set("Content-Type", "application/json")
		resp2, err := app.Test(req2)
		require.NoError(t, err)
		assert.Equal(t, fiber.StatusOK, resp2.StatusCode)
		assert.Equal(t, "1", resp2.Header.Get("X-RateLimit-Remaining"))

		// Third request should succeed
		req3 := httptest.NewRequest("POST", "/api/v1/streams", strings.NewReader("{}"))
		req3.Header.Set("Content-Type", "application/json")
		resp3, err := app.Test(req3)
		require.NoError(t, err)
		assert.Equal(t, fiber.StatusOK, resp3.StatusCode)
		assert.Equal(t, "0", resp3.Header.Get("X-RateLimit-Remaining"))
	})

	t.Run("Block requests exceeding limit", func(t *testing.T) {
		// Fourth request should be blocked
		req4 := httptest.NewRequest("POST", "/api/v1/streams", strings.NewReader("{}"))
		req4.Header.Set("Content-Type", "application/json")
		resp4, err := app.Test(req4)
		require.NoError(t, err)
		assert.Equal(t, fiber.StatusTooManyRequests, resp4.StatusCode)

		// Check rate limit headers
		assert.NotEmpty(t, resp4.Header.Get("Retry-After"))
		assert.Equal(t, "0", resp4.Header.Get("X-RateLimit-Remaining"))
		assert.NotEmpty(t, resp4.Header.Get("X-RateLimit-Reset"))
	})

	t.Run("Different users have separate rate limits", func(t *testing.T) {
		// Different user should have their own limit
		otherUserID := uuid.New().String()
		client.Del(ctx, fmt.Sprintf("rate_limit:stream_create:%s", otherUserID))

		req := httptest.NewRequest("POST", "/api/v1/streams", strings.NewReader("{}"))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("X-User-ID", otherUserID)

		resp, err := app.Test(req)
		require.NoError(t, err)
		assert.Equal(t, fiber.StatusOK, resp.StatusCode)
		assert.Equal(t, "2", resp.Header.Get("X-RateLimit-Remaining"))
	})
}

// TestStreamRateLimiterPremiumBypass tests premium user bypass
func TestStreamRateLimiterPremiumBypass(t *testing.T) {
	client := redis.NewClient(&redis.Options{
		Addr: "localhost:6379",
	})
	ctx := context.Background()
	if err := client.Ping(ctx).Err(); err != nil {
		t.Skip("Redis not available, skipping rate limiter tests")
	}
	defer client.Close()
	defer client.FlushDB(ctx)

	config := middleware.StreamRateLimiterConfig{
		MaxStreamsPerHour: 2,
		Redis:             client,
		Window:            time.Hour,
		BypassForPremium:  true,
	}

	app := setupRateLimiterApp(t, config)

	premiumUserID := "premium-user-" + uuid.New().String()

	t.Run("Premium user bypasses rate limit", func(t *testing.T) {
		client.Del(ctx, fmt.Sprintf("rate_limit:stream_create:%s", premiumUserID))

		// Make 5 requests (more than the limit of 2)
		for i := 0; i < 5; i++ {
			req := httptest.NewRequest("POST", "/api/v1/streams", strings.NewReader("{}"))
			req.Header.Set("Content-Type", "application/json")
			req.Header.Set("X-User-ID", premiumUserID)
			req.Header.Set("X-User-Role", "premium")

			resp, err := app.Test(req)
			require.NoError(t, err)
			assert.Equal(t, fiber.StatusOK, resp.StatusCode, "Request %d should succeed for premium user", i+1)
		}
	})

	t.Run("Admin user bypasses rate limit", func(t *testing.T) {
		adminUserID := "admin-user-" + uuid.New().String()
		client.Del(ctx, fmt.Sprintf("rate_limit:stream_create:%s", adminUserID))

		// Make 5 requests (more than the limit of 2)
		for i := 0; i < 5; i++ {
			req := httptest.NewRequest("POST", "/api/v1/streams", strings.NewReader("{}"))
			req.Header.Set("Content-Type", "application/json")
			req.Header.Set("X-User-ID", adminUserID)
			req.Header.Set("X-User-Role", "admin")

			resp, err := app.Test(req)
			require.NoError(t, err)
			assert.Equal(t, fiber.StatusOK, resp.StatusCode, "Request %d should succeed for admin user", i+1)
		}
	})

	t.Run("Regular user still rate limited", func(t *testing.T) {
		regularUserID := "regular-user-" + uuid.New().String()
		client.Del(ctx, fmt.Sprintf("rate_limit:stream_create:%s", regularUserID))

		// First 2 requests succeed
		for i := 0; i < 2; i++ {
			req := httptest.NewRequest("POST", "/api/v1/streams", strings.NewReader("{}"))
			req.Header.Set("Content-Type", "application/json")
			req.Header.Set("X-User-ID", regularUserID)
			req.Header.Set("X-User-Role", "user")

			resp, err := app.Test(req)
			require.NoError(t, err)
			assert.Equal(t, fiber.StatusOK, resp.StatusCode)
		}

		// Third request should be blocked
		req3 := httptest.NewRequest("POST", "/api/v1/streams", strings.NewReader("{}"))
		req3.Header.Set("Content-Type", "application/json")
		req3.Header.Set("X-User-ID", regularUserID)
		req3.Header.Set("X-User-Role", "user")

		resp3, err := app.Test(req3)
		require.NoError(t, err)
		assert.Equal(t, fiber.StatusTooManyRequests, resp3.StatusCode)
	})
}

// TestStreamRateLimiterNonStreamEndpoints tests that other endpoints are not rate limited
func TestStreamRateLimiterNonStreamEndpoints(t *testing.T) {
	client := redis.NewClient(&redis.Options{
		Addr: "localhost:6379",
	})
	ctx := context.Background()
	if err := client.Ping(ctx).Err(); err != nil {
		t.Skip("Redis not available, skipping rate limiter tests")
	}
	defer client.Close()
	defer client.FlushDB(ctx)

	config := middleware.StreamRateLimiterConfig{
		MaxStreamsPerHour: 2,
		Redis:             client,
		Window:            time.Hour,
	}

	app := setupRateLimiterApp(t, config)

	t.Run("GET /api/v1/streams is not rate limited", func(t *testing.T) {
		// Make many requests to list endpoint
		for i := 0; i < 10; i++ {
			req := httptest.NewRequest("GET", "/api/v1/streams", nil)
			resp, err := app.Test(req)
			require.NoError(t, err)
			assert.Equal(t, fiber.StatusOK, resp.StatusCode, "Request %d should succeed", i+1)
		}
	})
}

// TestStreamRateLimiterSlidingWindow tests sliding window behavior
func TestStreamRateLimiterSlidingWindow(t *testing.T) {
	client := redis.NewClient(&redis.Options{
		Addr: "localhost:6379",
	})
	ctx := context.Background()
	if err := client.Ping(ctx).Err(); err != nil {
		t.Skip("Redis not available, skipping rate limiter tests")
	}
	defer client.Close()
	defer client.FlushDB(ctx)

	// Use a short window for testing
	config := middleware.StreamRateLimiterConfig{
		MaxStreamsPerHour: 2,
		Redis:             client,
		Window:            2 * time.Second, // 2 second window for testing
	}

	app := setupRateLimiterApp(t, config)

	userID := "sliding-window-user-" + uuid.New().String()

	t.Run("Requests expire after window", func(t *testing.T) {
		client.Del(ctx, fmt.Sprintf("rate_limit:stream_create:%s", userID))

		// First 2 requests succeed
		for i := 0; i < 2; i++ {
			req := httptest.NewRequest("POST", "/api/v1/streams", strings.NewReader("{}"))
			req.Header.Set("Content-Type", "application/json")
			req.Header.Set("X-User-ID", userID)

			resp, err := app.Test(req)
			require.NoError(t, err)
			assert.Equal(t, fiber.StatusOK, resp.StatusCode)
		}

		// Third request should be blocked
		req3 := httptest.NewRequest("POST", "/api/v1/streams", strings.NewReader("{}"))
		req3.Header.Set("Content-Type", "application/json")
		req3.Header.Set("X-User-ID", userID)

		resp3, err := app.Test(req3)
		require.NoError(t, err)
		assert.Equal(t, fiber.StatusTooManyRequests, resp3.StatusCode)

		// Wait for window to expire
		time.Sleep(2500 * time.Millisecond)

		// Fourth request should succeed after window expires
		req4 := httptest.NewRequest("POST", "/api/v1/streams", strings.NewReader("{}"))
		req4.Header.Set("Content-Type", "application/json")
		req4.Header.Set("X-User-ID", userID)

		resp4, err := app.Test(req4)
		require.NoError(t, err)
		assert.Equal(t, fiber.StatusOK, resp4.StatusCode)
	})
}

// TestStreamRateLimiterWithoutRedis tests graceful fallback when Redis is not configured
func TestStreamRateLimiterWithoutRedis(t *testing.T) {
	config := middleware.StreamRateLimiterConfig{
		MaxStreamsPerHour: 2,
		Redis:             nil, // No Redis configured
		Window:            time.Hour,
	}

	app := setupRateLimiterApp(t, config)

	t.Run("Allows requests when Redis is not configured", func(t *testing.T) {
		// Should allow requests even without Redis (fail open)
		for i := 0; i < 5; i++ {
			req := httptest.NewRequest("POST", "/api/v1/streams", strings.NewReader("{}"))
			req.Header.Set("Content-Type", "application/json")

			resp, err := app.Test(req)
			require.NoError(t, err)
			assert.Equal(t, fiber.StatusOK, resp.StatusCode, "Request %d should succeed without Redis", i+1)
		}
	})
}

// TestStreamRateLimiterDefaultConfig tests default configuration values
func TestStreamRateLimiterDefaultConfig(t *testing.T) {
	client := redis.NewClient(&redis.Options{
		Addr: "localhost:6379",
	})
	ctx := context.Background()
	if err := client.Ping(ctx).Err(); err != nil {
		t.Skip("Redis not available, skipping rate limiter tests")
	}
	defer client.Close()
	defer client.FlushDB(ctx)

	// Use empty config to test defaults
	config := middleware.StreamRateLimiterConfig{
		Redis: client,
		// MaxStreamsPerHour and Window should default
	}

	app := setupRateLimiterApp(t, config)

	userID := "default-config-user-" + uuid.New().String()

	t.Run("Default limit is 10 streams per hour", func(t *testing.T) {
		client.Del(ctx, fmt.Sprintf("rate_limit:stream_create:%s", userID))

		// Make 10 requests (should all succeed)
		for i := 0; i < 10; i++ {
			req := httptest.NewRequest("POST", "/api/v1/streams", strings.NewReader("{}"))
			req.Header.Set("Content-Type", "application/json")
			req.Header.Set("X-User-ID", userID)

			resp, err := app.Test(req)
			require.NoError(t, err)
			assert.Equal(t, fiber.StatusOK, resp.StatusCode, "Request %d should succeed", i+1)
		}

		// 11th request should be blocked
		req11 := httptest.NewRequest("POST", "/api/v1/streams", strings.NewReader("{}"))
		req11.Header.Set("Content-Type", "application/json")
		req11.Header.Set("X-User-ID", userID)

		resp11, err := app.Test(req11)
		require.NoError(t, err)
		assert.Equal(t, fiber.StatusTooManyRequests, resp11.StatusCode)
	})
}
