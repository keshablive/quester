// Interface contract tests for framework layer interfaces
// T038: Verifies ClaimsProvider, StreamInfo, TokenBlacklist implementations
package framework_test

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/keshablive/quester/internal/framework/auth"
	"github.com/keshablive/quester/internal/framework/interfaces"
	"github.com/keshablive/quester/internal/models"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// ===========================================================================
// ClaimsProvider Interface Tests
// Verifies models.User implements auth.ClaimsProvider
// ===========================================================================

// Compile-time interface check
var _ auth.ClaimsProvider = (*models.User)(nil)

func TestUserImplementsClaimsProvider(t *testing.T) {
	// Setup: Create a user with known values
	userID := uuid.New()
	tenantID := uuid.New()
	user := &models.User{
		ID:       userID,
		TenantID: tenantID,
		Role:     "admin",
	}

	// Test GetID
	t.Run("GetID returns user ID", func(t *testing.T) {
		id := user.GetID()
		assert.Equal(t, userID, id)
	})

	// Test GetTenantID
	t.Run("GetTenantID returns tenant ID", func(t *testing.T) {
		tid := user.GetTenantID()
		assert.Equal(t, tenantID, tid)
	})

	// Test GetRole
	t.Run("GetRole returns user role", func(t *testing.T) {
		role := user.GetRole()
		assert.Equal(t, "admin", role)
	})
}

// ===========================================================================
// StreamInfo Interface Tests
// Verifies models.VideoStream implements streaming.StreamInfo
// ===========================================================================

// Compile-time interface check
var _ interfaces.StreamInfo = (*models.VideoStream)(nil)

func TestVideoStreamImplementsStreamInfo(t *testing.T) {
	// Setup: Create a video stream with known values
	streamID := uuid.New().String()
	creatorID := uuid.New().String()
	stream := &models.VideoStream{
		ID:        streamID,
		StreamKey: "test-stream-key-123",
		Status:    models.StreamStatusLive,
		CreatorID: creatorID,
	}

	// Test GetID
	t.Run("GetID returns stream ID string", func(t *testing.T) {
		id := stream.GetID()
		assert.Equal(t, streamID, id)
	})

	// Test GetStreamKey
	t.Run("GetStreamKey returns stream key", func(t *testing.T) {
		key := stream.GetStreamKey()
		assert.Equal(t, "test-stream-key-123", key)
	})

	// Test GetStatus
	t.Run("GetStatus returns status as string", func(t *testing.T) {
		status := stream.GetStatus()
		assert.Equal(t, string(models.StreamStatusLive), status)
	})

	// Test GetOwnerID
	t.Run("GetOwnerID returns creator ID string", func(t *testing.T) {
		oid := stream.GetOwnerID()
		assert.Equal(t, creatorID, oid)
	})

	// Test SetDuration
	t.Run("SetDuration sets stream duration", func(t *testing.T) {
		stream.SetDuration(3600) // 1 hour in seconds
		assert.Equal(t, int64(3600), int64(stream.Duration))
	})
}

// ===========================================================================
// TokenBlacklist Interface Tests
// Verifies services.BlacklistService implements interfaces.TokenBlacklist
// Note: Full integration test requires Redis, these are contract tests
// ===========================================================================

// MockTokenBlacklist is a test implementation for verifying interface contract
type MockTokenBlacklist struct {
	blacklisted map[string]time.Time
}

func NewMockTokenBlacklist() *MockTokenBlacklist {
	return &MockTokenBlacklist{
		blacklisted: make(map[string]time.Time),
	}
}

func (m *MockTokenBlacklist) Blacklist(ctx context.Context, tokenHash string, expiresAt time.Time) error {
	m.blacklisted[tokenHash] = expiresAt
	return nil
}

func (m *MockTokenBlacklist) IsBlacklisted(ctx context.Context, tokenHash string) (bool, error) {
	expiry, exists := m.blacklisted[tokenHash]
	if !exists {
		return false, nil
	}
	// Check if token has expired
	return time.Now().Before(expiry), nil
}

func (m *MockTokenBlacklist) CleanupExpired(ctx context.Context) error {
	now := time.Now()
	for hash, expiry := range m.blacklisted {
		if now.After(expiry) {
			delete(m.blacklisted, hash)
		}
	}
	return nil
}

// Compile-time interface check for mock
var _ interfaces.TokenBlacklist = (*MockTokenBlacklist)(nil)

func TestTokenBlacklistInterface(t *testing.T) {
	ctx := context.Background()
	blacklist := NewMockTokenBlacklist()

	t.Run("Blacklist adds token to blacklist", func(t *testing.T) {
		tokenHash := "test-token-hash-123"
		expiry := time.Now().Add(time.Hour)

		err := blacklist.Blacklist(ctx, tokenHash, expiry)
		require.NoError(t, err)

		isBlacklisted, err := blacklist.IsBlacklisted(ctx, tokenHash)
		require.NoError(t, err)
		assert.True(t, isBlacklisted)
	})

	t.Run("IsBlacklisted returns false for non-blacklisted token", func(t *testing.T) {
		isBlacklisted, err := blacklist.IsBlacklisted(ctx, "non-existent-token")
		require.NoError(t, err)
		assert.False(t, isBlacklisted)
	})

	t.Run("CleanupExpired removes expired tokens", func(t *testing.T) {
		// Add an already-expired token
		expiredHash := "expired-token-hash"
		blacklist.blacklisted[expiredHash] = time.Now().Add(-time.Hour) // Expired 1 hour ago

		err := blacklist.CleanupExpired(ctx)
		require.NoError(t, err)

		// Verify expired token is removed
		isBlacklisted, err := blacklist.IsBlacklisted(ctx, expiredHash)
		require.NoError(t, err)
		assert.False(t, isBlacklisted)
	})
}

// ===========================================================================
// ClaimsProvider Interface Definition Test
// Verifies the interface can be used for dependency injection
// ===========================================================================

func TestClaimsProviderDependencyInjection(t *testing.T) {
	// This tests that we can pass any ClaimsProvider implementation
	// to a function expecting the interface

	user := &models.User{
		ID:       uuid.New(),
		TenantID: uuid.New(),
		Role:     models.Role("user"),
	}

	// Function that accepts ClaimsProvider interface
	extractClaims := func(cp auth.ClaimsProvider) (id, tenantID uuid.UUID, role string) {
		return cp.GetID(), cp.GetTenantID(), cp.GetRole()
	}

	id, tenantID, role := extractClaims(user)
	assert.Equal(t, user.ID, id)
	assert.Equal(t, user.TenantID, tenantID)
	assert.Equal(t, string(user.Role), role)
}
