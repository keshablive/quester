// Package unit contains unit tests for the Quester API.
// 008-api-response-optimization T024: Unit tests for ETag generation and matching
package unit

import (
	"io"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/keshablive/quester/internal/framework/middleware"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestETagMiddleware_GeneratesETag(t *testing.T) {
	app := fiber.New()

	// Add ETag middleware
	app.Use(middleware.ETag())

	app.Get("/test", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"id": 1, "name": "test"})
	})

	req := httptest.NewRequest("GET", "/test", nil)
	resp, err := app.Test(req)
	require.NoError(t, err)

	// Verify ETag header is set
	etag := resp.Header.Get("ETag")
	assert.NotEmpty(t, etag, "ETag header should be set")
	assert.True(t, etag[0] == '"' || etag[0] == 'W', "ETag should start with quote or W/")
}

func TestETagMiddleware_Returns304OnMatch(t *testing.T) {
	app := fiber.New()

	app.Use(middleware.ETag())

	responseData := fiber.Map{"id": 1, "name": "test"}

	app.Get("/test", func(c *fiber.Ctx) error {
		return c.JSON(responseData)
	})

	// First request to get ETag
	req1 := httptest.NewRequest("GET", "/test", nil)
	resp1, err := app.Test(req1)
	require.NoError(t, err)

	etag := resp1.Header.Get("ETag")
	require.NotEmpty(t, etag)

	// Second request with If-None-Match
	req2 := httptest.NewRequest("GET", "/test", nil)
	req2.Header.Set("If-None-Match", etag)
	resp2, err := app.Test(req2)
	require.NoError(t, err)

	// Should return 304
	assert.Equal(t, 304, resp2.StatusCode, "Should return 304 Not Modified")
}

func TestETagMiddleware_WeakETag(t *testing.T) {
	app := fiber.New()

	// Configure weak ETags
	app.Use(middleware.ETag(middleware.ETagConfig{
		Weak: true,
	}))

	app.Get("/list", func(c *fiber.Ctx) error {
		return c.JSON([]fiber.Map{{"id": 1}, {"id": 2}})
	})

	req := httptest.NewRequest("GET", "/list", nil)
	resp, err := app.Test(req)
	require.NoError(t, err)

	etag := resp.Header.Get("ETag")
	assert.True(t, len(etag) > 3 && etag[:2] == "W/", "Should be weak ETag (W/...)")
}

func TestETagMiddleware_SkipsNonGET(t *testing.T) {
	app := fiber.New()
	app.Use(middleware.ETag())

	app.Post("/test", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"id": 1})
	})

	req := httptest.NewRequest("POST", "/test", nil)
	resp, err := app.Test(req)
	require.NoError(t, err)

	etag := resp.Header.Get("ETag")
	assert.Empty(t, etag, "ETag should not be set for POST requests")
}

func TestLastModifiedFormatting(t *testing.T) {
	// Test RFC 7231 date formatting
	testTime := time.Date(2024, 11, 27, 14, 30, 0, 0, time.UTC)

	app := fiber.New()
	app.Use(middleware.ETag())

	app.Get("/test", func(c *fiber.Ctx) error {
		middleware.SetLastModified(c, testTime)
		return c.JSON(fiber.Map{"id": 1})
	})

	req := httptest.NewRequest("GET", "/test", nil)
	resp, err := app.Test(req)
	require.NoError(t, err)

	lastMod := resp.Header.Get("Last-Modified")
	assert.Contains(t, lastMod, "2024")
	assert.Contains(t, lastMod, "Nov")
	assert.Contains(t, lastMod, "27")
}

func TestETagMiddleware_IncludesUserID(t *testing.T) {
	app := fiber.New()

	app.Use(middleware.ETag(middleware.ETagConfig{
		IncludeUserID: true,
	}))

	app.Get("/test", func(c *fiber.Ctx) error {
		c.Locals("userID", "user123")
		return c.JSON(fiber.Map{"id": 1})
	})

	// Request 1 with user123
	req1 := httptest.NewRequest("GET", "/test", nil)
	resp1, err := app.Test(req1)
	require.NoError(t, err)
	etag1 := resp1.Header.Get("ETag")

	// Request 2 with same user - should get same ETag
	req2 := httptest.NewRequest("GET", "/test", nil)
	resp2, err := app.Test(req2)
	require.NoError(t, err)
	etag2 := resp2.Header.Get("ETag")

	assert.Equal(t, etag1, etag2, "Same user ID should produce same ETag")
}

func TestRequestIDMiddleware_GeneratesUUID(t *testing.T) {
	app := fiber.New()
	app.Use(middleware.RequestID())

	var capturedID string

	app.Get("/test", func(c *fiber.Ctx) error {
		capturedID = middleware.GetRequestID(c)
		return c.SendString("ok")
	})

	req := httptest.NewRequest("GET", "/test", nil)
	resp, err := app.Test(req)
	require.NoError(t, err)
	io.ReadAll(resp.Body) // drain body

	assert.NotEmpty(t, capturedID)
	// UUID format: 8-4-4-4-12
	assert.Len(t, capturedID, 36)

	// Should also be in response header
	respID := resp.Header.Get("X-Request-ID")
	assert.Equal(t, capturedID, respID)
}

func TestRequestIDMiddleware_HonorsClientHeader(t *testing.T) {
	// FR-014: Honor X-Request-ID header from client
	app := fiber.New()
	app.Use(middleware.RequestID())

	var capturedID string
	clientID := "client-provided-id-123"

	app.Get("/test", func(c *fiber.Ctx) error {
		capturedID = middleware.GetRequestID(c)
		return c.SendString("ok")
	})

	req := httptest.NewRequest("GET", "/test", nil)
	req.Header.Set("X-Request-ID", clientID)
	resp, err := app.Test(req)
	require.NoError(t, err)
	io.ReadAll(resp.Body)

	assert.Equal(t, clientID, capturedID)

	// Should be echoed in response
	respID := resp.Header.Get("X-Request-ID")
	assert.Equal(t, clientID, respID)
}

func TestResponseVersionMiddleware_DefaultsToV1(t *testing.T) {
	app := fiber.New()
	app.Use(middleware.ResponseVersion())

	var version string

	app.Get("/test", func(c *fiber.Ctx) error {
		version = middleware.GetAPIVersion(c)
		return c.SendString("ok")
	})

	req := httptest.NewRequest("GET", "/test", nil)
	_, err := app.Test(req)
	require.NoError(t, err)

	assert.Equal(t, middleware.APIVersionV1, version)
}

func TestResponseVersionMiddleware_DetectsV2(t *testing.T) {
	// FR-011: Detect v2 from Accept header
	app := fiber.New()
	app.Use(middleware.ResponseVersion())

	var version string
	var isV2 bool

	app.Get("/test", func(c *fiber.Ctx) error {
		version = middleware.GetAPIVersion(c)
		isV2 = middleware.IsV2Request(c)
		return c.SendString("ok")
	})

	req := httptest.NewRequest("GET", "/test", nil)
	req.Header.Set("Accept", middleware.V2AcceptHeader)
	_, err := app.Test(req)
	require.NoError(t, err)

	assert.Equal(t, middleware.APIVersionV2, version)
	assert.True(t, isV2)
}

func TestFieldsMiddleware_ParsesFields(t *testing.T) {
	app := fiber.New()
	app.Use(middleware.Fields())

	var fields []string

	app.Get("/test", func(c *fiber.Ctx) error {
		fields = middleware.GetRequestedFields(c)
		return c.SendString("ok")
	})

	req := httptest.NewRequest("GET", "/test?fields=id,title,description", nil)
	_, err := app.Test(req)
	require.NoError(t, err)

	require.NotNil(t, fields)
	assert.ElementsMatch(t, []string{"id", "title", "description"}, fields)
}

func TestFieldsMiddleware_NoFieldsParam(t *testing.T) {
	app := fiber.New()
	app.Use(middleware.Fields())

	var fields []string
	var hasSelection bool

	app.Get("/test", func(c *fiber.Ctx) error {
		fields = middleware.GetRequestedFields(c)
		hasSelection = middleware.HasFieldSelection(c)
		return c.SendString("ok")
	})

	req := httptest.NewRequest("GET", "/test", nil)
	_, err := app.Test(req)
	require.NoError(t, err)

	assert.Nil(t, fields)
	assert.False(t, hasSelection)
}
