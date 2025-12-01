// Token blacklist service using Redis
package service

import (
	"context"
	"fmt"
	"math"
	"time"

	"github.com/gofiber/fiber/v2/log"
	"github.com/keshablive/quester/internal/framework/interfaces"
	"github.com/redis/go-redis/v9"
)

// Compile-time interface check: BlacklistService implements interfaces.TokenBlacklist
var _ interfaces.TokenBlacklist = (*BlacklistService)(nil)

// BlacklistService manages token blacklisting in Redis
// Implements FR-001: Complete BlacklistService Implementation
type BlacklistService struct {
	cache          *redis.Client
	maxRetries     int
	baseRetryDelay time.Duration
}

// NewBlacklistService creates a new blacklist service instance
// T103: Now accepts Redis client for dependency injection (eliminates global state)
func NewBlacklistService(cacheClient *redis.Client) *BlacklistService {
	return &BlacklistService{
		cache:          cacheClient,
		maxRetries:     3,
		baseRetryDelay: 100 * time.Millisecond,
	}
}

// AddToBlacklist adds a token hash to the blacklist with the specified TTL
// Key pattern: "blacklist:{token_hash}"
// Value: "1" (presence indicates blacklisted)
// TTL: Typically 30 days (2592000 seconds) to match refresh token expiry
// T106: Implements FR-028: Token blacklist storage with retry logic and structured logging
func (s *BlacklistService) AddToBlacklist(tokenHash string, ttl time.Duration) error {
	if tokenHash == "" {
		return fmt.Errorf("token hash cannot be empty")
	}

	// Redis key pattern for consistency
	key := fmt.Sprintf("blacklist:%s", tokenHash)
	ctx := context.Background()

	// T109: Retry logic with exponential backoff
	var lastErr error
	for attempt := 0; attempt <= s.maxRetries; attempt++ {
		if attempt > 0 {
			// Exponential backoff: 100ms, 200ms, 400ms
			delay := time.Duration(math.Pow(2, float64(attempt-1))) * s.baseRetryDelay

			// T108: Structured logging for retry
			log.Warnf("[BlacklistService] Retry attempt %d/%d after %v delay (token: %s)",
				attempt, s.maxRetries, delay, tokenHash[:min(8, len(tokenHash))])

			time.Sleep(delay)
		}

		// Store with TTL - value is "1" for simplicity
		err := s.cache.Set(ctx, key, "1", ttl).Err()
		if err == nil {
			// T108: Structured logging for success
			if attempt > 0 {
				log.Infof("[BlacklistService] Successfully blacklisted token after %d retries (ttl: %v)",
					attempt, ttl)
			}
			return nil
		}

		lastErr = err

		// T108: Structured logging for failure
		log.Errorf("[BlacklistService] Failed to blacklist token (attempt %d/%d): %v",
			attempt+1, s.maxRetries+1, err)
	}

	// All retries exhausted
	return fmt.Errorf("failed to add token to Redis blacklist after %d retries: %w",
		s.maxRetries, lastErr)
}

// IsBlacklistedSimple checks if a token hash is in the blacklist (legacy method)
// Returns true if blacklisted, false otherwise
// Fail open: Returns false on Redis errors to prioritize availability
// T105: Implements FR-029: Reject blacklisted tokens with structured logging and retry
// NOTE: This is the legacy method kept for backward compatibility with AuthService
func (s *BlacklistService) IsBlacklistedSimple(tokenHash string) bool {
	if tokenHash == "" {
		return false
	}

	// Redis key pattern
	key := fmt.Sprintf("blacklist:%s", tokenHash)
	ctx := context.Background()

	// T109: Retry logic for read operations
	var lastErr error
	for attempt := 0; attempt <= s.maxRetries; attempt++ {
		if attempt > 0 {
			// Exponential backoff
			delay := time.Duration(math.Pow(2, float64(attempt-1))) * s.baseRetryDelay
			time.Sleep(delay)
		}

		result, err := s.cache.Exists(ctx, key).Result()
		if err == nil {
			// Success
			return result > 0
		}

		lastErr = err
	}

	// T108: Structured logging for Redis failure (fail open)
	log.Warnf("[BlacklistService] Redis check failed after %d retries, failing open (token: %s, error: %v)",
		s.maxRetries, tokenHash[:min(8, len(tokenHash))], lastErr)

	// Fail open: If Redis is down, allow the request
	// Database revoked_at check is still enforced
	// This prioritizes availability over perfect security
	return false
}

// CleanupExpiredTokens performs manual cleanup of expired tokens
// T107: Note - Redis TTL handles automatic expiration, so manual cleanup is optional
// This method exists for monitoring/metrics purposes
func (s *BlacklistService) CleanupExpiredTokens() (int, error) {
	// Redis automatically removes expired keys via TTL
	// No manual cleanup needed - this is a no-op for compatibility

	// T108: Structured logging
	log.Info("[BlacklistService] Cleanup called - Redis TTL handles expiration automatically")

	return 0, nil
}

// RemoveFromBlacklist removes a token from the blacklist (for testing)
// Not typically used in production since TTL handles expiry
func (s *BlacklistService) RemoveFromBlacklist(tokenHash string) error {
	if tokenHash == "" {
		return fmt.Errorf("token hash cannot be empty")
	}

	key := fmt.Sprintf("blacklist:%s", tokenHash)
	ctx := context.Background()

	return s.cache.Del(ctx, key).Err()
}

// Helper function for min
func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

// ===========================================================================
// Framework TokenBlacklist Interface Implementation
// These methods implement interfaces.TokenBlacklist from framework layer
// ===========================================================================

// Blacklist implements interfaces.TokenBlacklist.Blacklist
// Adds a token to the blacklist with expiration time
func (s *BlacklistService) Blacklist(ctx context.Context, tokenHash string, expiresAt time.Time) error {
	// Calculate TTL from expiresAt
	ttl := time.Until(expiresAt)
	if ttl <= 0 {
		// Token already expired, use minimum TTL to allow cleanup
		ttl = time.Minute
	}
	return s.AddToBlacklist(tokenHash, ttl)
}

// IsBlacklisted implements interfaces.TokenBlacklist.IsBlacklisted
// This is the context-aware version that returns an error for framework interface compliance
func (s *BlacklistService) IsBlacklisted(ctx context.Context, tokenHash string) (bool, error) {
	if tokenHash == "" {
		return false, nil
	}

	// Redis key pattern
	key := fmt.Sprintf("blacklist:%s", tokenHash)

	// T109: Retry logic for read operations
	var lastErr error
	for attempt := 0; attempt <= s.maxRetries; attempt++ {
		if attempt > 0 {
			// Exponential backoff
			delay := time.Duration(math.Pow(2, float64(attempt-1))) * s.baseRetryDelay

			select {
			case <-ctx.Done():
				return false, ctx.Err()
			case <-time.After(delay):
			}
		}

		result, err := s.cache.Exists(ctx, key).Result()
		if err == nil {
			return result > 0, nil
		}

		lastErr = err
	}

	// Return error instead of failing open for interface compliance
	return false, fmt.Errorf("failed to check blacklist after %d retries: %w", s.maxRetries, lastErr)
}

// CleanupExpired implements interfaces.TokenBlacklist.CleanupExpired
func (s *BlacklistService) CleanupExpired(ctx context.Context) error {
	// Redis automatically removes expired keys via TTL
	// This is effectively a no-op but logs for monitoring
	log.Info("[BlacklistService] Cleanup called - Redis TTL handles expiration automatically")
	return nil
}
