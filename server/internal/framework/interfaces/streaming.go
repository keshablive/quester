// Streaming interfaces for framework layer
package interfaces

import (
	"context"
)

// StreamStatus represents the state of a video stream.
// This type is defined in the framework to avoid importing models.
type StreamStatus string

const (
	StreamStatusPending StreamStatus = "pending"
	StreamStatusLive    StreamStatus = "live"
	StreamStatusEnded   StreamStatus = "ended"
	StreamStatusError   StreamStatus = "error"
)

// String returns the string representation of StreamStatus
func (s StreamStatus) String() string {
	return string(s)
}

// IsValid checks if the status is a valid StreamStatus value
func (s StreamStatus) IsValid() bool {
	switch s {
	case StreamStatusPending, StreamStatusLive, StreamStatusEnded, StreamStatusError:
		return true
	default:
		return false
	}
}

// StreamInfo represents the core properties of a video stream.
// Application implements this interface on its stream model (e.g., models.VideoStream).
// This allows framework streaming components to work without importing models.
type StreamInfo interface {
	// GetID returns the unique identifier of the stream
	GetID() string

	// GetStreamKey returns the stream's authentication key
	GetStreamKey() string

	// GetStatus returns the current status of the stream as a string
	// Valid values: "pending", "live", "ended", "error"
	GetStatus() string

	// GetOwnerID returns the ID of the user who owns the stream
	GetOwnerID() string

	// CanStartStreaming returns true if the stream is in a state that allows starting
	CanStartStreaming() bool

	// MarkAsLive transitions the stream to live status
	MarkAsLive()

	// MarkAsEnded transitions the stream to ended status
	MarkAsEnded()

	// SetDuration sets the stream duration in seconds
	SetDuration(seconds int)
}

// StreamRepository provides stream data access for framework components.
// Application implements this interface using its repository pattern.
type StreamRepository interface {
	// FindByID retrieves a stream by its unique identifier
	FindByID(ctx context.Context, streamID string) (StreamInfo, error)

	// FindByStreamKey retrieves a stream by its stream key
	FindByStreamKey(ctx context.Context, streamKey string) (StreamInfo, error)

	// UpdateStatus changes the stream's status
	// status should be one of: "pending", "live", "ended", "error"
	UpdateStatus(ctx context.Context, streamID string, status string) error

	// Save persists changes to the stream
	Save(ctx context.Context, stream StreamInfo) error
}

// StreamAuthenticator validates stream access.
// This interface abstracts stream authentication for the RTMP server.
type StreamAuthenticator interface {
	// AuthenticateStream validates a stream key and returns stream info if valid
	AuthenticateStream(ctx context.Context, streamID, streamKey string) (StreamInfo, error)

	// ValidateStreamToken verifies a stream access token
	ValidateStreamToken(ctx context.Context, token string) (string, error)
}
