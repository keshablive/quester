package streaming

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"time"
)

// Transcoder handles FFmpeg transcoding from RTMP to HLS with multiple resolutions
type Transcoder struct {
	config      *TranscoderConfig
	streamID    string
	inputURL    string
	outputDir   string
	ctx         context.Context
	cancel      context.CancelFunc
	cmd         *exec.Cmd
	mu          sync.Mutex
	isRunning   bool
	startTime   time.Time
	segmentChan chan string // Channel for segment notifications
}

// TranscoderConfig holds FFmpeg transcoder configuration
type TranscoderConfig struct {
	FFmpegPath  string   // Path to FFmpeg binary (default: "ffmpeg")
	OutputDir   string   // Base directory for HLS output
	Resolutions []string // e.g., ["1080p", "720p", "480p", "360p"]
	SegmentTime int      // Segment duration in seconds (default: 6)
	MaxSegments int      // Max segments per playlist (default: 5)
	GOP         int      // Group of Pictures size (default: 60 for 2s at 30fps)
	VideoCodec  string   // Video codec (default: "libx264")
	AudioCodec  string   // Audio codec (default: "aac")
	Preset      string   // FFmpeg preset (default: "veryfast")
}

// Resolution profile defines encoding parameters for each quality level
type ResolutionProfile struct {
	Name         string // e.g., "1080p"
	Width        int    // Video width in pixels
	Height       int    // Video height in pixels
	VideoBitrate string // e.g., "5000k"
	AudioBitrate string // e.g., "128k"
	MaxRate      string // Maximum bitrate for buffer
	BufSize      string // Buffer size
}

// Default resolution profiles
var defaultProfiles = []ResolutionProfile{
	{
		Name:         "1080p",
		Width:        1920,
		Height:       1080,
		VideoBitrate: "5000k",
		AudioBitrate: "128k",
		MaxRate:      "5350k",
		BufSize:      "7500k",
	},
	{
		Name:         "720p",
		Width:        1280,
		Height:       720,
		VideoBitrate: "3000k",
		AudioBitrate: "128k",
		MaxRate:      "3210k",
		BufSize:      "4500k",
	},
	{
		Name:         "480p",
		Width:        854,
		Height:       480,
		VideoBitrate: "1500k",
		AudioBitrate: "96k",
		MaxRate:      "1605k",
		BufSize:      "2250k",
	},
	{
		Name:         "360p",
		Width:        640,
		Height:       360,
		VideoBitrate: "800k",
		AudioBitrate: "96k",
		MaxRate:      "856k",
		BufSize:      "1200k",
	},
}

// NewTranscoder creates a new FFmpeg transcoder instance
func NewTranscoder(config *TranscoderConfig, streamID string, inputURL string) (*Transcoder, error) {
	// Set defaults
	if config.FFmpegPath == "" {
		config.FFmpegPath = "ffmpeg"
	}
	if config.SegmentTime == 0 {
		config.SegmentTime = 6
	}
	if config.MaxSegments == 0 {
		config.MaxSegments = 5
	}
	if config.GOP == 0 {
		config.GOP = 60 // 2 seconds at 30fps
	}
	if config.VideoCodec == "" {
		config.VideoCodec = "libx264"
	}
	if config.AudioCodec == "" {
		config.AudioCodec = "aac"
	}
	if config.Preset == "" {
		config.Preset = "veryfast"
	}
	if len(config.Resolutions) == 0 {
		config.Resolutions = []string{"1080p", "720p", "480p", "360p"}
	}

	// Create output directory for this stream
	outputDir := filepath.Join(config.OutputDir, streamID)
	if err := os.MkdirAll(outputDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create output directory: %w", err)
	}

	ctx, cancel := context.WithCancel(context.Background())

	return &Transcoder{
		config:      config,
		streamID:    streamID,
		inputURL:    inputURL,
		outputDir:   outputDir,
		ctx:         ctx,
		cancel:      cancel,
		segmentChan: make(chan string, 100),
	}, nil
}

// Start starts the FFmpeg transcoding process
func (t *Transcoder) Start() error {
	t.mu.Lock()
	defer t.mu.Unlock()

	if t.isRunning {
		return fmt.Errorf("transcoder already running")
	}

	// Build FFmpeg command
	args := t.buildFFmpegArgs()

	// Create command
	t.cmd = exec.CommandContext(t.ctx, t.config.FFmpegPath, args...)
	t.cmd.Dir = t.outputDir

	// Capture output for debugging
	t.cmd.Stdout = os.Stdout
	t.cmd.Stderr = os.Stderr

	// Start FFmpeg process
	if err := t.cmd.Start(); err != nil {
		return fmt.Errorf("failed to start FFmpeg: %w", err)
	}

	t.isRunning = true
	t.startTime = time.Now()

	fmt.Printf("Transcoder started: stream=%s, pid=%d\n", t.streamID, t.cmd.Process.Pid)

	// Monitor process in background
	go t.monitorProcess()

	return nil
}

// Stop stops the transcoding process
func (t *Transcoder) Stop() error {
	t.mu.Lock()
	defer t.mu.Unlock()

	if !t.isRunning {
		return nil
	}

	fmt.Printf("Stopping transcoder: stream=%s\n", t.streamID)

	// Cancel context (will terminate FFmpeg)
	t.cancel()

	// Wait for process to exit (with timeout)
	done := make(chan error, 1)
	go func() {
		done <- t.cmd.Wait()
	}()

	select {
	case err := <-done:
		if err != nil && err.Error() != "signal: killed" {
			fmt.Printf("FFmpeg exited with error: %v\n", err)
		}
	case <-time.After(5 * time.Second):
		// Force kill if not stopped
		if t.cmd.Process != nil {
			t.cmd.Process.Kill()
		}
	}

	t.isRunning = false
	close(t.segmentChan)

	duration := time.Since(t.startTime)
	fmt.Printf("Transcoder stopped: stream=%s, duration=%s\n", t.streamID, duration)

	return nil
}

// buildFFmpegArgs builds the FFmpeg command arguments for adaptive bitrate streaming
func (t *Transcoder) buildFFmpegArgs() []string {
	args := []string{
		"-i", t.inputURL, // Input RTMP stream
		"-c:v", t.config.VideoCodec, // Video codec
		"-c:a", t.config.AudioCodec, // Audio codec
		"-preset", t.config.Preset, // Encoding speed preset
		"-g", fmt.Sprintf("%d", t.config.GOP), // GOP size
		"-sc_threshold", "0", // Disable scene change detection
		"-keyint_min", fmt.Sprintf("%d", t.config.GOP), // Minimum keyframe interval
		"-hls_time", fmt.Sprintf("%d", t.config.SegmentTime), // Segment duration
		"-hls_list_size", fmt.Sprintf("%d", t.config.MaxSegments), // Playlist size
		"-hls_flags", "delete_segments+append_list", // Delete old segments, append to playlist
		"-hls_segment_type", "mpegts", // Segment type
		"-hls_segment_filename", filepath.Join(t.outputDir, "segment_%v_%%d.ts"), // Segment naming
		"-f", "hls", // Output format
	}

	// Get active resolution profiles
	profiles := t.getActiveProfiles()

	// Build filter_complex for multiple resolutions
	var filterComplex []string
	var varStreamMap []string

	for i, profile := range profiles {
		// Video filter: scale and set keyframes
		filterComplex = append(filterComplex,
			fmt.Sprintf("[0:v]scale=%d:%d,setsar=1[v%d]", profile.Width, profile.Height, i))

		// Audio filter: copy audio stream
		filterComplex = append(filterComplex, fmt.Sprintf("[0:a]aresample=48000[a%d]", i))

		// Map video and audio streams
		varStreamMap = append(varStreamMap,
			fmt.Sprintf("v:%d,a:%d,name:%s", i, i, profile.Name))

		// Add stream-specific encoding options
		args = append(args,
			"-map", fmt.Sprintf("[v%d]", i),
			fmt.Sprintf("-b:v:%d", i), profile.VideoBitrate,
			fmt.Sprintf("-maxrate:v:%d", i), profile.MaxRate,
			fmt.Sprintf("-bufsize:v:%d", i), profile.BufSize,
			"-map", fmt.Sprintf("[a%d]", i),
			fmt.Sprintf("-b:a:%d", i), profile.AudioBitrate,
		)
	}

	// Add filter_complex
	args = append(args, "-filter_complex", strings.Join(filterComplex, ";"))

	// Add var_stream_map for HLS variants
	args = append(args, "-var_stream_map", strings.Join(varStreamMap, " "))

	// Master playlist
	args = append(args, "-master_pl_name", "master.m3u8")

	// Output path pattern (one playlist per resolution)
	args = append(args, filepath.Join(t.outputDir, "stream_%v.m3u8"))

	return args
}

// getActiveProfiles returns resolution profiles based on config
func (t *Transcoder) getActiveProfiles() []ResolutionProfile {
	var profiles []ResolutionProfile

	for _, res := range t.config.Resolutions {
		for _, profile := range defaultProfiles {
			if profile.Name == res {
				profiles = append(profiles, profile)
				break
			}
		}
	}

	// If no matches, return all default profiles
	if len(profiles) == 0 {
		profiles = defaultProfiles
	}

	return profiles
}

// monitorProcess monitors the FFmpeg process and handles errors
func (t *Transcoder) monitorProcess() {
	err := t.cmd.Wait()

	t.mu.Lock()
	t.isRunning = false
	t.mu.Unlock()

	if err != nil && t.ctx.Err() == nil {
		// Process crashed unexpectedly
		fmt.Printf("FFmpeg process crashed: stream=%s, error=%v\n", t.streamID, err)
		// TODO: Notify error handler or attempt restart
	}
}

// IsRunning returns whether the transcoder is currently running
func (t *Transcoder) IsRunning() bool {
	t.mu.Lock()
	defer t.mu.Unlock()
	return t.isRunning
}

// GetOutputDir returns the output directory path
func (t *Transcoder) GetOutputDir() string {
	return t.outputDir
}

// GetMasterPlaylistPath returns the path to the master HLS playlist
func (t *Transcoder) GetMasterPlaylistPath() string {
	return filepath.Join(t.outputDir, "master.m3u8")
}

// GetSegmentChannel returns the channel for segment notifications
func (t *Transcoder) GetSegmentChannel() <-chan string {
	return t.segmentChan
}

// GetStats returns transcoding statistics
func (t *Transcoder) GetStats() map[string]interface{} {
	t.mu.Lock()
	defer t.mu.Unlock()

	stats := map[string]interface{}{
		"stream_id":  t.streamID,
		"is_running": t.isRunning,
		"output_dir": t.outputDir,
	}

	if t.isRunning {
		stats["uptime"] = time.Since(t.startTime).String()
	}

	return stats
}

// Cleanup removes all output files for this stream
func (t *Transcoder) Cleanup() error {
	if t.isRunning {
		if err := t.Stop(); err != nil {
			return err
		}
	}

	// Remove output directory
	if err := os.RemoveAll(t.outputDir); err != nil {
		return fmt.Errorf("failed to cleanup output directory: %w", err)
	}

	fmt.Printf("Transcoder cleanup complete: stream=%s\n", t.streamID)
	return nil
}
