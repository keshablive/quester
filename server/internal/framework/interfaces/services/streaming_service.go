// Package services defines service layer interfaces for the Quester platform.
package services

import (
	"context"

	"github.com/google/uuid"
)

// StreamingServiceInterface defines the contract for video streaming operations.
// Implementations handle stream lifecycle, viewer management, and DVR functionality.
type StreamingServiceInterface interface {
	// CreateStream creates a new stream configuration.
	CreateStream(ctx context.Context, tenantID, creatorID uuid.UUID, input *CreateStreamInput) (*Stream, error)

	// GetStream retrieves stream information by ID.
	GetStream(ctx context.Context, tenantID, streamID uuid.UUID) (*Stream, error)

	// GetActiveStreams retrieves currently active streams.
	GetActiveStreams(ctx context.Context, tenantID uuid.UUID, filters *StreamFilters) (*StreamListResponse, error)

	// StartStream starts a stream (generates ingest URL).
	StartStream(ctx context.Context, tenantID, streamID uuid.UUID) (*StreamIngest, error)

	// StopStream stops an active stream.
	StopStream(ctx context.Context, tenantID, streamID uuid.UUID) error

	// GetStreamStats retrieves real-time stream statistics.
	GetStreamStats(ctx context.Context, tenantID, streamID uuid.UUID) (*StreamStats, error)

	// GetViewerCount retrieves current viewer count for a stream.
	GetViewerCount(ctx context.Context, streamID uuid.UUID) (int, error)

	// AddViewer registers a viewer joining a stream.
	AddViewer(ctx context.Context, streamID, userID uuid.UUID) error

	// RemoveViewer registers a viewer leaving a stream.
	RemoveViewer(ctx context.Context, streamID, userID uuid.UUID) error

	// GetPlaybackURL retrieves the playback URL for a stream.
	GetPlaybackURL(ctx context.Context, streamID uuid.UUID, quality string) (string, error)

	// GetDVRSegments retrieves DVR segments for catch-up viewing.
	GetDVRSegments(ctx context.Context, streamID uuid.UUID, startTime, endTime int64) ([]*DVRSegment, error)
}

// Stream represents a video stream.
type Stream struct {
	ID           uuid.UUID `json:"id"`
	TenantID     uuid.UUID `json:"tenant_id"`
	CreatorID    uuid.UUID `json:"creator_id"`
	Title        string    `json:"title"`
	Description  string    `json:"description"`
	ThumbnailURL string    `json:"thumbnail_url"`
	Status       string    `json:"status"`     // scheduled, live, ended
	Visibility   string    `json:"visibility"` // public, private, unlisted
	DVREnabled   bool      `json:"dvr_enabled"`
	ChatEnabled  bool      `json:"chat_enabled"`
	ScheduledAt  *string   `json:"scheduled_at,omitempty"`
	StartedAt    *string   `json:"started_at,omitempty"`
	EndedAt      *string   `json:"ended_at,omitempty"`
	CreatedAt    string    `json:"created_at"`
}

// CreateStreamInput contains data for creating a stream.
type CreateStreamInput struct {
	Title        string  `json:"title" validate:"required"`
	Description  string  `json:"description"`
	ThumbnailURL string  `json:"thumbnail_url"`
	Visibility   string  `json:"visibility"`
	DVREnabled   bool    `json:"dvr_enabled"`
	ChatEnabled  bool    `json:"chat_enabled"`
	ScheduledAt  *string `json:"scheduled_at"`
}

// StreamFilters contains filtering options for stream queries.
type StreamFilters struct {
	Status     string `json:"status"`
	CreatorID  string `json:"creator_id"`
	Visibility string `json:"visibility"`
	Page       int    `json:"page"`
	Limit      int    `json:"limit"`
}

// StreamListResponse contains paginated stream results.
type StreamListResponse struct {
	Streams    []*Stream `json:"streams"`
	TotalCount int64     `json:"total_count"`
	Page       int       `json:"page"`
	Limit      int       `json:"limit"`
}

// StreamIngest contains ingest information for a stream.
type StreamIngest struct {
	StreamID  uuid.UUID `json:"stream_id"`
	IngestURL string    `json:"ingest_url"`
	StreamKey string    `json:"stream_key"`
	ExpiresAt string    `json:"expires_at"`
}

// StreamStats contains real-time stream statistics.
type StreamStats struct {
	StreamID     uuid.UUID `json:"stream_id"`
	ViewerCount  int       `json:"viewer_count"`
	PeakViewers  int       `json:"peak_viewers"`
	TotalViews   int       `json:"total_views"`
	Duration     int64     `json:"duration_seconds"`
	Bitrate      int       `json:"bitrate_kbps"`
	Resolution   string    `json:"resolution"`
	HealthStatus string    `json:"health_status"`
}

// DVRSegment represents a recorded segment for DVR playback.
type DVRSegment struct {
	ID         uuid.UUID `json:"id"`
	StreamID   uuid.UUID `json:"stream_id"`
	StartTime  int64     `json:"start_time"`
	EndTime    int64     `json:"end_time"`
	Duration   int       `json:"duration_seconds"`
	URL        string    `json:"url"`
	Resolution string    `json:"resolution"`
}
