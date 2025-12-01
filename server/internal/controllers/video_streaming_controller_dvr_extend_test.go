// T542: Tests for DVR window extension endpoint
package controllers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/keshablive/quester/internal/models"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

// setupTestDBWithStream creates a test database with a sample stream
func setupTestDBWithStream(t *testing.T) (*gorm.DB, models.VideoStream, uuid.UUID) {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)

	// Auto-migrate
	err = db.AutoMigrate(&models.VideoStream{})
	require.NoError(t, err)

	// Create test user
	userID := uuid.New()
	tenantID := uuid.New()

	// Create test stream
	stream := models.VideoStream{
		ID:         uuid.New().String(),
		TenantID:   tenantID.String(),
		CreatorID:  userID.String(),
		Title:      "Test Stream",
		StreamType: models.StreamTypeLive,
		Status:     models.StreamStatusLive,
		StreamKey:  "test-stream-key-123",
		DVREnabled: true,
		DVRWindow:  7200, // 2 hours
	}

	err = db.Create(&stream).Error
	require.NoError(t, err)

	return db, stream, userID
}

func TestExtendDVRWindow_Success(t *testing.T) {
	db, stream, userID := setupTestDBWithStream(t)
	defer func() {
		sqlDB, _ := db.DB()
		sqlDB.Close()
	}()

	controller := NewVideoStreamingController(db, nil, nil)

	app := fiber.New()
	app.Post("/api/v1/streams/:key/dvr/extend", func(c *fiber.Ctx) error {
		// Mock authentication
		c.Locals("userID", userID)
		return controller.ExtendDVRWindow(c)
	})

	// Request body
	requestBody := map[string]interface{}{
		"additional_hours": 4,
		"reason":           "Premium event coverage",
	}
	bodyBytes, _ := json.Marshal(requestBody)

	// Make request
	req := httptest.NewRequest(http.MethodPost, "/api/v1/streams/test-stream-key-123/dvr/extend", bytes.NewReader(bodyBytes))
	req.Header.Set("Content-Type", "application/json")

	resp, err := app.Test(req, -1)
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, resp.StatusCode)

	// Parse response
	var result map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&result)

	assert.Equal(t, "DVR window extended successfully", result["message"])
	assert.Equal(t, float64(4), result["extended_hours"])
	assert.Equal(t, float64(2), result["old_window_hours"])
	assert.Equal(t, float64(6), result["new_window_hours"])
	assert.Equal(t, float64(21600), result["new_window_seconds"])

	// Verify database was updated
	var updatedStream models.VideoStream
	db.First(&updatedStream, "stream_key = ?", stream.StreamKey)
	assert.Equal(t, 21600, updatedStream.DVRWindow) // 6 hours = 21600 seconds
}

func TestExtendDVRWindow_InvalidHours(t *testing.T) {
	db, _, userID := setupTestDBWithStream(t)
	defer func() {
		sqlDB, _ := db.DB()
		sqlDB.Close()
	}()

	controller := NewVideoStreamingController(db, nil, nil)

	app := fiber.New()
	app.Post("/api/v1/streams/:key/dvr/extend", func(c *fiber.Ctx) error {
		c.Locals("userID", userID)
		return controller.ExtendDVRWindow(c)
	})

	tests := []struct {
		name            string
		additionalHours int
		expectedStatus  int
	}{
		{"Zero hours", 0, http.StatusBadRequest},
		{"Negative hours", -1, http.StatusBadRequest},
		{"Exceeds maximum", 25, http.StatusBadRequest},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			requestBody := map[string]interface{}{
				"additional_hours": tt.additionalHours,
			}
			bodyBytes, _ := json.Marshal(requestBody)

			req := httptest.NewRequest(http.MethodPost, "/api/v1/streams/test-stream-key-123/dvr/extend", bytes.NewReader(bodyBytes))
			req.Header.Set("Content-Type", "application/json")

			resp, err := app.Test(req, -1)
			require.NoError(t, err)
			assert.Equal(t, tt.expectedStatus, resp.StatusCode)
		})
	}
}

func TestExtendDVRWindow_MaxWindowCap(t *testing.T) {
	db, stream, userID := setupTestDBWithStream(t)
	defer func() {
		sqlDB, _ := db.DB()
		sqlDB.Close()
	}()

	// Update stream to already have 20 hours DVR window
	db.Model(&stream).Update("dvr_window", 72000) // 20 hours

	controller := NewVideoStreamingController(db, nil, nil)

	app := fiber.New()
	app.Post("/api/v1/streams/:key/dvr/extend", func(c *fiber.Ctx) error {
		c.Locals("userID", userID)
		return controller.ExtendDVRWindow(c)
	})

	// Try to add 10 more hours (would exceed 24h max)
	requestBody := map[string]interface{}{
		"additional_hours": 10,
	}
	bodyBytes, _ := json.Marshal(requestBody)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/streams/test-stream-key-123/dvr/extend", bytes.NewReader(bodyBytes))
	req.Header.Set("Content-Type", "application/json")

	resp, err := app.Test(req, -1)
	require.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, resp.StatusCode)

	// Parse error response
	var result map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&result)

	assert.Contains(t, result["error"], "exceed maximum allowed")
	assert.Equal(t, float64(20), result["current"])
	assert.Equal(t, float64(10), result["requested"])
	assert.Equal(t, float64(24), result["max_allowed"])
}

func TestExtendDVRWindow_Unauthorized(t *testing.T) {
	db, _, _ := setupTestDBWithStream(t)
	defer func() {
		sqlDB, _ := db.DB()
		sqlDB.Close()
	}()

	controller := NewVideoStreamingController(db, nil, nil)

	app := fiber.New()
	app.Post("/api/v1/streams/:key/dvr/extend", func(c *fiber.Ctx) error {
		// Mock different user (not the creator)
		differentUserID := uuid.New()
		c.Locals("userID", differentUserID)
		return controller.ExtendDVRWindow(c)
	})

	requestBody := map[string]interface{}{
		"additional_hours": 4,
	}
	bodyBytes, _ := json.Marshal(requestBody)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/streams/test-stream-key-123/dvr/extend", bytes.NewReader(bodyBytes))
	req.Header.Set("Content-Type", "application/json")

	resp, err := app.Test(req, -1)
	require.NoError(t, err)
	assert.Equal(t, http.StatusForbidden, resp.StatusCode)

	// Parse error response
	var result map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&result)

	assert.Contains(t, result["error"], "permission")
}

func TestExtendDVRWindow_StreamNotLive(t *testing.T) {
	db, stream, userID := setupTestDBWithStream(t)
	defer func() {
		sqlDB, _ := db.DB()
		sqlDB.Close()
	}()

	// Update stream to ended status
	db.Model(&stream).Update("status", models.StreamStatusEnded)

	controller := NewVideoStreamingController(db, nil, nil)

	app := fiber.New()
	app.Post("/api/v1/streams/:key/dvr/extend", func(c *fiber.Ctx) error {
		c.Locals("userID", userID)
		return controller.ExtendDVRWindow(c)
	})

	requestBody := map[string]interface{}{
		"additional_hours": 4,
	}
	bodyBytes, _ := json.Marshal(requestBody)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/streams/test-stream-key-123/dvr/extend", bytes.NewReader(bodyBytes))
	req.Header.Set("Content-Type", "application/json")

	resp, err := app.Test(req, -1)
	require.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, resp.StatusCode)

	// Parse error response
	var result map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&result)

	assert.Contains(t, result["error"], "must be live")
	assert.Equal(t, string(models.StreamStatusEnded), result["status"])
}

func TestExtendDVRWindow_StreamNotFound(t *testing.T) {
	db, _, userID := setupTestDBWithStream(t)
	defer func() {
		sqlDB, _ := db.DB()
		sqlDB.Close()
	}()

	controller := NewVideoStreamingController(db, nil, nil)

	app := fiber.New()
	app.Post("/api/v1/streams/:key/dvr/extend", func(c *fiber.Ctx) error {
		c.Locals("userID", userID)
		return controller.ExtendDVRWindow(c)
	})

	requestBody := map[string]interface{}{
		"additional_hours": 4,
	}
	bodyBytes, _ := json.Marshal(requestBody)

	// Use non-existent stream key
	req := httptest.NewRequest(http.MethodPost, "/api/v1/streams/nonexistent-key/dvr/extend", bytes.NewReader(bodyBytes))
	req.Header.Set("Content-Type", "application/json")

	resp, err := app.Test(req, -1)
	require.NoError(t, err)
	assert.Equal(t, http.StatusNotFound, resp.StatusCode)

	// Parse error response
	var result map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&result)

	assert.Contains(t, result["error"], "not found")
}
