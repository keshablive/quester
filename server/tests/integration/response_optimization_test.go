// Package integration contains integration tests for the Quester API.
// 008-api-response-optimization T047-T049: Integration tests for response optimization
package integration

import (
	"encoding/json"
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/keshablive/quester/internal/framework/middleware"
	"github.com/keshablive/quester/internal/framework/responses"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// setupTestApp creates a test app with all response optimization middleware
func setupTestApp() *fiber.App {
	app := fiber.New()

	// Wire middleware in the correct order (T044)
	app.Use(middleware.RequestID())
	app.Use(middleware.ResponseVersion())
	app.Use(middleware.Fields())
	app.Use(middleware.CacheControl())

	return app
}

// TestSparseFieldsetsWithPagination tests US1 + pagination (T047)
func TestSparseFieldsetsWithPagination(t *testing.T) {
	app := setupTestApp()

	// Mock data for courses list
	courses := []interface{}{
		map[string]interface{}{
			"id":          1,
			"title":       "Go Programming",
			"description": "Learn Go from scratch",
			"instructor":  map[string]interface{}{"id": 101, "name": "John", "email": "john@test.com"},
		},
		map[string]interface{}{
			"id":          2,
			"title":       "Python Basics",
			"description": "Python for beginners",
			"instructor":  map[string]interface{}{"id": 102, "name": "Jane", "email": "jane@test.com"},
		},
	}

	app.Get("/api/v1/courses", func(c *fiber.Ctx) error {
		return responses.SuccessWithPaginationAndFields(c, courses, 50, 1, 10)
	})

	t.Run("sparse fieldsets with pagination", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/api/v1/courses?fields=id,title", nil)
		resp, err := app.Test(req)
		require.NoError(t, err)

		assert.Equal(t, 200, resp.StatusCode)

		var result map[string]interface{}
		err = json.NewDecoder(resp.Body).Decode(&result)
		require.NoError(t, err)

		// Check data is filtered
		data, ok := result["data"].([]interface{})
		require.True(t, ok)
		require.Len(t, data, 2)

		// First course should only have id and title
		course1 := data[0].(map[string]interface{})
		assert.Contains(t, course1, "id")
		assert.Contains(t, course1, "title")
		assert.NotContains(t, course1, "description")
		assert.NotContains(t, course1, "instructor")

		// Check pagination
		pagination, ok := result["pagination"].(map[string]interface{})
		require.True(t, ok)
		assert.Equal(t, float64(50), pagination["total"])
		assert.Equal(t, float64(1), pagination["page"])
		assert.Equal(t, float64(10), pagination["limit"])
	})

	t.Run("nested field filtering", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/api/v1/courses?fields=id,instructor.name", nil)
		resp, err := app.Test(req)
		require.NoError(t, err)

		var result map[string]interface{}
		err = json.NewDecoder(resp.Body).Decode(&result)
		require.NoError(t, err)

		data := result["data"].([]interface{})
		course1 := data[0].(map[string]interface{})

		// Should have id
		assert.Contains(t, course1, "id")

		// Instructor should only have name
		instructor, ok := course1["instructor"].(map[string]interface{})
		require.True(t, ok)
		assert.Contains(t, instructor, "name")
		assert.NotContains(t, instructor, "id")
		assert.NotContains(t, instructor, "email")
	})

	t.Run("no fields param returns full response", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/api/v1/courses", nil)
		resp, err := app.Test(req)
		require.NoError(t, err)

		var result map[string]interface{}
		err = json.NewDecoder(resp.Body).Decode(&result)
		require.NoError(t, err)

		data := result["data"].([]interface{})
		course1 := data[0].(map[string]interface{})

		// Should have all fields
		assert.Contains(t, course1, "id")
		assert.Contains(t, course1, "title")
		assert.Contains(t, course1, "description")
		assert.Contains(t, course1, "instructor")
	})
}

// TestETagConditionalRequests tests US2 ETag functionality (T048)
func TestETagConditionalRequests(t *testing.T) {
	app := setupTestApp()

	// Add ETag middleware after setup
	app.Use(middleware.ETag())

	testData := fiber.Map{"id": 1, "name": "Test Resource"}

	app.Get("/api/v1/resource", func(c *fiber.Ctx) error {
		return c.JSON(testData)
	})

	t.Run("generates ETag on response", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/api/v1/resource", nil)
		resp, err := app.Test(req)
		require.NoError(t, err)

		assert.Equal(t, 200, resp.StatusCode)

		etag := resp.Header.Get("ETag")
		assert.NotEmpty(t, etag, "ETag header should be present")
		assert.True(t, etag[0] == '"' || etag[0] == 'W', "ETag should be quoted")
	})

	t.Run("returns 304 on ETag match", func(t *testing.T) {
		// First request to get ETag
		req1 := httptest.NewRequest("GET", "/api/v1/resource", nil)
		resp1, err := app.Test(req1)
		require.NoError(t, err)

		etag := resp1.Header.Get("ETag")
		require.NotEmpty(t, etag)

		// Second request with If-None-Match
		req2 := httptest.NewRequest("GET", "/api/v1/resource", nil)
		req2.Header.Set("If-None-Match", etag)
		resp2, err := app.Test(req2)
		require.NoError(t, err)

		assert.Equal(t, 304, resp2.StatusCode, "Should return 304 Not Modified")
	})

	t.Run("returns 200 on ETag mismatch", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/api/v1/resource", nil)
		req.Header.Set("If-None-Match", `"wrong-etag"`)
		resp, err := app.Test(req)
		require.NoError(t, err)

		assert.Equal(t, 200, resp.StatusCode, "Should return 200 OK on mismatch")
	})

	t.Run("includes X-Request-ID in response", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/api/v1/resource", nil)
		resp, err := app.Test(req)
		require.NoError(t, err)

		requestID := resp.Header.Get("X-Request-ID")
		assert.NotEmpty(t, requestID, "X-Request-ID should be present")
	})

	t.Run("honors client X-Request-ID", func(t *testing.T) {
		clientID := "client-trace-id-123"
		req := httptest.NewRequest("GET", "/api/v1/resource", nil)
		req.Header.Set("X-Request-ID", clientID)
		resp, err := app.Test(req)
		require.NoError(t, err)

		requestID := resp.Header.Get("X-Request-ID")
		assert.Equal(t, clientID, requestID, "Should echo client's X-Request-ID")
	})
}

// TestV2EnvelopeFormat tests US3 envelope format (T049)
func TestV2EnvelopeFormat(t *testing.T) {
	app := setupTestApp()

	testData := map[string]interface{}{"id": 1, "name": "Test"}

	app.Get("/api/v1/item", func(c *fiber.Ctx) error {
		return responses.AutoSuccess(c, testData)
	})

	app.Get("/api/v1/items", func(c *fiber.Ctx) error {
		items := []interface{}{testData, testData}
		return responses.AutoSuccessWithPagination(c, items, 100, 1, 10)
	})

	app.Get("/api/v1/error", func(c *fiber.Ctx) error {
		return responses.AutoError(c, 400, "Bad request")
	})

	t.Run("V2 envelope for success response", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/api/v1/item", nil)
		req.Header.Set("Accept", middleware.V2AcceptHeader)
		resp, err := app.Test(req)
		require.NoError(t, err)

		var result responses.ResponseEnvelope
		err = json.NewDecoder(resp.Body).Decode(&result)
		require.NoError(t, err)

		// FR-011: { "data": ..., "meta": {...} }
		assert.NotNil(t, result.Data)
		assert.NotNil(t, result.Meta)
		assert.Nil(t, result.Error)

		// FR-014: request_id in meta
		assert.NotEmpty(t, result.Meta.RequestID)
	})

	t.Run("V2 envelope with pagination", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/api/v1/items", nil)
		req.Header.Set("Accept", middleware.V2AcceptHeader)
		resp, err := app.Test(req)
		require.NoError(t, err)

		var result responses.ResponseEnvelope
		err = json.NewDecoder(resp.Body).Decode(&result)
		require.NoError(t, err)

		// FR-012: pagination in meta
		assert.Equal(t, 1, result.Meta.Page)
		assert.Equal(t, 10, result.Meta.Limit)
		assert.Equal(t, int64(100), result.Meta.Total)
		assert.True(t, result.Meta.HasMore)
	})

	t.Run("V2 error envelope", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/api/v1/error", nil)
		req.Header.Set("Accept", middleware.V2AcceptHeader)
		resp, err := app.Test(req)
		require.NoError(t, err)

		assert.Equal(t, 400, resp.StatusCode)

		var result responses.ResponseEnvelope
		err = json.NewDecoder(resp.Body).Decode(&result)
		require.NoError(t, err)

		// FR-013: { "error": { "code": ..., "message": ... } }
		assert.Nil(t, result.Data)
		assert.NotNil(t, result.Error)
		assert.Equal(t, 400, result.Error.Code)
		assert.Equal(t, "Bad request", result.Error.Message)
	})

	t.Run("V1 format for standard Accept header", func(t *testing.T) {
		// FR-011a: Return legacy format for application/json
		req := httptest.NewRequest("GET", "/api/v1/item", nil)
		req.Header.Set("Accept", "application/json")
		resp, err := app.Test(req)
		require.NoError(t, err)

		var result map[string]interface{}
		err = json.NewDecoder(resp.Body).Decode(&result)
		require.NoError(t, err)

		// V1 format has "success" field
		assert.Contains(t, result, "success")
		assert.Contains(t, result, "data")
	})

	t.Run("V1 format by default (no Accept header)", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/api/v1/item", nil)
		resp, err := app.Test(req)
		require.NoError(t, err)

		var result map[string]interface{}
		err = json.NewDecoder(resp.Body).Decode(&result)
		require.NoError(t, err)

		// Should default to V1 format
		assert.Contains(t, result, "success")
	})
}

// TestCacheControlHeaders tests US5 Cache-Control (T049)
func TestCacheControlHeaders(t *testing.T) {
	app := setupTestApp()

	app.Get("/api/v1/courses", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"courses": []string{}})
	})

	app.Get("/api/v1/users/me", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"user": "test"})
	})

	app.Get("/api/v1/notifications", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"notifications": []string{}})
	})

	t.Run("public endpoint has public cache policy", func(t *testing.T) {
		// FR-019: Cache-Control: public, max-age=300
		req := httptest.NewRequest("GET", "/api/v1/courses", nil)
		resp, err := app.Test(req)
		require.NoError(t, err)

		cacheControl := resp.Header.Get("Cache-Control")
		assert.Contains(t, cacheControl, "public")
		assert.Contains(t, cacheControl, "max-age=300")
	})

	t.Run("private endpoint has private cache policy", func(t *testing.T) {
		// FR-020: Cache-Control: private, no-store
		req := httptest.NewRequest("GET", "/api/v1/users/me", nil)
		resp, err := app.Test(req)
		require.NoError(t, err)

		cacheControl := resp.Header.Get("Cache-Control")
		assert.Contains(t, cacheControl, "private")
		assert.Contains(t, cacheControl, "no-store")
	})

	t.Run("real-time endpoint has no-cache policy", func(t *testing.T) {
		// FR-021: Cache-Control: no-cache
		req := httptest.NewRequest("GET", "/api/v1/notifications", nil)
		resp, err := app.Test(req)
		require.NoError(t, err)

		cacheControl := resp.Header.Get("Cache-Control")
		assert.Contains(t, cacheControl, "no-cache")
	})
}

// TestSensitiveFieldExclusion tests FR-005a
func TestSensitiveFieldExclusion(t *testing.T) {
	app := setupTestApp()

	userData := map[string]interface{}{
		"id":            1,
		"name":          "John",
		"email":         "john@test.com",
		"password_hash": "secret123",
		"totp_secret":   "ABCD1234",
	}

	app.Get("/api/v1/users/me", func(c *fiber.Ctx) error {
		return responses.SuccessWithFields(c, userData)
	})

	t.Run("sensitive fields excluded even when requested", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/api/v1/users/me?fields=id,name,password_hash", nil)
		resp, err := app.Test(req)
		require.NoError(t, err)

		var result map[string]interface{}
		err = json.NewDecoder(resp.Body).Decode(&result)
		require.NoError(t, err)

		data := result["data"].(map[string]interface{})

		// Should have safe fields
		assert.Contains(t, data, "id")
		assert.Contains(t, data, "name")

		// Sensitive fields should be excluded
		assert.NotContains(t, data, "password_hash")
		assert.NotContains(t, data, "totp_secret")
	})

	t.Run("sensitive fields excluded from full response", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/api/v1/users/me", nil)
		resp, err := app.Test(req)
		require.NoError(t, err)

		var result map[string]interface{}
		err = json.NewDecoder(resp.Body).Decode(&result)
		require.NoError(t, err)

		data := result["data"].(map[string]interface{})

		// Safe fields present
		assert.Contains(t, data, "id")
		assert.Contains(t, data, "name")
		assert.Contains(t, data, "email")

		// Sensitive fields should still be excluded
		assert.NotContains(t, data, "password_hash")
		assert.NotContains(t, data, "totp_secret")
	})
}

// TestAllInvalidFieldsEdgeCase tests T010a
func TestAllInvalidFieldsEdgeCase(t *testing.T) {
	app := setupTestApp()

	testData := map[string]interface{}{
		"id":    1,
		"title": "Test",
	}

	app.Get("/api/v1/item", func(c *fiber.Ctx) error {
		return responses.SuccessWithFields(c, testData)
	})

	t.Run("all invalid fields returns empty data with warning", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/api/v1/item?fields=invalid1,invalid2", nil)
		resp, err := app.Test(req)
		require.NoError(t, err)

		assert.Equal(t, 200, resp.StatusCode)

		var result map[string]interface{}
		err = json.NewDecoder(resp.Body).Decode(&result)
		require.NoError(t, err)

		// Data should be empty
		data := result["data"].(map[string]interface{})
		assert.Empty(t, data)

		// Should have warning
		warning, ok := result["warning"].(string)
		assert.True(t, ok)
		assert.Contains(t, warning, "invalid")
	})
}
