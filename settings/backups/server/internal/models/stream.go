// T509: Stream model with state management
package models

import (
	"fmt"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// StreamState represents the current state of a live stream
type StreamState string

const (
	StreamStatePending StreamState = "pending" // Stream created, not yet live
	StreamStateLive    StreamState = "live"    // Stream is currently broadcasting
	StreamStateEnded   StreamState = "ended"   // Stream has finished
)

// Stream represents a live streaming session
type Stream struct {
	ID          uuid.UUID   `gorm:"type:uuid;primary_key" json:"id"`
	TenantID    uuid.UUID   `gorm:"type:uuid;not null;index" json:"tenant_id"`
	UserID      uuid.UUID   `gorm:"type:uuid;not null;index" json:"user_id"`
	Title       string      `gorm:"size:255;not null" json:"title"`
	Description string      `gorm:"type:text" json:"description"`
	StreamKey   string      `gorm:"size:64;unique;not null;index" json:"-"` // Never expose in JSON
	State       StreamState `gorm:"size:20;not null;default:'pending';index" json:"state"`

	// RTMP/HLS Configuration
	RTMPEndpoint string `gorm:"size:512" json:"rtmp_endpoint"`
	HLSPlaylist  string `gorm:"size:512" json:"hls_playlist"`

	// Stream Metadata
	ViewerCount int    `gorm:"default:0" json:"viewer_count"`
	PeakViewers int    `gorm:"default:0" json:"peak_viewers"`
	Bitrate     int    `gorm:"default:0" json:"bitrate"`  // kbps
	Resolution  string `gorm:"size:20" json:"resolution"` // e.g., "1920x1080"
	FPS         int    `gorm:"default:0" json:"fps"`

	// Timing
	ScheduledAt *time.Time `gorm:"index" json:"scheduled_at"`
	StartedAt   *time.Time `json:"started_at"`
	EndedAt     *time.Time `json:"ended_at"`
	Duration    int        `gorm:"default:0" json:"duration"` // seconds

	// Features
	DVREnabled  bool   `gorm:"default:false" json:"dvr_enabled"`
	RecordingID string `gorm:"size:255" json:"recording_id,omitempty"` // S3 key or URL

	// Moderation
	IsPublic   bool `gorm:"default:true" json:"is_public"`
	IsFeatured bool `gorm:"default:false" json:"is_featured"`

	// Timestamps
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

// BeforeCreate generates UUID for new streams
func (s *Stream) BeforeCreate(tx *gorm.DB) error {
	if s.ID == uuid.Nil {
		s.ID = uuid.New()
	}
	return nil
}

// CanTransitionTo validates if state transition is allowed
func (s *Stream) CanTransitionTo(newState StreamState) bool {
	switch s.State {
	case StreamStatePending:
		// Pending can go to Live or Ended (if cancelled)
		return newState == StreamStateLive || newState == StreamStateEnded

	case StreamStateLive:
		// Live can only go to Ended
		return newState == StreamStateEnded

	case StreamStateEnded:
		// Ended is terminal state
		return false

	default:
		return false
	}
}

// TransitionTo changes stream state with validation
func (s *Stream) TransitionTo(newState StreamState) error {
	if !s.CanTransitionTo(newState) {
		return ErrInvalidStateTransition{
			From: s.State,
			To:   newState,
		}
	}

	// Update state and relevant timestamps
	s.State = newState

	switch newState {
	case StreamStateLive:
		now := time.Now()
		s.StartedAt = &now
	case StreamStateEnded:
		now := time.Now()
		s.EndedAt = &now
		if s.StartedAt != nil {
			s.Duration = int(now.Sub(*s.StartedAt).Seconds())
		}
	}

	return nil
}

// IsActive returns true if stream is currently live
func (s *Stream) IsActive() bool {
	return s.State == StreamStateLive
}

// IsPending returns true if stream is waiting to start
func (s *Stream) IsPending() bool {
	return s.State == StreamStatePending
}

// IsEnded returns true if stream has finished
func (s *Stream) IsEnded() bool {
	return s.State == StreamStateEnded
}

// ErrInvalidStateTransition represents an invalid state transition error
type ErrInvalidStateTransition struct {
	From StreamState
	To   StreamState
}

func (e ErrInvalidStateTransition) Error() string {
	return fmt.Sprintf("invalid stream state transition from %s to %s", e.From, e.To)
}

// TableName specifies the table name for Stream model
func (Stream) TableName() string {
	return "streams"
}
