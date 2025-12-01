package service

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/keshablive/quester/internal/framework/metrics"
	"github.com/keshablive/quester/internal/repositories"
	"gorm.io/gorm"
)

// TokenCleanupService handles periodic cleanup of expired refresh tokens
type TokenCleanupService struct {
	refreshTokenRepo *repositories.RefreshTokenRepository
}

// NewTokenCleanupService creates a new token cleanup service
func NewTokenCleanupService(refreshTokenRepo *repositories.RefreshTokenRepository) *TokenCleanupService {
	return &TokenCleanupService{
		refreshTokenRepo: refreshTokenRepo,
	}
}

// CleanupExpiredTokens removes all expired refresh tokens from the database
func (s *TokenCleanupService) CleanupExpiredTokens(ctx context.Context) (int64, error) {
	count, err := s.refreshTokenRepo.DeleteExpiredTokens(ctx)
	if err != nil {
		return 0, fmt.Errorf("failed to delete expired tokens: %w", err)
	}
	return count, nil
}

// StartCleanupScheduler starts a background goroutine that periodically cleans up expired tokens
// It runs every 24 hours by default
func (s *TokenCleanupService) StartCleanupScheduler(ctx context.Context, interval time.Duration) {
	ticker := time.NewTicker(interval)
	go func() {
		// Run cleanup immediately on startup
		s.runCleanup(ctx)

		// Then run on schedule
		for {
			select {
			case <-ticker.C:
				s.runCleanup(ctx)
			case <-ctx.Done():
				ticker.Stop()
				log.Println("Token cleanup scheduler stopped")
				return
			}
		}
	}()
	log.Printf("Token cleanup scheduler started (interval: %v)", interval)
}

// runCleanup executes the cleanup operation and logs the results
func (s *TokenCleanupService) runCleanup(ctx context.Context) {
	log.Println("Starting token cleanup...")
	startTime := time.Now()

	count, err := s.CleanupExpiredTokens(ctx)
	if err != nil {
		log.Printf("Token cleanup failed: %v", err)
		metrics.IncTokenCleanupErrors()
		return
	}

	duration := time.Since(startTime)
	log.Printf("Token cleanup completed: %d expired tokens deleted in %v", count, duration)

	// Update Prometheus metrics (T083)
	metrics.SetTokenCleanupLastRun(float64(time.Now().Unix()))
	metrics.AddTokenCleanupDeleted(float64(count))
}

// Convenience function to create and start cleanup scheduler
func StartTokenCleanup(ctx context.Context, db *gorm.DB, interval time.Duration) {
	refreshTokenRepo := repositories.NewRefreshTokenRepository(db)
	service := NewTokenCleanupService(refreshTokenRepo)
	service.StartCleanupScheduler(ctx, interval)
}
