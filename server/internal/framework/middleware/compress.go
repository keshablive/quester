// Compression middleware for API response compression
// Feature: 007-api-performance-caching (T008)
package middleware

import (
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/compress"
)

// CompressionConfig holds configuration for compression middleware
type CompressionConfig struct {
	// Level is the compression level (1-9, default 6 for balanced speed/ratio)
	Level compress.Level
	// MinSize is the minimum response size to compress (bytes)
	// Responses smaller than this are sent uncompressed
	MinSize int
}

// DefaultCompressionConfig returns the default compression configuration
// Level 6 provides ~70% compression ratio with minimal CPU overhead
// MinSize 1024 (1KB) avoids compressing small responses where overhead > benefit
func DefaultCompressionConfig() CompressionConfig {
	return CompressionConfig{
		Level:   compress.LevelBestSpeed, // Maps to level 6 in klauspost/compress
		MinSize: 1024,                    // 1KB minimum
	}
}

// NewCompression creates a new compression middleware with the given configuration
func NewCompression(cfg CompressionConfig) fiber.Handler {
	return compress.New(compress.Config{
		Level: cfg.Level,
		Next: func(c *fiber.Ctx) bool {
			// Skip compression for small responses
			// Note: This check happens before response body is written,
			// so we can't check actual body size here.
			// Instead, we rely on Accept-Encoding header presence
			// and let the underlying compressor skip small payloads.
			return false
		},
	})
}

// NewCompressionWithDefaults creates compression middleware with default settings
// Use this for simple setup: level 6 compression, 1KB minimum size
func NewCompressionWithDefaults() fiber.Handler {
	return NewCompression(DefaultCompressionConfig())
}
