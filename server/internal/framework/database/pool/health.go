// Package pool provides connection pool management, monitoring, and optimization
// Task Reference: 010-connection-pool-tuning T026-T031
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

// Health check metrics (FR-004)
var (
	healthCheckDuration = promauto.NewHistogram(
		prometheus.HistogramOpts{
			Name:    "quester_db_pool_health_check_duration_seconds",
			Help:    "Time taken to complete a health check",
			Buckets: []float64{0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0},
		},
	)

	healthCheckSuccess = promauto.NewCounter(
		prometheus.CounterOpts{
			Name: "quester_db_pool_health_check_success_total",
			Help: "Total number of successful health checks",
		},
	)

	healthCheckFailures = promauto.NewCounter(
		prometheus.CounterOpts{
			Name: "quester_db_pool_health_check_failures_total",
			Help: "Total number of failed health checks",
		},
	)

	healthCheckConsecutiveFailures = promauto.NewGauge(
		prometheus.GaugeOpts{
			Name: "quester_db_pool_health_check_consecutive_failures",
			Help: "Current number of consecutive health check failures",
		},
	)

	poolHealthStatus = promauto.NewGauge(
		prometheus.GaugeOpts{
			Name: "quester_db_pool_health_status",
			Help: "Current pool health status (1=healthy, 0=unhealthy, 0.5=degraded)",
		},
	)
)

// HealthChecker manages periodic health checks for the connection pool
type HealthChecker struct {
	db       *sql.DB
	cfg      *PoolConfig
	interval time.Duration
	timeout  time.Duration

	// Internal state
	ctx                 context.Context
	cancel              context.CancelFunc
	wg                  sync.WaitGroup
	mu                  sync.RWMutex
	running             bool
	lastResult          *HealthCheckResult
	consecutiveFailures int
	healthy             bool
}

// NewHealthChecker creates a new health checker for the given database
func NewHealthChecker(db *sql.DB, cfg *PoolConfig) *HealthChecker {
	return &HealthChecker{
		db:       db,
		cfg:      cfg,
		interval: cfg.HealthCheckInterval,
		timeout:  cfg.HealthCheckTimeout,
		healthy:  true, // Assume healthy until proven otherwise
	}
}

// Start begins the periodic health check goroutine
// Task Reference: T027
func (hc *HealthChecker) Start() error {
	hc.mu.Lock()

	if hc.running {
		hc.mu.Unlock()
		return NewPoolError("health checker already running")
	}

	hc.ctx, hc.cancel = context.WithCancel(context.Background())
	hc.running = true
	hc.mu.Unlock()

	// Run initial health check (outside lock to prevent deadlock)
	hc.checkHealth()

	// Start background checker
	hc.wg.Add(1)
	go hc.run()

	log.Printf("[pool/health] Started health checker (interval=%s, timeout=%s)",
		hc.interval, hc.timeout)

	return nil
}

// Stop gracefully stops the health checker
// Task Reference: T029
func (hc *HealthChecker) Stop() error {
	hc.mu.Lock()
	defer hc.mu.Unlock()

	if !hc.running {
		return nil
	}

	hc.cancel()
	hc.wg.Wait()
	hc.running = false

	log.Printf("[pool/health] Stopped health checker")

	return nil
}

// IsHealthy returns the current health status
// Task Reference: T031
func (hc *HealthChecker) IsHealthy() bool {
	hc.mu.RLock()
	defer hc.mu.RUnlock()
	return hc.healthy
}

// GetLastResult returns the most recent health check result
func (hc *HealthChecker) GetLastResult() *HealthCheckResult {
	hc.mu.RLock()
	defer hc.mu.RUnlock()
	return hc.lastResult
}

// GetConsecutiveFailures returns the number of consecutive failures
func (hc *HealthChecker) GetConsecutiveFailures() int {
	hc.mu.RLock()
	defer hc.mu.RUnlock()
	return hc.consecutiveFailures
}

// IsRunning returns whether the health checker is currently running
func (hc *HealthChecker) IsRunning() bool {
	hc.mu.RLock()
	defer hc.mu.RUnlock()
	return hc.running
}

// run is the main health check loop
func (hc *HealthChecker) run() {
	defer hc.wg.Done()

	ticker := time.NewTicker(hc.interval)
	defer ticker.Stop()

	for {
		select {
		case <-hc.ctx.Done():
			return
		case <-ticker.C:
			hc.checkHealth()
		}
	}
}

// checkHealth performs a single health check
// Task Reference: T026
func (hc *HealthChecker) checkHealth() {
	start := time.Now()

	// Create context with timeout
	ctx, cancel := context.WithTimeout(hc.ctx, hc.timeout)
	defer cancel()

	// Execute SELECT 1 to verify connection
	err := hc.checkConnection(ctx)
	duration := time.Since(start)

	// Record metrics (T030)
	healthCheckDuration.Observe(duration.Seconds())

	hc.mu.Lock()
	defer hc.mu.Unlock()

	if err != nil {
		// Health check failed (T028)
		hc.consecutiveFailures++
		healthCheckFailures.Inc()
		healthCheckConsecutiveFailures.Set(float64(hc.consecutiveFailures))

		hc.lastResult = NewHealthCheckResultFailed(duration, err, hc.consecutiveFailures)

		// Mark as unhealthy after 3 consecutive failures
		if hc.consecutiveFailures >= 3 {
			hc.healthy = false
			poolHealthStatus.Set(0)
			log.Printf("[pool/health] Pool marked unhealthy: %d consecutive failures, last error: %v",
				hc.consecutiveFailures, err)
		} else {
			poolHealthStatus.Set(0.5) // Degraded
			log.Printf("[pool/health] Health check failed (%d/%d): %v",
				hc.consecutiveFailures, 3, err)
		}
	} else {
		// Health check succeeded
		if hc.consecutiveFailures > 0 {
			log.Printf("[pool/health] Connection recovered after %d failures", hc.consecutiveFailures)
		}

		hc.consecutiveFailures = 0
		hc.healthy = true
		healthCheckSuccess.Inc()
		healthCheckConsecutiveFailures.Set(0)
		poolHealthStatus.Set(1)

		hc.lastResult = NewHealthCheckResult(duration)
	}
}

// checkConnection verifies the database connection with SELECT 1
// Task Reference: T026
func (hc *HealthChecker) checkConnection(ctx context.Context) error {
	var result int
	err := hc.db.QueryRowContext(ctx, "SELECT 1").Scan(&result)
	if err != nil {
		return err
	}
	if result != 1 {
		return NewPoolError("unexpected health check result")
	}
	return nil
}

// Global health checker instance
var defaultHealthChecker *HealthChecker
var healthCheckerMu sync.Mutex

// StartHealthChecker starts the global health checker
// Called from database.Initialize() after pool is ready
// Task Reference: T027
func StartHealthChecker(db *sql.DB, cfg *PoolConfig) error {
	healthCheckerMu.Lock()
	defer healthCheckerMu.Unlock()

	if !cfg.HealthCheckEnabled {
		log.Printf("[pool/health] Health checks disabled")
		return nil
	}

	if defaultHealthChecker != nil && defaultHealthChecker.IsRunning() {
		return NewPoolError("health checker already running")
	}

	defaultHealthChecker = NewHealthChecker(db, cfg)
	return defaultHealthChecker.Start()
}

// StopHealthChecker stops the global health checker
// Called during graceful shutdown
// Task Reference: T029
func StopHealthChecker() error {
	healthCheckerMu.Lock()
	defer healthCheckerMu.Unlock()

	if defaultHealthChecker == nil {
		return nil
	}

	return defaultHealthChecker.Stop()
}

// GetDefaultHealthChecker returns the global health checker (for testing/status)
func GetDefaultHealthChecker() *HealthChecker {
	healthCheckerMu.Lock()
	defer healthCheckerMu.Unlock()
	return defaultHealthChecker
}

// IsPoolHealthy returns the current pool health status
// Uses the global health checker if available, otherwise returns true
func IsPoolHealthy() bool {
	healthCheckerMu.Lock()
	defer healthCheckerMu.Unlock()

	if defaultHealthChecker == nil {
		return true // No health checker means we assume healthy
	}

	return defaultHealthChecker.IsHealthy()
}
