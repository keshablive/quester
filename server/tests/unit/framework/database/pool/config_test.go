// Package pool_test contains unit tests for connection pool configuration
// Task Reference: 010-connection-pool-tuning T009
package pool_test

import (
	"os"
	"testing"
	"time"

	"github.com/keshablive/quester/internal/framework/database/pool"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestDefaultPoolConfig verifies default values match spec.md
func TestDefaultPoolConfig(t *testing.T) {
	cfg := pool.DefaultPoolConfig()

	// Core pool settings
	assert.Equal(t, 25, cfg.MaxOpenConns, "default MaxOpenConns should be 25")
	assert.Equal(t, 5, cfg.MaxIdleConns, "default MaxIdleConns should be 5")
	assert.Equal(t, 5*time.Minute, cfg.ConnMaxLifetime, "default ConnMaxLifetime should be 5m")
	assert.Equal(t, 5*time.Minute, cfg.ConnMaxIdleTime, "default ConnMaxIdleTime should be 5m")

	// Warmup settings (disabled by default)
	assert.False(t, cfg.WarmupEnabled, "warmup should be disabled by default")
	assert.Equal(t, 10, cfg.WarmupSize, "default WarmupSize should be 10")
	assert.Equal(t, 30*time.Second, cfg.WarmupTimeout, "default WarmupTimeout should be 30s")

	// Health check settings (enabled by default)
	assert.True(t, cfg.HealthCheckEnabled, "health check should be enabled by default")
	assert.Equal(t, 30*time.Second, cfg.HealthCheckInterval, "default HealthCheckInterval should be 30s")
	assert.Equal(t, 5*time.Second, cfg.HealthCheckTimeout, "default HealthCheckTimeout should be 5s")

	// Adaptive sizing settings (disabled by default)
	assert.False(t, cfg.AdaptiveEnabled, "adaptive sizing should be disabled by default")
	assert.Equal(t, 10, cfg.AdaptiveMinFloor, "default AdaptiveMinFloor should be 10")
	assert.Equal(t, 50, cfg.AdaptiveMaxCeiling, "default AdaptiveMaxCeiling should be 50")
	assert.Equal(t, 80, cfg.AdaptiveScaleUpThresh, "default AdaptiveScaleUpThresh should be 80")
	assert.Equal(t, 30, cfg.AdaptiveScaleDownThresh, "default AdaptiveScaleDownThresh should be 30")
}

// TestPoolConfigValidation_ValidConfig verifies valid configurations pass
func TestPoolConfigValidation_ValidConfig(t *testing.T) {
	cfg := pool.DefaultPoolConfig()
	errs := cfg.Validate()
	assert.Empty(t, errs, "default config should have no validation errors")
}

// TestPoolConfigValidation_InvalidMaxOpenConns verifies MaxOpenConns validation
func TestPoolConfigValidation_InvalidMaxOpenConns(t *testing.T) {
	tests := []struct {
		name         string
		maxOpen      int
		expectErrors bool
	}{
		{"zero is invalid", 0, true},
		{"negative is invalid", -1, true},
		{"one is valid minimum", 1, false},
		{"large value is valid", 1000, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cfg := pool.DefaultPoolConfig()
			cfg.MaxOpenConns = tt.maxOpen
			// Ensure MaxIdleConns <= MaxOpenConns for valid tests
			if tt.maxOpen > 0 && !tt.expectErrors {
				cfg.MaxIdleConns = tt.maxOpen
			}
			errs := cfg.Validate()
			if tt.expectErrors {
				assert.NotEmpty(t, errs, "should have validation errors")
			} else {
				assert.Empty(t, errs, "should not have validation errors")
			}
		})
	}
}

// TestPoolConfigValidation_MaxIdleGreaterThanMaxOpen verifies constraint
func TestPoolConfigValidation_MaxIdleGreaterThanMaxOpen(t *testing.T) {
	cfg := pool.DefaultPoolConfig()
	cfg.MaxOpenConns = 10
	cfg.MaxIdleConns = 15 // Invalid: idle > open

	errs := cfg.Validate()
	assert.NotEmpty(t, errs, "should have validation errors when MaxIdleConns > MaxOpenConns")

	// Check that the error message is meaningful
	hasRelatedError := false
	for _, err := range errs {
		if err != nil && err.Error() != "" {
			hasRelatedError = true
			break
		}
	}
	assert.True(t, hasRelatedError, "should have meaningful error message")
}

// TestPoolConfigValidation_WarmupEnabled verifies warmup validation when enabled
func TestPoolConfigValidation_WarmupEnabled(t *testing.T) {
	tests := []struct {
		name         string
		warmupSize   int
		warmupTime   time.Duration
		expectErrors bool
	}{
		{"valid warmup config", 5, 30 * time.Second, false},
		{"zero warmup size is invalid", 0, 30 * time.Second, true},
		{"zero warmup timeout is invalid", 5, 0, true},
		{"negative warmup timeout is invalid", 5, -1 * time.Second, true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cfg := pool.DefaultPoolConfig()
			cfg.WarmupEnabled = true
			cfg.WarmupSize = tt.warmupSize
			cfg.WarmupTimeout = tt.warmupTime
			errs := cfg.Validate()
			if tt.expectErrors {
				assert.NotEmpty(t, errs, "should have validation errors")
			} else {
				assert.Empty(t, errs, "should not have validation errors")
			}
		})
	}
}

// TestPoolConfigValidation_HealthCheckEnabled verifies health check validation
func TestPoolConfigValidation_HealthCheckEnabled(t *testing.T) {
	t.Run("timeout must be less than interval", func(t *testing.T) {
		cfg := pool.DefaultPoolConfig()
		cfg.HealthCheckEnabled = true
		cfg.HealthCheckInterval = 10 * time.Second
		cfg.HealthCheckTimeout = 15 * time.Second // Invalid: timeout > interval

		errs := cfg.Validate()
		assert.NotEmpty(t, errs, "should have validation errors when timeout >= interval")
	})

	t.Run("zero interval is invalid", func(t *testing.T) {
		cfg := pool.DefaultPoolConfig()
		cfg.HealthCheckEnabled = true
		cfg.HealthCheckInterval = 0

		errs := cfg.Validate()
		assert.NotEmpty(t, errs, "should have validation errors for zero interval")
	})
}

// TestPoolConfigValidation_AdaptiveEnabled verifies adaptive sizing validation
func TestPoolConfigValidation_AdaptiveEnabled(t *testing.T) {
	tests := []struct {
		name         string
		minFloor     int
		maxCeiling   int
		scaleUp      int
		scaleDown    int
		expectErrors bool
	}{
		{"valid config", 5, 50, 80, 30, false},
		{"floor greater than ceiling", 50, 5, 80, 30, true},
		{"scale up must be greater than scale down", 5, 50, 30, 80, true},
		{"scale up out of range (>100)", 5, 50, 101, 30, true},
		{"scale down out of range (<0)", 5, 50, 80, -1, true},
		{"zero floor is invalid", 0, 50, 80, 30, true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cfg := pool.DefaultPoolConfig()
			cfg.AdaptiveEnabled = true
			cfg.AdaptiveMinFloor = tt.minFloor
			cfg.AdaptiveMaxCeiling = tt.maxCeiling
			cfg.AdaptiveScaleUpThresh = tt.scaleUp
			cfg.AdaptiveScaleDownThresh = tt.scaleDown
			errs := cfg.Validate()
			if tt.expectErrors {
				assert.NotEmpty(t, errs, "should have validation errors")
			} else {
				assert.Empty(t, errs, "should not have validation errors")
			}
		})
	}
}

// TestPoolConfigValidateOrError verifies the combined error function
func TestPoolConfigValidateOrError(t *testing.T) {
	t.Run("valid config returns nil", func(t *testing.T) {
		cfg := pool.DefaultPoolConfig()
		err := cfg.ValidateOrError()
		assert.NoError(t, err)
	})

	t.Run("invalid config returns combined error", func(t *testing.T) {
		cfg := pool.DefaultPoolConfig()
		cfg.MaxOpenConns = 0  // Invalid
		cfg.MaxIdleConns = -1 // Invalid

		err := cfg.ValidateOrError()
		require.Error(t, err)
		assert.Contains(t, err.Error(), "pool configuration invalid")
	})
}

// TestLoadPoolConfig verifies environment variable loading
func TestLoadPoolConfig(t *testing.T) {
	// Save and restore environment
	cleanup := setupTestEnv(t)
	defer cleanup()

	t.Run("loads defaults without env vars", func(t *testing.T) {
		cfg, err := pool.LoadPoolConfig()
		require.NoError(t, err)
		assert.NotNil(t, cfg)
		assert.Equal(t, 25, cfg.MaxOpenConns)
		assert.Equal(t, 5, cfg.MaxIdleConns)
	})

	t.Run("loads custom values from env", func(t *testing.T) {
		os.Setenv("DB_MAX_OPEN_CONNS", "100")
		os.Setenv("DB_MAX_IDLE_CONNS", "20")
		os.Setenv("DB_CONN_MAX_LIFETIME", "10m")
		os.Setenv("DB_POOL_WARMUP_ENABLED", "true")
		os.Setenv("DB_POOL_WARMUP_SIZE", "15")
		os.Setenv("DB_POOL_ADAPTIVE_ENABLED", "true")
		os.Setenv("DB_POOL_MIN_FLOOR", "10")
		os.Setenv("DB_POOL_MAX_CEILING", "200")

		cfg, err := pool.LoadPoolConfig()
		require.NoError(t, err)
		assert.Equal(t, 100, cfg.MaxOpenConns)
		assert.Equal(t, 20, cfg.MaxIdleConns)
		assert.Equal(t, 10*time.Minute, cfg.ConnMaxLifetime)
		assert.True(t, cfg.WarmupEnabled)
		assert.Equal(t, 15, cfg.WarmupSize)
		assert.True(t, cfg.AdaptiveEnabled)
		assert.Equal(t, 10, cfg.AdaptiveMinFloor)
		assert.Equal(t, 200, cfg.AdaptiveMaxCeiling)
	})

	t.Run("returns error on invalid config", func(t *testing.T) {
		os.Setenv("DB_MAX_OPEN_CONNS", "0") // Invalid value

		cfg, err := pool.LoadPoolConfig()
		assert.Error(t, err)
		assert.Nil(t, cfg)
		assert.Contains(t, err.Error(), "failed to load pool config")
	})
}

// TestWarmupSizeClamping verifies warmup size is clamped to max open
func TestWarmupSizeClamping(t *testing.T) {
	cfg := pool.DefaultPoolConfig()
	cfg.WarmupEnabled = true
	cfg.MaxOpenConns = 10
	cfg.WarmupSize = 20 // Greater than MaxOpenConns

	// Validation should clamp, not error
	_ = cfg.Validate()
	assert.Equal(t, 10, cfg.WarmupSize, "WarmupSize should be clamped to MaxOpenConns")
}

// setupTestEnv clears pool-related env vars and returns a cleanup function
func setupTestEnv(t *testing.T) func() {
	t.Helper()

	envVars := []string{
		"DB_MAX_OPEN_CONNS",
		"DB_MAX_IDLE_CONNS",
		"DB_CONN_MAX_LIFETIME",
		"DB_CONN_MAX_IDLE_TIME",
		"DB_POOL_WARMUP_ENABLED",
		"DB_POOL_WARMUP_SIZE",
		"DB_POOL_WARMUP_TIMEOUT",
		"DB_POOL_HEALTH_CHECK_ENABLED",
		"DB_POOL_HEALTH_CHECK_INTERVAL",
		"DB_POOL_HEALTH_CHECK_TIMEOUT",
		"DB_POOL_ADAPTIVE_ENABLED",
		"DB_POOL_MIN_FLOOR",
		"DB_POOL_MAX_CEILING",
		"DB_POOL_SCALE_UP_THRESHOLD",
		"DB_POOL_SCALE_DOWN_THRESHOLD",
		"DB_POOL_ADAPTIVE_EVAL_INTERVAL",
		"DB_POOL_ADAPTIVE_STEP_SIZE",
	}

	// Save existing values
	saved := make(map[string]string)
	for _, key := range envVars {
		saved[key] = os.Getenv(key)
		os.Unsetenv(key)
	}

	// Return cleanup function
	return func() {
		for _, key := range envVars {
			if val, ok := saved[key]; ok && val != "" {
				os.Setenv(key, val)
			} else {
				os.Unsetenv(key)
			}
		}
	}
}
