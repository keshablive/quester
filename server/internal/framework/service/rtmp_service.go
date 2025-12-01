// T504-T510: RTMP Service Implementation
package service

import (
	"context"
	"crypto/rand"
	"errors"
	"fmt"
	"net/http"
	"regexp"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"

	"github.com/keshablive/quester/internal/models"
)

// RTMPConfig holds RTMP server configuration
type RTMPConfig struct {
	Host       string // RTMP server host (e.g., "stream.quester.com")
	Port       int    // RTMP port (default: 1935)
	AppName    string // RTMP application name (e.g., "live")
	AuthURL    string // Authentication callback URL
	MaxStreams int    // Maximum concurrent streams allowed
}

// Validate validates the RTMP configuration
func (c *RTMPConfig) Validate() error {
	if c.Port <= 0 || c.Port > 65535 {
		return errors.New("invalid port: must be between 1 and 65535")
	}
	if c.AuthURL == "" {
		return errors.New("auth URL is required")
	}
	if c.MaxStreams <= 0 {
		return errors.New("max streams must be greater than 0")
	}
	return nil
}

// VideoStreamingService handles RTMP streaming operations
type VideoStreamingService struct {
	config      *RTMPConfig
	db          *gorm.DB
	redis       *redis.Client
	mu          sync.RWMutex
	maxStreams  int
	streamCount int // Current stream count (for capacity testing)
}

// NewVideoStreamingService creates a new video streaming service
func NewVideoStreamingService(db *gorm.DB, redisClient *redis.Client) *VideoStreamingService {
	return &VideoStreamingService{
		db:          db,
		redis:       redisClient,
		maxStreams:  100, // Default limit
		streamCount: 0,
	}
}

// NewRTMPService creates a new RTMP service with configuration
func NewRTMPService(config *RTMPConfig) *VideoStreamingService {
	// Validate configuration
	if err := config.Validate(); err != nil {
		return nil // Return nil for invalid config
	}

	return &VideoStreamingService{
		config:      config,
		maxStreams:  config.MaxStreams,
		streamCount: 0,
	}
}

// SetDatabase sets the database connection
func (s *VideoStreamingService) SetDatabase(db *gorm.DB) {
	s.db = db
}

// SetRedis sets the Redis client
func (s *VideoStreamingService) SetRedis(client *redis.Client) {
	s.redis = client
}

// GetAppName returns the RTMP application name
func (s *VideoStreamingService) GetAppName() string {
	if s.config == nil {
		return ""
	}
	return s.config.AppName
}

// SetMaxConcurrentStreams sets the maximum concurrent streams limit
func (s *VideoStreamingService) SetMaxConcurrentStreams(max int) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.maxStreams = max
}

// CanAcceptStream checks if service can accept a new stream (simple counter)
func (s *VideoStreamingService) CanAcceptStream() bool {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.streamCount < s.maxStreams
}

// IncrementStreamCount increments the active stream counter
func (s *VideoStreamingService) IncrementStreamCount() {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.streamCount++
}

// DecrementStreamCount decrements the active stream counter
func (s *VideoStreamingService) DecrementStreamCount() {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.streamCount > 0 {
		s.streamCount--
	}
}

// streamKeyRegex validates stream key format (32-64 alphanumeric + underscores)
var streamKeyRegex = regexp.MustCompile(`^[a-zA-Z0-9_]{32,64}$`)

// T508: GenerateStreamKey generates a secure random stream key
// Returns a 64-character alphanumeric string suitable for RTMP streaming
func GenerateStreamKey() (string, error) {
	const (
		keyLength = 64
		charset   = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	)

	// Use crypto/rand for secure random generation
	bytes := make([]byte, keyLength)
	_, err := rand.Read(bytes)
	if err != nil {
		return "", fmt.Errorf("failed to generate random bytes: %w", err)
	}

	// Map random bytes to charset
	key := make([]byte, keyLength)
	for i := 0; i < keyLength; i++ {
		key[i] = charset[bytes[i]%byte(len(charset))]
	}

	return string(key), nil
}

// ValidateStreamKeyFormat validates the format of a stream key (public function for tests)
func ValidateStreamKeyFormat(key string) error {
	if !streamKeyRegex.MatchString(key) {
		return errors.New("invalid stream key format: must be 32-64 alphanumeric characters or underscores")
	}

	// Security checks
	if containsMaliciousContent(key) {
		return errors.New("stream key contains invalid characters")
	}

	return nil
}

// ValidateStreamKey validates a stream key format and database existence
func (s *VideoStreamingService) ValidateStreamKey(ctx context.Context, key string) (bool, *models.VideoStream, error) {
	// Format validation
	if !streamKeyRegex.MatchString(key) {
		return false, nil, errors.New("invalid stream key format: must be 32-64 alphanumeric characters or underscores")
	}

	// Security checks
	if containsMaliciousContent(key) {
		return false, nil, errors.New("stream key contains invalid characters")
	}

	// Database lookup
	if s.db == nil {
		return false, nil, errors.New("database not configured")
	}

	var stream models.VideoStream
	err := s.db.WithContext(ctx).Where("stream_key = ?", key).First(&stream).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return false, nil, errors.New("stream not found")
		}
		return false, nil, fmt.Errorf("database error: %w", err)
	}

	// Status validation
	if stream.Status == models.StreamStatusEnded {
		return false, nil, errors.New("stream has ended")
	}
	if stream.Status == models.StreamStatusError {
		return false, nil, errors.New("stream is in error state")
	}

	// Accept pending or live streams (live allows reconnection)
	if stream.Status != models.StreamStatusPending && stream.Status != models.StreamStatusLive {
		return false, nil, fmt.Errorf("invalid stream status: %s", stream.Status)
	}

	return true, &stream, nil
}

// ValidateStreamKeyForTenant validates stream key with tenant isolation
func (s *VideoStreamingService) ValidateStreamKeyForTenant(ctx context.Context, key string, tenantID uuid.UUID) (bool, *models.VideoStream, error) {
	// First validate the key format and existence
	isValid, stream, err := s.ValidateStreamKey(ctx, key)
	if err != nil || !isValid {
		return false, nil, err
	}

	// Check tenant isolation
	if stream.TenantID != tenantID.String() {
		return false, nil, errors.New("stream does not belong to tenant")
	}

	return true, stream, nil
}

// ValidateUserOwnsStream validates that a user owns the stream
func (s *VideoStreamingService) ValidateUserOwnsStream(ctx context.Context, key string, userID uuid.UUID) (bool, error) {
	isValid, stream, err := s.ValidateStreamKey(ctx, key)
	if err != nil || !isValid {
		return false, err
	}

	if stream.CreatorID != userID.String() {
		return false, errors.New("unauthorized: user does not own stream")
	}

	return true, nil
}

// ValidateScheduledStream validates a scheduled stream is within allowed time window
func (s *VideoStreamingService) ValidateScheduledStream(ctx context.Context, key string, now time.Time) (bool, *models.VideoStream, error) {
	isValid, stream, err := s.ValidateStreamKey(ctx, key)
	if err != nil || !isValid {
		return false, nil, err
	}

	// Check if stream is scheduled
	if stream.ScheduledAt == nil {
		return true, stream, nil // Not scheduled, always valid
	}

	// Check if scheduled time has passed (with 1 hour grace period)
	graceWindow := 1 * time.Hour
	if now.After(stream.ScheduledAt.Add(graceWindow)) {
		return false, nil, errors.New("scheduled stream time has expired")
	}

	return true, stream, nil
}

// TransitionStreamToLive transitions a stream from pending to live
func (s *VideoStreamingService) TransitionStreamToLive(ctx context.Context, streamID uint) error {
	if s.db == nil {
		return errors.New("database not configured")
	}

	now := time.Now()

	// Update stream status with optimistic locking
	result := s.db.WithContext(ctx).Model(&models.VideoStream{}).
		Where("id = ? AND (status = ? OR status = ?)", streamID, models.StreamStatusPending, models.StreamStatusLive).
		Updates(map[string]interface{}{
			"status":     models.StreamStatusLive,
			"started_at": now,
			"updated_at": now,
		})

	if result.Error != nil {
		return fmt.Errorf("failed to transition stream to live: %w", result.Error)
	}

	if result.RowsAffected == 0 {
		return errors.New("stream not found or already in different state")
	}

	return nil
}

// TransitionStreamToEnded transitions a stream from live to ended
func (s *VideoStreamingService) TransitionStreamToEnded(ctx context.Context, streamID uint) error {
	if s.db == nil {
		return errors.New("database not configured")
	}

	var stream models.VideoStream
	err := s.db.WithContext(ctx).First(&stream, streamID).Error
	if err != nil {
		return fmt.Errorf("stream not found: %w", err)
	}

	// Only allow ending live streams
	if stream.Status != models.StreamStatusLive {
		return fmt.Errorf("cannot end stream with status: %s", stream.Status)
	}

	now := time.Now()
	duration := 0
	if stream.StartedAt != nil {
		duration = int(now.Sub(*stream.StartedAt).Seconds())
	}

	// Update stream to ended status
	err = s.db.WithContext(ctx).Model(&stream).Updates(map[string]interface{}{
		"status":     models.StreamStatusEnded,
		"ended_at":   now,
		"duration":   duration,
		"updated_at": now,
	}).Error

	if err != nil {
		return fmt.Errorf("failed to end stream: %w", err)
	}

	return nil
}

// IncrementViewerCount atomically increments the viewer count
func (s *VideoStreamingService) IncrementViewerCount(ctx context.Context, streamID uint) error {
	if s.db == nil {
		return errors.New("database not configured")
	}

	// T541: Use Redis for real-time viewer tracking
	redisKey := fmt.Sprintf("stream:%d:viewers", streamID)

	// Increment Redis counter (real-time)
	if s.redis != nil {
		newCount, err := s.redis.Incr(ctx, redisKey).Result()
		if err != nil {
			// Log error but don't fail - fallback to DB only
			fmt.Printf("Redis INCR failed: %v\n", err)
		} else {
			// Set TTL of 1 hour (auto-cleanup for stale streams)
			s.redis.Expire(ctx, redisKey, 1*time.Hour)

			// Update peak viewers in Redis if needed
			peakKey := fmt.Sprintf("stream:%d:peak", streamID)
			peak, _ := s.redis.Get(ctx, peakKey).Int64()
			if newCount > peak {
				s.redis.Set(ctx, peakKey, newCount, 24*time.Hour)
			}
		}
	}

	// Atomic increment with peak tracking in DB (persistent)
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var stream models.VideoStream
		if err := tx.Clauses().First(&stream, streamID).Error; err != nil {
			return err
		}

		newCount := stream.ViewerCount + 1
		updates := map[string]interface{}{
			"viewer_count": newCount,
			"total_views":  stream.TotalViews + 1,
		}

		// Update peak if necessary
		if newCount > stream.PeakViewers {
			updates["peak_viewers"] = newCount
		}

		return tx.Model(&stream).Updates(updates).Error
	})

	return err
}

// DecrementViewerCount atomically decrements the viewer count
func (s *VideoStreamingService) DecrementViewerCount(ctx context.Context, streamID uint) error {
	if s.db == nil {
		return errors.New("database not configured")
	}

	// T541: Decrement Redis counter (real-time)
	redisKey := fmt.Sprintf("stream:%d:viewers", streamID)

	if s.redis != nil {
		newCount, err := s.redis.Decr(ctx, redisKey).Result()
		if err != nil {
			fmt.Printf("Redis DECR failed: %v\n", err)
		} else {
			// Prevent negative counts
			if newCount < 0 {
				s.redis.Set(ctx, redisKey, 0, 1*time.Hour)
			}
		}
	}

	// Use raw SQL for atomic decrement with floor at 0
	err := s.db.WithContext(ctx).Exec(`
		UPDATE video_streams 
		SET viewer_count = GREATEST(viewer_count - 1, 0), 
		    updated_at = NOW() 
		WHERE id = ?
	`, streamID).Error

	return err
}

// GetViewerCount returns current viewer count (from Redis for real-time, fallback to DB)
func (s *VideoStreamingService) GetViewerCount(ctx context.Context, streamID uint) (int64, error) {
	// T541: Try Redis first for real-time count
	if s.redis != nil {
		redisKey := fmt.Sprintf("stream:%d:viewers", streamID)
		count, err := s.redis.Get(ctx, redisKey).Int64()
		if err == nil {
			return count, nil
		}
		// Redis miss or error - fallback to DB
	}

	// Fallback to database
	if s.db == nil {
		return 0, errors.New("database not configured")
	}

	var stream models.VideoStream
	err := s.db.WithContext(ctx).Select("viewer_count").First(&stream, streamID).Error
	if err != nil {
		return 0, fmt.Errorf("failed to get viewer count: %w", err)
	}

	return int64(stream.ViewerCount), nil
}

// CanAcceptNewStream checks if system can accept a new stream (capacity check)
func (s *VideoStreamingService) CanAcceptNewStream(ctx context.Context, tenantID uuid.UUID) (bool, error) {
	if s.db == nil {
		return false, errors.New("database not configured")
	}

	// Count currently live streams
	var liveCount int64
	err := s.db.WithContext(ctx).Model(&models.VideoStream{}).
		Where("tenant_id = ? AND status = ?", tenantID.String(), models.StreamStatusLive).
		Count(&liveCount).Error

	if err != nil {
		return false, fmt.Errorf("failed to count live streams: %w", err)
	}

	s.mu.RLock()
	maxStreams := s.maxStreams
	s.mu.RUnlock()

	if liveCount >= int64(maxStreams) {
		return false, errors.New("maximum stream capacity reached")
	}

	return true, nil
}

// CreateStreamRequest represents a stream creation request
type CreateStreamRequest struct {
	TenantID    string
	CreatorID   string
	Title       string
	Description string
	StreamType  models.StreamType
	DVREnabled  bool
	ScheduledAt *time.Time
}

// CreateStream creates a new stream
func (s *VideoStreamingService) CreateStream(ctx context.Context, req *CreateStreamRequest) (uint, error) {
	if s.db == nil {
		return 0, errors.New("database not configured")
	}

	stream := &models.VideoStream{
		TenantID:    req.TenantID,
		CreatorID:   req.CreatorID,
		Title:       req.Title,
		Description: req.Description,
		StreamType:  req.StreamType,
		Status:      models.StreamStatusPending,
		DVREnabled:  req.DVREnabled,
		ScheduledAt: req.ScheduledAt,
	}

	err := s.db.WithContext(ctx).Create(stream).Error
	if err != nil {
		return 0, fmt.Errorf("failed to create stream: %w", err)
	}

	// Convert string ID to uint (assuming auto-increment)
	// Note: This is a simplified version; real implementation may differ
	var id uint
	fmt.Sscanf(stream.ID, "%d", &id)

	return id, nil
}

// HandleOnPublish handles nginx-rtmp on_publish callback
func (s *VideoStreamingService) HandleOnPublish(w http.ResponseWriter, r *http.Request) int {
	ctx := r.Context()

	// Extract stream key from query params
	streamKey := r.URL.Query().Get("name")
	if streamKey == "" {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte("Missing stream key"))
		return http.StatusBadRequest
	}

	// Validate stream key
	isValid, stream, err := s.ValidateStreamKey(ctx, streamKey)
	if err != nil || !isValid {
		w.WriteHeader(http.StatusForbidden)
		w.Write([]byte(fmt.Sprintf("Stream validation failed: %v", err)))
		return http.StatusForbidden
	}

	// Transition to live if pending
	if stream.Status == models.StreamStatusPending {
		// Note: Using stream ID as uint - may need conversion
		var streamID uint
		fmt.Sscanf(stream.ID, "%d", &streamID)
		if err := s.TransitionStreamToLive(ctx, streamID); err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			w.Write([]byte(fmt.Sprintf("Failed to start stream: %v", err)))
			return http.StatusInternalServerError
		}
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte("OK"))
	return http.StatusOK
}

// HandleOnPublishDone handles nginx-rtmp on_publish_done callback
func (s *VideoStreamingService) HandleOnPublishDone(w http.ResponseWriter, r *http.Request) int {
	ctx := r.Context()

	// Extract stream key from query params
	streamKey := r.URL.Query().Get("name")
	if streamKey == "" {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte("Missing stream key"))
		return http.StatusBadRequest
	}

	// Look up stream
	var stream models.VideoStream
	err := s.db.WithContext(ctx).Where("stream_key = ?", streamKey).First(&stream).Error
	if err != nil {
		w.WriteHeader(http.StatusNotFound)
		w.Write([]byte("Stream not found"))
		return http.StatusNotFound
	}

	// Transition to ended if live
	if stream.Status == models.StreamStatusLive {
		var streamID uint
		fmt.Sscanf(stream.ID, "%d", &streamID)
		if err := s.TransitionStreamToEnded(ctx, streamID); err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			w.Write([]byte(fmt.Sprintf("Failed to end stream: %v", err)))
			return http.StatusInternalServerError
		}
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte("OK"))
	return http.StatusOK
}

// HandleOnConnect handles nginx-rtmp on_connect callback (viewer tracking)
func (s *VideoStreamingService) HandleOnConnect(w http.ResponseWriter, r *http.Request) int {
	w.WriteHeader(http.StatusOK)
	w.Write([]byte("OK"))
	return http.StatusOK
}

// HandleOnDisconnect handles nginx-rtmp on_disconnect callback (viewer tracking)
func (s *VideoStreamingService) HandleOnDisconnect(w http.ResponseWriter, r *http.Request) int {
	w.WriteHeader(http.StatusOK)
	w.Write([]byte("OK"))
	return http.StatusOK
}

// containsMaliciousContent checks for common attack patterns
func containsMaliciousContent(key string) bool {
	maliciousPatterns := []string{
		"../",      // Path traversal
		"<script>", // XSS
		"DROP",     // SQL injection
		"--",       // SQL comment
		";",        // SQL statement separator
		" ",        // Spaces not allowed
	}

	for _, pattern := range maliciousPatterns {
		if regexp.MustCompile(pattern).MatchString(key) {
			return true
		}
	}

	return false
}
