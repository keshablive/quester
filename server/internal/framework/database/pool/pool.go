// Package pool provides connection pool management, monitoring, and optimization
// for PostgreSQL database connections via sql.DB.
//
// Task Reference: 010-connection-pool-tuning T053
//
// # Features
//
// This package provides the following connection pool management features:
//
//   - Metrics: Prometheus metrics for pool monitoring (utilization, wait times, connections)
//   - Warmup: Pre-establish connections on startup to eliminate cold-start latency
//   - Health Checks: Background health validation with automatic recovery
//   - Adaptive Sizing: Automatic pool size adjustment based on load patterns
//
// # Quick Start
//
// The simplest way to use this package is through the database.Initialize() function
// which handles all configuration and initialization automatically:
//
//	cfg := &database.Config{
//		DatabaseURL:         os.Getenv("DATABASE_URL"),
//		MaxOpenConns:        25,
//		MaxIdleConns:        5,
//		WarmupEnabled:       true,
//		HealthCheckEnabled:  true,
//		AdaptiveEnabled:     true,
//	}
//	if err := database.Initialize(cfg); err != nil {
//		log.Fatal(err)
//	}
//	defer database.Close()
//
// # Configuration
//
// All pool settings are configured via environment variables:
//
//	# Core pool settings
//	DB_MAX_OPEN_CONNS=25          # Maximum open connections
//	DB_MAX_IDLE_CONNS=5           # Maximum idle connections
//	DB_CONN_MAX_LIFETIME=5m       # Connection reuse lifetime
//	DB_CONN_MAX_IDLE_TIME=5m      # Maximum idle time
//
//	# Warmup settings
//	DB_POOL_WARMUP_ENABLED=true   # Enable warmup on startup
//	DB_POOL_WARMUP_SIZE=10        # Connections to pre-establish
//	DB_POOL_WARMUP_TIMEOUT=30s    # Maximum warmup duration
//
//	# Health check settings
//	DB_HEALTH_CHECK_ENABLED=true  # Enable background health checks
//	DB_HEALTH_CHECK_INTERVAL=30s  # Check interval
//	DB_HEALTH_CHECK_TIMEOUT=5s    # Individual check timeout
//
//	# Adaptive sizing settings
//	DB_POOL_ADAPTIVE_ENABLED=true # Enable adaptive sizing
//	DB_POOL_MIN_FLOOR=5           # Minimum pool size
//	DB_POOL_MAX_CEILING=50        # Maximum pool size
//	DB_POOL_ADAPTIVE_SCALE_UP_THRESHOLD=80   # Scale up at % utilization
//	DB_POOL_ADAPTIVE_SCALE_DOWN_THRESHOLD=20 # Scale down at % utilization
//
// # Metrics
//
// Prometheus metrics are registered with the "quester_db_pool_" namespace:
//
//   - quester_db_pool_open_connections: Current open connections
//   - quester_db_pool_in_use_connections: Connections currently in use
//   - quester_db_pool_idle_connections: Idle connections
//   - quester_db_pool_utilization: Pool utilization percentage (0-1)
//   - quester_db_pool_wait_duration_seconds: Connection acquisition latency
//   - quester_db_pool_wait_total: Total waits for connections
//
// # Manual Usage
//
// For advanced use cases, individual components can be used directly:
//
//	// Load configuration
//	poolCfg, err := pool.LoadPoolConfig()
//
//	// Start metrics collection
//	pool.RegisterMetrics()
//	pool.StartMetricsCollector(sqlDB, poolCfg.MaxOpenConns, poolCfg.MaxIdleConns)
//	defer pool.StopMetricsCollector()
//
//	// Warmup pool
//	pool.WarmupPool(ctx, sqlDB, poolCfg.WarmupSize, poolCfg.WarmupTimeout)
//
//	// Start health checker
//	pool.StartHealthChecker(sqlDB, poolCfg.HealthCheckInterval, poolCfg.HealthCheckTimeout)
//	defer pool.StopHealthChecker()
//
//	// Start adaptive manager
//	pool.StartAdaptiveManager(sqlDB, poolCfg)
//	defer pool.StopAdaptiveManager()
package pool

// Re-export commonly used types for convenient access
// Users can import just the pool package and access all types

// Configuration types (from config.go)
// - PoolConfig: Main configuration struct for all pool settings
// - DefaultPoolConfig(): Returns config with default values
// - LoadPoolConfig(): Loads config from environment variables
// - ValidatePoolConfig(): Validates configuration constraints

// Statistics types (from stats.go)
// - PoolStats: Point-in-time pool statistics
// - AdaptiveState: Adaptive sizing state information
// - NewPoolStatsFromDB(): Creates stats from sql.DB
// - FromDBStats(): Creates stats from sql.DBStats

// Error types (from errors.go)
// - ErrWarmupTimeout: Warmup exceeded configured timeout
// - ErrWarmupPartial: Partial warmup success
// - ErrHealthCheckFailed: Health check failure
// - ErrPoolUnhealthy: Sustained health failures
// - ErrAdaptiveDisabled: Adaptive operation when disabled
// - ErrInvalidConfig: Configuration validation failure
// - ErrPoolNotInitialized: Pool not initialized
// - ConfigValidationError: Detailed validation error

// Metrics functions (from metrics.go)
// - RegisterMetrics(): Register Prometheus metrics
// - StartMetricsCollector(): Start background collection
// - StopMetricsCollector(): Stop metrics collection
// - GetDefaultCollector(): Get singleton collector

// Warmup functions (from warmup.go)
// - WarmupPool(): Pre-establish connections
// - WarmupState: Warmup operation state
// - WarmupResult: Warmup operation result

// Health check functions (from health.go)
// - StartHealthChecker(): Start background health checks
// - StopHealthChecker(): Stop health checks
// - NewHealthChecker(): Create health checker instance
// - HealthChecker: Health checker struct
// - HealthCheckResult: Individual check result

// Adaptive sizing functions (from adaptive.go)
// - StartAdaptiveManager(): Start adaptive sizing
// - StopAdaptiveManager(): Stop adaptive sizing
// - AdaptiveManager: Manager struct
