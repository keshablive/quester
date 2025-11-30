package cache

import "github.com/redis/go-redis/v9"

// NewPooledRedisClientFromExisting wraps an existing redis.Client in a PooledRedisClient
// This is useful for wrapping the global cache.Client instance
func NewPooledRedisClientFromExisting(client *redis.Client) *PooledRedisClient {
	return &PooledRedisClient{client: client}
}
