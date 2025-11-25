package services

import (
	"fmt"
	"path/filepath"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/yourusername/quester/internal/framework/streaming"
	"github.com/yourusername/quester/internal/models"
)

// VideoStreamService handles video streaming business logic
type VideoStreamService struct {
	db           *gorm.DB
	rtmpServer   *streaming.RTMPServer
	streamConfig *StreamingConfig
}

// StreamingConfig holds streaming configuration
type StreamingConfig struct {
	RTMPBaseURL string // Base URL for RTMP ingest (e.g., "rtmp://stream.example.com")
	CDNBaseURL  string // CDN base URL for playback (e.g., "https://cdn.example.com")
	OutputDir   string // Base directory for HLS output
	S3Bucket    string // S3 bucket name
	S3Region    string // S3 region
	S3AccessKey string // S3 access key
	S3SecretKey string // S3 secret key
	FFmpegPath  string // Path to FFmpeg binary
}

// NewVideoStreamService creates a new video stream service
func NewVideoStreamService(db *gorm.DB, config *StreamingConfig) (*VideoStreamService, error) {
	// Create RTMP server
	rtmpConfig := &streaming.RTMPServerConfig{
		Addr: ":1935",
		DB:   db,
		TranscoderConfig: &streaming.TranscoderConfig{
			FFmpegPath:  config.FFmpegPath,
			OutputDir:   config.OutputDir,
			Resolutions: []string{"1080p", "720p", "480p", "360p"},
			SegmentTime: 6,
			MaxSegments: 5,
		},
		UploaderConfig: &streaming.HLSUploaderConfig{
			S3Bucket:    config.S3Bucket,
			S3Region:    config.S3Region,
			S3AccessKey: config.S3AccessKey,
			S3SecretKey: config.S3SecretKey,
			CDNBaseURL:  config.CDNBaseURL,
			KeyPrefix:   "streams/",
		},
		DVRConfig: &streaming.DVRConfig{
			MaxSegments: 1200, // 2 hours at 6 seconds per segment
			SegmentTime: 6,
			StorageDir:  config.OutputDir,
		},
	}

	rtmpServer, err := streaming.NewRTMPServer(rtmpConfig)
	if err != nil {
		return nil, fmt.Errorf("failed to create RTMP server: %w", err)
	}

	service := &VideoStreamService{
		db:           db,
		rtmpServer:   rtmpServer,
		streamConfig: config,
	}

	// Set RTMP callbacks
	authHandler := streaming.NewRTMPAuthHandler(db)
	rtmpServer.SetPublishCallbacks(
		authHandler.HandlePublishStart,
		authHandler.HandlePublishEnd,
	)

	return service, nil
}

// StartRTMPServer starts the RTMP server
func (s *VideoStreamService) StartRTMPServer() error {
	return s.rtmpServer.Start()
}

// StopRTMPServer stops the RTMP server
func (s *VideoStreamService) StopRTMPServer() error {
	return s.rtmpServer.Stop()
}

// CreateStream creates a new video stream
func (s *VideoStreamService) CreateStream(tenantID, creatorID uuid.UUID, input CreateStreamInput) (*models.VideoStream, error) {
	// Validate input
	if input.Title == "" {
		return nil, fmt.Errorf("title is required")
	}

	if input.StreamType != models.StreamTypeLive && input.StreamType != models.StreamTypeVOD {
		return nil, fmt.Errorf("invalid stream type: %s", input.StreamType)
	}

	// Create stream record
	stream := &models.VideoStream{
		TenantID:    tenantID.String(),
		CreatorID:   creatorID.String(),
		Title:       input.Title,
		Description: input.Description,
		StreamType:  input.StreamType,
		Status:      models.StreamStatusPending,
		DVREnabled:  input.DVREnabled,
		DVRWindow:   input.DVRWindow,
		ScheduledAt: input.ScheduledAt,
	}

	// BeforeCreate hook will generate stream key and set defaults
	if err := s.db.Create(stream).Error; err != nil {
		return nil, fmt.Errorf("failed to create stream: %w", err)
	}

	return stream, nil
}

// CreateStreamInput holds input for creating a stream
type CreateStreamInput struct {
	Title       string
	Description string
	StreamType  models.StreamType
	DVREnabled  bool
	DVRWindow   int
	ScheduledAt *time.Time
}

// GetStream retrieves a stream by ID
func (s *VideoStreamService) GetStream(streamID uuid.UUID) (*models.VideoStream, error) {
	var stream models.VideoStream
	if err := s.db.Where("id = ? AND deleted_at IS NULL", streamID).First(&stream).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("stream not found")
		}
		return nil, fmt.Errorf("database error: %w", err)
	}

	return &stream, nil
}

// GetStreamWithPlaybackURL retrieves a stream and generates playback URL with signature
func (s *VideoStreamService) GetStreamWithPlaybackURL(streamID uuid.UUID, token string) (*models.VideoStream, string, error) {
	stream, err := s.GetStream(streamID)
	if err != nil {
		return nil, "", err
	}

	// Generate playback URL
	playbackURL := stream.GetPlaybackURL(s.streamConfig.CDNBaseURL, token)

	return stream, playbackURL, nil
}

// ListStreams lists streams with filters
func (s *VideoStreamService) ListStreams(tenantID uuid.UUID, filters StreamFilters) ([]*models.VideoStream, int64, error) {
	query := s.db.Where("tenant_id = ? AND deleted_at IS NULL", tenantID)

	// Apply filters
	if filters.CreatorID != nil {
		query = query.Where("creator_id = ?", *filters.CreatorID)
	}
	if filters.StreamType != nil {
		query = query.Where("stream_type = ?", *filters.StreamType)
	}
	if filters.Status != nil {
		query = query.Where("status = ?", *filters.Status)
	}

	// Count total
	var total int64
	if err := query.Model(&models.VideoStream{}).Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("failed to count streams: %w", err)
	}

	// Get streams
	var streams []*models.VideoStream
	query = query.Order("created_at DESC")

	if filters.Limit > 0 {
		query = query.Limit(filters.Limit)
	}
	if filters.Offset > 0 {
		query = query.Offset(filters.Offset)
	}

	if err := query.Find(&streams).Error; err != nil {
		return nil, 0, fmt.Errorf("failed to fetch streams: %w", err)
	}

	return streams, total, nil
}

// StreamFilters holds filters for listing streams
type StreamFilters struct {
	CreatorID  *uuid.UUID
	StreamType *models.StreamType
	Status     *models.StreamStatus
	Limit      int
	Offset     int
}

// StartStream starts a stream (called when broadcaster connects via RTMP)
func (s *VideoStreamService) StartStream(streamID uuid.UUID) error {
	stream, err := s.GetStream(streamID)
	if err != nil {
		return err
	}

	// Verify stream can start
	if !stream.CanStartStreaming() {
		return fmt.Errorf("stream cannot start (status: %s)", stream.Status)
	}

	// Mark as live
	stream.MarkAsLive()
	if err := s.db.Save(stream).Error; err != nil {
		return fmt.Errorf("failed to update stream status: %w", err)
	}

	// Start transcoding pipeline
	if err := s.startTranscodingPipeline(stream); err != nil {
		// Mark as error
		stream.MarkAsError()
		s.db.Save(stream)
		return fmt.Errorf("failed to start transcoding: %w", err)
	}

	return nil
}

// EndStream ends a stream
func (s *VideoStreamService) EndStream(streamID uuid.UUID) error {
	stream, err := s.GetStream(streamID)
	if err != nil {
		return err
	}

	// Mark as ended
	stream.MarkAsEnded()
	if err := s.db.Save(stream).Error; err != nil {
		return fmt.Errorf("failed to update stream status: %w", err)
	}

	// Stop transcoding pipeline
	if err := s.stopTranscodingPipeline(stream); err != nil {
		return fmt.Errorf("failed to stop transcoding: %w", err)
	}

	return nil
}

// startTranscodingPipeline starts the transcoding pipeline for a stream
func (s *VideoStreamService) startTranscodingPipeline(stream *models.VideoStream) error {
	// Get RTMP session
	session, exists := s.rtmpServer.GetStream(stream.ID)
	if !exists {
		return fmt.Errorf("RTMP session not found")
	}

	// Create output directory
	outputDir := filepath.Join(s.streamConfig.OutputDir, stream.ID)

	// Create transcoder
	transcoderConfig := &streaming.TranscoderConfig{
		FFmpegPath:  s.streamConfig.FFmpegPath,
		OutputDir:   s.streamConfig.OutputDir,
		Resolutions: []string{"1080p", "720p", "480p", "360p"},
		SegmentTime: 6,
		MaxSegments: 5,
	}

	transcoder, err := streaming.NewTranscoder(transcoderConfig, stream.ID, stream.GetIngestURL(s.streamConfig.RTMPBaseURL))
	if err != nil {
		return fmt.Errorf("failed to create transcoder: %w", err)
	}

	// Create HLS uploader
	uploaderConfig := &streaming.HLSUploaderConfig{
		S3Bucket:    s.streamConfig.S3Bucket,
		S3Region:    s.streamConfig.S3Region,
		S3AccessKey: s.streamConfig.S3AccessKey,
		S3SecretKey: s.streamConfig.S3SecretKey,
		CDNBaseURL:  s.streamConfig.CDNBaseURL,
		WatchDir:    outputDir,
		KeyPrefix:   "streams/",
	}

	uploader, err := streaming.NewHLSUploader(uploaderConfig, stream.ID)
	if err != nil {
		return fmt.Errorf("failed to create uploader: %w", err)
	}

	// Create DVR manager (if enabled)
	var dvrManager *streaming.DVRManager
	if stream.DVREnabled {
		dvrConfig := &streaming.DVRConfig{
			MaxSegments: stream.DVRWindow / 6, // DVRWindow is in seconds, segments are 6s each
			SegmentTime: 6,
			StorageDir:  s.streamConfig.OutputDir,
		}

		dvrManager, err = streaming.NewDVRManager(dvrConfig, stream.ID)
		if err != nil {
			return fmt.Errorf("failed to create DVR manager: %w", err)
		}

		if err := dvrManager.Start(); err != nil {
			return fmt.Errorf("failed to start DVR manager: %w", err)
		}
	}

	// Start transcoder
	if err := transcoder.Start(); err != nil {
		return fmt.Errorf("failed to start transcoder: %w", err)
	}

	// Start uploader
	if err := uploader.Start(); err != nil {
		transcoder.Stop()
		return fmt.Errorf("failed to start uploader: %w", err)
	}

	// Store in session
	session.Transcoder = transcoder
	session.HLSUploader = uploader
	session.DVRManager = dvrManager

	return nil
}

// stopTranscodingPipeline stops the transcoding pipeline for a stream
func (s *VideoStreamService) stopTranscodingPipeline(stream *models.VideoStream) error {
	// Get RTMP session
	session, exists := s.rtmpServer.GetStream(stream.ID)
	if !exists {
		// Session already cleaned up
		return nil
	}

	// Stop transcoder
	if session.Transcoder != nil {
		if err := session.Transcoder.Stop(); err != nil {
			return fmt.Errorf("failed to stop transcoder: %w", err)
		}
	}

	// Stop uploader
	if session.HLSUploader != nil {
		if err := session.HLSUploader.Stop(); err != nil {
			return fmt.Errorf("failed to stop uploader: %w", err)
		}
	}

	// Stop DVR manager
	if session.DVRManager != nil {
		if err := session.DVRManager.Stop(); err != nil {
			return fmt.Errorf("failed to stop DVR manager: %w", err)
		}
	}

	return nil
}

// UpdateViewerCount updates the viewer count for a stream
func (s *VideoStreamService) UpdateViewerCount(streamID uuid.UUID, count int) error {
	stream, err := s.GetStream(streamID)
	if err != nil {
		return err
	}

	// Update viewer count
	stream.UpdateViewerCount(count)

	if err := s.db.Save(stream).Error; err != nil {
		return fmt.Errorf("failed to update viewer count: %w", err)
	}

	return nil
}

// GetActiveStreams returns all currently live streams
func (s *VideoStreamService) GetActiveStreams(tenantID uuid.UUID) ([]*models.VideoStream, error) {
	var streams []*models.VideoStream

	err := s.db.Where("tenant_id = ? AND status = ? AND deleted_at IS NULL", tenantID, models.StreamStatusLive).
		Order("viewer_count DESC").
		Find(&streams).Error

	if err != nil {
		return nil, fmt.Errorf("failed to fetch active streams: %w", err)
	}

	return streams, nil
}

// GetStreamStats returns statistics for a stream
func (s *VideoStreamService) GetStreamStats(streamID uuid.UUID) (map[string]interface{}, error) {
	stream, err := s.GetStream(streamID)
	if err != nil {
		return nil, err
	}

	stats := map[string]interface{}{
		"id":           stream.ID,
		"title":        stream.Title,
		"status":       stream.Status,
		"stream_type":  stream.StreamType,
		"viewer_count": stream.ViewerCount,
		"peak_viewers": stream.PeakViewers,
		"total_views":  stream.TotalViews,
		"duration":     stream.Duration,
		"dvr_enabled":  stream.DVREnabled,
		"dvr_window":   stream.DVRWindow,
	}

	// Add RTMP session stats if live
	if stream.IsLive() {
		session, exists := s.rtmpServer.GetStream(stream.ID)
		if exists {
			stats["bytes_in"] = session.BytesIn
			stats["bytes_out"] = session.BytesOut
			stats["uptime"] = time.Since(session.StartedAt).Seconds()

			if session.Transcoder != nil {
				stats["transcoder"] = session.Transcoder.GetStats()
			}
			if session.HLSUploader != nil {
				stats["uploader"] = session.HLSUploader.GetStats()
			}
			if session.DVRManager != nil {
				stats["dvr"] = session.DVRManager.GetStats()
			}
		}
	}

	return stats, nil
}

// DeleteStream soft deletes a stream
func (s *VideoStreamService) DeleteStream(streamID uuid.UUID) error {
	stream, err := s.GetStream(streamID)
	if err != nil {
		return err
	}

	// Stop stream if live
	if stream.IsLive() {
		if err := s.EndStream(streamID); err != nil {
			return fmt.Errorf("failed to end stream: %w", err)
		}
	}

	// Soft delete
	if err := s.db.Delete(stream).Error; err != nil {
		return fmt.Errorf("failed to delete stream: %w", err)
	}

	return nil
}

// CleanupExpiredStreams deletes streams past their retention period
func (s *VideoStreamService) CleanupExpiredStreams() error {
	// Find expired streams
	var expiredStreams []*models.VideoStream
	err := s.db.Where("retention_until IS NOT NULL AND retention_until < ? AND deleted_at IS NULL", time.Now()).
		Find(&expiredStreams).Error

	if err != nil {
		return fmt.Errorf("failed to find expired streams: %w", err)
	}

	if len(expiredStreams) == 0 {
		fmt.Println("No expired streams to cleanup")
		return nil
	}

	fmt.Printf("Cleaning up %d expired streams\n", len(expiredStreams))

	// Delete each stream
	for _, stream := range expiredStreams {
		// Delete S3 files
		uploaderConfig := &streaming.HLSUploaderConfig{
			S3Bucket:    s.streamConfig.S3Bucket,
			S3Region:    s.streamConfig.S3Region,
			S3AccessKey: s.streamConfig.S3AccessKey,
			S3SecretKey: s.streamConfig.S3SecretKey,
			CDNBaseURL:  s.streamConfig.CDNBaseURL,
			KeyPrefix:   "streams/",
		}

		uploader, err := streaming.NewHLSUploader(uploaderConfig, stream.ID)
		if err != nil {
			fmt.Printf("Failed to create uploader for cleanup: stream=%s, error=%v\n", stream.ID, err)
			continue
		}

		if err := uploader.DeleteStream(); err != nil {
			fmt.Printf("Failed to delete S3 files: stream=%s, error=%v\n", stream.ID, err)
		}

		// Delete database record
		if err := s.db.Delete(stream).Error; err != nil {
			fmt.Printf("Failed to delete stream record: stream=%s, error=%v\n", stream.ID, err)
			continue
		}

		fmt.Printf("Cleaned up expired stream: %s\n", stream.ID)
	}

	return nil
}
