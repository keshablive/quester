package cache

import (
	"context"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

// PooledRedisClient wraps go-redis client with production-grade connection pooling
// Use this for high-throughput scenarios (leaderboards, real-time features)
type PooledRedisClient struct {
	client *redis.Client
}

// PoolConfig holds advanced Redis connection pooling configuration
type PoolConfig struct {
	URL      string
	Password string
	DB       int

	// Connection pool settings (optimized for production)
	MaxRetries      int
	MinIdleConns    int           // Minimum idle connections (prevents cold starts)
	MaxIdleConns    int           // Maximum idle connections
	MaxActiveConns  int           // Maximum active connections (0 = unlimited)
	ConnMaxIdleTime time.Duration // Close idle connections after this duration
	ConnMaxLifetime time.Duration // Maximum connection lifetime

	// Timeouts
	DialTimeout  time.Duration
	ReadTimeout  time.Duration
	WriteTimeout time.Duration
}

// DefaultPoolConfig returns production-ready pool configuration
// Optimized for: 50-200 concurrent connections, high-throughput workloads
func DefaultPoolConfig() PoolConfig {
	return PoolConfig{
		URL:             "redis://localhost:6379/0",
		Password:        "",
		DB:              0,
		MaxRetries:      3,
		MinIdleConns:    10,  // Keep 10 connections warm
		MaxIdleConns:    50,  // Up to 50 idle connections
		MaxActiveConns:  200, // Max 200 concurrent connections
		ConnMaxIdleTime: 5 * time.Minute,
		ConnMaxLifetime: 30 * time.Minute,
		DialTimeout:     5 * time.Second,
		ReadTimeout:     3 * time.Second,
		WriteTimeout:    3 * time.Second,
	}
}

// NewPooledRedisClient creates a Redis client with advanced connection pooling
func NewPooledRedisClient(cfg PoolConfig) (*PooledRedisClient, error) {
	opts, err := redis.ParseURL(cfg.URL)
	if err != nil {
		return nil, fmt.Errorf("failed to parse Redis URL: %w", err)
	}

	// Apply pool configuration
	opts.Password = cfg.Password
	opts.DB = cfg.DB
	opts.MaxRetries = cfg.MaxRetries
	opts.MinIdleConns = cfg.MinIdleConns
	opts.MaxIdleConns = cfg.MaxIdleConns
	opts.MaxActiveConns = cfg.MaxActiveConns
	opts.ConnMaxIdleTime = cfg.ConnMaxIdleTime
	opts.ConnMaxLifetime = cfg.ConnMaxLifetime
	opts.DialTimeout = cfg.DialTimeout
	opts.ReadTimeout = cfg.ReadTimeout
	opts.WriteTimeout = cfg.WriteTimeout

	client := redis.NewClient(opts)

	// Test connection
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := client.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("failed to connect to Redis: %w", err)
	}

	return &PooledRedisClient{client: client}, nil
}

// Client returns the underlying go-redis client for direct access
func (r *PooledRedisClient) Client() *redis.Client {
	return r.client
}

// Close gracefully closes all connections in the pool
func (r *PooledRedisClient) Close() error {
	return r.client.Close()
}

// HealthCheck verifies Redis connection is healthy
func (r *PooledRedisClient) HealthCheck(ctx context.Context) error {
	return r.client.Ping(ctx).Err()
}

// ===== String Operations =====

// Set stores a key-value pair with optional expiration (0 = no expiration)
func (r *PooledRedisClient) Set(ctx context.Context, key string, value interface{}, expiration time.Duration) error {
	return r.client.Set(ctx, key, value, expiration).Err()
}

// Get retrieves a value by key
func (r *PooledRedisClient) Get(ctx context.Context, key string) (string, error) {
	return r.client.Get(ctx, key).Result()
}

// Del deletes one or more keys atomically
func (r *PooledRedisClient) Del(ctx context.Context, keys ...string) error {
	return r.client.Del(ctx, keys...).Err()
}

// Exists checks if keys exist, returns count of existing keys
func (r *PooledRedisClient) Exists(ctx context.Context, keys ...string) (int64, error) {
	return r.client.Exists(ctx, keys...).Result()
}

// Expire sets TTL on a key (returns false if key doesn't exist)
func (r *PooledRedisClient) Expire(ctx context.Context, key string, expiration time.Duration) error {
	return r.client.Expire(ctx, key, expiration).Err()
}

// ===== Hash Operations (for nested data: user profiles, badge progress) =====

// HSet sets hash fields (variadic: HSet(ctx, "user:123", "name", "Alice", "age", 30))
func (r *PooledRedisClient) HSet(ctx context.Context, key string, values ...interface{}) error {
	return r.client.HSet(ctx, key, values...).Err()
}

// HGet retrieves a single hash field value
func (r *PooledRedisClient) HGet(ctx context.Context, key, field string) (string, error) {
	return r.client.HGet(ctx, key, field).Result()
}

// HGetAll retrieves all hash fields and values as a map
func (r *PooledRedisClient) HGetAll(ctx context.Context, key string) (map[string]string, error) {
	return r.client.HGetAll(ctx, key).Result()
}

// HDel deletes hash fields
func (r *PooledRedisClient) HDel(ctx context.Context, key string, fields ...string) error {
	return r.client.HDel(ctx, key, fields...).Err()
}

// ===== Sorted Set Operations (for leaderboards: global, guild, monthly) =====

// ZAdd adds members with scores to a sorted set (for leaderboards)
func (r *PooledRedisClient) ZAdd(ctx context.Context, key string, members ...redis.Z) error {
	return r.client.ZAdd(ctx, key, members...).Err()
}

// ZRangeWithScores retrieves members by rank (0=top) in ascending order
func (r *PooledRedisClient) ZRangeWithScores(ctx context.Context, key string, start, stop int64) ([]redis.Z, error) {
	return r.client.ZRangeWithScores(ctx, key, start, stop).Result()
}

// ZRevRangeWithScores retrieves top N members in descending order (leaderboards)
// Example: ZRevRangeWithScores(ctx, "leaderboard:global", 0, 9) => top 10 users
func (r *PooledRedisClient) ZRevRangeWithScores(ctx context.Context, key string, start, stop int64) ([]redis.Z, error) {
	return r.client.ZRevRangeWithScores(ctx, key, start, stop).Result()
}

// ZRem removes members from a sorted set
func (r *PooledRedisClient) ZRem(ctx context.Context, key string, members ...interface{}) error {
	return r.client.ZRem(ctx, key, members...).Err()
}

// ZIncrBy increments a member's score (for XP updates in leaderboards)
func (r *PooledRedisClient) ZIncrBy(ctx context.Context, key string, increment float64, member string) (float64, error) {
	return r.client.ZIncrBy(ctx, key, increment, member).Result()
}

// ===== Counter Operations (for views, likes, streak tracking) =====

// Incr atomically increments a key's value by 1
func (r *PooledRedisClient) Incr(ctx context.Context, key string) (int64, error) {
	return r.client.Incr(ctx, key).Result()
}

// IncrBy atomically increments a key's value by a specific amount
func (r *PooledRedisClient) IncrBy(ctx context.Context, key string, value int64) (int64, error) {
	return r.client.IncrBy(ctx, key, value).Result()
}

// Decr atomically decrements a key's value by 1
func (r *PooledRedisClient) Decr(ctx context.Context, key string) (int64, error) {
	return r.client.Decr(ctx, key).Result()
}

// DecrBy atomically decrements a key's value by a specific amount
func (r *PooledRedisClient) DecrBy(ctx context.Context, key string, value int64) (int64, error) {
	return r.client.DecrBy(ctx, key, value).Result()
}

// ===== Set Operations (for unique collections: active users, online players) =====

// SAdd adds members to a set (for tracking unique active users)
func (r *PooledRedisClient) SAdd(ctx context.Context, key string, members ...interface{}) error {
	return r.client.SAdd(ctx, key, members...).Err()
}

// SRem removes members from a set
func (r *PooledRedisClient) SRem(ctx context.Context, key string, members ...interface{}) error {
	return r.client.SRem(ctx, key, members...).Err()
}

// SMembers retrieves all set members (use SSCAN for large sets)
func (r *PooledRedisClient) SMembers(ctx context.Context, key string) ([]string, error) {
	return r.client.SMembers(ctx, key).Result()
}

// SIsMember checks if a value is in a set (O(1) lookup)
func (r *PooledRedisClient) SIsMember(ctx context.Context, key string, member interface{}) (bool, error) {
	return r.client.SIsMember(ctx, key, member).Result()
}

// SCard returns the cardinality (size) of a set
func (r *PooledRedisClient) SCard(ctx context.Context, key string) (int64, error) {
	return r.client.SCard(ctx, key).Result()
}
