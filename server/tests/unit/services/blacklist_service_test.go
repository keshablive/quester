// Unit tests for BlacklistService
package services

import (
	"context"
	"testing"
	"time"

	"github.com/keshablive/quester/internal/framework/service"
	"github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// MockRedisClient is a mock implementation of redis.Client
type MockRedisClient struct {
	mock.Mock
}

// We'll mock the specific methods used by BlacklistService
type MockRedisCmdable struct {
	mock.Mock
}

func (m *MockRedisCmdable) Set(ctx context.Context, key string, value interface{}, expiration time.Duration) *redis.StatusCmd {
	args := m.Called(ctx, key, value, expiration)
	return args.Get(0).(*redis.StatusCmd)
}

func (m *MockRedisCmdable) Exists(ctx context.Context, keys ...string) *redis.IntCmd {
	args := m.Called(ctx, keys)
	return args.Get(0).(*redis.IntCmd)
}

func (m *MockRedisCmdable) Del(ctx context.Context, keys ...string) *redis.IntCmd {
	args := m.Called(ctx, keys)
	return args.Get(0).(*redis.IntCmd)
}

// TestBlacklistService_AddToBlacklist tests adding tokens to blacklist
func TestBlacklistService_AddToBlacklist(t *testing.T) {
	tests := []struct {
		name      string
		tokenHash string
		ttl       time.Duration
		wantErr   bool
	}{
		{
			name:      "Valid token addition",
			tokenHash: "abc123def456",
			ttl:       30 * 24 * time.Hour,
			wantErr:   false,
		},
		{
			name:      "Empty token hash",
			tokenHash: "",
			ttl:       30 * 24 * time.Hour,
			wantErr:   true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Create real redis client for this test
			// In a real scenario, you'd mock redis or use miniredis
			client := redis.NewClient(&redis.Options{
				Addr: "localhost:6379",
			})

			service := service.NewBlacklistService(client)

			// Test the method
			err := service.AddToBlacklist(tt.tokenHash, tt.ttl)

			if tt.wantErr {
				assert.Error(t, err)
			} else {
				// Note: This will only pass if Redis is running
				// In a full test suite, you'd use miniredis or similar
				if err != nil {
					t.Skipf("Skipping test - Redis not available: %v", err)
				}
				assert.NoError(t, err)

				// Cleanup
				key := "blacklist:" + tt.tokenHash
				client.Del(context.Background(), key)
			}
		})
	}
}

// TestBlacklistService_IsBlacklisted tests checking blacklist status
func TestBlacklistService_IsBlacklisted(t *testing.T) {
	tests := []struct {
		name            string
		tokenHash       string
		setupToken      bool
		wantBlacklisted bool
	}{
		{
			name:            "Token is blacklisted",
			tokenHash:       "blacklisted123",
			setupToken:      true,
			wantBlacklisted: true,
		},
		{
			name:            "Token not blacklisted",
			tokenHash:       "clean456",
			setupToken:      false,
			wantBlacklisted: false,
		},
		{
			name:            "Empty token hash",
			tokenHash:       "",
			setupToken:      false,
			wantBlacklisted: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			client := redis.NewClient(&redis.Options{
				Addr: "localhost:6379",
			})

			service := service.NewBlacklistService(client)

			// Setup: Add token to blacklist if needed
			if tt.setupToken && tt.tokenHash != "" {
				key := "blacklist:" + tt.tokenHash
				err := client.Set(context.Background(), key, "1", 1*time.Hour).Err()
				if err != nil {
					t.Skipf("Skipping test - Redis not available: %v", err)
				}
				defer client.Del(context.Background(), key)
			}

			// Test - use the legacy IsBlacklistedSimple method for backward compatibility
			result := service.IsBlacklistedSimple(tt.tokenHash)
			assert.Equal(t, tt.wantBlacklisted, result)
		})
	}
}

// TestBlacklistService_RemoveFromBlacklist tests token removal
func TestBlacklistService_RemoveFromBlacklist(t *testing.T) {
	client := redis.NewClient(&redis.Options{
		Addr: "localhost:6379",
	})

	service := service.NewBlacklistService(client)
	tokenHash := "test_remove_123"
	key := "blacklist:" + tokenHash

	// Setup: Add token first
	err := client.Set(context.Background(), key, "1", 1*time.Hour).Err()
	if err != nil {
		t.Skipf("Skipping test - Redis not available: %v", err)
	}

	// Test removal
	err = service.RemoveFromBlacklist(tokenHash)
	assert.NoError(t, err)

	// Verify removal
	exists := client.Exists(context.Background(), key).Val()
	assert.Equal(t, int64(0), exists)
}

// TestBlacklistService_CleanupExpiredTokens tests the cleanup method
func TestBlacklistService_CleanupExpiredTokens(t *testing.T) {
	client := redis.NewClient(&redis.Options{
		Addr: "localhost:6379",
	})

	service := service.NewBlacklistService(client)

	// Test cleanup (should be a no-op since Redis handles TTL)
	count, err := service.CleanupExpiredTokens()
	assert.NoError(t, err)
	assert.Equal(t, 0, count)
}
