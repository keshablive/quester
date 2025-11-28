package streaming

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"
	"time"
)

// DVRManager handles DVR segment archival and cleanup
// Maintains a rolling window of segments for time-shift viewing
type DVRManager struct {
	config    *DVRConfig
	streamID  string
	ctx       context.Context
	cancel    context.CancelFunc
	wg        sync.WaitGroup
	mu        sync.Mutex
	isRunning bool

	// Segment tracking
	segments        []SegmentInfo
	totalSegments   int64
	deletedSegments int64
}

// DVRConfig holds DVR manager configuration
type DVRConfig struct {
	MaxSegments     int    // Maximum segments to keep (default: 1200 for 2 hours @ 6s)
	SegmentTime     int    // Segment duration in seconds (default: 6)
	StorageDir      string // Local storage directory for DVR segments
	S3Bucket        string // S3 bucket for DVR segments (optional)
	CleanupInterval int    // Cleanup check interval in seconds (default: 30)
}

// SegmentInfo holds information about a segment
type SegmentInfo struct {
	FileName  string
	FilePath  string
	Sequence  int
	Timestamp time.Time
	Size      int64
}

// NewDVRManager creates a new DVR manager instance
func NewDVRManager(config *DVRConfig, streamID string) (*DVRManager, error) {
	// Set defaults
	if config.MaxSegments == 0 {
		config.MaxSegments = 1200 // 2 hours at 6 seconds per segment
	}
	if config.SegmentTime == 0 {
		config.SegmentTime = 6
	}
	if config.CleanupInterval == 0 {
		config.CleanupInterval = 30
	}

	// Ensure storage directory exists
	streamDir := filepath.Join(config.StorageDir, streamID)
	if err := os.MkdirAll(streamDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create DVR storage directory: %w", err)
	}

	ctx, cancel := context.WithCancel(context.Background())

	return &DVRManager{
		config:   config,
		streamID: streamID,
		ctx:      ctx,
		cancel:   cancel,
		segments: make([]SegmentInfo, 0, config.MaxSegments),
	}, nil
}

// Start starts the DVR manager
func (d *DVRManager) Start() error {
	d.mu.Lock()
	defer d.mu.Unlock()

	if d.isRunning {
		return fmt.Errorf("DVR manager already running")
	}

	d.isRunning = true

	// Start cleanup worker
	d.wg.Add(1)
	go d.cleanupWorker()

	fmt.Printf("DVR manager started: stream=%s, max_segments=%d, window=%ds\n",
		d.streamID, d.config.MaxSegments, d.config.MaxSegments*d.config.SegmentTime)

	return nil
}

// Stop stops the DVR manager
func (d *DVRManager) Stop() error {
	d.mu.Lock()
	defer d.mu.Unlock()

	if !d.isRunning {
		return nil
	}

	fmt.Printf("Stopping DVR manager: stream=%s\n", d.streamID)

	// Cancel context
	d.cancel()

	// Wait for workers
	d.wg.Wait()

	d.isRunning = false

	fmt.Printf("DVR manager stopped: stream=%s, total=%d, deleted=%d\n",
		d.streamID, d.totalSegments, d.deletedSegments)

	return nil
}

// AddSegment registers a new segment
func (d *DVRManager) AddSegment(fileName string, filePath string) error {
	d.mu.Lock()
	defer d.mu.Unlock()

	// Get file info
	fileInfo, err := os.Stat(filePath)
	if err != nil {
		return fmt.Errorf("failed to stat segment file: %w", err)
	}

	// Extract sequence number from filename (e.g., "segment_720p_123.ts" -> 123)
	sequence := d.extractSequenceNumber(fileName)

	// Create segment info
	segment := SegmentInfo{
		FileName:  fileName,
		FilePath:  filePath,
		Sequence:  sequence,
		Timestamp: time.Now(),
		Size:      fileInfo.Size(),
	}

	// Add to list
	d.segments = append(d.segments, segment)
	d.totalSegments++

	// Sort by sequence
	sort.Slice(d.segments, func(i, j int) bool {
		return d.segments[i].Sequence < d.segments[j].Sequence
	})

	// Trigger cleanup if over limit
	if len(d.segments) > d.config.MaxSegments {
		d.cleanupOldSegments()
	}

	return nil
}

// cleanupWorker periodically checks and cleans up old segments
func (d *DVRManager) cleanupWorker() {
	defer d.wg.Done()

	ticker := time.NewTicker(time.Duration(d.config.CleanupInterval) * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-d.ctx.Done():
			return
		case <-ticker.C:
			d.mu.Lock()
			d.cleanupOldSegments()
			d.mu.Unlock()
		}
	}
}

// cleanupOldSegments removes segments beyond the DVR window
func (d *DVRManager) cleanupOldSegments() {
	if len(d.segments) <= d.config.MaxSegments {
		return
	}

	// Calculate how many segments to delete
	toDelete := len(d.segments) - d.config.MaxSegments

	// Get segments to delete (oldest first)
	deleteSegments := d.segments[:toDelete]

	// Delete files
	for _, segment := range deleteSegments {
		if err := os.Remove(segment.FilePath); err != nil && !os.IsNotExist(err) {
			fmt.Printf("Failed to delete DVR segment: %s, error=%v\n", segment.FilePath, err)
		} else {
			d.deletedSegments++
		}
	}

	// Remove from list
	d.segments = d.segments[toDelete:]

	fmt.Printf("DVR cleanup: stream=%s, deleted=%d segments, remaining=%d\n",
		d.streamID, toDelete, len(d.segments))
}

// extractSequenceNumber extracts sequence number from segment filename
func (d *DVRManager) extractSequenceNumber(fileName string) int {
	// Expected format: "segment_720p_123.ts" or "segment_123.ts"
	parts := strings.Split(fileName, "_")
	if len(parts) < 2 {
		return 0
	}

	// Last part should be sequence number
	lastPart := parts[len(parts)-1]
	seqStr := strings.TrimSuffix(lastPart, filepath.Ext(lastPart))

	var seq int
	fmt.Sscanf(seqStr, "%d", &seq)
	return seq
}

// GetSegments returns all current segments
func (d *DVRManager) GetSegments() []SegmentInfo {
	d.mu.Lock()
	defer d.mu.Unlock()

	// Return a copy to avoid race conditions
	segments := make([]SegmentInfo, len(d.segments))
	copy(segments, d.segments)
	return segments
}

// GetSegmentCount returns the number of segments in DVR window
func (d *DVRManager) GetSegmentCount() int {
	d.mu.Lock()
	defer d.mu.Unlock()
	return len(d.segments)
}

// GetDVRWindow returns the DVR window duration in seconds
func (d *DVRManager) GetDVRWindow() int {
	d.mu.Lock()
	defer d.mu.Unlock()
	return len(d.segments) * d.config.SegmentTime
}

// GetOldestSegment returns the oldest segment in the DVR window
func (d *DVRManager) GetOldestSegment() *SegmentInfo {
	d.mu.Lock()
	defer d.mu.Unlock()

	if len(d.segments) == 0 {
		return nil
	}

	return &d.segments[0]
}

// GetNewestSegment returns the newest segment in the DVR window
func (d *DVRManager) GetNewestSegment() *SegmentInfo {
	d.mu.Lock()
	defer d.mu.Unlock()

	if len(d.segments) == 0 {
		return nil
	}

	return &d.segments[len(d.segments)-1]
}

// GetStats returns DVR statistics
func (d *DVRManager) GetStats() map[string]interface{} {
	d.mu.Lock()
	defer d.mu.Unlock()

	var totalSize int64
	for _, segment := range d.segments {
		totalSize += segment.Size
	}

	return map[string]interface{}{
		"stream_id":        d.streamID,
		"is_running":       d.isRunning,
		"segment_count":    len(d.segments),
		"max_segments":     d.config.MaxSegments,
		"dvr_window":       len(d.segments) * d.config.SegmentTime,
		"total_segments":   d.totalSegments,
		"deleted_segments": d.deletedSegments,
		"storage_size":     totalSize,
	}
}

// CleanupAll removes all segments for this stream
func (d *DVRManager) CleanupAll() error {
	d.mu.Lock()
	defer d.mu.Unlock()

	streamDir := filepath.Join(d.config.StorageDir, d.streamID)

	// Delete all segment files
	for _, segment := range d.segments {
		if err := os.Remove(segment.FilePath); err != nil && !os.IsNotExist(err) {
			fmt.Printf("Failed to delete segment: %s, error=%v\n", segment.FilePath, err)
		}
	}

	// Remove stream directory
	if err := os.RemoveAll(streamDir); err != nil {
		return fmt.Errorf("failed to remove DVR directory: %w", err)
	}

	d.segments = make([]SegmentInfo, 0)

	fmt.Printf("DVR cleanup complete: stream=%s\n", d.streamID)

	return nil
}

// UpdatePlaylist updates the HLS playlist to reflect DVR window
// This modifies the playlist to include only segments in the DVR window
func (d *DVRManager) UpdatePlaylist(playlistPath string) error {
	d.mu.Lock()
	defer d.mu.Unlock()

	if len(d.segments) == 0 {
		return nil
	}

	// Read current playlist
	content, err := os.ReadFile(playlistPath)
	if err != nil {
		return fmt.Errorf("failed to read playlist: %w", err)
	}

	lines := strings.Split(string(content), "\n")
	var newLines []string

	// Keep header
	inHeader := true
	for _, line := range lines {
		if inHeader {
			newLines = append(newLines, line)
			if strings.HasPrefix(line, "#EXT-X-TARGETDURATION") {
				// Add DVR-specific tags
				newLines = append(newLines,
					"#EXT-X-PLAYLIST-TYPE:EVENT",
					fmt.Sprintf("#EXT-X-DVR-WINDOW:%d", d.GetDVRWindow()),
				)
				inHeader = false
			}
		} else if strings.HasPrefix(line, "#EXTINF") || strings.HasSuffix(line, ".ts") {
			// Include only segments in DVR window
			segmentName := filepath.Base(line)
			for _, segment := range d.segments {
				if segment.FileName == segmentName {
					newLines = append(newLines, line)
					break
				}
			}
		}
	}

	// Write updated playlist
	newContent := strings.Join(newLines, "\n")
	if err := os.WriteFile(playlistPath, []byte(newContent), 0644); err != nil {
		return fmt.Errorf("failed to write playlist: %w", err)
	}

	return nil
}
