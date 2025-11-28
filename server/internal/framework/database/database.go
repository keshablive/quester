// GORM setup, connection pooling, migrations
package database

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/google/uuid"
	"github.com/keshablive/quester/internal/framework/database/pool"
	"github.com/keshablive/quester/internal/framework/metrics"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// DB is the global database instance
var DB *gorm.DB

// Config holds database configuration
type Config struct {
	DatabaseURL          string
	MaxOpenConns         int
	MaxIdleConns         int
	ConnMaxLifetime      time.Duration
	ConnMaxIdleTime      time.Duration // 010-connection-pool-tuning T008: Max idle time before close
	LogQueries           bool
	SlowQueryThresholdMS int // 009-database-query-optimization T010

	// Connection Pool Warmup (010-connection-pool-tuning T023)
	WarmupEnabled bool
	WarmupSize    int
	WarmupTimeout time.Duration

	// Connection Pool Health Checks (010-connection-pool-tuning T032)
	HealthCheckEnabled  bool
	HealthCheckInterval time.Duration
	HealthCheckTimeout  time.Duration

	// Connection Pool Adaptive Sizing (010-connection-pool-tuning T044)
	AdaptiveEnabled            bool
	AdaptiveMinFloor           int // Minimum pool size
	AdaptiveMaxCeiling         int // Maximum pool size
	AdaptiveScaleUpThreshold   int // Utilization % to trigger scale up
	AdaptiveScaleDownThreshold int // Utilization % to trigger scale down
}

// Initialize sets up the database connection with connection pooling
func Initialize(cfg *Config) error {
	var err error
	var logLevel logger.LogLevel

	// Set log level based on configuration
	if cfg.LogQueries {
		logLevel = logger.Info
	} else {
		logLevel = logger.Silent
	}

	// Configure GORM
	gormConfig := &gorm.Config{
		Logger: logger.Default.LogMode(logLevel),
		NowFunc: func() time.Time {
			return time.Now().UTC()
		},
		// Disable foreign key constraints for multi-tenant flexibility
		DisableForeignKeyConstraintWhenMigrating: true,
		// Enable prepared statement caching for improved performance (T062)
		// This caches SQL statements and reuses them, reducing parsing overhead
		PrepareStmt: true,
	}

	// Connect to PostgreSQL
	DB, err = gorm.Open(postgres.Open(cfg.DatabaseURL), gormConfig)
	if err != nil {
		return fmt.Errorf("failed to connect to database: %w", err)
	}

	// Get underlying SQL database for connection pooling
	sqlDB, err := DB.DB()
	if err != nil {
		return fmt.Errorf("failed to get database instance: %w", err)
	}

	// Configure connection pooling (constitutional requirement: Performance First)
	sqlDB.SetMaxOpenConns(cfg.MaxOpenConns)       // Max concurrent connections
	sqlDB.SetMaxIdleConns(cfg.MaxIdleConns)       // Idle connections in pool
	sqlDB.SetConnMaxLifetime(cfg.ConnMaxLifetime) // Connection reuse lifetime
	// 010-connection-pool-tuning T008: Set idle timeout (0 means no timeout)
	if cfg.ConnMaxIdleTime > 0 {
		sqlDB.SetConnMaxIdleTime(cfg.ConnMaxIdleTime)
	}

	// Test the connection
	if err := sqlDB.Ping(); err != nil {
		return fmt.Errorf("failed to ping database: %w", err)
	}

	// Install Prometheus metrics plugin
	if err := metrics.InstallGormMetrics(DB); err != nil {
		log.Printf("Warning: failed to install GORM metrics plugin: %v", err)
		// Non-fatal error, continue startup
	}

	// Install query metrics plugin for slow query detection (009-database-query-optimization T010)
	slowQueryThreshold := cfg.SlowQueryThresholdMS
	if slowQueryThreshold <= 0 {
		slowQueryThreshold = 100 // Default per FR-006
	}
	if err := metrics.InstallQueryMetricsPlugin(DB, slowQueryThreshold); err != nil {
		log.Printf("Warning: failed to install query metrics plugin: %v", err)
		// Non-fatal error, continue startup
	}

	// Start pool metrics collector (010-connection-pool-tuning T016)
	if err := pool.StartMetricsCollector(sqlDB, cfg.MaxOpenConns, cfg.MaxIdleConns); err != nil {
		log.Printf("Warning: failed to start pool metrics collector: %v", err)
		// Non-fatal error, continue startup
	}

	// Warmup pool if enabled (010-connection-pool-tuning T023)
	if cfg.WarmupEnabled {
		warmupCfg := &pool.PoolConfig{
			WarmupEnabled: cfg.WarmupEnabled,
			WarmupSize:    cfg.WarmupSize,
			WarmupTimeout: cfg.WarmupTimeout,
		}
		// Clamp warmup size to max open connections
		if warmupCfg.WarmupSize > cfg.MaxOpenConns {
			warmupCfg.WarmupSize = cfg.MaxOpenConns
		}
		if warmupCfg.WarmupSize < 1 {
			warmupCfg.WarmupSize = 1
		}
		if err := pool.WarmupPool(context.Background(), sqlDB, warmupCfg); err != nil {
			log.Printf("Warning: pool warmup failed: %v", err)
			// Non-fatal error per spec - continue startup
		}
	}

	// Start health checker if enabled (010-connection-pool-tuning T032)
	if cfg.HealthCheckEnabled {
		healthCfg := &pool.PoolConfig{
			HealthCheckEnabled:  cfg.HealthCheckEnabled,
			HealthCheckInterval: cfg.HealthCheckInterval,
			HealthCheckTimeout:  cfg.HealthCheckTimeout,
		}
		if err := pool.StartHealthChecker(sqlDB, healthCfg); err != nil {
			log.Printf("Warning: failed to start health checker: %v", err)
			// Non-fatal error, continue startup
		}
	}

	// Start adaptive manager if enabled (010-connection-pool-tuning T044)
	if cfg.AdaptiveEnabled {
		adaptiveCfg := &pool.PoolConfig{
			AdaptiveEnabled:         cfg.AdaptiveEnabled,
			AdaptiveMinFloor:        cfg.AdaptiveMinFloor,
			AdaptiveMaxCeiling:      cfg.AdaptiveMaxCeiling,
			AdaptiveScaleUpThresh:   cfg.AdaptiveScaleUpThreshold,
			AdaptiveScaleDownThresh: cfg.AdaptiveScaleDownThreshold,
			MaxOpenConns:            cfg.MaxOpenConns, // Initial size
		}
		// Validate bounds
		if adaptiveCfg.AdaptiveMinFloor <= 0 {
			adaptiveCfg.AdaptiveMinFloor = cfg.MaxIdleConns // Default floor to max idle
		}
		if adaptiveCfg.AdaptiveMaxCeiling <= 0 {
			adaptiveCfg.AdaptiveMaxCeiling = cfg.MaxOpenConns * 2 // Default ceiling to 2x max open
		}
		if adaptiveCfg.AdaptiveScaleUpThresh <= 0 {
			adaptiveCfg.AdaptiveScaleUpThresh = 80 // Default 80%
		}
		if adaptiveCfg.AdaptiveScaleDownThresh <= 0 {
			adaptiveCfg.AdaptiveScaleDownThresh = 30 // Default 30%
		}
		if err := pool.StartAdaptiveManager(sqlDB, adaptiveCfg); err != nil {
			log.Printf("Warning: failed to start adaptive manager: %v", err)
			// Non-fatal error, continue startup
		}
	}

	log.Printf("Database connected successfully (max_open=%d, max_idle=%d, max_lifetime=%s)",
		cfg.MaxOpenConns, cfg.MaxIdleConns, cfg.ConnMaxLifetime)

	return nil
}

// Close closes the database connection
func Close() error {
	if DB == nil {
		return nil
	}

	// Stop adaptive manager (010-connection-pool-tuning T044)
	if err := pool.StopAdaptiveManager(); err != nil {
		log.Printf("Warning: failed to stop adaptive manager: %v", err)
	}

	// Stop health checker (010-connection-pool-tuning T032)
	if err := pool.StopHealthChecker(); err != nil {
		log.Printf("Warning: failed to stop health checker: %v", err)
	}

	// Stop pool metrics collector (010-connection-pool-tuning T016)
	if err := pool.StopMetricsCollector(); err != nil {
		log.Printf("Warning: failed to stop pool metrics collector: %v", err)
	}

	sqlDB, err := DB.DB()
	if err != nil {
		return fmt.Errorf("failed to get database instance: %w", err)
	}

	return sqlDB.Close()
}

// AutoMigrate runs database migrations for the given models
func AutoMigrate(models ...interface{}) error {
	if DB == nil {
		return fmt.Errorf("database not initialized")
	}

	return DB.AutoMigrate(models...)
}

// TenantScope is a GORM scope that filters queries by tenant_id
// Constitutional requirement: Multi-Tenant Architecture
func TenantScope(tenantID uuid.UUID) func(db *gorm.DB) *gorm.DB {
	return func(db *gorm.DB) *gorm.DB {
		return db.Where("tenant_id = ?", tenantID)
	}
}

// WithTenant returns a database instance scoped to a specific tenant
func WithTenant(tenantID uuid.UUID) *gorm.DB {
	if DB == nil {
		log.Fatal("database not initialized")
	}
	return DB.Scopes(TenantScope(tenantID))
}

// Transaction executes a function within a database transaction
func Transaction(fn func(tx *gorm.DB) error) error {
	if DB == nil {
		return fmt.Errorf("database not initialized")
	}

	return DB.Transaction(fn)
}

// TransactionWithContext executes a function within a database transaction with context
func TransactionWithContext(ctx context.Context, fn func(tx *gorm.DB) error) error {
	if DB == nil {
		return fmt.Errorf("database not initialized")
	}

	return DB.WithContext(ctx).Transaction(fn)
}

// Health checks the database health
func Health() error {
	if DB == nil {
		return fmt.Errorf("database not initialized")
	}

	sqlDB, err := DB.DB()
	if err != nil {
		return fmt.Errorf("failed to get database instance: %w", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	return sqlDB.PingContext(ctx)
}

// Stats returns database connection pool statistics
type Stats struct {
	MaxOpenConnections int
	OpenConnections    int
	InUse              int
	Idle               int
}

// GlobalReplicaManager holds the singleton replica manager instance
// Task Reference: 009-database-query-optimization T060
var GlobalReplicaManager *ReplicaManager

// InitializeReplicas initializes the global replica manager with the given configuration
// Task Reference: 009-database-query-optimization T060
func InitializeReplicas(cfg *ReplicaConfig) error {
	if DB == nil {
		return fmt.Errorf("primary database not initialized")
	}

	var err error
	GlobalReplicaManager, err = NewReplicaManager(DB, cfg)
	if err != nil {
		return fmt.Errorf("failed to create replica manager: %w", err)
	}

	log.Printf("Replica manager initialized: enabled=%v, replicas=%d",
		cfg.Enabled, len(cfg.DSNs))
	return nil
}

// GetReadDB returns a database connection for read operations
// If replicas are configured and healthy, uses round-robin selection
// Otherwise falls back to primary
// Task Reference: 009-database-query-optimization T060
func GetReadDB(ctx context.Context) *gorm.DB {
	if GlobalReplicaManager != nil {
		db, err := GlobalReplicaManager.GetReadDB(ctx)
		if err == nil {
			return db
		}
		// Fall back to primary on error
		log.Printf("Warning: failed to get read replica: %v, using primary", err)
	}
	return DB.WithContext(ctx)
}

// GetWriteDB returns the primary database connection for write operations
// Task Reference: 009-database-query-optimization T060
func GetWriteDB(ctx context.Context) *gorm.DB {
	if GlobalReplicaManager != nil {
		return GlobalReplicaManager.GetWriteDB(ctx)
	}
	return DB.WithContext(ctx)
}

// GetReplicaHealth returns health status of all replicas
// Task Reference: 009-database-query-optimization T061
func GetReplicaHealth() map[string]interface{} {
	if GlobalReplicaManager == nil {
		return map[string]interface{}{
			"enabled": false,
		}
	}
	return GlobalReplicaManager.GetHealth()
}

func GetStats() (*Stats, error) {
	if DB == nil {
		return nil, fmt.Errorf("database not initialized")
	}

	sqlDB, err := DB.DB()
	if err != nil {
		return nil, fmt.Errorf("failed to get database instance: %w", err)
	}

	stats := sqlDB.Stats()
	return &Stats{
		MaxOpenConnections: stats.MaxOpenConnections,
		OpenConnections:    stats.OpenConnections,
		InUse:              stats.InUse,
		Idle:               stats.Idle,
	}, nil
}

// StartMetricsCollector starts a goroutine that periodically updates database metrics
func StartMetricsCollector(interval time.Duration) {
	go func() {
		ticker := time.NewTicker(interval)
		defer ticker.Stop()

		for range ticker.C {
			if DB == nil {
				continue
			}

			sqlDB, err := DB.DB()
			if err != nil {
				continue
			}

			stats := sqlDB.Stats()
			metrics.UpdateDBConnectionStats(stats.InUse, stats.Idle)
		}
	}()
}
