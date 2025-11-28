// Package pool provides connection pool management, monitoring, and optimization
// Task Reference: 010-connection-pool-tuning T019-T022
package pool

import (
	"context"
	"database/sql"
	"log"
	"sync"
	"sync/atomic"
	"time"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

// Warmup metrics (FR-003)
var (
	warmupDuration = promauto.NewHistogram(
		prometheus.HistogramOpts{
			Name:    "quester_db_pool_warmup_duration_seconds",
			Help:    "Time taken to complete pool warmup",
			Buckets: []float64{0.1, 0.5, 1.0, 2.0, 5.0, 10.0, 30.0, 60.0},
		},
	)

	warmupConnectionsEstablished = promauto.NewGauge(
		prometheus.GaugeOpts{
			Name: "quester_db_pool_warmup_connections_established",
			Help: "Number of connections established during warmup",
		},
	)

	warmupSuccess = promauto.NewCounter(
		prometheus.CounterOpts{
			Name: "quester_db_pool_warmup_success_total",
			Help: "Total number of successful pool warmups",
		},
	)

	warmupFailures = promauto.NewCounter(
		prometheus.CounterOpts{
			Name: "quester_db_pool_warmup_failures_total",
			Help: "Total number of failed pool warmups",
		},
	)

	warmupTimeouts = promauto.NewCounter(
		prometheus.CounterOpts{
			Name: "quester_db_pool_warmup_timeouts_total",
			Help: "Total number of pool warmup timeouts",
		},
	)
)

// WarmupState tracks the state of pool warmup
type WarmupState struct {
	InProgress  bool      // Whether warmup is currently running
	Complete    bool      // Whether warmup has completed (success or timeout)
	StartedAt   time.Time // When warmup started
	CompletedAt time.Time // When warmup completed
	Connections int       // Connections established during warmup
	Failed      int       // Connections that failed to establish
	Error       error     // Error if warmup failed
	mu          sync.RWMutex
}

// Global warmup state
var globalWarmupState = &WarmupState{}

// GetWarmupState returns the current warmup state
func GetWarmupState() *WarmupState {
	globalWarmupState.mu.RLock()
	defer globalWarmupState.mu.RUnlock()
	return &WarmupState{
		InProgress:  globalWarmupState.InProgress,
		Complete:    globalWarmupState.Complete,
		StartedAt:   globalWarmupState.StartedAt,
		CompletedAt: globalWarmupState.CompletedAt,
		Connections: globalWarmupState.Connections,
		Failed:      globalWarmupState.Failed,
		Error:       globalWarmupState.Error,
	}
}

// IsWarmupComplete returns true if warmup has completed (for health checks)
func IsWarmupComplete() bool {
	globalWarmupState.mu.RLock()
	defer globalWarmupState.mu.RUnlock()
	return globalWarmupState.Complete
}

// WarmupPool pre-establishes connections to eliminate cold-start latency
// Task Reference: T019, T021
func WarmupPool(ctx context.Context, db *sql.DB, cfg *PoolConfig) error {
	if !cfg.WarmupEnabled {
		log.Printf("[pool/warmup] Warmup disabled, skipping")
		return nil
	}

	// Mark warmup as starting
	globalWarmupState.mu.Lock()
	globalWarmupState.InProgress = true
	globalWarmupState.Complete = false
	globalWarmupState.StartedAt = time.Now()
	globalWarmupState.mu.Unlock()

	// Log warmup start (T022)
	log.Printf("[pool/warmup] Starting pool warmup: target=%d connections, timeout=%s",
		cfg.WarmupSize, cfg.WarmupTimeout)

	// Create context with timeout (T021)
	warmupCtx, cancel := context.WithTimeout(ctx, cfg.WarmupTimeout)
	defer cancel()

	startTime := time.Now()

	// Pre-establish connections in parallel
	var wg sync.WaitGroup
	var established int32
	var failed int32
	connCh := make(chan *sql.Conn, cfg.WarmupSize)
	errCh := make(chan error, cfg.WarmupSize)

	for i := 0; i < cfg.WarmupSize; i++ {
		wg.Add(1)
		go func(idx int) {
			defer wg.Done()

			// Try to acquire a connection
			conn, err := db.Conn(warmupCtx)
			if err != nil {
				atomic.AddInt32(&failed, 1)
				select {
				case errCh <- err:
				default:
				}
				return
			}

			// Ping to verify the connection is usable
			if err := conn.PingContext(warmupCtx); err != nil {
				conn.Close()
				atomic.AddInt32(&failed, 1)
				select {
				case errCh <- err:
				default:
				}
				return
			}

			atomic.AddInt32(&established, 1)
			connCh <- conn
		}(i)
	}

	// Wait for all goroutines with timeout
	done := make(chan struct{})
	go func() {
		wg.Wait()
		close(done)
	}()

	var warmupErr error
	select {
	case <-done:
		// All goroutines completed
	case <-warmupCtx.Done():
		// Timeout (T021)
		warmupErr = ErrWarmupTimeout
		warmupTimeouts.Inc()
		log.Printf("[pool/warmup] WARNING: Warmup timeout after %s", cfg.WarmupTimeout)
	}

	// Wait for all goroutines to finish before closing channels
	// This prevents "send on closed channel" panic
	<-done

	close(connCh)
	close(errCh)

	// Return connections to pool
	for conn := range connCh {
		conn.Close() // Returns connection to pool
	}

	duration := time.Since(startTime)
	establishedCount := int(atomic.LoadInt32(&established))
	failedCount := int(atomic.LoadInt32(&failed))

	// Update warmup state
	globalWarmupState.mu.Lock()
	globalWarmupState.InProgress = false
	globalWarmupState.Complete = true
	globalWarmupState.CompletedAt = time.Now()
	globalWarmupState.Connections = establishedCount
	globalWarmupState.Failed = failedCount
	globalWarmupState.Error = warmupErr
	globalWarmupState.mu.Unlock()

	// Update metrics (T020)
	warmupDuration.Observe(duration.Seconds())
	warmupConnectionsEstablished.Set(float64(establishedCount))

	// Log completion (T022)
	if warmupErr != nil {
		warmupFailures.Inc()
		log.Printf("[pool/warmup] Warmup completed with errors: established=%d, failed=%d, duration=%s, error=%v",
			establishedCount, failedCount, duration, warmupErr)
		return NewWarmupError(cfg.WarmupSize, establishedCount, warmupErr)
	}

	if failedCount > 0 {
		warmupFailures.Inc()
		// Collect first error for context
		var firstErr error
		select {
		case firstErr = <-errCh:
		default:
		}
		log.Printf("[pool/warmup] Warmup partially succeeded: established=%d, failed=%d, duration=%s",
			establishedCount, failedCount, duration)
		return NewWarmupError(cfg.WarmupSize, establishedCount, firstErr)
	}

	warmupSuccess.Inc()
	log.Printf("[pool/warmup] Warmup completed successfully: established=%d connections in %s",
		establishedCount, duration)

	return nil
}

// WarmupResult contains the outcome of a warmup operation
type WarmupResult struct {
	Success     bool
	Established int
	Failed      int
	Duration    time.Duration
	Error       error
}

// WarmupPoolWithResult performs warmup and returns detailed results
func WarmupPoolWithResult(ctx context.Context, db *sql.DB, cfg *PoolConfig) *WarmupResult {
	start := time.Now()
	err := WarmupPool(ctx, db, cfg)

	state := GetWarmupState()
	return &WarmupResult{
		Success:     err == nil,
		Established: state.Connections,
		Failed:      state.Failed,
		Duration:    time.Since(start),
		Error:       err,
	}
}
