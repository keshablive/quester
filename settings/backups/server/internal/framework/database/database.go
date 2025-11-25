// GORM setup, connection pooling, migrations
package database

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/google/uuid"
	"github.com/yourusername/quester/internal/framework/metrics"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// DB is the global database instance
var DB *gorm.DB

// Config holds database configuration
type Config struct {
	DatabaseURL     string
	MaxOpenConns    int
	MaxIdleConns    int
	ConnMaxLifetime time.Duration
	LogQueries      bool
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

	// Test the connection
	if err := sqlDB.Ping(); err != nil {
		return fmt.Errorf("failed to ping database: %w", err)
	}

	// Install Prometheus metrics plugin
	if err := metrics.InstallGormMetrics(DB); err != nil {
		log.Printf("Warning: failed to install GORM metrics plugin: %v", err)
		// Non-fatal error, continue startup
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
