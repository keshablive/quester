// Package pool provides connection pool management, monitoring, and optimization
// Task Reference: 010-connection-pool-tuning T003
package pool

import (
	"fmt"
	"os"
	"strconv"
	"time"
)

// PoolConfig holds all connection pool configuration settings
// Loaded from environment variables via LoadPoolConfig()
type PoolConfig struct {
	// Core pool settings (existing, mapped from main config)
	MaxOpenConns    int           // Maximum open connections (DB_MAX_OPEN_CONNS)
	MaxIdleConns    int           // Maximum idle connections (DB_MAX_IDLE_CONNS)
	ConnMaxLifetime time.Duration // Maximum connection lifetime (DB_CONN_MAX_LIFETIME)
	ConnMaxIdleTime time.Duration // Maximum idle time before close (DB_CONN_MAX_IDLE_TIME)

	// Warmup settings
	WarmupEnabled bool          // Enable pool warmup on startup (DB_POOL_WARMUP_ENABLED)
	WarmupSize    int           // Number of connections to pre-establish (DB_POOL_WARMUP_SIZE)
	WarmupTimeout time.Duration // Maximum warmup duration (DB_POOL_WARMUP_TIMEOUT)

	// Health check settings
	HealthCheckEnabled  bool          // Enable background health checks (DB_HEALTH_CHECK_ENABLED)
	HealthCheckInterval time.Duration // Interval between checks (DB_HEALTH_CHECK_INTERVAL)
	HealthCheckTimeout  time.Duration // Timeout for each check (DB_HEALTH_CHECK_TIMEOUT)

	// Adaptive sizing settings
	AdaptiveEnabled         bool          // Enable adaptive pool sizing (DB_POOL_ADAPTIVE_ENABLED)
	AdaptiveMinFloor        int           // Minimum pool size (DB_POOL_MIN_FLOOR)
	AdaptiveMaxCeiling      int           // Maximum pool size (DB_POOL_MAX_CEILING)
	AdaptiveScaleUpThresh   int           // Scale up at % utilization (DB_POOL_ADAPTIVE_SCALE_UP_THRESHOLD)
	AdaptiveScaleDownThresh int           // Scale down at % utilization (DB_POOL_ADAPTIVE_SCALE_DOWN_THRESHOLD)
	AdaptiveEvalInterval    time.Duration // Evaluation interval (DB_POOL_ADAPTIVE_EVAL_INTERVAL)
	AdaptiveStepSize        int           // Connections per adjustment (DB_POOL_ADAPTIVE_STEP_SIZE)
}

// DefaultPoolConfig returns a PoolConfig with default values
// per spec.md Configuration Defaults table
func DefaultPoolConfig() *PoolConfig {
	return &PoolConfig{
		// Core pool settings
		MaxOpenConns:    25,
		MaxIdleConns:    5,
		ConnMaxLifetime: 5 * time.Minute,
		ConnMaxIdleTime: 5 * time.Minute,

		// Warmup settings (disabled by default)
		WarmupEnabled: false,
		WarmupSize:    10,
		WarmupTimeout: 30 * time.Second,

		// Health check settings (enabled by default)
		HealthCheckEnabled:  true,
		HealthCheckInterval: 30 * time.Second,
		HealthCheckTimeout:  5 * time.Second,

		// Adaptive sizing settings (disabled by default)
		AdaptiveEnabled:         false,
		AdaptiveMinFloor:        10,
		AdaptiveMaxCeiling:      50,
		AdaptiveScaleUpThresh:   80,
		AdaptiveScaleDownThresh: 30,
		AdaptiveEvalInterval:    30 * time.Second,
		AdaptiveStepSize:        5,
	}
}

// LoadPoolConfig loads connection pool configuration from environment variables
// This is the primary way to create a PoolConfig in production
// Task Reference: 010-connection-pool-tuning T006
func LoadPoolConfig() (*PoolConfig, error) {
	cfg := &PoolConfig{
		// Core pool settings
		MaxOpenConns:    getEnvInt("DB_MAX_OPEN_CONNS", 25),
		MaxIdleConns:    getEnvInt("DB_MAX_IDLE_CONNS", 5),
		ConnMaxLifetime: getEnvDuration("DB_CONN_MAX_LIFETIME", 5*time.Minute),
		ConnMaxIdleTime: getEnvDuration("DB_CONN_MAX_IDLE_TIME", 5*time.Minute),

		// Warmup settings
		WarmupEnabled: getEnvBool("DB_POOL_WARMUP_ENABLED", false),
		WarmupSize:    getEnvInt("DB_POOL_WARMUP_SIZE", 5),
		WarmupTimeout: getEnvDuration("DB_POOL_WARMUP_TIMEOUT", 30*time.Second),

		// Health check settings
		HealthCheckEnabled:  getEnvBool("DB_POOL_HEALTH_CHECK_ENABLED", true),
		HealthCheckInterval: getEnvDuration("DB_POOL_HEALTH_CHECK_INTERVAL", 30*time.Second),
		HealthCheckTimeout:  getEnvDuration("DB_POOL_HEALTH_CHECK_TIMEOUT", 5*time.Second),

		// Adaptive sizing settings
		AdaptiveEnabled:         getEnvBool("DB_POOL_ADAPTIVE_ENABLED", false),
		AdaptiveMinFloor:        getEnvInt("DB_POOL_MIN_FLOOR", 5),
		AdaptiveMaxCeiling:      getEnvInt("DB_POOL_MAX_CEILING", 50),
		AdaptiveScaleUpThresh:   getEnvInt("DB_POOL_SCALE_UP_THRESHOLD", 80),
		AdaptiveScaleDownThresh: getEnvInt("DB_POOL_SCALE_DOWN_THRESHOLD", 30),
		AdaptiveEvalInterval:    getEnvDuration("DB_POOL_ADAPTIVE_EVAL_INTERVAL", 1*time.Minute),
		AdaptiveStepSize:        getEnvInt("DB_POOL_ADAPTIVE_STEP_SIZE", 2),
	}

	// Validate the loaded configuration
	if err := cfg.ValidateOrError(); err != nil {
		return nil, fmt.Errorf("failed to load pool config: %w", err)
	}

	return cfg, nil
}

// Environment variable helper functions (local to package)

func getEnvInt(key string, defaultVal int) int {
	if val := os.Getenv(key); val != "" {
		if i, err := strconv.Atoi(val); err == nil {
			return i
		}
	}
	return defaultVal
}

func getEnvBool(key string, defaultVal bool) bool {
	if val := os.Getenv(key); val != "" {
		if b, err := strconv.ParseBool(val); err == nil {
			return b
		}
	}
	return defaultVal
}

func getEnvDuration(key string, defaultVal time.Duration) time.Duration {
	if val := os.Getenv(key); val != "" {
		if d, err := time.ParseDuration(val); err == nil {
			return d
		}
	}
	return defaultVal
}

// Validate checks the PoolConfig for invalid values
// Returns nil if valid, or a slice of validation errors
func (c *PoolConfig) Validate() []error {
	var errs []error

	// Core pool validation
	if c.MaxOpenConns < 1 {
		errs = append(errs, NewConfigValidationError("MaxOpenConns", c.MaxOpenConns, "must be >= 1"))
	}
	if c.MaxIdleConns < 0 {
		errs = append(errs, NewConfigValidationError("MaxIdleConns", c.MaxIdleConns, "must be >= 0"))
	}
	if c.MaxOpenConns < c.MaxIdleConns {
		errs = append(errs, NewConfigValidationError("MaxOpenConns", c.MaxOpenConns,
			fmt.Sprintf("must be >= MaxIdleConns (%d)", c.MaxIdleConns)))
	}
	if c.ConnMaxLifetime <= 0 {
		errs = append(errs, NewConfigValidationError("ConnMaxLifetime", c.ConnMaxLifetime, "must be > 0"))
	}
	if c.ConnMaxIdleTime <= 0 {
		errs = append(errs, NewConfigValidationError("ConnMaxIdleTime", c.ConnMaxIdleTime, "must be > 0"))
	}

	// Warmup validation
	if c.WarmupEnabled {
		if c.WarmupSize < 1 {
			errs = append(errs, NewConfigValidationError("WarmupSize", c.WarmupSize, "must be >= 1 when warmup enabled"))
		}
		if c.WarmupSize > c.MaxOpenConns {
			// Auto-clamp warning, not an error per data-model.md
			c.WarmupSize = c.MaxOpenConns
		}
		if c.WarmupTimeout <= 0 {
			errs = append(errs, NewConfigValidationError("WarmupTimeout", c.WarmupTimeout, "must be > 0"))
		}
	}

	// Health check validation
	if c.HealthCheckEnabled {
		if c.HealthCheckInterval <= 0 {
			errs = append(errs, NewConfigValidationError("HealthCheckInterval", c.HealthCheckInterval, "must be > 0"))
		}
		if c.HealthCheckTimeout <= 0 {
			errs = append(errs, NewConfigValidationError("HealthCheckTimeout", c.HealthCheckTimeout, "must be > 0"))
		}
		if c.HealthCheckTimeout >= c.HealthCheckInterval {
			errs = append(errs, NewConfigValidationError("HealthCheckTimeout", c.HealthCheckTimeout,
				fmt.Sprintf("must be < HealthCheckInterval (%s)", c.HealthCheckInterval)))
		}
	}

	// Adaptive sizing validation
	if c.AdaptiveEnabled {
		if c.AdaptiveMinFloor < 1 {
			errs = append(errs, NewConfigValidationError("AdaptiveMinFloor", c.AdaptiveMinFloor, "must be >= 1"))
		}
		if c.AdaptiveMaxCeiling < c.AdaptiveMinFloor {
			errs = append(errs, NewConfigValidationError("AdaptiveMaxCeiling", c.AdaptiveMaxCeiling,
				fmt.Sprintf("must be >= AdaptiveMinFloor (%d)", c.AdaptiveMinFloor)))
		}
		if c.AdaptiveScaleUpThresh <= c.AdaptiveScaleDownThresh {
			errs = append(errs, NewConfigValidationError("AdaptiveScaleUpThresh", c.AdaptiveScaleUpThresh,
				fmt.Sprintf("must be > AdaptiveScaleDownThresh (%d)", c.AdaptiveScaleDownThresh)))
		}
		if c.AdaptiveScaleUpThresh > 100 || c.AdaptiveScaleUpThresh < 1 {
			errs = append(errs, NewConfigValidationError("AdaptiveScaleUpThresh", c.AdaptiveScaleUpThresh, "must be between 1 and 100"))
		}
		if c.AdaptiveScaleDownThresh > 100 || c.AdaptiveScaleDownThresh < 0 {
			errs = append(errs, NewConfigValidationError("AdaptiveScaleDownThresh", c.AdaptiveScaleDownThresh, "must be between 0 and 100"))
		}
		if c.AdaptiveEvalInterval <= 0 {
			errs = append(errs, NewConfigValidationError("AdaptiveEvalInterval", c.AdaptiveEvalInterval, "must be > 0"))
		}
		if c.AdaptiveStepSize < 1 {
			errs = append(errs, NewConfigValidationError("AdaptiveStepSize", c.AdaptiveStepSize, "must be >= 1"))
		}
	}

	return errs
}

// ValidateOrError runs Validate and returns a combined error if any validation fails
func (c *PoolConfig) ValidateOrError() error {
	errs := c.Validate()
	if len(errs) == 0 {
		return nil
	}

	// Combine all errors into a single error message
	msg := fmt.Sprintf("pool configuration invalid (%d errors):", len(errs))
	for _, err := range errs {
		msg += "\n  - " + err.Error()
	}
	return fmt.Errorf("%s: %w", msg, ErrInvalidConfig)
}
