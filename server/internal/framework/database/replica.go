// Package database provides read replica support for database scaling.
// Task Reference: 009-database-query-optimization T051-T061
package database

import (
	"context"
	"errors"
	"fmt"
	"log"
	"sync"
	"sync/atomic"
	"time"

	"github.com/keshablive/quester/internal/framework/metrics"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var (
	// ErrNoReplicasAvailable is returned when no replicas are healthy
	ErrNoReplicasAvailable = errors.New("no replicas available")
	// ErrReplicaNotConfigured is returned when replicas are not configured
	ErrReplicaNotConfigured = errors.New("replicas not configured")
)

// ReplicaConfig holds configuration for read replicas per data-model.md
type ReplicaConfig struct {
	Enabled             bool          // Whether replica routing is enabled
	DSNs                []string      // Connection strings for replicas
	MaxOpenConns        int           // Max connections per replica
	MaxIdleConns        int           // Max idle connections per replica
	ConnMaxLifetime     time.Duration // Connection lifetime
	HealthCheckInterval time.Duration // How often to check replica health
	StaleThresholdMS    int           // Max acceptable replication lag in ms
}

// DefaultReplicaConfig returns sensible defaults
func DefaultReplicaConfig() *ReplicaConfig {
	return &ReplicaConfig{
		Enabled:             false,
		MaxOpenConns:        10,
		MaxIdleConns:        2,
		ConnMaxLifetime:     5 * time.Minute,
		HealthCheckInterval: 10 * time.Second,
		StaleThresholdMS:    1000, // 1 second default threshold
	}
}

// replicaState tracks the health state of a single replica
type replicaState struct {
	db        *gorm.DB
	healthy   bool
	lagMS     int64
	lastCheck time.Time
	mu        sync.RWMutex
}

// ReplicaManager manages primary and replica database connections
// Task Reference: T052
type ReplicaManager struct {
	primary    *gorm.DB
	replicas   []*replicaState
	config     *ReplicaConfig
	roundRobin uint64 // Atomic counter for round-robin selection
	stopChan   chan struct{}
	wg         sync.WaitGroup
}

// NewReplicaManager creates a new replica manager
// Task Reference: T052
func NewReplicaManager(primary *gorm.DB, config *ReplicaConfig) (*ReplicaManager, error) {
	if primary == nil {
		return nil, errors.New("primary database connection required")
	}

	if config == nil {
		config = DefaultReplicaConfig()
	}

	rm := &ReplicaManager{
		primary:  primary,
		config:   config,
		stopChan: make(chan struct{}),
	}

	// Initialize replicas if enabled
	if config.Enabled && len(config.DSNs) > 0 {
		if err := rm.initializeReplicas(); err != nil {
			return nil, fmt.Errorf("failed to initialize replicas: %w", err)
		}

		// Start health check goroutine
		rm.startHealthChecker()
	}

	return rm, nil
}

// initializeReplicas connects to all configured replicas
func (rm *ReplicaManager) initializeReplicas() error {
	rm.replicas = make([]*replicaState, 0, len(rm.config.DSNs))

	gormConfig := &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
		NowFunc: func() time.Time {
			return time.Now().UTC()
		},
	}

	for i, dsn := range rm.config.DSNs {
		db, err := gorm.Open(postgres.Open(dsn), gormConfig)
		if err != nil {
			log.Printf("replica[%d]: failed to connect: %v", i, err)
			continue // Skip failed replicas, don't fail entirely
		}

		sqlDB, err := db.DB()
		if err != nil {
			log.Printf("replica[%d]: failed to get sql.DB: %v", i, err)
			continue
		}

		// Configure connection pool
		sqlDB.SetMaxOpenConns(rm.config.MaxOpenConns)
		sqlDB.SetMaxIdleConns(rm.config.MaxIdleConns)
		sqlDB.SetConnMaxLifetime(rm.config.ConnMaxLifetime)

		// Initial health check
		healthy := sqlDB.Ping() == nil

		rm.replicas = append(rm.replicas, &replicaState{
			db:        db,
			healthy:   healthy,
			lastCheck: time.Now(),
		})

		// Set initial metrics
		replicaIndex := fmt.Sprintf("replica_%d", i)
		metrics.SetReplicaHealth(replicaIndex, healthy)

		log.Printf("replica[%d]: connected (healthy=%v)", i, healthy)
	}

	if len(rm.replicas) == 0 {
		return errors.New("no replicas could be initialized")
	}

	log.Printf("replica_manager: initialized %d replicas", len(rm.replicas))
	return nil
}

// startHealthChecker starts a background goroutine to check replica health
func (rm *ReplicaManager) startHealthChecker() {
	rm.wg.Add(1)
	go func() {
		defer rm.wg.Done()
		ticker := time.NewTicker(rm.config.HealthCheckInterval)
		defer ticker.Stop()

		for {
			select {
			case <-ticker.C:
				rm.checkReplicaHealth()
			case <-rm.stopChan:
				return
			}
		}
	}()
}

// checkReplicaHealth checks the health and lag of all replicas
// Task Reference: T055
func (rm *ReplicaManager) checkReplicaHealth() {
	for i, replica := range rm.replicas {
		replicaIndex := fmt.Sprintf("replica_%d", i)

		replica.mu.Lock()

		// Check basic connectivity
		sqlDB, err := replica.db.DB()
		if err != nil {
			replica.healthy = false
			replica.mu.Unlock()
			metrics.SetReplicaHealth(replicaIndex, false)
			continue
		}

		if err := sqlDB.Ping(); err != nil {
			replica.healthy = false
			replica.mu.Unlock()
			metrics.SetReplicaHealth(replicaIndex, false)
			log.Printf("replica[%d]: health check failed: %v", i, err)
			continue
		}

		// Check replication lag (PostgreSQL specific)
		var lagMS int64
		err = replica.db.Raw(`
			SELECT COALESCE(
				EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp())) * 1000,
				0
			)::bigint
		`).Scan(&lagMS).Error

		if err != nil {
			// If we can't check lag, assume it's acceptable but log warning
			log.Printf("replica[%d]: could not check replication lag: %v", i, err)
			lagMS = 0
		}

		replica.lagMS = lagMS
		replica.healthy = lagMS <= int64(rm.config.StaleThresholdMS)
		replica.lastCheck = time.Now()

		replica.mu.Unlock()

		// Update metrics
		metrics.SetReplicaLag(replicaIndex, float64(lagMS)/1000)
		metrics.SetReplicaHealth(replicaIndex, replica.healthy)
	}
}

// GetReadDB returns a database connection for read operations
// Uses round-robin selection among healthy replicas
// Task Reference: T053
func (rm *ReplicaManager) GetReadDB(ctx context.Context) (*gorm.DB, error) {
	// Check if force read from primary is requested
	if forceReadPrimary(ctx) {
		metrics.RecordReplicaRouting("primary_forced")
		return rm.primary.WithContext(ctx), nil
	}

	// If replicas not configured, return primary
	if !rm.config.Enabled || len(rm.replicas) == 0 {
		metrics.RecordReplicaRouting("primary_no_replicas")
		return rm.primary.WithContext(ctx), nil
	}

	// Find a healthy replica using round-robin
	numReplicas := len(rm.replicas)
	startIndex := atomic.AddUint64(&rm.roundRobin, 1) % uint64(numReplicas)

	for i := 0; i < numReplicas; i++ {
		idx := (int(startIndex) + i) % numReplicas
		replica := rm.replicas[idx]

		replica.mu.RLock()
		healthy := replica.healthy
		db := replica.db
		replica.mu.RUnlock()

		if healthy {
			replicaIndex := fmt.Sprintf("replica_%d", idx)
			metrics.RecordReplicaRouting(replicaIndex)
			return db.WithContext(ctx), nil
		}
	}

	// Fallback to primary if no healthy replicas
	// Task Reference: T057
	log.Printf("replica_manager: no healthy replicas, falling back to primary")
	metrics.RecordReplicaRouting("primary_fallback")
	return rm.primary.WithContext(ctx), nil
}

// GetWriteDB returns the primary database connection for write operations
// Task Reference: T054
func (rm *ReplicaManager) GetWriteDB(ctx context.Context) *gorm.DB {
	metrics.RecordReplicaRouting("primary_write")
	return rm.primary.WithContext(ctx)
}

// GetPrimary returns the primary database connection directly
func (rm *ReplicaManager) GetPrimary() *gorm.DB {
	return rm.primary
}

// Close closes all replica connections
func (rm *ReplicaManager) Close() error {
	// Signal health checker to stop
	close(rm.stopChan)
	rm.wg.Wait()

	var errs []error
	for i, replica := range rm.replicas {
		sqlDB, err := replica.db.DB()
		if err != nil {
			errs = append(errs, fmt.Errorf("replica[%d]: %w", i, err))
			continue
		}
		if err := sqlDB.Close(); err != nil {
			errs = append(errs, fmt.Errorf("replica[%d]: %w", i, err))
		}
	}

	if len(errs) > 0 {
		return fmt.Errorf("errors closing replicas: %v", errs)
	}
	return nil
}

// GetReplicaStats returns stats for all replicas
func (rm *ReplicaManager) GetReplicaStats() []ReplicaStats {
	stats := make([]ReplicaStats, len(rm.replicas))

	for i, replica := range rm.replicas {
		replica.mu.RLock()
		stats[i] = ReplicaStats{
			Index:     i,
			Healthy:   replica.healthy,
			LagMS:     replica.lagMS,
			LastCheck: replica.lastCheck,
		}
		replica.mu.RUnlock()
	}

	return stats
}

// GetHealth returns health status for all replicas as a map
// Task Reference: 009-database-query-optimization T061
func (rm *ReplicaManager) GetHealth() map[string]interface{} {
	result := map[string]interface{}{
		"enabled":       rm.config.Enabled,
		"replica_count": len(rm.replicas),
	}

	if !rm.config.Enabled || len(rm.replicas) == 0 {
		return result
	}

	healthyCount := 0
	replicas := make([]map[string]interface{}, len(rm.replicas))

	for i, replica := range rm.replicas {
		replica.mu.RLock()
		replicas[i] = map[string]interface{}{
			"index":      i,
			"healthy":    replica.healthy,
			"lag_ms":     replica.lagMS,
			"last_check": replica.lastCheck.Format(time.RFC3339),
		}
		if replica.healthy {
			healthyCount++
		}
		replica.mu.RUnlock()
	}

	result["healthy_count"] = healthyCount
	result["replicas"] = replicas
	result["all_healthy"] = healthyCount == len(rm.replicas)

	return result
}

// ReplicaStats contains statistics for a single replica
type ReplicaStats struct {
	Index     int
	Healthy   bool
	LagMS     int64
	LastCheck time.Time
}

// Context key for forcing read from primary
type forceReadPrimaryKey struct{}

// WithForceReadPrimary returns a context that forces reads to use primary
// Task Reference: T058
func WithForceReadPrimary(ctx context.Context) context.Context {
	return context.WithValue(ctx, forceReadPrimaryKey{}, true)
}

// forceReadPrimary checks if the context requires reading from primary
func forceReadPrimary(ctx context.Context) bool {
	if ctx == nil {
		return false
	}
	force, ok := ctx.Value(forceReadPrimaryKey{}).(bool)
	return ok && force
}

// Global replica manager instance
var replicaManager *ReplicaManager

// InitReplicaManager initializes the global replica manager
// Task Reference: T060
func InitReplicaManager(primary *gorm.DB, config *ReplicaConfig) error {
	if !config.Enabled {
		log.Printf("replica_manager: disabled (DB_REPLICA_ENABLED=false)")
		return nil
	}

	rm, err := NewReplicaManager(primary, config)
	if err != nil {
		return err
	}

	replicaManager = rm
	return nil
}

// GetReplicaManager returns the global replica manager
func GetReplicaManager() *ReplicaManager {
	return replicaManager
}

// ReadDB returns a database connection for read operations
// This is a convenience function using the global replica manager
func ReadDB(ctx context.Context) (*gorm.DB, error) {
	if replicaManager == nil {
		// No replica manager, use primary
		if DB == nil {
			return nil, errors.New("database not initialized")
		}
		return DB.WithContext(ctx), nil
	}
	return replicaManager.GetReadDB(ctx)
}

// WriteDB returns a database connection for write operations
// This is a convenience function using the global replica manager
func WriteDB(ctx context.Context) *gorm.DB {
	if replicaManager == nil {
		if DB == nil {
			log.Fatal("database not initialized")
		}
		return DB.WithContext(ctx)
	}
	return replicaManager.GetWriteDB(ctx)
}
