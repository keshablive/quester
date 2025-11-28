package streaming

import (
	"fmt"
	"time"

	"gorm.io/gorm"

	"github.com/keshablive/quester/internal/models"
)

// RTMPAuthHandler handles RTMP stream authentication and authorization
type RTMPAuthHandler struct {
	db *gorm.DB
}

// NewRTMPAuthHandler creates a new RTMP authentication handler
func NewRTMPAuthHandler(db *gorm.DB) *RTMPAuthHandler {
	return &RTMPAuthHandler{
		db: db,
	}
}

// HandlePublishStart is called when a broadcaster starts publishing
// This is the callback set on RTMPServer for onPublishStart
func (h *RTMPAuthHandler) HandlePublishStart(streamID string, session *StreamSession) error {
	fmt.Printf("HandlePublishStart: stream=%s, session=%s\n", streamID, session.ID)

	// Update stream status to 'live'
	var stream models.VideoStream
	if err := h.db.First(&stream, "id = ?", streamID).Error; err != nil {
		return fmt.Errorf("failed to fetch stream: %w", err)
	}

	// Verify stream can start streaming
	if !stream.CanStartStreaming() {
		return fmt.Errorf("stream cannot start (status: %s)", stream.Status)
	}

	// Mark stream as live
	stream.MarkAsLive()

	// Save to database
	if err := h.db.Save(&stream).Error; err != nil {
		return fmt.Errorf("failed to update stream status: %w", err)
	}

	fmt.Printf("Stream marked as live: %s\n", streamID)

	return nil
}

// HandlePublishEnd is called when a broadcaster stops publishing
// This is the callback set on RTMPServer for onPublishEnd
func (h *RTMPAuthHandler) HandlePublishEnd(streamID string, session *StreamSession) error {
	fmt.Printf("HandlePublishEnd: stream=%s, session=%s\n", streamID, session.ID)

	// Update stream status to 'ended'
	var stream models.VideoStream
	if err := h.db.First(&stream, "id = ?", streamID).Error; err != nil {
		return fmt.Errorf("failed to fetch stream: %w", err)
	}

	// Mark stream as ended
	stream.MarkAsEnded()

	// Calculate duration if started
	if session.EndedAt != nil && !session.StartedAt.IsZero() {
		duration := int(session.EndedAt.Sub(session.StartedAt).Seconds())
		stream.Duration = duration
	}

	// Save to database
	if err := h.db.Save(&stream).Error; err != nil {
		return fmt.Errorf("failed to update stream status: %w", err)
	}

	fmt.Printf("Stream marked as ended: %s (duration: %ds)\n", streamID, stream.Duration)

	return nil
}

// ValidateStreamKey validates a stream key for authentication
// Returns the stream if valid, error otherwise
func (h *RTMPAuthHandler) ValidateStreamKey(streamID, streamKey string) (*models.VideoStream, error) {
	var stream models.VideoStream

	// Query database
	if err := h.db.Where("id = ? AND deleted_at IS NULL", streamID).First(&stream).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("stream not found: %s", streamID)
		}
		return nil, fmt.Errorf("database error: %w", err)
	}

	// Verify stream key
	if stream.StreamKey != streamKey {
		return nil, fmt.Errorf("invalid stream key")
	}

	// Check stream status
	if stream.Status != models.StreamStatusPending {
		return nil, fmt.Errorf("stream not in pending status (current: %s)", stream.Status)
	}

	// Check if stream is expired
	if stream.IsExpired() {
		return nil, fmt.Errorf("stream has expired")
	}

	// Check if scheduled stream is ready to start
	if stream.ScheduledAt != nil && time.Now().Before(*stream.ScheduledAt) {
		return nil, fmt.Errorf("stream not scheduled to start yet (starts at: %s)",
			stream.ScheduledAt.Format(time.RFC3339))
	}

	return &stream, nil
}

// HandlePublishError is called when an error occurs during publishing
func (h *RTMPAuthHandler) HandlePublishError(streamID string, session *StreamSession, err error) error {
	fmt.Printf("HandlePublishError: stream=%s, error=%v\n", streamID, err)

	// Update stream status to 'error'
	var stream models.VideoStream
	if dbErr := h.db.First(&stream, "id = ?", streamID).Error; dbErr != nil {
		return fmt.Errorf("failed to fetch stream: %w", dbErr)
	}

	// Mark stream as error
	stream.MarkAsError()

	// Save to database
	if dbErr := h.db.Save(&stream).Error; dbErr != nil {
		return fmt.Errorf("failed to update stream status: %w", dbErr)
	}

	fmt.Printf("Stream marked as error: %s\n", streamID)

	return nil
}

// GetActiveStreamByKey returns an active stream by its stream key
func (h *RTMPAuthHandler) GetActiveStreamByKey(streamKey string) (*models.VideoStream, error) {
	var stream models.VideoStream

	if err := h.db.Where("stream_key = ? AND status = ? AND deleted_at IS NULL",
		streamKey, models.StreamStatusLive).First(&stream).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("no active stream found with key")
		}
		return nil, fmt.Errorf("database error: %w", err)
	}

	return &stream, nil
}

// RevokeStreamKey revokes a stream key (prevents future use)
func (h *RTMPAuthHandler) RevokeStreamKey(streamID string) error {
	// Update stream to generate new key or mark as revoked
	var stream models.VideoStream
	if err := h.db.First(&stream, "id = ?", streamID).Error; err != nil {
		return fmt.Errorf("failed to fetch stream: %w", err)
	}

	// For security, we can either:
	// 1. Mark stream as ended/error to prevent reuse
	// 2. Generate a new stream key
	// For now, mark as ended
	stream.MarkAsEnded()

	if err := h.db.Save(&stream).Error; err != nil {
		return fmt.Errorf("failed to revoke stream: %w", err)
	}

	fmt.Printf("Stream key revoked: %s\n", streamID)

	return nil
}
