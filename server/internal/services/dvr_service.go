// T531-T539: DVR (Digital Video Recording) Service Implementation
package services

import (
	"context"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"sync"
	"time"
)

// DVRConfig holds DVR configuration
type DVRConfig struct {
	BaseDir         string        // Base directory for DVR storage
	WindowDuration  time.Duration // DVR window duration (e.g., 2 hours)
	SegmentDuration time.Duration // Individual segment duration (e.g., 6 seconds)
	MaxSegments     int           // Maximum segments to keep per stream
	CleanupInterval time.Duration // How often to run cleanup (e.g., 1 minute)
	S3Bucket        string        // S3 bucket for archival (optional)
	S3Enabled       bool          // Enable S3 archival
}

// Validate validates DVR configuration
func (c *DVRConfig) Validate() error {
	if c.BaseDir == "" {
		return errors.New("base directory is required")
	}
	if c.WindowDuration <= 0 {
		return errors.New("window duration must be greater than 0")
	}
	if c.SegmentDuration <= 0 {
		return errors.New("segment duration must be greater than 0")
	}
	return nil
}

// SetDefaults sets default values for DVR configuration
func (c *DVRConfig) SetDefaults() {
	if c.WindowDuration == 0 {
		c.WindowDuration = 2 * time.Hour // 2-hour DVR window
	}
	if c.SegmentDuration == 0 {
		c.SegmentDuration = 6 * time.Second // 6-second segments
	}
	if c.MaxSegments == 0 {
		// Calculate max segments based on window duration
		c.MaxSegments = int(c.WindowDuration / c.SegmentDuration)
	}
	if c.CleanupInterval == 0 {
		c.CleanupInterval = 1 * time.Minute // Run cleanup every minute
	}
}

// DVRSegment represents a single DVR segment
type DVRSegment struct {
	StreamKey  string    // Stream identifier
	Resolution string    // Resolution (1080p, 720p, etc.)
	SegmentID  int64     // Segment sequence number
	Timestamp  time.Time // Segment timestamp
	Duration   float64   // Segment duration in seconds
	Path       string    // Local file path
	S3Path     string    // S3 path (if archived)
	Size       int64     // File size in bytes
	Archived   bool      // Whether archived to S3
	CreatedAt  time.Time // When segment was created
}

// DVRWindow represents the current DVR window for a stream
type DVRWindow struct {
	StreamKey string       // Stream identifier
	StartTime time.Time    // Window start time
	EndTime   time.Time    // Window end time
	Segments  []DVRSegment // Segments in window
	TotalSize int64        // Total size of segments
	mu        sync.RWMutex // Protects segment access
}

// AddSegment adds a segment to the DVR window
func (w *DVRWindow) AddSegment(segment DVRSegment) {
	w.mu.Lock()
	defer w.mu.Unlock()

	w.Segments = append(w.Segments, segment)
	w.TotalSize += segment.Size

	// Update window bounds
	if w.StartTime.IsZero() || segment.Timestamp.Before(w.StartTime) {
		w.StartTime = segment.Timestamp
	}
	if segment.Timestamp.After(w.EndTime) {
		w.EndTime = segment.Timestamp
	}

	// Sort segments by timestamp
	sort.Slice(w.Segments, func(i, j int) bool {
		return w.Segments[i].Timestamp.Before(w.Segments[j].Timestamp)
	})
}

// RemoveOldSegments removes segments outside the DVR window
func (w *DVRWindow) RemoveOldSegments(cutoff time.Time) []DVRSegment {
	w.mu.Lock()
	defer w.mu.Unlock()

	var removed []DVRSegment
	var kept []DVRSegment

	for _, seg := range w.Segments {
		if seg.Timestamp.Before(cutoff) {
			removed = append(removed, seg)
			w.TotalSize -= seg.Size
		} else {
			kept = append(kept, seg)
		}
	}

	w.Segments = kept

	// Update window bounds
	if len(w.Segments) > 0 {
		w.StartTime = w.Segments[0].Timestamp
		w.EndTime = w.Segments[len(w.Segments)-1].Timestamp
	}

	return removed
}

// GetSegmentsByTimeRange returns segments within a time range
func (w *DVRWindow) GetSegmentsByTimeRange(start, end time.Time) []DVRSegment {
	w.mu.RLock()
	defer w.mu.RUnlock()

	var result []DVRSegment
	for _, seg := range w.Segments {
		if (seg.Timestamp.Equal(start) || seg.Timestamp.After(start)) &&
			(seg.Timestamp.Before(end) || seg.Timestamp.Equal(end)) {
			result = append(result, seg)
		}
	}

	return result
}

// GetSegmentCount returns the number of segments in the window
func (w *DVRWindow) GetSegmentCount() int {
	w.mu.RLock()
	defer w.mu.RUnlock()
	return len(w.Segments)
}

// Recording represents a saved DVR recording
type Recording struct {
	ID          string    // Unique recording ID
	StreamKey   string    // Source stream
	Title       string    // Recording title
	Description string    // Recording description
	StartTime   time.Time // Recording start time
	EndTime     time.Time // Recording end time
	Duration    float64   // Total duration in seconds
	Resolutions []string  // Available resolutions
	Size        int64     // Total size in bytes
	S3Bucket    string    // S3 bucket
	S3Prefix    string    // S3 prefix
	CreatedAt   time.Time // When recording was created
	CreatedBy   string    // User who created recording
}

// S3Uploader interface for uploading files to S3
type S3Uploader interface {
	UploadFile(ctx context.Context, key string, reader interface{}, contentType string, metadata map[string]string) error
}

// DVRService manages DVR functionality
type DVRService struct {
	config   *DVRConfig
	windows  map[string]*DVRWindow // streamKey -> DVRWindow
	s3Client S3Uploader            // S3 client for uploading recordings
	mu       sync.RWMutex
	ctx      context.Context
	cancel   context.CancelFunc
}

// NewDVRService creates a new DVR service
func NewDVRService(config *DVRConfig, s3Client S3Uploader) (*DVRService, error) {
	if err := config.Validate(); err != nil {
		return nil, fmt.Errorf("invalid DVR config: %w", err)
	}

	config.SetDefaults()

	ctx, cancel := context.WithCancel(context.Background())

	service := &DVRService{
		config:   config,
		windows:  make(map[string]*DVRWindow),
		s3Client: s3Client,
		ctx:      ctx,
		cancel:   cancel,
	}

	// Start background cleanup goroutine
	go service.cleanupLoop()

	return service, nil
}

// T531: Initialize DVR window for a stream
func (s *DVRService) InitializeWindow(streamKey string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if _, exists := s.windows[streamKey]; exists {
		return fmt.Errorf("DVR window already exists for stream: %s", streamKey)
	}

	s.windows[streamKey] = &DVRWindow{
		StreamKey: streamKey,
		Segments:  make([]DVRSegment, 0),
	}

	return nil
}

// T531: Register a new segment in the DVR window
func (s *DVRService) RegisterSegment(segment DVRSegment) error {
	s.mu.RLock()
	window, exists := s.windows[segment.StreamKey]
	s.mu.RUnlock()

	if !exists {
		// Auto-initialize window if not exists
		if err := s.InitializeWindow(segment.StreamKey); err != nil {
			return err
		}
		s.mu.RLock()
		window = s.windows[segment.StreamKey]
		s.mu.RUnlock()
	}

	// Check if segment file exists
	if _, err := os.Stat(segment.Path); err != nil {
		return fmt.Errorf("segment file not found: %w", err)
	}

	// Get file size
	fileInfo, err := os.Stat(segment.Path)
	if err != nil {
		return fmt.Errorf("failed to stat segment: %w", err)
	}
	segment.Size = fileInfo.Size()
	segment.CreatedAt = time.Now()

	window.AddSegment(segment)

	return nil
}

// T533: Generate DVR playlist for time-shifted playback
func (s *DVRService) GenerateDVRPlaylist(streamKey, resolution string, seekTime *time.Time) (string, error) {
	s.mu.RLock()
	window, exists := s.windows[streamKey]
	s.mu.RUnlock()

	if !exists {
		return "", fmt.Errorf("no DVR window found for stream: %s", streamKey)
	}

	// Get segments for the specified resolution
	window.mu.RLock()
	defer window.mu.RUnlock()

	var segments []DVRSegment
	for _, seg := range window.Segments {
		if seg.Resolution == resolution {
			// If seekTime is specified, only include segments from that point
			if seekTime != nil && seg.Timestamp.Before(*seekTime) {
				continue
			}
			segments = append(segments, seg)
		}
	}

	if len(segments) == 0 {
		return "", fmt.Errorf("no segments found for resolution: %s", resolution)
	}

	// Build HLS playlist
	playlist := "#EXTM3U\n"
	playlist += "#EXT-X-VERSION:3\n"
	playlist += fmt.Sprintf("#EXT-X-TARGETDURATION:%d\n", int(s.config.SegmentDuration.Seconds())+1)
	playlist += fmt.Sprintf("#EXT-X-MEDIA-SEQUENCE:%d\n", segments[0].SegmentID)

	// Add DVR tags for time-shifting
	playlist += "#EXT-X-PLAYLIST-TYPE:EVENT\n"

	for _, seg := range segments {
		playlist += fmt.Sprintf("#EXTINF:%.3f,\n", seg.Duration)
		// Use relative path for segments
		segmentName := filepath.Base(seg.Path)
		playlist += fmt.Sprintf("%s\n", segmentName)
	}

	// Don't add #EXT-X-ENDLIST for live DVR

	return playlist, nil
}

// T534: Seek to a specific time in the DVR window
func (s *DVRService) SeekToTime(streamKey string, seekTime time.Time) ([]DVRSegment, error) {
	s.mu.RLock()
	window, exists := s.windows[streamKey]
	s.mu.RUnlock()

	if !exists {
		return nil, fmt.Errorf("no DVR window found for stream: %s", streamKey)
	}

	// Find segments starting from seek time
	segments := window.GetSegmentsByTimeRange(seekTime, window.EndTime)

	if len(segments) == 0 {
		return nil, fmt.Errorf("no segments found after seek time: %v", seekTime)
	}

	return segments, nil
}

// T534: Seek by relative offset (e.g., -30s for 30 seconds back)
func (s *DVRService) SeekByOffset(streamKey string, offset time.Duration) ([]DVRSegment, error) {
	s.mu.RLock()
	window, exists := s.windows[streamKey]
	s.mu.RUnlock()

	if !exists {
		return nil, fmt.Errorf("no DVR window found for stream: %s", streamKey)
	}

	// Calculate seek time (offset from current end)
	seekTime := window.EndTime.Add(offset)

	// Ensure seek time is within window bounds
	if seekTime.Before(window.StartTime) {
		seekTime = window.StartTime
	}

	return s.SeekToTime(streamKey, seekTime)
}

// T535: Create a recording from DVR segments
func (s *DVRService) CreateRecording(streamKey, title, description string, startTime, endTime time.Time, createdBy string) (*Recording, error) {
	s.mu.RLock()
	window, exists := s.windows[streamKey]
	s.mu.RUnlock()

	if !exists {
		return nil, fmt.Errorf("no DVR window found for stream: %s", streamKey)
	}

	// Get segments within the time range
	segments := window.GetSegmentsByTimeRange(startTime, endTime)

	if len(segments) == 0 {
		return nil, fmt.Errorf("no segments found in time range")
	}

	// Calculate total duration and size
	var totalDuration float64
	var totalSize int64
	resolutionMap := make(map[string]bool)

	for _, seg := range segments {
		totalDuration += seg.Duration
		totalSize += seg.Size
		resolutionMap[seg.Resolution] = true
	}

	// Get unique resolutions
	var resolutions []string
	for res := range resolutionMap {
		resolutions = append(resolutions, res)
	}
	sort.Strings(resolutions)

	// Generate unique recording ID
	recordingID := fmt.Sprintf("rec_%s_%d", streamKey, time.Now().Unix())

	recording := &Recording{
		ID:          recordingID,
		StreamKey:   streamKey,
		Title:       title,
		Description: description,
		StartTime:   startTime,
		EndTime:     endTime,
		Duration:    totalDuration,
		Resolutions: resolutions,
		Size:        totalSize,
		S3Bucket:    s.config.S3Bucket,
		S3Prefix:    fmt.Sprintf("recordings/%s", recordingID),
		CreatedAt:   time.Now(),
		CreatedBy:   createdBy,
	}

	// Upload segments to S3 if enabled
	if s.config.S3Enabled && s.s3Client != nil {
		if err := s.uploadRecordingToS3(recording, segments); err != nil {
			return nil, fmt.Errorf("failed to upload recording to S3: %w", err)
		}
	}

	return recording, nil
}

// uploadRecordingToS3 uploads recording segments to S3 permanent storage
func (s *DVRService) uploadRecordingToS3(recording *Recording, segments []DVRSegment) error {
	ctx := context.Background()

	for i, segment := range segments {
		// Read segment file
		file, err := os.Open(segment.Path)
		if err != nil {
			return fmt.Errorf("failed to open segment %s: %w", segment.Path, err)
		}

		// Generate S3 key
		s3Key := fmt.Sprintf("%s/%s_%d_%s.ts",
			recording.S3Prefix,
			segment.Resolution,
			i,
			segment.Timestamp.Format("20060102-150405"),
		)

		// Upload to S3
		metadata := map[string]string{
			"recording-id": recording.ID,
			"stream-key":   recording.StreamKey,
			"resolution":   segment.Resolution,
			"timestamp":    segment.Timestamp.Format(time.RFC3339),
			"duration":     fmt.Sprintf("%.2f", segment.Duration),
		}

		if err := s.s3Client.UploadFile(ctx, s3Key, file, "video/mp2t", metadata); err != nil {
			file.Close()
			return fmt.Errorf("failed to upload segment to S3: %w", err)
		}
		file.Close()
	}

	return nil
}

// GetRecording retrieves a recording from S3 or local storage
// Note: Recording retrieval requires database/cache persistence layer (Phase 3 - LMS)
func (s *DVRService) GetRecording(recordingID string) (*Recording, error) {
	// Recording persistence will be implemented when DVRRepository is created
	return nil, fmt.Errorf("recording retrieval not yet implemented")
}

// T538: Clean up old segments outside DVR window
func (s *DVRService) cleanupLoop() {
	ticker := time.NewTicker(s.config.CleanupInterval)
	defer ticker.Stop()

	for {
		select {
		case <-s.ctx.Done():
			return
		case <-ticker.C:
			s.performCleanup()
		}
	}
}

// T538: Perform cleanup of expired segments
func (s *DVRService) performCleanup() {
	s.mu.RLock()
	streamKeys := make([]string, 0, len(s.windows))
	for key := range s.windows {
		streamKeys = append(streamKeys, key)
	}
	s.mu.RUnlock()

	cutoffTime := time.Now().Add(-s.config.WindowDuration)

	for _, streamKey := range streamKeys {
		s.mu.RLock()
		window, exists := s.windows[streamKey]
		s.mu.RUnlock()

		if !exists {
			continue
		}

		// Remove old segments
		removed := window.RemoveOldSegments(cutoffTime)

		// Delete segment files from disk
		for _, seg := range removed {
			if !seg.Archived && seg.Path != "" {
				// Only delete if not archived to S3
				os.Remove(seg.Path)
			}
		}
	}
}

// T539: Get DVR metrics for a stream
func (s *DVRService) GetMetrics(streamKey string) (*DVRMetrics, error) {
	s.mu.RLock()
	window, exists := s.windows[streamKey]
	s.mu.RUnlock()

	if !exists {
		return nil, fmt.Errorf("no DVR window found for stream: %s", streamKey)
	}

	window.mu.RLock()
	defer window.mu.RUnlock()

	// Calculate metrics
	var archivedCount int
	var archivedSize int64
	resolutionCounts := make(map[string]int)

	for _, seg := range window.Segments {
		if seg.Archived {
			archivedCount++
			archivedSize += seg.Size
		}
		resolutionCounts[seg.Resolution]++
	}

	windowDuration := window.EndTime.Sub(window.StartTime)

	metrics := &DVRMetrics{
		StreamKey:        streamKey,
		WindowDuration:   windowDuration,
		SegmentCount:     len(window.Segments),
		TotalSize:        window.TotalSize,
		ArchivedCount:    archivedCount,
		ArchivedSize:     archivedSize,
		ResolutionCounts: resolutionCounts,
		StartTime:        window.StartTime,
		EndTime:          window.EndTime,
		UpdatedAt:        time.Now(),
	}

	return metrics, nil
}

// DVRMetrics represents DVR metrics for monitoring
type DVRMetrics struct {
	StreamKey        string
	WindowDuration   time.Duration
	SegmentCount     int
	TotalSize        int64
	ArchivedCount    int
	ArchivedSize     int64
	ResolutionCounts map[string]int
	StartTime        time.Time
	EndTime          time.Time
	UpdatedAt        time.Time
}

// Close shuts down the DVR service
func (s *DVRService) Close() error {
	s.cancel()
	return nil
}

// GetWindow returns the DVR window for a stream (for testing)
func (s *DVRService) GetWindow(streamKey string) (*DVRWindow, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	window, exists := s.windows[streamKey]
	return window, exists
}
