package config

import (
	"context"
	"fmt"
	"os"
	"strconv"
	"time"

	"github.com/redis/go-redis/v9"
)

// RedisConfig holds Redis configuration settings
// CONSTITUTION: Performance First - 15min default TTL, connection pooling
type RedisConfig struct {
	Host            string
	Port            int
	Password        string
	DB              int
	MaxRetries      int
	PoolSize        int
	MinIdleConns    int
	MaxIdleConns    int
	ConnMaxLifetime time.Duration
	DefaultTTL      time.Duration

	// Cache-specific TTLs by category
	SessionTTL      time.Duration
	UserCacheTTL    time.Duration
	QuestCacheTTL   time.Duration
	LeaderboardTTL  time.Duration
	ContentCacheTTL time.Duration
}

// DefaultRedisConfig returns constitution-compliant Redis settings
func DefaultRedisConfig() *RedisConfig {
	return &RedisConfig{
		Host:            getEnv("REDIS_HOST", "localhost"),
		Port:            getEnvInt("REDIS_PORT", 6379),
		Password:        getEnv("REDIS_PASSWORD", ""),
		DB:              getEnvInt("REDIS_DB", 0),
		MaxRetries:      3,
		PoolSize:        100, // Max active connections
		MinIdleConns:    10,  // Keep warm connections
		MaxIdleConns:    20,  // Max idle connections
		ConnMaxLifetime: 30 * time.Minute,

		// CONSTITUTION: 15min default TTL for cached data
		DefaultTTL:      15 * time.Minute,
		SessionTTL:      24 * time.Hour,   // JWT sessions
		UserCacheTTL:    15 * time.Minute, // User profiles
		QuestCacheTTL:   30 * time.Minute, // Quest data (less frequent changes)
		LeaderboardTTL:  5 * time.Minute,  // Leaderboards (frequent updates)
		ContentCacheTTL: 60 * time.Minute, // Static content
	}
}

var (
	// Global Redis client instance
	RedisClient *redis.Client

	// Cache key prefixes by tenant
	cachePrefixes = map[string]string{
		"user":        "usr",
		"quest":       "qst",
		"leaderboard": "ldb",
		"content":     "cnt",
		"session":     "ses",
		"analytics":   "anl",
	}
)

// InitRedis initializes the Redis client with connection pooling
func InitRedis() error {
	cfg := DefaultRedisConfig()

	RedisClient = redis.NewClient(&redis.Options{
		Addr:            fmt.Sprintf("%s:%d", cfg.Host, cfg.Port),
		Password:        cfg.Password,
		DB:              cfg.DB,
		MaxRetries:      cfg.MaxRetries,
		PoolSize:        cfg.PoolSize,
		MinIdleConns:    cfg.MinIdleConns,
		ConnMaxIdleTime: cfg.ConnMaxLifetime,

		// Connection timeouts
		DialTimeout:  5 * time.Second,
		ReadTimeout:  3 * time.Second,
		WriteTimeout: 3 * time.Second,

		// Pool timeout
		PoolTimeout: 4 * time.Second,
	})

	// Test connection
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := RedisClient.Ping(ctx).Err(); err != nil {
		return fmt.Errorf("failed to connect to Redis: %w", err)
	}

	return nil
}

// CloseRedis closes the Redis connection
func CloseRedis() error {
	if RedisClient != nil {
		return RedisClient.Close()
	}
	return nil
}

// CacheKey generates a tenant-scoped cache key
// Format: {prefix}:t:{tenant_id}:{id}
// Example: usr:t:abc123:user:456
func CacheKey(tenantID string, prefix string, id string) string {
	shortPrefix, ok := cachePrefixes[prefix]
	if !ok {
		shortPrefix = prefix
	}
	return fmt.Sprintf("%s:t:%s:%s", shortPrefix, tenantID, id)
}

// GlobalCacheKey generates a global (non-tenant) cache key
// Format: {prefix}:g:{id}
// Example: anl:g:system-stats
func GlobalCacheKey(prefix string, id string) string {
	shortPrefix, ok := cachePrefixes[prefix]
	if !ok {
		shortPrefix = prefix
	}
	return fmt.Sprintf("%s:g:%s", shortPrefix, id)
}

// GetTTL returns the appropriate TTL for a cache key prefix
func GetTTL(prefix string) time.Duration {
	cfg := DefaultRedisConfig()

	switch prefix {
	case "session":
		return cfg.SessionTTL
	case "user":
		return cfg.UserCacheTTL
	case "quest":
		return cfg.QuestCacheTTL
	case "leaderboard":
		return cfg.LeaderboardTTL
	case "content":
		return cfg.ContentCacheTTL
	default:
		return cfg.DefaultTTL
	}
}

// Helper functions

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intValue, err := strconv.Atoi(value); err == nil {
			return intValue
		}
	}
	return defaultValue
}

// Cache helpers for common operations

// SetCache stores a value in Redis with tenant scoping and TTL
func SetCache(ctx context.Context, tenantID, prefix, id, value string) error {
	key := CacheKey(tenantID, prefix, id)
	ttl := GetTTL(prefix)
	return RedisClient.Set(ctx, key, value, ttl).Err()
}

// GetCache retrieves a value from Redis cache
func GetCache(ctx context.Context, tenantID, prefix, id string) (string, error) {
	key := CacheKey(tenantID, prefix, id)
	return RedisClient.Get(ctx, key).Result()
}

// DeleteCache removes a value from Redis cache
func DeleteCache(ctx context.Context, tenantID, prefix, id string) error {
	key := CacheKey(tenantID, prefix, id)
	return RedisClient.Del(ctx, key).Err()
}

// InvalidateCachePattern removes all keys matching a pattern
// Example: InvalidateCachePattern(ctx, "usr:t:abc123:*") removes all user cache for tenant abc123
func InvalidateCachePattern(ctx context.Context, pattern string) error {
	iter := RedisClient.Scan(ctx, 0, pattern, 0).Iterator()
	for iter.Next(ctx) {
		if err := RedisClient.Del(ctx, iter.Val()).Err(); err != nil {
			return err
		}
	}
	return iter.Err()
}
