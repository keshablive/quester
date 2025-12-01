package service

import (
	"fmt"
	"os/exec"
)

// FFmpegService provides helpers for generating ffmpeg commands and starting processes.
type FFmpegService struct {
	BinaryPath string // path to ffmpeg binary, default "ffmpeg"
}

// NewFFmpegService creates a new FFmpegService
func NewFFmpegService(binaryPath string) *FFmpegService {
	if binaryPath == "" {
		binaryPath = "ffmpeg"
	}
	return &FFmpegService{BinaryPath: binaryPath}
}

// Variant represents an output quality ladder variant
type Variant struct {
	Name         string // e.g., "1080p"
	Width        int
	Height       int
	VideoBitrate string // e.g., "4000k"
	AudioBitrate string // e.g., "128k"
}

// GenerateFFmpegArgs builds ffmpeg arguments for a single variant HLS output
// input - input URL (rtmp:// or file)
// outputPath - directory or output prefix for HLS files
// variant - desired output variant
func GenerateFFmpegArgs(input, outputPath string, variant Variant) []string {
	// Example args (simplified):
	// ffmpeg -i <input> -c:v libx264 -b:v 4000k -vf scale=1920:1080 -c:a aac -b:a 128k -f hls -hls_time 6 -hls_list_size 0 <outputPath>/1080p.m3u8
	args := []string{"-i", input}
	// Video codec and bitrate
	args = append(args, "-c:v", "libx264", "-b:v", variant.VideoBitrate)
	// Scaling
	scale := fmt.Sprintf("scale=%d:%d", variant.Width, variant.Height)
	args = append(args, "-vf", scale)
	// Audio codec
	args = append(args, "-c:a", "aac", "-b:a", variant.AudioBitrate)
	// HLS flags
	args = append(args, "-f", "hls", "-hls_time", "6", "-hls_list_size", "0")
	// Output playlist
	playlist := fmt.Sprintf("%s/%s.m3u8", outputPath, variant.Name)
	args = append(args, playlist)
	return args
}

// StartTranscode constructs an *exec.Cmd for ffmpeg with the given args but does not start it.
// This allows tests to inspect the command without requiring ffmpeg to be present.
func (s *FFmpegService) StartTranscode(args []string) (*exec.Cmd, error) {
	if s.BinaryPath == "" {
		s.BinaryPath = "ffmpeg"
	}
	cmd := exec.Command(s.BinaryPath, args...)
	return cmd, nil
}
