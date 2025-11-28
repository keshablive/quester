// Package pool provides connection pool management, monitoring, and optimization
// Task Reference: 010-connection-pool-tuning T004
package pool

import (
	"database/sql"
	"time"
)

// PoolStats represents point-in-time connection pool statistics
// Collected from sql.DB.Stats() with computed metrics
type PoolStats struct {
	// From sql.DBStats (raw values)
	MaxOpenConnections int           // Maximum number of open connections to the database
	OpenConnections    int           // Current number of established connections (in-use + idle)
	InUse              int           // Number of connections currently in use
	Idle               int           // Number of idle connections
	WaitCount          int64         // Total number of connections waited for
	WaitDuration       time.Duration // Total time blocked waiting for a new connection
	MaxIdleClosed      int64         // Total connections closed due to SetMaxIdleConns
	MaxIdleTimeClosed  int64         // Total connections closed due to SetConnMaxIdleTime
	MaxLifetimeClosed  int64         // Total connections closed due to SetConnMaxLifetime

	// Computed metrics
	Utilization float64   // InUse / MaxOpenConnections (0.0 to 1.0)
	CollectedAt time.Time // Timestamp when stats were collected
}

// NewPoolStatsFromDB creates PoolStats from sql.DB
func NewPoolStatsFromDB(db *sql.DB) *PoolStats {
	if db == nil {
		return nil
	}

	stats := db.Stats()
	ps := &PoolStats{
		MaxOpenConnections: stats.MaxOpenConnections,
		OpenConnections:    stats.OpenConnections,
		InUse:              stats.InUse,
		Idle:               stats.Idle,
		WaitCount:          stats.WaitCount,
		WaitDuration:       stats.WaitDuration,
		MaxIdleClosed:      stats.MaxIdleClosed,
		MaxIdleTimeClosed:  stats.MaxIdleTimeClosed,
		MaxLifetimeClosed:  stats.MaxLifetimeClosed,
		CollectedAt:        time.Now(),
	}

	// Compute utilization (avoid division by zero)
	if stats.MaxOpenConnections > 0 {
		ps.Utilization = float64(stats.InUse) / float64(stats.MaxOpenConnections)
	}

	return ps
}

// FromDBStats creates PoolStats from sql.DBStats with an explicit maxOpen value
// This is used when the actual configured maxOpen differs from sql.DBStats.MaxOpenConnections
func FromDBStats(stats *sql.DBStats, maxOpen int) *PoolStats {
	if stats == nil {
		return nil
	}

	ps := &PoolStats{
		MaxOpenConnections: maxOpen,
		OpenConnections:    stats.OpenConnections,
		InUse:              stats.InUse,
		Idle:               stats.Idle,
		WaitCount:          stats.WaitCount,
		WaitDuration:       stats.WaitDuration,
		MaxIdleClosed:      stats.MaxIdleClosed,
		MaxIdleTimeClosed:  stats.MaxIdleTimeClosed,
		MaxLifetimeClosed:  stats.MaxLifetimeClosed,
		CollectedAt:        time.Now(),
	}

	// Compute utilization (avoid division by zero)
	if maxOpen > 0 {
		ps.Utilization = float64(stats.InUse) / float64(maxOpen)
	}

	return ps
}

// HealthCheckResult captures the outcome of a single health check
type HealthCheckResult struct {
	Success             bool          // Whether the check passed
	Duration            time.Duration // Time taken to complete the check
	Error               error         // Error if failed (nil if success)
	ExecutedAt          time.Time     // When the check was performed
	ConsecutiveFailures int           // Number of consecutive failures (reset on success)
}

// IsHealthy returns true if the check succeeded
func (r *HealthCheckResult) IsHealthy() bool {
	return r.Success && r.Error == nil
}

// NewHealthCheckResult creates a successful health check result
func NewHealthCheckResult(duration time.Duration) *HealthCheckResult {
	return &HealthCheckResult{
		Success:             true,
		Duration:            duration,
		Error:               nil,
		ExecutedAt:          time.Now(),
		ConsecutiveFailures: 0,
	}
}

// NewHealthCheckResultFailed creates a failed health check result
func NewHealthCheckResultFailed(duration time.Duration, err error, consecutiveFailures int) *HealthCheckResult {
	return &HealthCheckResult{
		Success:             false,
		Duration:            duration,
		Error:               err,
		ExecutedAt:          time.Now(),
		ConsecutiveFailures: consecutiveFailures,
	}
}

// AdaptiveState tracks the state of adaptive pool sizing
type AdaptiveState struct {
	CurrentMax     int       // Current MaxOpenConns setting
	LastEvaluation time.Time // When utilization was last evaluated
	LastAdjustment time.Time // When pool size was last changed
	ScaleUpCount   int64     // Total number of scale up events
	ScaleDownCount int64     // Total number of scale down events
	Stable         bool      // True if no adjustments in recent cycles
}

// NewAdaptiveState creates an AdaptiveState with initial values
func NewAdaptiveState(initialMax int) *AdaptiveState {
	now := time.Now()
	return &AdaptiveState{
		CurrentMax:     initialMax,
		LastEvaluation: now,
		LastAdjustment: now,
		ScaleUpCount:   0,
		ScaleDownCount: 0,
		Stable:         true,
	}
}

// RecordScaleUp records a scale up event
func (s *AdaptiveState) RecordScaleUp(newMax int) {
	s.CurrentMax = newMax
	s.LastAdjustment = time.Now()
	s.ScaleUpCount++
	s.Stable = false
}

// RecordScaleDown records a scale down event
func (s *AdaptiveState) RecordScaleDown(newMax int) {
	s.CurrentMax = newMax
	s.LastAdjustment = time.Now()
	s.ScaleDownCount++
	s.Stable = false
}

// RecordEvaluation records that an evaluation occurred (no resize)
func (s *AdaptiveState) RecordEvaluation() {
	s.LastEvaluation = time.Now()
}

// MarkStable marks the pool as stable (no recent adjustments)
func (s *AdaptiveState) MarkStable() {
	s.Stable = true
}

// PoolHealthStatus represents the overall health state of the pool
type PoolHealthStatus string

const (
	PoolHealthy   PoolHealthStatus = "healthy"
	PoolDegraded  PoolHealthStatus = "degraded"
	PoolUnhealthy PoolHealthStatus = "unhealthy"
)

// PoolHealth provides a summary of pool health for the /health/database/pool endpoint
type PoolHealth struct {
	Status          PoolHealthStatus   `json:"status"`
	Message         string             `json:"message,omitempty"`
	Stats           *PoolStats         `json:"stats,omitempty"`
	LastHealthCheck *HealthCheckResult `json:"last_health_check,omitempty"`
	AdaptiveState   *AdaptiveState     `json:"adaptive_state,omitempty"`
	WarmupComplete  bool               `json:"warmup_complete"`
}
