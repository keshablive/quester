package framework_test

import (
	"encoding/json"
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/keshablive/quester/internal/framework/responses"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type ErrorResponse struct {
	Success   bool   `json:"success"`
	Error     string `json:"error"`
	Code      int    `json:"code"`
	RequestID string `json:"request_id"`
}

func TestBadRequest_IncludesRequestID(t *testing.T) {
	app := fiber.New()
	requestID := "test-request-123"

	app.Get("/test", func(c *fiber.Ctx) error {
		return responses.BadRequest(c, "bad request message")
	})

	req := httptest.NewRequest("GET", "/test", nil)
	req.Header.Set("X-Request-ID", requestID)

	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, fiber.StatusBadRequest, resp.StatusCode)

	var body ErrorResponse
	err = json.NewDecoder(resp.Body).Decode(&body)
	require.NoError(t, err)

	assert.False(t, body.Success)
	assert.Equal(t, "bad request message", body.Error)
	assert.Equal(t, fiber.StatusBadRequest, body.Code)
	assert.Equal(t, requestID, body.RequestID)
}

func TestUnauthorized_IncludesRequestID(t *testing.T) {
	app := fiber.New()
	requestID := "test-request-456"

	app.Get("/test", func(c *fiber.Ctx) error {
		return responses.Unauthorized(c, "unauthorized message")
	})

	req := httptest.NewRequest("GET", "/test", nil)
	req.Header.Set("X-Request-ID", requestID)

	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, fiber.StatusUnauthorized, resp.StatusCode)

	var body ErrorResponse
	err = json.NewDecoder(resp.Body).Decode(&body)
	require.NoError(t, err)

	assert.False(t, body.Success)
	assert.Equal(t, "unauthorized message", body.Error)
	assert.Equal(t, fiber.StatusUnauthorized, body.Code)
	assert.Equal(t, requestID, body.RequestID)
}

func TestForbidden_IncludesRequestID(t *testing.T) {
	app := fiber.New()
	requestID := "test-request-789"

	app.Get("/test", func(c *fiber.Ctx) error {
		return responses.Forbidden(c, "forbidden message")
	})

	req := httptest.NewRequest("GET", "/test", nil)
	req.Header.Set("X-Request-ID", requestID)

	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, fiber.StatusForbidden, resp.StatusCode)

	var body ErrorResponse
	err = json.NewDecoder(resp.Body).Decode(&body)
	require.NoError(t, err)

	assert.False(t, body.Success)
	assert.Equal(t, "forbidden message", body.Error)
	assert.Equal(t, fiber.StatusForbidden, body.Code)
	assert.Equal(t, requestID, body.RequestID)
}

func TestNotFound_IncludesRequestID(t *testing.T) {
	app := fiber.New()
	requestID := "test-request-101"

	app.Get("/test", func(c *fiber.Ctx) error {
		return responses.NotFound(c, "not found message")
	})

	req := httptest.NewRequest("GET", "/test", nil)
	req.Header.Set("X-Request-ID", requestID)

	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, fiber.StatusNotFound, resp.StatusCode)

	var body ErrorResponse
	err = json.NewDecoder(resp.Body).Decode(&body)
	require.NoError(t, err)

	assert.False(t, body.Success)
	assert.Equal(t, "not found message", body.Error)
	assert.Equal(t, fiber.StatusNotFound, body.Code)
	assert.Equal(t, requestID, body.RequestID)
}

func TestInternalError_IncludesRequestID(t *testing.T) {
	app := fiber.New()
	requestID := "test-request-500"

	app.Get("/test", func(c *fiber.Ctx) error {
		return responses.InternalError(c, "internal error message")
	})

	req := httptest.NewRequest("GET", "/test", nil)
	req.Header.Set("X-Request-ID", requestID)

	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, fiber.StatusInternalServerError, resp.StatusCode)

	var body ErrorResponse
	err = json.NewDecoder(resp.Body).Decode(&body)
	require.NoError(t, err)

	assert.False(t, body.Success)
	assert.Equal(t, "internal error message", body.Error)
	assert.Equal(t, fiber.StatusInternalServerError, body.Code)
	assert.Equal(t, requestID, body.RequestID)
}

func TestConflict_IncludesRequestID(t *testing.T) {
	app := fiber.New()
	requestID := "test-request-409"

	app.Get("/test", func(c *fiber.Ctx) error {
		return responses.Conflict(c, "conflict message")
	})

	req := httptest.NewRequest("GET", "/test", nil)
	req.Header.Set("X-Request-ID", requestID)

	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, fiber.StatusConflict, resp.StatusCode)

	var body ErrorResponse
	err = json.NewDecoder(resp.Body).Decode(&body)
	require.NoError(t, err)

	assert.False(t, body.Success)
	assert.Equal(t, "conflict message", body.Error)
	assert.Equal(t, fiber.StatusConflict, body.Code)
	assert.Equal(t, requestID, body.RequestID)
}

func TestTooManyRequests_IncludesRequestID(t *testing.T) {
	app := fiber.New()
	requestID := "test-request-429"

	app.Get("/test", func(c *fiber.Ctx) error {
		return responses.TooManyRequests(c, "rate limited message")
	})

	req := httptest.NewRequest("GET", "/test", nil)
	req.Header.Set("X-Request-ID", requestID)

	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, fiber.StatusTooManyRequests, resp.StatusCode)

	var body ErrorResponse
	err = json.NewDecoder(resp.Body).Decode(&body)
	require.NoError(t, err)

	assert.False(t, body.Success)
	assert.Equal(t, "rate limited message", body.Error)
	assert.Equal(t, fiber.StatusTooManyRequests, body.Code)
	assert.Equal(t, requestID, body.RequestID)
}

func TestErrorResponse_NoRequestID(t *testing.T) {
	// Test that error responses still work even without X-Request-ID header
	app := fiber.New()

	app.Get("/test", func(c *fiber.Ctx) error {
		return responses.BadRequest(c, "bad request")
	})

	req := httptest.NewRequest("GET", "/test", nil)
	// No X-Request-ID header

	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, fiber.StatusBadRequest, resp.StatusCode)

	var body ErrorResponse
	err = json.NewDecoder(resp.Body).Decode(&body)
	require.NoError(t, err)

	assert.False(t, body.Success)
	assert.Equal(t, "bad request", body.Error)
	assert.Equal(t, fiber.StatusBadRequest, body.Code)
	assert.Equal(t, "", body.RequestID) // Empty when no header
}

func TestErrorResponse_ConsistentFormat(t *testing.T) {
	// Test that all error responses have the same structure
	testCases := []struct {
		name       string
		handler    func(c *fiber.Ctx) error
		statusCode int
	}{
		{"BadRequest", func(c *fiber.Ctx) error { return responses.BadRequest(c, "test") }, 400},
		{"Unauthorized", func(c *fiber.Ctx) error { return responses.Unauthorized(c, "test") }, 401},
		{"Forbidden", func(c *fiber.Ctx) error { return responses.Forbidden(c, "test") }, 403},
		{"NotFound", func(c *fiber.Ctx) error { return responses.NotFound(c, "test") }, 404},
		{"Conflict", func(c *fiber.Ctx) error { return responses.Conflict(c, "test") }, 409},
		{"TooManyRequests", func(c *fiber.Ctx) error { return responses.TooManyRequests(c, "test") }, 429},
		{"InternalError", func(c *fiber.Ctx) error { return responses.InternalError(c, "test") }, 500},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			app := fiber.New()
			app.Get("/test", tc.handler)

			req := httptest.NewRequest("GET", "/test", nil)
			req.Header.Set("X-Request-ID", "test-123")

			resp, err := app.Test(req)
			require.NoError(t, err)
			assert.Equal(t, tc.statusCode, resp.StatusCode)

			var body map[string]interface{}
			err = json.NewDecoder(resp.Body).Decode(&body)
			require.NoError(t, err)

			// All error responses must have these fields
			assert.Contains(t, body, "success")
			assert.Contains(t, body, "error")
			assert.Contains(t, body, "code")
			assert.Contains(t, body, "request_id")

			// Verify types
			assert.False(t, body["success"].(bool))
			assert.IsType(t, "", body["error"])
			assert.IsType(t, float64(0), body["code"]) // JSON numbers are float64
			assert.IsType(t, "", body["request_id"])
		})
	}
}
