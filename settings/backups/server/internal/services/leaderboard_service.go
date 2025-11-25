package services

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/yourusername/quester/internal/framework/cache"
	"github.com/yourusername/quester/internal/models"
	"github.com/yourusername/quester/internal/repositories"

	"github.com/redis/go-redis/v9"
)

// LeaderboardService handles leaderboard ranking operations
// Uses Redis sorted sets as primary data source for real-time rankings
// Database is for persistence, historical queries, and backup
type LeaderboardService struct {
	leaderboardRepo *repositories.LeaderboardRepository
	userRepo        *repositories.UserRepository
	redisClient     *cache.PooledRedisClient
}

// NewLeaderboardService creates a new leaderboard service
func NewLeaderboardService(
	leaderboardRepo *repositories.LeaderboardRepository,
	userRepo *repositories.UserRepository,
	redisClient *cache.PooledRedisClient,
) *LeaderboardService {
	return &LeaderboardService{
		leaderboardRepo: leaderboardRepo,
		userRepo:        userRepo,
		redisClient:     redisClient,
	}
}

// UpdateRank updates a user's rank in specified leaderboard(s)
// Called whenever user's metric changes (XP gain, quest completion, etc.)
func (s *LeaderboardService) UpdateRank(
	ctx context.Context,
	tenantID uuid.UUID,
	userID uuid.UUID,
	leaderboardType models.LeaderboardType,
	category string,
	metricValue int,
) error {
	// Generate Redis key(s) for this leaderboard
	keys := s.generateRedisKeys(tenantID, leaderboardType, category)

	// Update rank in each leaderboard (all-time and monthly)
	for _, key := range keys {
		// Use ZADD to add/update user score in sorted set
		// Higher scores = higher rank (Redis sorts in ascending order by default)
		member := fmt.Sprintf("user:%s", userID.String())
		err := s.redisClient.Client().ZAdd(ctx, key, redis.Z{
			Score:  float64(metricValue),
			Member: member,
		}).Err()
		if err != nil {
			return fmt.Errorf("failed to update rank in Redis key %s: %w", key, err)
		}

		// Set expiration on monthly keys (45 days to keep historical data)
		if isMonthlyKey(key) {
			s.redisClient.Client().Expire(ctx, key, 45*24*time.Hour)
		}
	}

	return nil
}

// GetTopN retrieves the top N users from a leaderboard
// Returns ranked entries with user info
func (s *LeaderboardService) GetTopN(
	ctx context.Context,
	tenantID uuid.UUID,
	leaderboardType models.LeaderboardType,
	period models.LeaderboardPeriod,
	category string,
	limit int,
) ([]models.LeaderboardEntry, error) {
	// Validate limit
	if limit <= 0 {
		limit = 20 // Default
	}
	if limit > 100 {
		limit = 100 // Max
	}

	// Generate Redis key
	key := s.buildRedisKey(tenantID, leaderboardType, period, category)

	// Get top N from Redis sorted set (descending order - highest scores first)
	// ZREVRANGE returns members in descending score order
	results, err := s.redisClient.Client().ZRevRangeWithScores(ctx, key, 0, int64(limit-1)).Result()
	if err != nil {
		return nil, fmt.Errorf("failed to get top N from Redis: %w", err)
	}

	// Convert Redis results to LeaderboardEntry
	entries := make([]models.LeaderboardEntry, 0, len(results))
	for i, result := range results {
		userIDStr := result.Member.(string)
		// Extract UUID from "user:uuid-here" format
		var userIDString string
		fmt.Sscanf(userIDStr, "user:%s", &userIDString)

		// Parse UUID
		userID, err := uuid.Parse(userIDString)
		if err != nil {
			// Skip invalid UUIDs
			continue
		}

		// Get user info from database
		user, err := s.userRepo.FindByID(ctx, userID)
		if err != nil {
			// Skip users that no longer exist
			continue
		}

		// Get avatar URL if available
		avatarURL := ""
		if user.Avatar != nil {
			avatarURL = *user.Avatar
		}

		entry := models.LeaderboardEntry{
			Rank:        i + 1, // 1-based rank
			UserID:      userID,
			Username:    user.Username,
			Avatar:      avatarURL,
			MetricValue: int(result.Score),
			TenantID:    tenantID,
		}
		entries = append(entries, entry)
	}

	return entries, nil
}

// GetUserRank retrieves a specific user's position in a leaderboard
func (s *LeaderboardService) GetUserRank(
	ctx context.Context,
	tenantID uuid.UUID,
	userID uuid.UUID,
	leaderboardType models.LeaderboardType,
	period models.LeaderboardPeriod,
	category string,
) (*models.UserLeaderboardPosition, error) {
	// Generate Redis key
	key := s.buildRedisKey(tenantID, leaderboardType, period, category)
	member := fmt.Sprintf("user:%s", userID.String())

	// Get user's score
	score, err := s.redisClient.Client().ZScore(ctx, key, member).Result()
	if err == redis.Nil {
		// User not in leaderboard (0 XP or no activity)
		return &models.UserLeaderboardPosition{
			UserID:          userID,
			LeaderboardType: leaderboardType,
			Period:          period,
			PeriodKey:       s.getPeriodKey(period),
			Category:        category,
			Rank:            0,
			MetricValue:     0,
			TotalUsers:      0,
			Percentile:      0,
		}, nil
	} else if err != nil {
		return nil, fmt.Errorf("failed to get user score from Redis: %w", err)
	}

	// Get user's rank (ZREVRANK returns 0-based rank in descending order)
	rank, err := s.redisClient.Client().ZRevRank(ctx, key, member).Result()
	if err != nil {
		return nil, fmt.Errorf("failed to get user rank from Redis: %w", err)
	}

	// Get total users in leaderboard
	totalUsers, err := s.redisClient.Client().ZCard(ctx, key).Result()
	if err != nil {
		return nil, fmt.Errorf("failed to get total users from Redis: %w", err)
	}

	// Calculate percentile (0-100)
	var percentile int
	if totalUsers > 0 {
		percentile = 100 - int((float64(rank)/float64(totalUsers))*100)
	}

	position := &models.UserLeaderboardPosition{
		UserID:          userID,
		LeaderboardType: leaderboardType,
		Period:          period,
		PeriodKey:       s.getPeriodKey(period),
		Category:        category,
		Rank:            int(rank) + 1, // Convert to 1-based rank
		MetricValue:     int(score),
		TotalUsers:      int(totalUsers),
		Percentile:      percentile,
	}

	return position, nil
}

// ResetMonthlyLeaderboards resets monthly leaderboard data
// Called by cron job on the 1st of each month
func (s *LeaderboardService) ResetMonthlyLeaderboards(ctx context.Context) error {
	// Get previous month key for potential archival
	_ = time.Now().AddDate(0, -1, 0).Format("2006-01")

	// Archive previous month's data to database (optional)
	// This allows historical queries for past months
	// Implementation: Scan Redis keys, save to database, then delete

	// For now, Redis keys will naturally expire after 45 days
	// No explicit deletion needed

	return nil
}

// SyncToDatabase syncs Redis leaderboard data to database for persistence
// Can be called periodically (e.g., every 5 minutes) for backup
func (s *LeaderboardService) SyncToDatabase(
	ctx context.Context,
	tenantID uuid.UUID,
	leaderboardType models.LeaderboardType,
	period models.LeaderboardPeriod,
	category string,
) error {
	// Get top 1000 from Redis
	entries, err := s.GetTopN(ctx, tenantID, leaderboardType, period, category, 1000)
	if err != nil {
		return fmt.Errorf("failed to get leaderboard entries: %w", err)
	}

	// Batch insert/update to database
	leaderboards := make([]models.Leaderboard, 0, len(entries))
	for _, entry := range entries {
		leaderboard := models.Leaderboard{
			TenantID:        tenantID,
			UserID:          entry.UserID,
			LeaderboardType: leaderboardType,
			Period:          period,
			PeriodKey:       s.getPeriodKey(period),
			Category:        category,
			Rank:            entry.Rank,
			MetricValue:     entry.MetricValue,
			CachedAt:        time.Now(),
		}
		leaderboards = append(leaderboards, leaderboard)
	}

	// Use repository to batch upsert
	if err := s.leaderboardRepo.BulkUpsert(ctx, leaderboards); err != nil {
		return fmt.Errorf("failed to sync to database: %w", err)
	}

	return nil
}

// generateRedisKeys generates all Redis keys that need to be updated
// Returns both all-time and monthly keys
func (s *LeaderboardService) generateRedisKeys(
	tenantID uuid.UUID,
	leaderboardType models.LeaderboardType,
	category string,
) []string {
	keys := make([]string, 0, 2)

	// All-time key
	alltimeKey := s.buildRedisKey(tenantID, leaderboardType, models.LeaderboardPeriodAllTime, category)
	keys = append(keys, alltimeKey)

	// Monthly key
	monthlyKey := s.buildRedisKey(tenantID, leaderboardType, models.LeaderboardPeriodMonthly, category)
	keys = append(keys, monthlyKey)

	return keys
}

// buildRedisKey constructs a Redis key for a specific leaderboard
// Format: leaderboard:{tenantID}:{type}:{period}:{category}
// Examples:
//   - leaderboard:550e8400-e29b-41d4-a716-446655440000:global:alltime
//   - leaderboard:550e8400-e29b-41d4-a716-446655440000:global:monthly:2024-10
//   - leaderboard:550e8400-e29b-41d4-a716-446655440000:category:alltime:quest
//   - leaderboard:550e8400-e29b-41d4-a716-446655440000:category:monthly:2024-10:quest
func (s *LeaderboardService) buildRedisKey(
	tenantID uuid.UUID,
	leaderboardType models.LeaderboardType,
	period models.LeaderboardPeriod,
	category string,
) string {
	base := fmt.Sprintf("leaderboard:%s:%s", tenantID.String(), leaderboardType)

	if period == models.LeaderboardPeriodAllTime {
		// All-time key
		if leaderboardType == models.LeaderboardTypeCategory {
			return fmt.Sprintf("%s:alltime:%s", base, category)
		}
		return fmt.Sprintf("%s:alltime", base)
	} else {
		// Monthly key with current month
		month := time.Now().Format("2006-01")
		if leaderboardType == models.LeaderboardTypeCategory {
			return fmt.Sprintf("%s:monthly:%s:%s", base, month, category)
		}
		return fmt.Sprintf("%s:monthly:%s", base, month)
	}
}

// getPeriodKey returns the period key string for database storage
func (s *LeaderboardService) getPeriodKey(period models.LeaderboardPeriod) string {
	if period == models.LeaderboardPeriodAllTime {
		return "alltime"
	}
	return time.Now().Format("2006-01")
}

// isMonthlyKey checks if a Redis key is for a monthly leaderboard
func isMonthlyKey(key string) bool {
	return len(key) > 7 && key[len(key)-7:len(key)-5] == ":" && isDigit(key[len(key)-7])
}

// isDigit checks if a byte is a digit
func isDigit(b byte) bool {
	return b >= '0' && b <= '9'
}

// InvalidateCache invalidates cached leaderboard data in Redis
func (s *LeaderboardService) InvalidateCache(
	ctx context.Context,
	tenantID uuid.UUID,
	leaderboardType models.LeaderboardType,
	category string,
) error {
	keys := s.generateRedisKeys(tenantID, leaderboardType, category)
	for _, key := range keys {
		if err := s.redisClient.Client().Del(ctx, key).Err(); err != nil {
			return fmt.Errorf("failed to invalidate cache key %s: %w", key, err)
		}
	}
	return nil
}
