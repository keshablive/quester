// Package pool provides connection pool management, monitoring, and optimization
// Task Reference: 010-connection-pool-tuning T010-T014
package pool

import (
	"context"
	"database/sql"
	"log"
	"sync"
	"time"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

// Prometheus metrics for connection pool monitoring (FR-001, FR-002)
// All metrics use "quester_db_pool_" namespace per spec.md
var (
	// Connection gauges (FR-001)
	poolConnectionsOpen = promauto.NewGauge(
		prometheus.GaugeOpts{
			Name: "quester_db_pool_connections_open",
			Help: "Number of open connections to the database",
		},
	)

	poolConnectionsInUse = promauto.NewGauge(
		prometheus.GaugeOpts{
			Name: "quester_db_pool_connections_in_use",
			Help: "Number of connections currently in use",
		},
	)

	poolConnectionsIdle = promauto.NewGauge(
		prometheus.GaugeOpts{
			Name: "quester_db_pool_connections_idle",
			Help: "Number of idle connections in the pool",
		},
	)

	// Configuration gauges (FR-001)
	poolConnectionsMaxOpen = promauto.NewGauge(
		prometheus.GaugeOpts{
			Name: "quester_db_pool_connections_max_open",
			Help: "Maximum number of open connections configured",
		},
	)

	poolConnectionsMaxIdleConfigured = promauto.NewGauge(
		prometheus.GaugeOpts{
			Name: "quester_db_pool_connections_max_idle_configured",
			Help: "Maximum number of idle connections configured",
		},
	)

	// Utilization gauge (FR-002)
	poolUtilization = promauto.NewGauge(
		prometheus.GaugeOpts{
			Name: "quester_db_pool_utilization_ratio",
			Help: "Pool utilization ratio (in_use / max_open), 0-1",
		},
	)

	// Wait metrics (FR-002)
	poolWaitCount = promauto.NewCounter(
		prometheus.CounterOpts{
			Name: "quester_db_pool_wait_count_total",
			Help: "Total number of connections waits (when pool was full)",
		},
	)

	poolWaitDuration = promauto.NewHistogram(
		prometheus.HistogramOpts{
			Name:    "quester_db_pool_wait_duration_seconds",
			Help:    "Time spent waiting to acquire a connection",
			Buckets: []float64{0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0},
		},
	)

	// Connection lifecycle counters (FR-001)
	poolConnectionsMaxIdleClosed = promauto.NewCounter(
		prometheus.CounterOpts{
			Name: "quester_db_pool_connections_max_idle_closed_total",
			Help: "Total connections closed due to max idle limit",
		},
	)

	poolConnectionsMaxIdleTimeClosed = promauto.NewCounter(
		prometheus.CounterOpts{
			Name: "quester_db_pool_connections_max_idle_time_closed_total",
			Help: "Total connections closed due to idle timeout",
		},
	)

	poolConnectionsMaxLifetimeClosed = promauto.NewCounter(
		prometheus.CounterOpts{
			Name: "quester_db_pool_connections_max_lifetime_closed_total",
			Help: "Total connections closed due to max lifetime",
		},
	)

	// Collection metadata
	lastCollectionTime = promauto.NewGauge(
		prometheus.GaugeOpts{
			Name: "quester_db_pool_last_collection_timestamp",
			Help: "Unix timestamp of the last metrics collection",
		},
	)
)

// MetricsCollector manages periodic collection of pool statistics
type MetricsCollector struct {
	db       *sql.DB
	interval time.Duration
	maxOpen  int
	maxIdle  int

	// Internal state
	ctx        context.Context
	cancel     context.CancelFunc
	wg         sync.WaitGroup
	mu         sync.Mutex
	running    bool
	lastStats  sql.DBStats
	lastWaitNs int64 // Track wait duration changes
}

// NewMetricsCollector creates a new metrics collector for the given database
// Task Reference: T012
func NewMetricsCollector(db *sql.DB, interval time.Duration, maxOpen, maxIdle int) *MetricsCollector {
	return &MetricsCollector{
		db:       db,
		interval: interval,
		maxOpen:  maxOpen,
		maxIdle:  maxIdle,
	}
}

// Start begins the periodic metrics collection goroutine
// Task Reference: T013
func (mc *MetricsCollector) Start() error {
	mc.mu.Lock()
	defer mc.mu.Unlock()

	if mc.running {
		return ErrCollectorAlreadyRunning
	}

	mc.ctx, mc.cancel = context.WithCancel(context.Background())
	mc.running = true

	// Set static configuration metrics
	poolConnectionsMaxOpen.Set(float64(mc.maxOpen))
	poolConnectionsMaxIdleConfigured.Set(float64(mc.maxIdle))

	// Collect initial stats
	mc.collectStats()

	// Start background collector
	mc.wg.Add(1)
	go mc.run()

	log.Printf("[pool/metrics] Started metrics collector (interval=%s, max_open=%d, max_idle=%d)",
		mc.interval, mc.maxOpen, mc.maxIdle)

	return nil
}

// Stop gracefully stops the metrics collector
// Task Reference: T014
func (mc *MetricsCollector) Stop() error {
	mc.mu.Lock()
	defer mc.mu.Unlock()

	if !mc.running {
		return nil
	}

	mc.cancel()
	mc.wg.Wait()
	mc.running = false

	log.Printf("[pool/metrics] Stopped metrics collector")

	return nil
}

// IsRunning returns whether the collector is currently running
func (mc *MetricsCollector) IsRunning() bool {
	mc.mu.Lock()
	defer mc.mu.Unlock()
	return mc.running
}

// run is the main collection loop
func (mc *MetricsCollector) run() {
	defer mc.wg.Done()

	ticker := time.NewTicker(mc.interval)
	defer ticker.Stop()

	for {
		select {
		case <-mc.ctx.Done():
			return
		case <-ticker.C:
			mc.collectStats()
		}
	}
}

// collectStats reads sql.DB.Stats() and updates Prometheus metrics
// Task Reference: T012
func (mc *MetricsCollector) collectStats() {
	stats := mc.db.Stats()

	// Update connection gauges
	poolConnectionsOpen.Set(float64(stats.OpenConnections))
	poolConnectionsInUse.Set(float64(stats.InUse))
	poolConnectionsIdle.Set(float64(stats.Idle))

	// Calculate and update utilization (FR-002)
	if mc.maxOpen > 0 {
		utilization := float64(stats.InUse) / float64(mc.maxOpen)
		poolUtilization.Set(utilization)
	}

	// Update wait metrics (delta from last collection)
	if stats.WaitCount > mc.lastStats.WaitCount {
		waitDelta := stats.WaitCount - mc.lastStats.WaitCount
		poolWaitCount.Add(float64(waitDelta))
	}

	// Track wait duration (cumulative in nanoseconds)
	waitNs := stats.WaitDuration.Nanoseconds()
	if waitNs > mc.lastWaitNs {
		// Approximate per-wait duration for histogram
		// This is an approximation since sql.DBStats gives cumulative values
		waitDelta := stats.WaitCount - mc.lastStats.WaitCount
		if waitDelta > 0 {
			durationDelta := waitNs - mc.lastWaitNs
			avgWaitSec := float64(durationDelta) / float64(waitDelta) / 1e9
			poolWaitDuration.Observe(avgWaitSec)
		}
	}
	mc.lastWaitNs = waitNs

	// Update lifecycle counters (cumulative)
	poolConnectionsMaxIdleClosed.Add(float64(stats.MaxIdleClosed - mc.lastStats.MaxIdleClosed))
	poolConnectionsMaxIdleTimeClosed.Add(float64(stats.MaxIdleTimeClosed - mc.lastStats.MaxIdleTimeClosed))
	poolConnectionsMaxLifetimeClosed.Add(float64(stats.MaxLifetimeClosed - mc.lastStats.MaxLifetimeClosed))

	// Update collection timestamp
	lastCollectionTime.Set(float64(time.Now().Unix()))

	// Store for next delta calculation
	mc.lastStats = stats
}

// GetStats returns the current pool statistics (for health checks)
func (mc *MetricsCollector) GetStats() *PoolStats {
	stats := mc.db.Stats()
	return FromDBStats(&stats, mc.maxOpen)
}

// RegisterMetrics registers all pool metrics with the default Prometheus registry
// This is called during server initialization
// Task Reference: T011
func RegisterMetrics() error {
	// All metrics are auto-registered via promauto
	// This function exists for explicit initialization and future custom registration
	log.Printf("[pool/metrics] Pool metrics registered")
	return nil
}

// Global collector instance for convenience
var defaultCollector *MetricsCollector
var collectorMu sync.Mutex

// StartMetricsCollector starts the global metrics collector
// Called from database.Initialize() after pool is ready
// Task Reference: T013
func StartMetricsCollector(db *sql.DB, maxOpen, maxIdle int) error {
	collectorMu.Lock()
	defer collectorMu.Unlock()

	if defaultCollector != nil && defaultCollector.IsRunning() {
		return ErrCollectorAlreadyRunning
	}

	// Default 5-second collection interval per spec
	defaultCollector = NewMetricsCollector(db, 5*time.Second, maxOpen, maxIdle)
	return defaultCollector.Start()
}

// StopMetricsCollector stops the global metrics collector
// Called during graceful shutdown
// Task Reference: T014
func StopMetricsCollector() error {
	collectorMu.Lock()
	defer collectorMu.Unlock()

	if defaultCollector == nil {
		return nil
	}

	return defaultCollector.Stop()
}

// GetDefaultCollector returns the global metrics collector (for testing/health checks)
func GetDefaultCollector() *MetricsCollector {
	collectorMu.Lock()
	defer collectorMu.Unlock()
	return defaultCollector
}

// Error definitions for metrics collector
var (
	ErrCollectorAlreadyRunning = NewPoolError("metrics collector already running")
)
