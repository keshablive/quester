package service

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/google/uuid"
	"github.com/keshablive/quester/internal/framework/cache"
	"github.com/keshablive/quester/internal/framework/interfaces"
	"github.com/keshablive/quester/internal/models"
	"github.com/keshablive/quester/internal/framework/repository"

	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
)

// LeaderboardService handles leaderboard ranking operations
// Uses Redis sorted sets as primary data source for real-time rankings
// Database is for persistence, historical queries, and backup
type LeaderboardService struct {
	BaseService
	leaderboardRepo     interfaces.LeaderboardRepository
	leaderboardRepoImpl *repository.LeaderboardRepository // For custom methods like BulkUpsert
	userRepo            *repository.UserRepository
}

// NewLeaderboardService creates a new leaderboard service
func NewLeaderboardService(
	db *gorm.DB,
	logger *slog.Logger,
	redisClient *cache.PooledRedisClient,
	leaderboardRepo interfaces.LeaderboardRepository,
	leaderboardRepoImpl *repository.LeaderboardRepository,
	userRepo *repository.UserRepository,
) *LeaderboardService {
	return &LeaderboardService{
		BaseService:         NewBaseService(db, logger, redisClient, nil),
		leaderboardRepo:     leaderboardRepo,
		leaderboardRepoImpl: leaderboardRepoImpl,
		userRepo:            userRepo,
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
		err := s.GetCache().Client().ZAdd(ctx, key, redis.Z{
			Score:  float64(metricValue),
			Member: member,
		}).Err()
		if err != nil {
			return fmt.Errorf("failed to update rank in Redis key %s: %w", key, err)
		}

		// Set expiration on monthly keys (45 days to keep historical data)
		if isMonthlyKey(key) {
			s.GetCache().Client().Expire(ctx, key, 45*24*time.Hour)
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
	results, err := s.GetCache().Client().ZRevRangeWithScores(ctx, key, 0, int64(limit-1)).Result()
	if err != nil {
		return nil, fmt.Errorf("failed to get top N from Redis: %w", err)
	}

	// Convert Redis results to LeaderboardEntry
	entries := make([]models.LeaderboardEntry, 0, len(results))

	// T026: Collect all user IDs first to do batch lookup (fixes N+1)
	userIDs := make([]uuid.UUID, 0, len(results))
	userIDToResult := make(map[uuid.UUID]struct {
		rank  int
		score float64
	})

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

		userIDs = append(userIDs, userID)
		userIDToResult[userID] = struct {
			rank  int
			score float64
		}{rank: i + 1, score: result.Score}
	}

	// Batch fetch all users in single query (T026: N+1 fix)
	users, err := s.userRepo.FindByIDs(ctx, tenantID, userIDs)
	if err != nil {
		return nil, fmt.Errorf("failed to batch fetch users: %w", err)
	}

	// Build user map for O(1) lookup
	userMap := make(map[uuid.UUID]*models.User)
	for i := range users {
		userMap[users[i].ID] = &users[i]
	}

	// Build entries maintaining rank order
	for _, userID := range userIDs {
		user, exists := userMap[userID]
		if !exists {
			// Skip users that no longer exist
			continue
		}

		resultData := userIDToResult[userID]

		// Get avatar URL if available
		avatarURL := ""
		if user.Avatar != nil {
			avatarURL = *user.Avatar
		}

		entry := models.LeaderboardEntry{
			Rank:        resultData.rank,
			UserID:      userID,
			Username:    user.Username,
			Avatar:      avatarURL,
			MetricValue: int(resultData.score),
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
	score, err := s.GetCache().Client().ZScore(ctx, key, member).Result()
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
	rank, err := s.GetCache().Client().ZRevRank(ctx, key, member).Result()
	if err != nil {
		return nil, fmt.Errorf("failed to get user rank from Redis: %w", err)
	}

	// Get total users in leaderboard
	totalUsers, err := s.GetCache().Client().ZCard(ctx, key).Result()
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
	if err := s.leaderboardRepoImpl.BulkUpsert(ctx, leaderboards); err != nil {
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
		if err := s.GetCache().Client().Del(ctx, key).Err(); err != nil {
			return fmt.Errorf("failed to invalidate cache key %s: %w", key, err)
		}
	}
	return nil
}

// SocialLeaderboardCategory is the category identifier for social XP leaderboards
const SocialLeaderboardCategory = "social"

// UpdateSocialLeaderboard updates a user's position in the social XP leaderboard
// T055: Called after XP is awarded for social actions (posts, likes, comments, etc.)
func (s *LeaderboardService) UpdateSocialLeaderboard(
	ctx context.Context,
	tenantID uuid.UUID,
	userID uuid.UUID,
	totalSocialXP int,
) error {
	// Update rank in the social category leaderboard
	return s.UpdateRank(ctx, tenantID, userID, models.LeaderboardTypeCategory, SocialLeaderboardCategory, totalSocialXP)
}

// GetSocialLeaderboard retrieves the social XP leaderboard
// T055: Returns top users by social XP with optional period filter
func (s *LeaderboardService) GetSocialLeaderboard(
	ctx context.Context,
	tenantID uuid.UUID,
	period models.LeaderboardPeriod,
	limit int,
) ([]models.LeaderboardEntry, error) {
	return s.GetTopN(ctx, tenantID, models.LeaderboardTypeCategory, period, SocialLeaderboardCategory, limit)
}

// GetUserSocialRank retrieves a user's position in the social XP leaderboard
// T055: Returns user's rank, XP, and percentile in social leaderboard
func (s *LeaderboardService) GetUserSocialRank(
	ctx context.Context,
	tenantID uuid.UUID,
	userID uuid.UUID,
	period models.LeaderboardPeriod,
) (*models.UserLeaderboardPosition, error) {
	return s.GetUserRank(ctx, tenantID, userID, models.LeaderboardTypeCategory, period, SocialLeaderboardCategory)
}
