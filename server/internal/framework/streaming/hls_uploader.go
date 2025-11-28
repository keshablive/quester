package streaming

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/credentials"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/s3"
	"github.com/fsnotify/fsnotify"
)

// HLSUploader handles uploading HLS segments and playlists to S3
type HLSUploader struct {
	config    *HLSUploaderConfig
	streamID  string
	s3Client  *s3.S3
	watcher   *fsnotify.Watcher
	ctx       context.Context
	cancel    context.CancelFunc
	wg        sync.WaitGroup
	mu        sync.Mutex
	isRunning bool

	// Statistics
	uploadedFiles     int64
	uploadedBytes     int64
	uploadedSegments  int64
	uploadedPlaylists int64
}

// HLSUploaderConfig holds S3 uploader configuration
type HLSUploaderConfig struct {
	S3Bucket      string // S3 bucket name
	S3Region      string // S3 region (e.g., "us-east-1")
	S3AccessKey   string // S3 access key ID
	S3SecretKey   string // S3 secret access key
	S3Endpoint    string // Custom S3 endpoint (optional, for S3-compatible services)
	CDNBaseURL    string // CloudFront/CDN base URL for playback
	WatchDir      string // Directory to watch for HLS files
	KeyPrefix     string // S3 key prefix (e.g., "streams/")
	ACL           string // S3 ACL (default: "public-read")
	CacheControl  string // Cache-Control header (default: "max-age=3600")
	UploadWorkers int    // Number of concurrent upload workers (default: 4)
}

// NewHLSUploader creates a new HLS uploader instance
func NewHLSUploader(config *HLSUploaderConfig, streamID string) (*HLSUploader, error) {
	// Set defaults
	if config.ACL == "" {
		config.ACL = "public-read"
	}
	if config.CacheControl == "" {
		config.CacheControl = "max-age=3600"
	}
	if config.UploadWorkers == 0 {
		config.UploadWorkers = 4
	}
	if config.KeyPrefix == "" {
		config.KeyPrefix = "streams/"
	}

	// Create AWS session
	awsConfig := &aws.Config{
		Region:      aws.String(config.S3Region),
		Credentials: credentials.NewStaticCredentials(config.S3AccessKey, config.S3SecretKey, ""),
	}

	// Use custom endpoint if provided (for S3-compatible services)
	if config.S3Endpoint != "" {
		awsConfig.Endpoint = aws.String(config.S3Endpoint)
		awsConfig.S3ForcePathStyle = aws.Bool(true)
	}

	sess, err := session.NewSession(awsConfig)
	if err != nil {
		return nil, fmt.Errorf("failed to create AWS session: %w", err)
	}

	s3Client := s3.New(sess)

	// Create file watcher
	watcher, err := fsnotify.NewWatcher()
	if err != nil {
		return nil, fmt.Errorf("failed to create file watcher: %w", err)
	}

	ctx, cancel := context.WithCancel(context.Background())

	return &HLSUploader{
		config:   config,
		streamID: streamID,
		s3Client: s3Client,
		watcher:  watcher,
		ctx:      ctx,
		cancel:   cancel,
	}, nil
}

// Start starts watching for HLS files to upload
func (h *HLSUploader) Start() error {
	h.mu.Lock()
	defer h.mu.Unlock()

	if h.isRunning {
		return fmt.Errorf("uploader already running")
	}

	// Add watch directory
	if err := h.watcher.Add(h.config.WatchDir); err != nil {
		return fmt.Errorf("failed to watch directory: %w", err)
	}

	h.isRunning = true

	// Start file watcher
	h.wg.Add(1)
	go h.watchFiles()

	fmt.Printf("HLS uploader started: stream=%s, watch_dir=%s\n", h.streamID, h.config.WatchDir)

	return nil
}

// Stop stops the uploader
func (h *HLSUploader) Stop() error {
	h.mu.Lock()
	defer h.mu.Unlock()

	if !h.isRunning {
		return nil
	}

	fmt.Printf("Stopping HLS uploader: stream=%s\n", h.streamID)

	// Cancel context
	h.cancel()

	// Close watcher
	h.watcher.Close()

	// Wait for goroutines
	h.wg.Wait()

	h.isRunning = false

	fmt.Printf("HLS uploader stopped: stream=%s, files=%d, bytes=%d\n",
		h.streamID, h.uploadedFiles, h.uploadedBytes)

	return nil
}

// watchFiles monitors the watch directory for new HLS files
func (h *HLSUploader) watchFiles() {
	defer h.wg.Done()

	// Upload existing files on startup
	h.uploadExistingFiles()

	// Watch for new files
	for {
		select {
		case <-h.ctx.Done():
			return

		case event, ok := <-h.watcher.Events:
			if !ok {
				return
			}

			// Handle file creation/write events
			if event.Op&fsnotify.Create == fsnotify.Create || event.Op&fsnotify.Write == fsnotify.Write {
				// Check if it's an HLS file (.m3u8 or .ts)
				if h.isHLSFile(event.Name) {
					// Wait briefly for file to be fully written
					time.Sleep(100 * time.Millisecond)

					// Upload file
					if err := h.uploadFile(event.Name); err != nil {
						fmt.Printf("Upload failed: file=%s, error=%v\n", event.Name, err)
					}
				}
			}

		case err, ok := <-h.watcher.Errors:
			if !ok {
				return
			}
			fmt.Printf("Watcher error: %v\n", err)
		}
	}
}

// uploadExistingFiles uploads all existing HLS files in the watch directory
func (h *HLSUploader) uploadExistingFiles() {
	files, err := os.ReadDir(h.config.WatchDir)
	if err != nil {
		fmt.Printf("Failed to read watch directory: %v\n", err)
		return
	}

	for _, file := range files {
		if file.IsDir() {
			continue
		}

		filePath := filepath.Join(h.config.WatchDir, file.Name())
		if h.isHLSFile(filePath) {
			if err := h.uploadFile(filePath); err != nil {
				fmt.Printf("Upload failed: file=%s, error=%v\n", filePath, err)
			}
		}
	}
}

// isHLSFile checks if a file is an HLS file (.m3u8 or .ts)
func (h *HLSUploader) isHLSFile(filePath string) bool {
	ext := strings.ToLower(filepath.Ext(filePath))
	return ext == ".m3u8" || ext == ".ts"
}

// uploadFile uploads a single file to S3
func (h *HLSUploader) uploadFile(filePath string) error {
	// Read file
	file, err := os.Open(filePath)
	if err != nil {
		return fmt.Errorf("failed to open file: %w", err)
	}
	defer file.Close()

	// Read file contents
	var buf bytes.Buffer
	size, err := io.Copy(&buf, file)
	if err != nil {
		return fmt.Errorf("failed to read file: %w", err)
	}

	// Get file info
	fileName := filepath.Base(filePath)
	contentType := h.getContentType(fileName)

	// Build S3 key
	s3Key := fmt.Sprintf("%s%s/%s", h.config.KeyPrefix, h.streamID, fileName)

	// Upload to S3
	_, err = h.s3Client.PutObject(&s3.PutObjectInput{
		Bucket:       aws.String(h.config.S3Bucket),
		Key:          aws.String(s3Key),
		Body:         bytes.NewReader(buf.Bytes()),
		ContentType:  aws.String(contentType),
		ACL:          aws.String(h.config.ACL),
		CacheControl: aws.String(h.getCacheControl(fileName)),
	})

	if err != nil {
		return fmt.Errorf("failed to upload to S3: %w", err)
	}

	// Update statistics
	h.mu.Lock()
	h.uploadedFiles++
	h.uploadedBytes += size
	if strings.HasSuffix(fileName, ".ts") {
		h.uploadedSegments++
	} else if strings.HasSuffix(fileName, ".m3u8") {
		h.uploadedPlaylists++
	}
	h.mu.Unlock()

	fmt.Printf("Uploaded: file=%s, size=%d, key=%s\n", fileName, size, s3Key)

	return nil
}

// getContentType returns the content type for a file
func (h *HLSUploader) getContentType(fileName string) string {
	ext := strings.ToLower(filepath.Ext(fileName))
	switch ext {
	case ".m3u8":
		return "application/vnd.apple.mpegurl"
	case ".ts":
		return "video/mp2t"
	default:
		return "application/octet-stream"
	}
}

// getCacheControl returns the cache control header for a file
func (h *HLSUploader) getCacheControl(fileName string) string {
	// Playlists change frequently, use shorter cache
	if strings.HasSuffix(fileName, ".m3u8") {
		if strings.Contains(fileName, "master") {
			return "max-age=60" // Master playlist: 1 minute
		}
		return "max-age=6" // Variant playlists: 6 seconds (1 segment duration)
	}

	// Segments are immutable, use longer cache
	if strings.HasSuffix(fileName, ".ts") {
		return "max-age=31536000" // 1 year
	}

	return h.config.CacheControl
}

// GetPlaybackURL returns the CDN URL for the master playlist
func (h *HLSUploader) GetPlaybackURL() string {
	return fmt.Sprintf("%s/%s%s/master.m3u8",
		strings.TrimSuffix(h.config.CDNBaseURL, "/"),
		h.config.KeyPrefix,
		h.streamID)
}

// GetStats returns uploader statistics
func (h *HLSUploader) GetStats() map[string]interface{} {
	h.mu.Lock()
	defer h.mu.Unlock()

	return map[string]interface{}{
		"stream_id":          h.streamID,
		"is_running":         h.isRunning,
		"uploaded_files":     h.uploadedFiles,
		"uploaded_bytes":     h.uploadedBytes,
		"uploaded_segments":  h.uploadedSegments,
		"uploaded_playlists": h.uploadedPlaylists,
	}
}

// DeleteStream deletes all files for this stream from S3
func (h *HLSUploader) DeleteStream() error {
	// List all objects with the stream prefix
	prefix := fmt.Sprintf("%s%s/", h.config.KeyPrefix, h.streamID)

	listInput := &s3.ListObjectsV2Input{
		Bucket: aws.String(h.config.S3Bucket),
		Prefix: aws.String(prefix),
	}

	// Collect all object keys
	var objectKeys []*s3.ObjectIdentifier

	err := h.s3Client.ListObjectsV2Pages(listInput, func(page *s3.ListObjectsV2Output, lastPage bool) bool {
		for _, obj := range page.Contents {
			objectKeys = append(objectKeys, &s3.ObjectIdentifier{
				Key: obj.Key,
			})
		}
		return !lastPage // Continue pagination
	})

	if err != nil {
		return fmt.Errorf("failed to list S3 objects: %w", err)
	}

	if len(objectKeys) == 0 {
		fmt.Printf("No files to delete for stream: %s\n", h.streamID)
		return nil
	}

	// Delete objects (batch delete up to 1000 at a time)
	deleteInput := &s3.DeleteObjectsInput{
		Bucket: aws.String(h.config.S3Bucket),
		Delete: &s3.Delete{
			Objects: objectKeys,
			Quiet:   aws.Bool(true),
		},
	}

	_, err = h.s3Client.DeleteObjects(deleteInput)
	if err != nil {
		return fmt.Errorf("failed to delete S3 objects: %w", err)
	}

	fmt.Printf("Deleted %d files from S3 for stream: %s\n", len(objectKeys), h.streamID)

	return nil
}

// UploadThumbnail uploads a thumbnail image for the stream
func (h *HLSUploader) UploadThumbnail(thumbnailPath string) (string, error) {
	// Read thumbnail
	file, err := os.Open(thumbnailPath)
	if err != nil {
		return "", fmt.Errorf("failed to open thumbnail: %w", err)
	}
	defer file.Close()

	var buf bytes.Buffer
	if _, err := io.Copy(&buf, file); err != nil {
		return "", fmt.Errorf("failed to read thumbnail: %w", err)
	}

	// Build S3 key
	ext := filepath.Ext(thumbnailPath)
	s3Key := fmt.Sprintf("%s%s/thumbnail%s", h.config.KeyPrefix, h.streamID, ext)

	// Upload to S3
	_, err = h.s3Client.PutObject(&s3.PutObjectInput{
		Bucket:       aws.String(h.config.S3Bucket),
		Key:          aws.String(s3Key),
		Body:         bytes.NewReader(buf.Bytes()),
		ContentType:  aws.String("image/jpeg"),
		ACL:          aws.String(h.config.ACL),
		CacheControl: aws.String("max-age=86400"), // 24 hours
	})

	if err != nil {
		return "", fmt.Errorf("failed to upload thumbnail: %w", err)
	}

	// Return CDN URL
	thumbnailURL := fmt.Sprintf("%s/%s",
		strings.TrimSuffix(h.config.CDNBaseURL, "/"),
		s3Key)

	fmt.Printf("Uploaded thumbnail: stream=%s, url=%s\n", h.streamID, thumbnailURL)

	return thumbnailURL, nil
}
