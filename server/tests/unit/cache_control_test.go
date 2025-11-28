// Package unit contains unit tests for the Quester API.
// 008-api-response-optimization T043: Unit tests for Cache-Control header generation
package unit

import (
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/keshablive/quester/internal/framework/middleware"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestCachePolicy_String_Public(t *testing.T) {
	// FR-019: Cache-Control: public, max-age=300
	policy := middleware.CachePolicy{
		Visibility: middleware.CachePublic,
		MaxAge:     300,
	}

	header := policy.String()

	assert.Contains(t, header, "public")
	assert.Contains(t, header, "max-age=300")
}

func TestCachePolicy_String_Private(t *testing.T) {
	// FR-020: Cache-Control: private, no-store
	policy := middleware.CachePolicy{
		Visibility: middleware.CachePrivate,
		NoStore:    true,
	}

	header := policy.String()

	assert.Contains(t, header, "private")
	assert.Contains(t, header, "no-store")
}

func TestCachePolicy_String_NoCache(t *testing.T) {
	// FR-021: Cache-Control: no-cache
	policy := middleware.CachePolicy{
		NoCache: true,
	}

	header := policy.String()

	assert.Contains(t, header, "no-cache")
}

func TestCachePolicy_String_AllDirectives(t *testing.T) {
	policy := middleware.CachePolicy{
		Visibility:     middleware.CachePublic,
		MaxAge:         3600,
		SMaxAge:        7200,
		MustRevalidate: true,
		Immutable:      true,
	}

	header := policy.String()

	assert.Contains(t, header, "public")
	assert.Contains(t, header, "max-age=3600")
	assert.Contains(t, header, "s-maxage=7200")
	assert.Contains(t, header, "must-revalidate")
	assert.Contains(t, header, "immutable")
}

func TestCachePolicy_String_Empty(t *testing.T) {
	policy := middleware.CachePolicy{}

	header := policy.String()

	assert.Empty(t, header)
}

func TestPredefinedPolicies(t *testing.T) {
	t.Run("PublicCachePolicy", func(t *testing.T) {
		header := middleware.PublicCachePolicy.String()
		assert.Contains(t, header, "public")
		assert.Contains(t, header, "max-age=300")
	})

	t.Run("PrivateCachePolicy", func(t *testing.T) {
		header := middleware.PrivateCachePolicy.String()
		assert.Contains(t, header, "private")
		assert.Contains(t, header, "no-store")
	})

	t.Run("NoCachePolicy", func(t *testing.T) {
		header := middleware.NoCachePolicy.String()
		assert.Contains(t, header, "no-cache")
	})

	t.Run("StaticCachePolicy", func(t *testing.T) {
		header := middleware.StaticCachePolicy.String()
		assert.Contains(t, header, "public")
		assert.Contains(t, header, "max-age=86400")
		assert.Contains(t, header, "immutable")
	})
}

func TestCacheControlMiddleware_PublicEndpoint(t *testing.T) {
	app := fiber.New()
	app.Use(middleware.CacheControl())

	app.Get("/api/v1/courses", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"courses": []string{}})
	})

	req := httptest.NewRequest("GET", "/api/v1/courses", nil)
	resp, err := app.Test(req)
	require.NoError(t, err)

	cacheControl := resp.Header.Get("Cache-Control")
	assert.Contains(t, cacheControl, "public")
	assert.Contains(t, cacheControl, "max-age=300")
}

func TestCacheControlMiddleware_PrivateEndpoint(t *testing.T) {
	app := fiber.New()
	app.Use(middleware.CacheControl())

	app.Get("/api/v1/users/me", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"user": "test"})
	})

	req := httptest.NewRequest("GET", "/api/v1/users/me", nil)
	resp, err := app.Test(req)
	require.NoError(t, err)

	cacheControl := resp.Header.Get("Cache-Control")
	assert.Contains(t, cacheControl, "private")
	assert.Contains(t, cacheControl, "no-store")
}

func TestCacheControlMiddleware_NoCacheEndpoint(t *testing.T) {
	app := fiber.New()
	app.Use(middleware.CacheControl())

	app.Get("/api/v1/notifications", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"notifications": []string{}})
	})

	req := httptest.NewRequest("GET", "/api/v1/notifications", nil)
	resp, err := app.Test(req)
	require.NoError(t, err)

	cacheControl := resp.Header.Get("Cache-Control")
	assert.Contains(t, cacheControl, "no-cache")
}

func TestCacheControlMiddleware_WildcardMatching(t *testing.T) {
	app := fiber.New()
	app.Use(middleware.CacheControl())

	app.Get("/api/v1/courses/:id", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"course": "test"})
	})

	req := httptest.NewRequest("GET", "/api/v1/courses/123", nil)
	resp, err := app.Test(req)
	require.NoError(t, err)

	cacheControl := resp.Header.Get("Cache-Control")
	// /api/v1/courses/* matches /api/v1/courses/123
	assert.Contains(t, cacheControl, "public")
}

func TestCacheControlMiddleware_SkipsNonGET(t *testing.T) {
	app := fiber.New()
	app.Use(middleware.CacheControl())

	app.Post("/api/v1/courses", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"created": true})
	})

	req := httptest.NewRequest("POST", "/api/v1/courses", nil)
	resp, err := app.Test(req)
	require.NoError(t, err)

	cacheControl := resp.Header.Get("Cache-Control")
	assert.Empty(t, cacheControl, "Cache-Control should not be set for POST")
}

func TestCacheControlMiddleware_UnmatchedRoute(t *testing.T) {
	app := fiber.New()
	app.Use(middleware.CacheControl())

	app.Get("/api/v1/unknown", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"data": "test"})
	})

	req := httptest.NewRequest("GET", "/api/v1/unknown", nil)
	resp, err := app.Test(req)
	require.NoError(t, err)

	cacheControl := resp.Header.Get("Cache-Control")
	// Default policy is empty, so no header
	assert.Empty(t, cacheControl)
}

func TestCacheControlMiddleware_CustomConfig(t *testing.T) {
	customConfig := middleware.CachePolicyConfig{
		Policies: map[string]middleware.CachePolicy{
			"/custom": {
				Visibility: middleware.CachePublic,
				MaxAge:     600,
			},
		},
		Default: middleware.CachePolicy{
			NoCache: true,
		},
	}

	app := fiber.New()
	app.Use(middleware.CacheControl(customConfig))

	app.Get("/custom", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{})
	})

	app.Get("/other", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{})
	})

	// Test custom route
	req1 := httptest.NewRequest("GET", "/custom", nil)
	resp1, err := app.Test(req1)
	require.NoError(t, err)

	cc1 := resp1.Header.Get("Cache-Control")
	assert.Contains(t, cc1, "public")
	assert.Contains(t, cc1, "max-age=600")

	// Test default policy
	req2 := httptest.NewRequest("GET", "/other", nil)
	resp2, err := app.Test(req2)
	require.NoError(t, err)

	cc2 := resp2.Header.Get("Cache-Control")
	assert.Contains(t, cc2, "no-cache")
}

func TestCacheControlMiddleware_SkipsErrors(t *testing.T) {
	app := fiber.New()
	app.Use(middleware.CacheControl())

	app.Get("/api/v1/courses", func(c *fiber.Ctx) error {
		return c.Status(404).JSON(fiber.Map{"error": "not found"})
	})

	req := httptest.NewRequest("GET", "/api/v1/courses", nil)
	resp, err := app.Test(req)
	require.NoError(t, err)

	cacheControl := resp.Header.Get("Cache-Control")
	assert.Empty(t, cacheControl, "Cache-Control should not be set for error responses")
}
