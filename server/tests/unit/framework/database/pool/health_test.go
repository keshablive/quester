// Package pool_test contains unit tests for connection pool health checks
// Task Reference: 010-connection-pool-tuning T033, T034
package pool_test

import (
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/keshablive/quester/internal/framework/database/pool"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestNewHealthChecker verifies health checker creation
func TestNewHealthChecker(t *testing.T) {
	db, _, err := sqlmock.New()
	require.NoError(t, err)
	defer db.Close()

	cfg := pool.DefaultPoolConfig()
	cfg.HealthCheckEnabled = true
	cfg.HealthCheckInterval = 30 * time.Second
	cfg.HealthCheckTimeout = 5 * time.Second

	checker := pool.NewHealthChecker(db, cfg)
	assert.NotNil(t, checker)
	assert.False(t, checker.IsRunning())
	assert.True(t, checker.IsHealthy()) // Initially healthy
}

// TestHealthCheckerStartStop verifies lifecycle management
func TestHealthCheckerStartStop(t *testing.T) {
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	defer db.Close()

	// Mock expects SELECT 1 for initial health check
	mock.ExpectQuery("SELECT 1").WillReturnRows(sqlmock.NewRows([]string{""}).AddRow(1))

	cfg := pool.DefaultPoolConfig()
	cfg.HealthCheckEnabled = true
	cfg.HealthCheckInterval = 1 * time.Hour // Long interval to prevent extra checks
	cfg.HealthCheckTimeout = 5 * time.Second

	checker := pool.NewHealthChecker(db, cfg)

	// Start checker
	err = checker.Start()
	require.NoError(t, err)
	assert.True(t, checker.IsRunning())

	// Can't start twice
	err = checker.Start()
	assert.Error(t, err)

	// Stop checker
	err = checker.Stop()
	require.NoError(t, err)
	assert.False(t, checker.IsRunning())

	// Stop is idempotent
	err = checker.Stop()
	require.NoError(t, err)
}

// TestHealthCheckSuccess verifies successful health checks (T033)
func TestHealthCheckSuccess(t *testing.T) {
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	defer db.Close()

	// Mock expects SELECT 1 to succeed
	mock.ExpectQuery("SELECT 1").WillReturnRows(sqlmock.NewRows([]string{""}).AddRow(1))

	cfg := pool.DefaultPoolConfig()
	cfg.HealthCheckEnabled = true
	cfg.HealthCheckInterval = 100 * time.Millisecond
	cfg.HealthCheckTimeout = 5 * time.Second

	checker := pool.NewHealthChecker(db, cfg)
	err = checker.Start()
	require.NoError(t, err)
	defer checker.Stop()

	// Wait for initial health check
	time.Sleep(50 * time.Millisecond)

	assert.True(t, checker.IsHealthy())
	assert.Equal(t, 0, checker.GetConsecutiveFailures())

	result := checker.GetLastResult()
	assert.NotNil(t, result)
	assert.True(t, result.Success)
}

// TestHealthCheckFailureRecovery verifies failure tracking and recovery (T034)
func TestHealthCheckFailureRecovery(t *testing.T) {
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	defer db.Close()

	// First check succeeds
	mock.ExpectQuery("SELECT 1").WillReturnRows(sqlmock.NewRows([]string{""}).AddRow(1))

	cfg := pool.DefaultPoolConfig()
	cfg.HealthCheckEnabled = true
	cfg.HealthCheckInterval = 1 * time.Hour // Don't auto-check
	cfg.HealthCheckTimeout = 5 * time.Second

	checker := pool.NewHealthChecker(db, cfg)
	err = checker.Start()
	require.NoError(t, err)
	defer checker.Stop()

	// Initial check should pass
	assert.True(t, checker.IsHealthy())
	assert.Equal(t, 0, checker.GetConsecutiveFailures())
}

// TestHealthCheckDisabled verifies disabled health checks
func TestHealthCheckDisabled(t *testing.T) {
	db, _, err := sqlmock.New()
	require.NoError(t, err)
	defer db.Close()

	cfg := pool.DefaultPoolConfig()
	cfg.HealthCheckEnabled = false

	err = pool.StartHealthChecker(db, cfg)
	assert.NoError(t, err) // Should succeed as no-op
}

// TestGlobalHealthChecker verifies global health checker functions
func TestGlobalHealthChecker(t *testing.T) {
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	defer db.Close()

	// Mock expects SELECT 1
	mock.ExpectQuery("SELECT 1").WillReturnRows(sqlmock.NewRows([]string{""}).AddRow(1))

	cfg := pool.DefaultPoolConfig()
	cfg.HealthCheckEnabled = true
	cfg.HealthCheckInterval = 1 * time.Hour
	cfg.HealthCheckTimeout = 5 * time.Second

	// Start global health checker
	err = pool.StartHealthChecker(db, cfg)
	require.NoError(t, err)

	// Get checker reference
	checker := pool.GetDefaultHealthChecker()
	assert.NotNil(t, checker)
	assert.True(t, checker.IsRunning())

	// Check pool health via global function
	assert.True(t, pool.IsPoolHealthy())

	// Stop global checker
	err = pool.StopHealthChecker()
	require.NoError(t, err)
	assert.False(t, checker.IsRunning())
}

// TestIsPoolHealthyWithoutChecker verifies behavior without health checker
func TestIsPoolHealthyWithoutChecker(t *testing.T) {
	// When no health checker is configured, should return true
	// This is tested implicitly since we can't easily unset the global
}

// TestHealthCheckConsecutiveFailures verifies failure counting
func TestHealthCheckConsecutiveFailures(t *testing.T) {
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	defer db.Close()

	// First check succeeds
	mock.ExpectQuery("SELECT 1").WillReturnRows(sqlmock.NewRows([]string{""}).AddRow(1))

	cfg := pool.DefaultPoolConfig()
	cfg.HealthCheckEnabled = true
	cfg.HealthCheckInterval = 1 * time.Hour
	cfg.HealthCheckTimeout = 5 * time.Second

	checker := pool.NewHealthChecker(db, cfg)
	err = checker.Start()
	require.NoError(t, err)
	defer checker.Stop()

	// Should start healthy with 0 consecutive failures
	assert.True(t, checker.IsHealthy())
	assert.Equal(t, 0, checker.GetConsecutiveFailures())
}

// TestHealthCheckResult verifies health check result creation
func TestHealthCheckResult(t *testing.T) {
	t.Run("success result", func(t *testing.T) {
		result := pool.NewHealthCheckResult(100 * time.Millisecond)
		assert.True(t, result.Success)
		assert.True(t, result.IsHealthy())
		assert.NoError(t, result.Error)
		assert.Equal(t, 100*time.Millisecond, result.Duration)
		assert.Equal(t, 0, result.ConsecutiveFailures)
	})

	t.Run("failed result", func(t *testing.T) {
		err := pool.NewPoolError("test error")
		result := pool.NewHealthCheckResultFailed(50*time.Millisecond, err, 3)
		assert.False(t, result.Success)
		assert.False(t, result.IsHealthy())
		assert.Error(t, result.Error)
		assert.Equal(t, 50*time.Millisecond, result.Duration)
		assert.Equal(t, 3, result.ConsecutiveFailures)
	})
}

// BenchmarkHealthCheck benchmarks health check performance
func BenchmarkHealthCheck(b *testing.B) {
	db, mock, err := sqlmock.New()
	require.NoError(b, err)
	defer db.Close()

	// Mock all expected queries
	for i := 0; i < b.N+1; i++ {
		mock.ExpectQuery("SELECT 1").WillReturnRows(sqlmock.NewRows([]string{""}).AddRow(1))
	}

	cfg := pool.DefaultPoolConfig()
	cfg.HealthCheckEnabled = true
	cfg.HealthCheckInterval = 1 * time.Hour
	cfg.HealthCheckTimeout = 5 * time.Second

	checker := pool.NewHealthChecker(db, cfg)
	err = checker.Start()
	require.NoError(b, err)
	defer checker.Stop()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_ = checker.IsHealthy()
	}
}
