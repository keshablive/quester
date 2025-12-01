// T506, T507, T510: Video streaming controller with structured logging
package controllers

import (
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/keshablive/quester/internal/models"
	"github.com/keshablive/quester/internal/framework/service"
	"gorm.io/gorm"
)

// VideoStreamingController handles video streaming endpoints
type VideoStreamingController struct {
	db      *gorm.DB
	service *service.VideoStreamingService
	dvr     *service.DVRService
}

// NewVideoStreamingController creates a new video streaming controller
func NewVideoStreamingController(db *gorm.DB, service *service.VideoStreamingService, dvr *service.DVRService) *VideoStreamingController {
	return &VideoStreamingController{
		db:      db,
		service: service,
		dvr:     dvr,
	}
}

// T510: Structured logging helper
type streamLog struct {
	Timestamp string                 `json:"timestamp"`
	Level     string                 `json:"level"`
	Event     string                 `json:"event"`
	RequestID string                 `json:"request_id,omitempty"`
	StreamID  string                 `json:"stream_id,omitempty"`
	UserID    string                 `json:"user_id,omitempty"`
	TenantID  string                 `json:"tenant_id,omitempty"`
	StreamKey string                 `json:"stream_key,omitempty"` // Only for validation events
	Details   map[string]interface{} `json:"details,omitempty"`
	Error     string                 `json:"error,omitempty"`
}

// logStreamEvent logs a structured stream event
func logStreamEvent(level, event string, fields streamLog) {
	fields.Timestamp = time.Now().UTC().Format(time.RFC3339)
	fields.Level = level
	fields.Event = event

	logJSON, err := json.Marshal(fields)
	if err != nil {
		log.Printf("[ERROR] Failed to marshal log: %v", err)
		return
	}
	log.Println(string(logJSON))
}

// getRequestID extracts or generates a request ID for tracing
func getRequestID(c *fiber.Ctx) string {
	// Try to get X-Request-ID header first
	requestID := c.Get("X-Request-ID")
	if requestID == "" {
		// Generate new UUID if not present
		requestID = uuid.New().String()
	}
	return requestID
}

// CreateStreamRequest represents the request body for creating a stream
type CreateStreamRequest struct {
	Title       string     `json:"title" validate:"required,min=1,max=255"`
	Description string     `json:"description" validate:"max=5000"`
	ScheduledAt *time.Time `json:"scheduled_at"`
	DVREnabled  bool       `json:"dvr_enabled"`
	IsPublic    bool       `json:"is_public"`
}

// CreateStreamResponse represents the response for creating a stream
type CreateStreamResponse struct {
	ID           uuid.UUID `json:"id"`
	StreamKey    string    `json:"stream_key"`
	RTMPEndpoint string    `json:"rtmp_endpoint"`
	HLSPlaylist  string    `json:"hls_playlist"`
	State        string    `json:"state"`
	CreatedAt    time.Time `json:"created_at"`
}

// T506, T510: CreateStream creates a new live stream with structured logging
// POST /api/v1/streams
func (ctrl *VideoStreamingController) CreateStream(c *fiber.Ctx) error {
	requestID := getRequestID(c)

	// Parse request body
	var req CreateStreamRequest
	if err := c.BodyParser(&req); err != nil {
		logStreamEvent("ERROR", "stream_create_failed", streamLog{
			RequestID: requestID,
			Error:     "Invalid request body: " + err.Error(),
		})
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// Validate request
	if req.Title == "" {
		logStreamEvent("ERROR", "stream_create_failed", streamLog{
			RequestID: requestID,
			Error:     "Title is required",
		})
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Title is required",
		})
	}

	// Get user ID and tenant ID from context (set by auth middleware)
	userID, ok := c.Locals("userID").(uuid.UUID)
	if !ok {
		logStreamEvent("ERROR", "stream_create_failed", streamLog{
			RequestID: requestID,
			Error:     "User not authenticated",
		})
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "User not authenticated",
		})
	}

	tenantID, ok := c.Locals("tenantID").(uuid.UUID)
	if !ok {
		logStreamEvent("ERROR", "stream_create_failed", streamLog{
			RequestID: requestID,
			UserID:    userID.String(),
			Error:     "Tenant not found",
		})
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Tenant not found",
		})
	}

	// T508: Generate secure stream key
	streamKey, err := service.GenerateStreamKey()
	if err != nil {
		logStreamEvent("ERROR", "stream_key_generation_failed", streamLog{
			RequestID: requestID,
			UserID:    userID.String(),
			TenantID:  tenantID.String(),
			Error:     err.Error(),
		})
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to generate stream key",
		})
	}

	logStreamEvent("INFO", "stream_key_generated", streamLog{
		RequestID: requestID,
		UserID:    userID.String(),
		TenantID:  tenantID.String(),
		Details: map[string]interface{}{
			"title":        req.Title,
			"dvr_enabled":  req.DVREnabled,
			"is_public":    req.IsPublic,
			"scheduled_at": req.ScheduledAt,
		},
	})

	// Create stream record
	stream := models.Stream{
		TenantID:    tenantID,
		UserID:      userID,
		Title:       req.Title,
		Description: req.Description,
		StreamKey:   streamKey,
		State:       models.StreamStatePending,
		ScheduledAt: req.ScheduledAt,
		DVREnabled:  req.DVREnabled,
		IsPublic:    req.IsPublic,
	}

	// Save to database
	if err := ctrl.db.Create(&stream).Error; err != nil {
		logStreamEvent("ERROR", "stream_create_db_failed", streamLog{
			RequestID: requestID,
			UserID:    userID.String(),
			TenantID:  tenantID.String(),
			Error:     err.Error(),
		})
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to create stream",
		})
	}

	// Build RTMP and HLS endpoints
	rtmpEndpoint := buildRTMPEndpoint(streamKey)
	hlsPlaylist := buildHLSPlaylist(stream.ID)

	// Update endpoints in database
	stream.RTMPEndpoint = rtmpEndpoint
	stream.HLSPlaylist = hlsPlaylist
	ctrl.db.Save(&stream)

	logStreamEvent("INFO", "stream_created", streamLog{
		RequestID: requestID,
		StreamID:  stream.ID.String(),
		UserID:    userID.String(),
		TenantID:  tenantID.String(),
		Details: map[string]interface{}{
			"title":         req.Title,
			"state":         string(stream.State),
			"rtmp_endpoint": rtmpEndpoint,
			"hls_playlist":  hlsPlaylist,
			"dvr_enabled":   req.DVREnabled,
			"is_public":     req.IsPublic,
		},
	})

	// Return response
	return c.Status(fiber.StatusCreated).JSON(CreateStreamResponse{
		ID:           stream.ID,
		StreamKey:    streamKey,
		RTMPEndpoint: rtmpEndpoint,
		HLSPlaylist:  hlsPlaylist,
		State:        string(stream.State),
		CreatedAt:    stream.CreatedAt,
	})
}

// ValidateStreamRequest represents the nginx-rtmp callback request
type ValidateStreamRequest struct {
	Name string `json:"name" form:"name"` // Stream key
	App  string `json:"app" form:"app"`   // RTMP app name (should be "live")
	Addr string `json:"addr" form:"addr"` // Client IP address
}

// T507, T510: ValidateStream validates RTMP stream authentication with structured logging
// POST /api/v1/streams/validate
// This endpoint is called by nginx-rtmp on_publish callback
func (ctrl *VideoStreamingController) ValidateStream(c *fiber.Ctx) error {
	requestID := getRequestID(c)

	// Parse request (nginx sends form data)
	var req ValidateStreamRequest
	if err := c.BodyParser(&req); err != nil {
		// Also try query parameters as fallback
		req.Name = c.Query("name")
		req.App = c.Query("app")
		req.Addr = c.Query("addr")
	}

	logStreamEvent("INFO", "rtmp_auth_attempt", streamLog{
		RequestID: requestID,
		StreamKey: req.Name[:min(8, len(req.Name))] + "...", // Only log first 8 chars for security
		Details: map[string]interface{}{
			"app":        req.App,
			"client_ip":  req.Addr,
			"key_length": len(req.Name),
		},
	})

	// Validate stream key format
	if err := service.ValidateStreamKeyFormat(req.Name); err != nil {
		logStreamEvent("WARN", "rtmp_auth_rejected", streamLog{
			RequestID: requestID,
			StreamKey: req.Name[:min(8, len(req.Name))] + "...",
			Error:     "Invalid stream key format",
			Details: map[string]interface{}{
				"client_ip": req.Addr,
			},
		})
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "Invalid stream key format",
		})
	}

	// Look up stream in database
	var stream models.Stream
	err := ctrl.db.Where("stream_key = ?", req.Name).First(&stream).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			logStreamEvent("WARN", "rtmp_auth_rejected", streamLog{
				RequestID: requestID,
				StreamKey: req.Name[:min(8, len(req.Name))] + "...",
				Error:     "Stream not found",
				Details: map[string]interface{}{
					"client_ip": req.Addr,
				},
			})
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "Stream not found",
			})
		}
		logStreamEvent("ERROR", "rtmp_auth_db_error", streamLog{
			RequestID: requestID,
			StreamKey: req.Name[:min(8, len(req.Name))] + "...",
			Error:     err.Error(),
		})
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Database error",
		})
	}

	// Validate stream state
	if stream.State == models.StreamStateEnded {
		logStreamEvent("WARN", "rtmp_auth_rejected", streamLog{
			RequestID: requestID,
			StreamID:  stream.ID.String(),
			UserID:    stream.UserID.String(),
			TenantID:  stream.TenantID.String(),
			Error:     "Stream has ended",
			Details: map[string]interface{}{
				"client_ip": req.Addr,
				"state":     string(stream.State),
			},
		})
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "Stream has ended",
		})
	}

	// Check if scheduled stream is within allowed window
	if stream.ScheduledAt != nil {
		now := time.Now()
		graceWindow := 15 * time.Minute // Allow 15 minutes before scheduled time

		if now.Before(stream.ScheduledAt.Add(-graceWindow)) {
			logStreamEvent("WARN", "rtmp_auth_rejected", streamLog{
				RequestID: requestID,
				StreamID:  stream.ID.String(),
				UserID:    stream.UserID.String(),
				TenantID:  stream.TenantID.String(),
				Error:     "Stream scheduled for later",
				Details: map[string]interface{}{
					"scheduled_at": stream.ScheduledAt,
					"current_time": now,
					"client_ip":    req.Addr,
				},
			})
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "Stream is scheduled for later",
			})
		}

		// Allow 1 hour after scheduled time
		if now.After(stream.ScheduledAt.Add(1 * time.Hour)) {
			logStreamEvent("WARN", "rtmp_auth_rejected", streamLog{
				RequestID: requestID,
				StreamID:  stream.ID.String(),
				UserID:    stream.UserID.String(),
				TenantID:  stream.TenantID.String(),
				Error:     "Scheduled stream time expired",
				Details: map[string]interface{}{
					"scheduled_at": stream.ScheduledAt,
					"current_time": now,
					"client_ip":    req.Addr,
				},
			})
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "Scheduled stream time has expired",
			})
		}
	}

	// Transition stream to live state
	previousState := stream.State
	if stream.State == models.StreamStatePending {
		if err := stream.TransitionTo(models.StreamStateLive); err == nil {
			ctrl.db.Save(&stream)
			logStreamEvent("INFO", "stream_state_transition", streamLog{
				RequestID: requestID,
				StreamID:  stream.ID.String(),
				UserID:    stream.UserID.String(),
				TenantID:  stream.TenantID.String(),
				Details: map[string]interface{}{
					"from":      string(previousState),
					"to":        string(models.StreamStateLive),
					"client_ip": req.Addr,
					"title":     stream.Title,
				},
			})

			// Initialize DVR window if DVR is enabled and service is available
			if stream.DVREnabled && ctrl.dvr != nil {
				if err := ctrl.dvr.InitializeWindow(stream.StreamKey); err != nil {
					// Log error but don't fail the stream start
					logStreamEvent("WARN", "dvr_init_failed", streamLog{
						RequestID: requestID,
						StreamID:  stream.ID.String(),
						Error:     err.Error(),
					})
				} else {
					logStreamEvent("INFO", "dvr_window_initialized", streamLog{
						RequestID: requestID,
						StreamID:  stream.ID.String(),
						StreamKey: stream.StreamKey[:min(8, len(stream.StreamKey))] + "...",
					})
				}
			}
		}
	}

	logStreamEvent("INFO", "rtmp_auth_success", streamLog{
		RequestID: requestID,
		StreamID:  stream.ID.String(),
		UserID:    stream.UserID.String(),
		TenantID:  stream.TenantID.String(),
		Details: map[string]interface{}{
			"state":     string(stream.State),
			"client_ip": req.Addr,
			"title":     stream.Title,
		},
	})

	// Return 200 OK to allow the stream
	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message":   "Stream authorized",
		"stream_id": stream.ID.String(),
	})
}

// min returns the minimum of two integers
func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

// PublishDone handles the on_publish_done callback from nginx-rtmp
// POST /api/v1/streams/publish-done
func (ctrl *VideoStreamingController) PublishDone(c *fiber.Ctx) error {
	requestID := getRequestID(c)

	var req ValidateStreamRequest
	if err := c.BodyParser(&req); err != nil {
		req.Name = c.Query("name")
	}

	logStreamEvent("INFO", "rtmp_publish_done", streamLog{
		RequestID: requestID,
		StreamKey: req.Name[:min(8, len(req.Name))] + "...",
		Details: map[string]interface{}{
			"client_ip": req.Addr,
		},
	})

	// Find stream and mark as ended
	var stream models.Stream
	if err := ctrl.db.Where("stream_key = ?", req.Name).First(&stream).Error; err == nil {
		previousState := stream.State
		if err := stream.TransitionTo(models.StreamStateEnded); err == nil {
			ctrl.db.Save(&stream)

			// Calculate stream duration
			var duration time.Duration
			if stream.StartedAt != nil && stream.EndedAt != nil {
				duration = stream.EndedAt.Sub(*stream.StartedAt)
			}

			logStreamEvent("INFO", "stream_state_transition", streamLog{
				RequestID: requestID,
				StreamID:  stream.ID.String(),
				UserID:    stream.UserID.String(),
				TenantID:  stream.TenantID.String(),
				Details: map[string]interface{}{
					"from":          string(previousState),
					"to":            string(models.StreamStateEnded),
					"title":         stream.Title,
					"duration_secs": duration.Seconds(),
					"viewer_count":  stream.ViewerCount,
					"peak_viewers":  stream.PeakViewers,
				},
			})
		}
	} else {
		logStreamEvent("WARN", "stream_not_found_on_publish_done", streamLog{
			RequestID: requestID,
			StreamKey: req.Name[:min(8, len(req.Name))] + "...",
			Error:     err.Error(),
		})
	}

	return c.SendStatus(fiber.StatusOK)
}

// T524, T529: GetMasterPlaylist serves the enhanced HLS master playlist with ABR metadata
// GET /api/v1/streams/:key/master.m3u8
func (ctrl *VideoStreamingController) GetMasterPlaylist(c *fiber.Ctx) error {
	requestID := getRequestID(c)
	streamKey := c.Params("key")

	if streamKey == "" {
		logStreamEvent("ERROR", "master_playlist_request_invalid", streamLog{
			RequestID: requestID,
			Error:     "Stream key is required",
		})
		return c.Status(fiber.StatusBadRequest).SendString("Stream key is required")
	}

	// Find the stream
	var stream models.Stream
	if err := ctrl.db.Where("stream_key = ?", streamKey).First(&stream).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			logStreamEvent("WARN", "master_playlist_stream_not_found", streamLog{
				RequestID: requestID,
				StreamKey: streamKey[:min(8, len(streamKey))] + "...",
			})
			return c.Status(fiber.StatusNotFound).SendString("Stream not found")
		}

		logStreamEvent("ERROR", "master_playlist_db_error", streamLog{
			RequestID: requestID,
			StreamKey: streamKey[:min(8, len(streamKey))] + "...",
			Error:     err.Error(),
		})
		return c.Status(fiber.StatusInternalServerError).SendString("Database error")
	}

	// Generate the master playlist content (simplified - in production, read from file system)
	// T524: Enhanced ABR playlist with full metadata
	playlist := `#EXTM3U
#EXT-X-VERSION:7
# Generated at ` + time.Now().UTC().Format(time.RFC3339) + `
# Stream: ` + stream.Title + `

# 1080p - Full HD
#EXT-X-STREAM-INF:BANDWIDTH=4692000,AVERAGE-BANDWIDTH=4222800,RESOLUTION=1920x1080,FRAME-RATE=30.000,CODECS="avc1.64001f,mp4a.40.2",NAME="1080p"
1080p/playlist.m3u8

# 720p - HD
#EXT-X-STREAM-INF:BANDWIDTH=2928000,AVERAGE-BANDWIDTH=2635200,RESOLUTION=1280x720,FRAME-RATE=30.000,CODECS="avc1.64001f,mp4a.40.2",NAME="720p"
720p/playlist.m3u8

# 480p - SD
#EXT-X-STREAM-INF:BANDWIDTH=1528000,AVERAGE-BANDWIDTH=1375200,RESOLUTION=854x480,FRAME-RATE=30.000,CODECS="avc1.64001f,mp4a.40.2",NAME="480p"
480p/playlist.m3u8

# 360p - Low
#EXT-X-STREAM-INF:BANDWIDTH=896000,AVERAGE-BANDWIDTH=806400,RESOLUTION=640x360,FRAME-RATE=30.000,CODECS="avc1.64001f,mp4a.40.2",NAME="360p"
360p/playlist.m3u8
`

	logStreamEvent("INFO", "master_playlist_served", streamLog{
		RequestID: requestID,
		StreamID:  stream.ID.String(),
		UserID:    stream.UserID.String(),
		TenantID:  stream.TenantID.String(),
		Details: map[string]interface{}{
			"stream_title": stream.Title,
			"stream_state": string(stream.State),
			"qualities":    []string{"1080p", "720p", "480p", "360p"},
		},
	})

	// Set appropriate headers for HLS
	c.Set("Content-Type", "application/vnd.apple.mpegurl")
	c.Set("Cache-Control", "no-cache")
	c.Set("Access-Control-Allow-Origin", "*") // CORS for video players

	return c.SendString(playlist)
}

// T535/T536: GetDVRWindow returns the available DVR window (start/end and counts) for a stream and resolution
// GET /api/v1/streams/:key/dvr/window?resolution=720p
func (ctrl *VideoStreamingController) GetDVRWindow(c *fiber.Ctx) error {
	requestID := getRequestID(c)
	streamKey := c.Params("key")
	resolution := c.Query("resolution", "720p")

	if ctrl.dvr == nil {
		logStreamEvent("ERROR", "dvr_unavailable", streamLog{RequestID: requestID, StreamKey: streamKey[:min(8, len(streamKey))] + "..."})
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{"error": "DVR service unavailable"})
	}

	window, exists := ctrl.dvr.GetWindow(streamKey)
	if !exists {
		logStreamEvent("WARN", "dvr_window_not_found", streamLog{RequestID: requestID, StreamKey: streamKey[:min(8, len(streamKey))] + "..."})
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "DVR window not found"})
	}

	// Build response
	// Use DVRWindow helper to obtain segments in the window and count by resolution
	segmentsInWindow := window.GetSegmentsByTimeRange(window.StartTime, window.EndTime)
	count := 0
	for _, seg := range segmentsInWindow {
		if seg.Resolution == resolution {
			count++
		}
	}

	resp := fiber.Map{
		"stream_key":    streamKey,
		"resolution":    resolution,
		"start_time":    window.StartTime.Format(time.RFC3339),
		"end_time":      window.EndTime.Format(time.RFC3339),
		"segment_count": count,
		"total_size":    window.TotalSize,
	}

	logStreamEvent("INFO", "dvr_window_served", streamLog{RequestID: requestID, StreamKey: streamKey[:min(8, len(streamKey))] + "...", Details: map[string]interface{}{"resolution": resolution, "segment_count": count}})

	return c.JSON(resp)
}

// T535/T536: GetDVRPlaylist serves a time-shifted playlist for a stream/resolution
// GET /api/v1/streams/:key/dvr/playlist?resolution=720p&start=2025-11-05T12:00:00Z
func (ctrl *VideoStreamingController) GetDVRPlaylist(c *fiber.Ctx) error {
	requestID := getRequestID(c)
	streamKey := c.Params("key")
	resolution := c.Query("resolution", "720p")
	startParam := c.Query("start", "")

	if ctrl.dvr == nil {
		logStreamEvent("ERROR", "dvr_unavailable", streamLog{RequestID: requestID, StreamKey: streamKey[:min(8, len(streamKey))] + "..."})
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{"error": "DVR service unavailable"})
	}

	var seekTime *time.Time
	if startParam != "" {
		if t, err := time.Parse(time.RFC3339, startParam); err == nil {
			seekTime = &t
		} else {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid start time; use RFC3339"})
		}
	}

	playlist, err := ctrl.dvr.GenerateDVRPlaylist(streamKey, resolution, seekTime)
	if err != nil {
		logStreamEvent("WARN", "dvr_playlist_error", streamLog{RequestID: requestID, StreamKey: streamKey[:min(8, len(streamKey))] + "...", Error: err.Error()})
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": err.Error()})
	}

	logStreamEvent("INFO", "dvr_playlist_served", streamLog{RequestID: requestID, StreamKey: streamKey[:min(8, len(streamKey))] + "...", Details: map[string]interface{}{"resolution": resolution}})

	c.Set("Content-Type", "application/vnd.apple.mpegurl")
	c.Set("Cache-Control", "no-cache")
	c.Set("Access-Control-Allow-Origin", "*")

	return c.SendString(playlist)
}

// (removed duplicate GetDVRPlaylist implementation - using DVRService-backed playlist handler)

// T536: GetRecording retrieves a saved recording
// GET /api/v1/recordings/:id
func (ctrl *VideoStreamingController) GetRecording(c *fiber.Ctx) error {
	requestID := getRequestID(c)
	recordingID := c.Params("id")

	if recordingID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Recording ID is required",
		})
	}

	// TODO: Query recording from database
	// For now, return placeholder response

	logStreamEvent("INFO", "recording_retrieved", streamLog{
		RequestID: requestID,
		Details: map[string]interface{}{
			"recording_id": recordingID,
		},
	})

	return c.JSON(fiber.Map{
		"id":          recordingID,
		"title":       "Sample Recording",
		"duration":    120.0,
		"resolutions": []string{"1080p", "720p", "480p"},
		"url":         fmt.Sprintf("/api/v1/recordings/%s/master.m3u8", recordingID),
	})
}

// T537: DeleteRecording deletes a saved recording
// DELETE /api/v1/recordings/:id
func (ctrl *VideoStreamingController) DeleteRecording(c *fiber.Ctx) error {
	requestID := getRequestID(c)
	recordingID := c.Params("id")

	if recordingID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Recording ID is required",
		})
	}

	// Get user ID from context
	userID, ok := c.Locals("userID").(uuid.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "User not authenticated",
		})
	}

	// TODO: Verify ownership and delete from database + S3

	logStreamEvent("INFO", "recording_deleted", streamLog{
		RequestID: requestID,
		UserID:    userID.String(),
		Details: map[string]interface{}{
			"recording_id": recordingID,
		},
	})

	return c.JSON(fiber.Map{
		"message": "Recording deleted successfully",
	})
}

// Helper functions
func buildRTMPEndpoint(streamKey string) string {
	// In production, use environment variable for domain
	return "rtmp://localhost:1935/live/" + streamKey
}

func buildHLSPlaylist(streamID uuid.UUID) string {
	// In production, use environment variable for domain
	return "http://localhost:8080/hls/" + streamID.String() + ".m3u8"
}

// T542: ExtendDVRWindow extends the DVR window for premium users
// POST /api/v1/streams/:key/dvr/extend
func (ctrl *VideoStreamingController) ExtendDVRWindow(c *fiber.Ctx) error {
	requestID := getRequestID(c)
	streamKey := c.Params("key")

	if streamKey == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Stream key is required",
		})
	}

	// Get user ID from context
	userID, ok := c.Locals("userID").(uuid.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "User not authenticated",
		})
	}

	// Parse request body
	type ExtendRequest struct {
		AdditionalHours int    `json:"additional_hours" validate:"required,min=1,max=24"`
		Reason          string `json:"reason" validate:"max=500"`
	}

	var req ExtendRequest
	if err := c.BodyParser(&req); err != nil {
		logStreamEvent("ERROR", "dvr_extend_parse_failed", streamLog{
			RequestID: requestID,
			UserID:    userID.String(),
			StreamKey: streamKey,
			Error:     err.Error(),
		})
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// Validate additional hours
	if req.AdditionalHours < 1 || req.AdditionalHours > 24 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Additional hours must be between 1 and 24",
		})
	}

	// Get stream from database
	var stream models.VideoStream
	if err := ctrl.db.Where("stream_key = ?", streamKey).First(&stream).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "Stream not found",
			})
		}
		logStreamEvent("ERROR", "dvr_extend_stream_lookup_failed", streamLog{
			RequestID: requestID,
			UserID:    userID.String(),
			StreamKey: streamKey,
			Error:     err.Error(),
		})
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to retrieve stream",
		})
	}

	// Verify ownership
	if stream.CreatorID != userID.String() {
		logStreamEvent("WARN", "dvr_extend_unauthorized", streamLog{
			RequestID: requestID,
			UserID:    userID.String(),
			StreamID:  stream.ID,
			StreamKey: streamKey,
			Error:     "User does not own stream",
		})
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "You do not have permission to extend this stream's DVR window",
		})
	}

	// Check if stream is live
	if stream.Status != models.StreamStatusLive {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":  "Stream must be live to extend DVR window",
			"status": stream.Status,
		})
	}

	// TODO: Check user's premium status and DVR quota
	// For now, allow all authenticated users

	// Calculate new DVR window (in seconds)
	currentWindow := stream.DVRWindow
	if currentWindow == 0 {
		currentWindow = 7200 // Default: 2 hours
	}

	additionalSeconds := req.AdditionalHours * 3600
	newWindow := currentWindow + additionalSeconds

	// Cap maximum DVR window at 24 hours (86400 seconds)
	maxWindow := 86400
	if newWindow > maxWindow {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":       "DVR window would exceed maximum allowed (24 hours)",
			"current":     currentWindow / 3600,
			"requested":   req.AdditionalHours,
			"max_allowed": maxWindow / 3600,
		})
	}

	// Update stream with new DVR window
	updates := map[string]interface{}{
		"dvr_window": newWindow,
		"updated_at": time.Now(),
	}

	if err := ctrl.db.Model(&stream).Updates(updates).Error; err != nil {
		logStreamEvent("ERROR", "dvr_extend_update_failed", streamLog{
			RequestID: requestID,
			UserID:    userID.String(),
			StreamID:  stream.ID,
			StreamKey: streamKey,
			Error:     err.Error(),
		})
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to extend DVR window",
		})
	}

	logStreamEvent("INFO", "dvr_window_extended", streamLog{
		RequestID: requestID,
		UserID:    userID.String(),
		StreamID:  stream.ID,
		StreamKey: streamKey,
		Details: map[string]interface{}{
			"additional_hours":   req.AdditionalHours,
			"old_window_hours":   currentWindow / 3600,
			"new_window_hours":   newWindow / 3600,
			"new_window_seconds": newWindow,
			"reason":             req.Reason,
		},
	})

	return c.JSON(fiber.Map{
		"message":            "DVR window extended successfully",
		"stream_id":          stream.ID,
		"extended_hours":     req.AdditionalHours,
		"old_window_hours":   currentWindow / 3600,
		"new_window_hours":   newWindow / 3600,
		"new_window_seconds": newWindow,
	})
}

// T554: ListStreams returns paginated list of streams
// GET /api/v1/streams?page=1&limit=20&status=live&tenant_id=xxx
func (ctrl *VideoStreamingController) ListStreams(c *fiber.Ctx) error {
	requestID := getRequestID(c)

	// Get authenticated user (middleware should set this)
	userIDStr := c.Locals("user_id")
	if userIDStr == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	userID, err := uuid.Parse(userIDStr.(string))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid user ID",
		})
	}

	// Parse query parameters
	page := c.QueryInt("page", 1)
	limit := c.QueryInt("limit", 20)
	status := c.Query("status", "") // live, pending, ended
	tenantID := c.Query("tenant_id", "")

	// Validate pagination
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}

	offset := (page - 1) * limit

	// Build query
	query := ctrl.db.Model(&models.VideoStream{})

	// Filter by tenant if provided (admin feature)
	if tenantID != "" {
		tenantUUID, err := uuid.Parse(tenantID)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "Invalid tenant ID",
			})
		}
		query = query.Where("tenant_id = ?", tenantUUID)
	} else {
		// Otherwise, only show user's own streams
		query = query.Where("creator_id = ?", userID.String())
	}

	// Filter by status if provided
	if status != "" {
		query = query.Where("status = ?", status)
	}

	// Get total count
	var total int64
	if err := query.Count(&total).Error; err != nil {
		logStreamEvent("ERROR", "list_streams_count_failed", streamLog{
			RequestID: requestID,
			UserID:    userID.String(),
			Error:     err.Error(),
		})
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to count streams",
		})
	}

	// Get paginated streams
	var streams []models.VideoStream
	if err := query.
		Order("created_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&streams).Error; err != nil {
		logStreamEvent("ERROR", "list_streams_query_failed", streamLog{
			RequestID: requestID,
			UserID:    userID.String(),
			Error:     err.Error(),
		})
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to retrieve streams",
		})
	}

	// Calculate pagination metadata
	totalPages := (int(total) + limit - 1) / limit
	hasNext := page < totalPages
	hasPrev := page > 1

	logStreamEvent("INFO", "list_streams_success", streamLog{
		RequestID: requestID,
		UserID:    userID.String(),
		Details: map[string]interface{}{
			"page":     page,
			"limit":    limit,
			"total":    total,
			"count":    len(streams),
			"status":   status,
			"has_next": hasNext,
		},
	})

	return c.JSON(fiber.Map{
		"streams": streams,
		"pagination": fiber.Map{
			"page":        page,
			"limit":       limit,
			"total":       total,
			"total_pages": totalPages,
			"has_next":    hasNext,
			"has_prev":    hasPrev,
		},
	})
}

// T555: GetStream returns details for a specific stream
// GET /api/v1/streams/:id
func (ctrl *VideoStreamingController) GetStream(c *fiber.Ctx) error {
	requestID := getRequestID(c)

	// Get authenticated user
	userIDStr := c.Locals("user_id")
	if userIDStr == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	userID, err := uuid.Parse(userIDStr.(string))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid user ID",
		})
	}

	// Get stream ID from URL
	streamIDStr := c.Params("id")
	streamID, err := uuid.Parse(streamIDStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid stream ID",
		})
	}

	// Fetch stream from database
	var stream models.VideoStream
	if err := ctrl.db.Where("id = ?", streamID).First(&stream).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			logStreamEvent("WARN", "stream_not_found", streamLog{
				RequestID: requestID,
				UserID:    userID.String(),
				StreamID:  streamIDStr,
			})
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "Stream not found",
			})
		}
		logStreamEvent("ERROR", "get_stream_query_failed", streamLog{
			RequestID: requestID,
			UserID:    userID.String(),
			StreamID:  streamIDStr,
			Error:     err.Error(),
		})
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to retrieve stream",
		})
	}

	// Check access permission (streams can only be viewed by owner or admins)
	// TODO: Add access control for public streams when that field is added
	creatorID, err := uuid.Parse(stream.CreatorID)
	if err != nil || creatorID != userID {
		logStreamEvent("WARN", "stream_access_denied", streamLog{
			RequestID: requestID,
			UserID:    userID.String(),
			StreamID:  streamIDStr,
			Details: map[string]interface{}{
				"creator_id": stream.CreatorID,
			},
		})
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "Access denied",
		})
	}

	logStreamEvent("INFO", "get_stream_success", streamLog{
		RequestID: requestID,
		UserID:    userID.String(),
		StreamID:  streamIDStr,
		Details: map[string]interface{}{
			"status": stream.Status,
		},
	})

	return c.JSON(fiber.Map{
		"stream": stream,
	})
}

// UpdateStreamRequest represents the request body for updating a stream
type UpdateStreamRequest struct {
	Title       *string    `json:"title" validate:"omitempty,min=1,max=200"`
	Description *string    `json:"description" validate:"omitempty"`
	ScheduledAt *time.Time `json:"scheduled_at"`
}

// T556: UpdateStream updates stream metadata
// PUT /api/v1/streams/:id
func (ctrl *VideoStreamingController) UpdateStream(c *fiber.Ctx) error {
	requestID := getRequestID(c)

	// Get authenticated user
	userIDStr := c.Locals("user_id")
	if userIDStr == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	userID, err := uuid.Parse(userIDStr.(string))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid user ID",
		})
	}

	// Get stream ID from URL
	streamIDStr := c.Params("id")
	streamID, err := uuid.Parse(streamIDStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid stream ID",
		})
	}

	// Parse request body
	var req UpdateStreamRequest
	if err := c.BodyParser(&req); err != nil {
		logStreamEvent("ERROR", "update_stream_parse_failed", streamLog{
			RequestID: requestID,
			UserID:    userID.String(),
			StreamID:  streamIDStr,
			Error:     err.Error(),
		})
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// Fetch stream from database
	var stream models.VideoStream
	if err := ctrl.db.Where("id = ?", streamID).First(&stream).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "Stream not found",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to retrieve stream",
		})
	}

	// Check ownership
	creatorID, err := uuid.Parse(stream.CreatorID)
	if err != nil || creatorID != userID {
		logStreamEvent("WARN", "update_stream_not_owner", streamLog{
			RequestID: requestID,
			UserID:    userID.String(),
			StreamID:  streamIDStr,
			Details: map[string]interface{}{
				"creator_id": stream.CreatorID,
			},
		})
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "Only the stream owner can update it",
		})
	}

	// Build updates map
	updates := map[string]interface{}{
		"updated_at": time.Now(),
	}

	if req.Title != nil {
		updates["title"] = *req.Title
	}
	if req.Description != nil {
		updates["description"] = *req.Description
	}
	if req.ScheduledAt != nil {
		updates["scheduled_at"] = *req.ScheduledAt
	}

	// Apply updates
	if err := ctrl.db.Model(&stream).Updates(updates).Error; err != nil {
		logStreamEvent("ERROR", "update_stream_failed", streamLog{
			RequestID: requestID,
			UserID:    userID.String(),
			StreamID:  streamIDStr,
			Error:     err.Error(),
		})
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to update stream",
		})
	}

	// Fetch updated stream
	if err := ctrl.db.Where("id = ?", streamID).First(&stream).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to retrieve updated stream",
		})
	}

	logStreamEvent("INFO", "update_stream_success", streamLog{
		RequestID: requestID,
		UserID:    userID.String(),
		StreamID:  streamIDStr,
		Details: map[string]interface{}{
			"updated_fields": len(updates) - 1, // Exclude updated_at
		},
	})

	return c.JSON(fiber.Map{
		"message": "Stream updated successfully",
		"stream":  stream,
	})
}

// T557: DeleteStream deletes a stream
// DELETE /api/v1/streams/:id
func (ctrl *VideoStreamingController) DeleteStream(c *fiber.Ctx) error {
	requestID := getRequestID(c)

	// Get authenticated user
	userIDStr := c.Locals("user_id")
	if userIDStr == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	userID, err := uuid.Parse(userIDStr.(string))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid user ID",
		})
	}

	// Get stream ID from URL
	streamIDStr := c.Params("id")
	streamID, err := uuid.Parse(streamIDStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid stream ID",
		})
	}

	// Fetch stream from database
	var stream models.VideoStream
	if err := ctrl.db.Where("id = ?", streamID).First(&stream).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "Stream not found",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to retrieve stream",
		})
	}

	// Check ownership
	creatorID, err := uuid.Parse(stream.CreatorID)
	if err != nil || creatorID != userID {
		logStreamEvent("WARN", "delete_stream_not_owner", streamLog{
			RequestID: requestID,
			UserID:    userID.String(),
			StreamID:  streamIDStr,
			Details: map[string]interface{}{
				"creator_id": stream.CreatorID,
			},
		})
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "Only the stream owner can delete it",
		})
	}

	// Cannot delete live streams
	if stream.Status == models.StreamStatusLive {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":  "Cannot delete a live stream. Stop the stream first.",
			"status": stream.Status,
		})
	}

	// Soft delete the stream
	if err := ctrl.db.Delete(&stream).Error; err != nil {
		logStreamEvent("ERROR", "delete_stream_failed", streamLog{
			RequestID: requestID,
			UserID:    userID.String(),
			StreamID:  streamIDStr,
			Error:     err.Error(),
		})
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to delete stream",
		})
	}

	// TODO: Clean up associated resources (HLS segments, DVR recordings, etc.)
	// This should be handled by a background job or cleanup service

	logStreamEvent("INFO", "delete_stream_success", streamLog{
		RequestID: requestID,
		UserID:    userID.String(),
		StreamID:  streamIDStr,
		Details: map[string]interface{}{
			"title":  stream.Title,
			"status": stream.Status,
		},
	})

	return c.JSON(fiber.Map{
		"message":   "Stream deleted successfully",
		"stream_id": streamID,
	})
}

// T558: GetViewerCount returns current viewer count for a stream
// GET /api/v1/streams/:id/viewers
func (ctrl *VideoStreamingController) GetViewerCount(c *fiber.Ctx) error {
	requestID := getRequestID(c)

	// Get stream ID from URL
	streamIDStr := c.Params("id")
	streamID, err := uuid.Parse(streamIDStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid stream ID",
		})
	}

	// Fetch stream from database
	var stream models.VideoStream
	if err := ctrl.db.Where("id = ?", streamID).First(&stream).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "Stream not found",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to retrieve stream",
		})
	}

	// Viewer count endpoint is public for all streams
	// Get current viewer count from stream model
	viewerCount := stream.ViewerCount
	peakViewers := stream.PeakViewers

	logStreamEvent("INFO", "get_viewer_count_success", streamLog{
		RequestID: requestID,
		StreamID:  streamIDStr,
		Details: map[string]interface{}{
			"current_viewers": viewerCount,
			"peak_viewers":    peakViewers,
			"status":          stream.Status,
		},
	})

	return c.JSON(fiber.Map{
		"stream_id":       streamID,
		"current_viewers": viewerCount,
		"peak_viewers":    peakViewers,
		"status":          stream.Status,
		"is_live":         stream.Status == models.StreamStatusLive,
	})
}
