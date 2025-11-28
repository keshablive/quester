package streaming

import (
	"context"
	"fmt"
	"time"

	"github.com/keshablive/quester/internal/framework/interfaces"
)

// RTMPAuthHandler handles RTMP stream authentication and authorization
// Uses interfaces to avoid importing application models
type RTMPAuthHandler struct {
	repo interfaces.StreamRepository
}

// NewRTMPAuthHandler creates a new RTMP authentication handler
func NewRTMPAuthHandler(repo interfaces.StreamRepository) *RTMPAuthHandler {
	return &RTMPAuthHandler{
		repo: repo,
	}
}

// HandlePublishStart is called when a broadcaster starts publishing
// This is the callback set on RTMPServer for onPublishStart
func (h *RTMPAuthHandler) HandlePublishStart(streamID string, session *StreamSession) error {
	fmt.Printf("HandlePublishStart: stream=%s, session=%s\n", streamID, session.ID)
	ctx := context.Background()

	// Fetch stream by ID
	stream, err := h.repo.FindByID(ctx, streamID)
	if err != nil {
		return fmt.Errorf("failed to fetch stream: %w", err)
	}

	// Verify stream can start streaming
	if !stream.CanStartStreaming() {
		return fmt.Errorf("stream cannot start (status: %s)", stream.GetStatus())
	}

	// Mark stream as live
	stream.MarkAsLive()

	// Save to database
	if err := h.repo.Save(ctx, stream); err != nil {
		return fmt.Errorf("failed to update stream status: %w", err)
	}

	fmt.Printf("Stream marked as live: %s\n", streamID)

	return nil
}

// HandlePublishEnd is called when a broadcaster stops publishing
// This is the callback set on RTMPServer for onPublishEnd
func (h *RTMPAuthHandler) HandlePublishEnd(streamID string, session *StreamSession) error {
	fmt.Printf("HandlePublishEnd: stream=%s, session=%s\n", streamID, session.ID)
	ctx := context.Background()

	// Fetch stream by ID
	stream, err := h.repo.FindByID(ctx, streamID)
	if err != nil {
		return fmt.Errorf("failed to fetch stream: %w", err)
	}

	// Mark stream as ended
	stream.MarkAsEnded()

	// Calculate duration if started
	if session.EndedAt != nil && !session.StartedAt.IsZero() {
		duration := int(session.EndedAt.Sub(session.StartedAt).Seconds())
		stream.SetDuration(duration)
	}

	// Save to database
	if err := h.repo.Save(ctx, stream); err != nil {
		return fmt.Errorf("failed to update stream status: %w", err)
	}

	fmt.Printf("Stream marked as ended: %s\n", streamID)

	return nil
}

// StreamValidator interface for additional stream validation
// This allows injection of custom validation logic (e.g., checking expiration, schedule)
type StreamValidator interface {
	// IsExpired checks if the stream has expired
	IsExpired(stream interfaces.StreamInfo) bool
	// IsScheduledToStart checks if a scheduled stream is ready to start
	IsScheduledToStart(stream interfaces.StreamInfo) (bool, *time.Time)
}

// ValidateStreamKey validates a stream key for authentication
// Returns the stream if valid, error otherwise
func (h *RTMPAuthHandler) ValidateStreamKey(streamID, streamKey string) (interfaces.StreamInfo, error) {
	ctx := context.Background()

	// Query database
	stream, err := h.repo.FindByID(ctx, streamID)
	if err != nil {
		return nil, fmt.Errorf("stream not found: %s - %w", streamID, err)
	}

	// Verify stream key
	if stream.GetStreamKey() != streamKey {
		return nil, fmt.Errorf("invalid stream key")
	}

	// Check stream status
	if stream.GetStatus() != string(interfaces.StreamStatusPending) {
		return nil, fmt.Errorf("stream not in pending status (current: %s)", stream.GetStatus())
	}

	return stream, nil
}

// HandlePublishError is called when an error occurs during publishing
func (h *RTMPAuthHandler) HandlePublishError(streamID string, session *StreamSession, publishErr error) error {
	fmt.Printf("HandlePublishError: stream=%s, error=%v\n", streamID, publishErr)
	ctx := context.Background()

	// Fetch stream by ID
	stream, err := h.repo.FindByID(ctx, streamID)
	if err != nil {
		return fmt.Errorf("failed to fetch stream: %w", err)
	}

	// Update stream status to error
	if err := h.repo.UpdateStatus(ctx, streamID, string(interfaces.StreamStatusError)); err != nil {
		return fmt.Errorf("failed to update stream status: %w", err)
	}

	fmt.Printf("Stream marked as error: %s\n", stream.GetID())

	return nil
}

// GetActiveStreamByKey returns an active stream by its stream key
func (h *RTMPAuthHandler) GetActiveStreamByKey(streamKey string) (interfaces.StreamInfo, error) {
	ctx := context.Background()

	stream, err := h.repo.FindByStreamKey(ctx, streamKey)
	if err != nil {
		return nil, fmt.Errorf("no active stream found with key: %w", err)
	}

	if stream.GetStatus() != string(interfaces.StreamStatusLive) {
		return nil, fmt.Errorf("stream is not live (status: %s)", stream.GetStatus())
	}

	return stream, nil
}

// RevokeStreamKey revokes a stream key (prevents future use)
func (h *RTMPAuthHandler) RevokeStreamKey(streamID string) error {
	ctx := context.Background()

	// Update stream status to ended
	if err := h.repo.UpdateStatus(ctx, streamID, string(interfaces.StreamStatusEnded)); err != nil {
		return fmt.Errorf("failed to revoke stream: %w", err)
	}

	fmt.Printf("Stream key revoked: %s\n", streamID)

	return nil
}
