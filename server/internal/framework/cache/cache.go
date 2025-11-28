// Cache operations (Get, Set, Delete, TTL)
package cache

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

// Client is the global Redis client instance
var Client *redis.Client

// Config holds Redis configuration
type Config struct {
	RedisURL string
	Password string
	DB       int
}

// Initialize sets up the Redis client
func Initialize(cfg *Config) error {
	// Parse Redis URL
	opt, err := redis.ParseURL(cfg.RedisURL)
	if err != nil {
		return fmt.Errorf("failed to parse Redis URL: %w", err)
	}

	// Override password if provided
	if cfg.Password != "" {
		opt.Password = cfg.Password
	}

	// Override DB if provided
	if cfg.DB != 0 {
		opt.DB = cfg.DB
	}

	// Create Redis client
	Client = redis.NewClient(opt)

	// Test connection
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := Client.Ping(ctx).Err(); err != nil {
		return fmt.Errorf("failed to ping Redis: %w", err)
	}

	return nil
}

// Close closes the Redis connection
func Close() error {
	if Client == nil {
		return nil
	}
	return Client.Close()
}

// Get retrieves a value from Redis
func Get(ctx context.Context, key string) (string, error) {
	if Client == nil {
		return "", fmt.Errorf("cache not initialized")
	}

	val, err := Client.Get(ctx, key).Result()
	if err == redis.Nil {
		return "", fmt.Errorf("key not found: %s", key)
	}
	if err != nil {
		return "", fmt.Errorf("failed to get key %s: %w", key, err)
	}

	return val, nil
}

// Set stores a value in Redis with TTL
func Set(ctx context.Context, key string, value interface{}, ttl time.Duration) error {
	if Client == nil {
		return fmt.Errorf("cache not initialized")
	}

	// Convert value to string
	var strValue string
	switch v := value.(type) {
	case string:
		strValue = v
	case []byte:
		strValue = string(v)
	default:
		// Marshal complex types to JSON
		jsonBytes, err := json.Marshal(value)
		if err != nil {
			return fmt.Errorf("failed to marshal value: %w", err)
		}
		strValue = string(jsonBytes)
	}

	if err := Client.Set(ctx, key, strValue, ttl).Err(); err != nil {
		return fmt.Errorf("failed to set key %s: %w", key, err)
	}

	return nil
}

// Delete removes a key from Redis
func Delete(ctx context.Context, key string) error {
	if Client == nil {
		return fmt.Errorf("cache not initialized")
	}

	if err := Client.Del(ctx, key).Err(); err != nil {
		return fmt.Errorf("failed to delete key %s: %w", key, err)
	}

	return nil
}

// SetNX sets a key only if it does not exist (useful for rate limiting)
// Returns true if the key was set, false if it already exists
func SetNX(ctx context.Context, key string, value interface{}, ttl time.Duration) (bool, error) {
	if Client == nil {
		return false, fmt.Errorf("cache not initialized")
	}

	// Convert value to string
	var strValue string
	switch v := value.(type) {
	case string:
		strValue = v
	case []byte:
		strValue = string(v)
	default:
		jsonBytes, err := json.Marshal(value)
		if err != nil {
			return false, fmt.Errorf("failed to marshal value: %w", err)
		}
		strValue = string(jsonBytes)
	}

	wasSet, err := Client.SetNX(ctx, key, strValue, ttl).Result()
	if err != nil {
		return false, fmt.Errorf("failed to setnx key %s: %w", key, err)
	}

	return wasSet, nil
}

// TTL returns the time-to-live for a key
func TTL(ctx context.Context, key string) (time.Duration, error) {
	if Client == nil {
		return 0, fmt.Errorf("cache not initialized")
	}

	ttl, err := Client.TTL(ctx, key).Result()
	if err != nil {
		return 0, fmt.Errorf("failed to get TTL for key %s: %w", key, err)
	}

	return ttl, nil
}

// Increment increments a numeric value in Redis (useful for rate limiting)
func Increment(ctx context.Context, key string) (int64, error) {
	if Client == nil {
		return 0, fmt.Errorf("cache not initialized")
	}

	val, err := Client.Incr(ctx, key).Result()
	if err != nil {
		return 0, fmt.Errorf("failed to increment key %s: %w", key, err)
	}

	return val, nil
}

// IncrementWithExpiry increments a key and sets expiry if it's a new key
func IncrementWithExpiry(ctx context.Context, key string, ttl time.Duration) (int64, error) {
	if Client == nil {
		return 0, fmt.Errorf("cache not initialized")
	}

	pipe := Client.Pipeline()
	incrCmd := pipe.Incr(ctx, key)
	pipe.Expire(ctx, key, ttl)

	_, err := pipe.Exec(ctx)
	if err != nil {
		return 0, fmt.Errorf("failed to increment with expiry for key %s: %w", key, err)
	}

	return incrCmd.Val(), nil
}

// Exists checks if a key exists in Redis
func Exists(ctx context.Context, key string) (bool, error) {
	if Client == nil {
		return false, fmt.Errorf("cache not initialized")
	}

	count, err := Client.Exists(ctx, key).Result()
	if err != nil {
		return false, fmt.Errorf("failed to check existence of key %s: %w", key, err)
	}

	return count > 0, nil
}

// Health checks Redis health
func Health() error {
	if Client == nil {
		return fmt.Errorf("cache not initialized")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	return Client.Ping(ctx).Err()
}

// GetJSON retrieves and unmarshals a JSON value from Redis
func GetJSON(ctx context.Context, key string, dest interface{}) error {
	if Client == nil {
		return fmt.Errorf("cache not initialized")
	}

	val, err := Get(ctx, key)
	if err != nil {
		return err
	}

	if err := json.Unmarshal([]byte(val), dest); err != nil {
		return fmt.Errorf("failed to unmarshal JSON for key %s: %w", key, err)
	}

	return nil
}

// SetJSON marshals and stores a value as JSON in Redis
func SetJSON(ctx context.Context, key string, value interface{}, ttl time.Duration) error {
	if Client == nil {
		return fmt.Errorf("cache not initialized")
	}

	jsonBytes, err := json.Marshal(value)
	if err != nil {
		return fmt.Errorf("failed to marshal value: %w", err)
	}

	return Set(ctx, key, string(jsonBytes), ttl)
}
