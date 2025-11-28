package models

import (
	"time"

	"gorm.io/gorm"
)

// StreamType represents the type of video stream
type StreamType string

const (
	StreamTypeLive StreamType = "live"
	StreamTypeVOD  StreamType = "vod"
)

// StreamStatus represents the current status of a stream
type StreamStatus string

const (
	StreamStatusPending StreamStatus = "pending" // Created, awaiting RTMP connection
	StreamStatusLive    StreamStatus = "live"    // Currently streaming
	StreamStatusEnded   StreamStatus = "ended"   // Stream ended normally
	StreamStatusError   StreamStatus = "error"   // Stream ended with error
)

// VideoStream represents a live or VOD video stream
type VideoStream struct {
	ID          string `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	TenantID    string `gorm:"type:uuid;not null;index:idx_streams_tenant" json:"tenant_id"`
	CreatorID   string `gorm:"type:uuid;not null;index:idx_streams_creator" json:"creator_id"`
	Title       string `gorm:"type:varchar(200);not null" json:"title"`
	Description string `gorm:"type:text" json:"description"`

	// Stream configuration
	StreamType StreamType   `gorm:"type:varchar(10);not null;default:'live';index:idx_streams_type_status" json:"stream_type"`
	Status     StreamStatus `gorm:"type:varchar(20);not null;default:'pending';index:idx_streams_type_status" json:"status"`
	StreamKey  string       `gorm:"type:varchar(64);unique;not null" json:"-"` // Hidden from JSON

	// URLs
	IngestURL    string `gorm:"type:varchar(500)" json:"ingest_url"`              // RTMP ingest URL with stream key
	PlaybackURL  string `gorm:"type:varchar(500)" json:"playback_url"`            // HLS master playlist URL
	ThumbnailURL string `gorm:"type:varchar(500)" json:"thumbnail_url,omitempty"` // VOD thumbnail

	// Stream metadata
	ViewerCount int  `gorm:"default:0" json:"viewer_count"`
	PeakViewers int  `gorm:"default:0" json:"peak_viewers"`
	TotalViews  int  `gorm:"default:0" json:"total_views"`
	Duration    int  `gorm:"default:0" json:"duration"`       // Duration in seconds
	DVREnabled  bool `gorm:"default:true" json:"dvr_enabled"` // Enable DVR for live streams
	DVRWindow   int  `gorm:"default:7200" json:"dvr_window"`  // DVR window in seconds (default: 2 hours)

	// Scheduling
	ScheduledAt *time.Time `gorm:"index" json:"scheduled_at,omitempty"` // For scheduled streams
	StartedAt   *time.Time `json:"started_at,omitempty"`                // When stream went live
	EndedAt     *time.Time `json:"ended_at,omitempty"`                  // When stream ended

	// Retention
	RetentionUntil *time.Time `gorm:"index:idx_streams_retention" json:"retention_until,omitempty"` // When to delete stream data

	// Creator info (denormalized for query performance)
	CreatorName   string `gorm:"type:varchar(100)" json:"creator_name"`
	CreatorAvatar string `gorm:"type:varchar(500)" json:"creator_avatar,omitempty"`

	// Timestamps
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	// Relations
	Tenant  Tenant `gorm:"foreignKey:TenantID" json:"-"`
	Creator User   `gorm:"foreignKey:CreatorID" json:"-"`
}

// TableName specifies the table name for VideoStream
func (VideoStream) TableName() string {
	return "video_streams"
}

// BeforeCreate sets default values before creating a video stream
func (v *VideoStream) BeforeCreate(tx *gorm.DB) error {
	// Generate stream key if not set
	if v.StreamKey == "" {
		v.StreamKey = generateStreamKey()
	}

	// Set default DVR settings for live streams
	if v.StreamType == StreamTypeLive {
		if v.DVRWindow == 0 {
			v.DVRWindow = 7200 // 2 hours default
		}
	}

	// Set retention date if not set (7 days for live, 30 days for VOD)
	if v.RetentionUntil == nil {
		var retentionDays int
		if v.StreamType == StreamTypeLive {
			retentionDays = 7
		} else {
			retentionDays = 30
		}
		retentionDate := time.Now().AddDate(0, 0, retentionDays)
		v.RetentionUntil = &retentionDate
	}

	return nil
}

// IsLive returns true if the stream is currently live
func (v *VideoStream) IsLive() bool {
	return v.Status == StreamStatusLive
}

// CanStartStreaming returns true if stream can transition to live status
func (v *VideoStream) CanStartStreaming() bool {
	return v.Status == StreamStatusPending
}

// GetID implements interfaces.StreamInfo - returns the unique identifier of the stream
func (v *VideoStream) GetID() string {
	return v.ID
}

// GetStreamKey implements interfaces.StreamInfo - returns the stream's authentication key
func (v *VideoStream) GetStreamKey() string {
	return v.StreamKey
}

// GetStatus implements interfaces.StreamInfo - returns the current status as string
func (v *VideoStream) GetStatus() string {
	return string(v.Status)
}

// GetOwnerID implements interfaces.StreamInfo - returns the ID of the user who owns the stream
func (v *VideoStream) GetOwnerID() string {
	return v.CreatorID
}

// SetDuration implements interfaces.StreamInfo - sets the stream duration in seconds
func (v *VideoStream) SetDuration(seconds int) {
	v.Duration = seconds
}

// IsExpired returns true if stream has passed its retention date
func (v *VideoStream) IsExpired() bool {
	if v.RetentionUntil == nil {
		return false
	}
	return time.Now().After(*v.RetentionUntil)
}

// GetIngestURL returns the full RTMP ingest URL with stream key
func (v *VideoStream) GetIngestURL(baseURL string) string {
	if baseURL == "" {
		baseURL = "rtmp://streaming.quester.app"
	}
	return baseURL + "/live/" + v.ID + "?key=" + v.StreamKey
}

// GetPlaybackURL returns the HLS playback URL (signed)
func (v *VideoStream) GetPlaybackURL(baseURL string, signedToken string) string {
	if baseURL == "" {
		baseURL = "https://cdn.quester.app"
	}

	var streamPath string
	if v.StreamType == StreamTypeLive {
		streamPath = "/live/" + v.ID + "/master.m3u8"
	} else {
		streamPath = "/vod/" + v.ID + "/master.m3u8"
	}

	url := baseURL + streamPath
	if signedToken != "" {
		url += "?token=" + signedToken
	}

	return url
}

// UpdateViewerCount updates the current and peak viewer counts
func (v *VideoStream) UpdateViewerCount(count int) {
	v.ViewerCount = count
	if count > v.PeakViewers {
		v.PeakViewers = count
	}
}

// MarkAsLive transitions stream to live status
func (v *VideoStream) MarkAsLive() {
	v.Status = StreamStatusLive
	now := time.Now()
	v.StartedAt = &now
}

// MarkAsEnded transitions stream to ended status
func (v *VideoStream) MarkAsEnded() {
	v.Status = StreamStatusEnded
	now := time.Now()
	v.EndedAt = &now

	// Calculate duration if started
	if v.StartedAt != nil {
		v.Duration = int(now.Sub(*v.StartedAt).Seconds())
	}

	// Reset viewer count
	v.ViewerCount = 0
}

// MarkAsError transitions stream to error status
func (v *VideoStream) MarkAsError() {
	v.Status = StreamStatusError
	now := time.Now()
	v.EndedAt = &now
	v.ViewerCount = 0
}

// Helper function to generate a random stream key
func generateStreamKey() string {
	// Generate a secure random stream key (64 characters)
	const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	const keyLength = 64

	// In production, use crypto/rand for secure random generation
	// For now, return a placeholder
	return "sk_" + randomString(keyLength-3, charset)
}

// Helper function to generate random string
func randomString(length int, charset string) string {
	// Placeholder implementation
	// In production, use crypto/rand
	result := make([]byte, length)
	for i := range result {
		result[i] = charset[i%len(charset)]
	}
	return string(result)
}
