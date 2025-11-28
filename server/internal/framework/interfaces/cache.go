package interfaces

import (
	"context"
	"time"
)

// CacheClient defines the interface for cache operations
// Abstracts Redis operations to enable mocking and testing
type CacheClient interface {
	// Get retrieves a value from cache by key
	Get(ctx context.Context, key string) (string, error)

	// Set stores a value in cache with expiration
	Set(ctx context.Context, key string, value interface{}, expiration time.Duration) error

	// Delete removes a key from cache
	Delete(ctx context.Context, keys ...string) error

	// Exists checks if one or more keys exist in cache
	// Returns the number of keys that exist
	Exists(ctx context.Context, keys ...string) (int64, error)

	// Expire sets a timeout on a key
	Expire(ctx context.Context, key string, expiration time.Duration) error

	// TTL returns the remaining time to live of a key
	TTL(ctx context.Context, key string) (time.Duration, error)

	// Incr increments the integer value of a key by one
	Incr(ctx context.Context, key string) (int64, error)

	// Decr decrements the integer value of a key by one
	Decr(ctx context.Context, key string) (int64, error)

	// HGet gets the value of a hash field
	HGet(ctx context.Context, key, field string) (string, error)

	// HSet sets the value of a hash field
	HSet(ctx context.Context, key string, values ...interface{}) error

	// HDel deletes one or more hash fields
	HDel(ctx context.Context, key string, fields ...string) error

	// HGetAll gets all fields and values in a hash
	HGetAll(ctx context.Context, key string) (map[string]string, error)

	// SAdd adds one or more members to a set
	SAdd(ctx context.Context, key string, members ...interface{}) error

	// SMembers gets all members of a set
	SMembers(ctx context.Context, key string) ([]string, error)

	// SRem removes one or more members from a set
	SRem(ctx context.Context, key string, members ...interface{}) error

	// ZAdd adds one or more members to a sorted set
	ZAdd(ctx context.Context, key string, members ...interface{}) error

	// ZRange returns a range of members in a sorted set by index
	ZRange(ctx context.Context, key string, start, stop int64) ([]string, error)

	// ZRem removes one or more members from a sorted set
	ZRem(ctx context.Context, key string, members ...interface{}) error

	// Ping tests the connection to the cache server
	Ping(ctx context.Context) error

	// Close closes the cache client connection
	Close() error
}
