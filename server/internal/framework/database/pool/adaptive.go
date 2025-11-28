// Package pool provides connection pool management, monitoring, and optimization
// Task Reference: 010-connection-pool-tuning T035-T044
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

// Default adaptive sizing constants
const (
	DefaultAdaptiveInterval       = 30 * time.Second // How often to evaluate pool size
	DefaultScaleUpThreshold       = 80               // Scale up when utilization > 80%
	DefaultScaleDownThreshold     = 30               // Scale down when utilization < 30%
	DefaultAdaptiveStep           = 5                // Connections to add/remove per resize
	DefaultAdaptiveCooldown       = 60 * time.Second // Minimum time between resizes
	DefaultConsecutiveHighPeriods = 3                // Consecutive periods before scale up
	DefaultConsecutiveLowPeriods  = 5                // Consecutive periods before scale down
)

// Adaptive metrics (FR-004)
var (
	adaptiveResizeTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "quester_db_pool_adaptive_resize_total",
			Help: "Total number of pool resize operations by direction",
		},
		[]string{"direction"}, // "up" or "down"
	)

	adaptiveCurrentSize = promauto.NewGauge(
		prometheus.GaugeOpts{
			Name: "quester_db_pool_adaptive_current_size",
			Help: "Current adaptive pool size (MaxOpenConnections)",
		},
	)

	adaptiveUtilization = promauto.NewGauge(
		prometheus.GaugeOpts{
			Name: "quester_db_pool_adaptive_utilization",
			Help: "Current pool utilization percentage used for adaptive decisions",
		},
	)

	adaptiveDecisions = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "quester_db_pool_adaptive_decisions_total",
			Help: "Total number of adaptive decisions by type",
		},
		[]string{"decision"}, // "scale_up", "scale_down", "no_change", "cooldown"
	)
)

// adaptiveManagerState is the internal state for the AdaptiveManager
// This is different from AdaptiveState in stats.go which is for health reporting
// Task Reference: T035
type adaptiveManagerState struct {
	Enabled                bool      // Whether adaptive sizing is enabled
	CurrentSize            int       // Current MaxOpenConnections value
	MinSize                int       // Floor - minimum allowed pool size
	MaxSize                int       // Ceiling - maximum allowed pool size
	LastUtilization        float64   // Last recorded utilization percentage
	LastResizeAt           time.Time // When the last resize occurred
	ConsecutiveHighPeriods int       // Periods with high utilization
	ConsecutiveLowPeriods  int       // Periods with low utilization
	TotalScaleUps          int       // Total number of scale up operations
	TotalScaleDowns        int       // Total number of scale down operations
	LastEvaluationAt       time.Time // When last evaluation occurred
	ScaleUpThreshold       int       // Utilization % to trigger scale up
	ScaleDownThreshold     int       // Utilization % to trigger scale down
	Step                   int       // Connections to add/remove per resize
	CooldownPeriod         time.Duration
	RequiredHighPeriods    int // Consecutive high periods needed before scale up
	RequiredLowPeriods     int // Consecutive low periods needed before scale down
}

// newAdaptiveManagerState creates a new adaptiveManagerState with the given config
func newAdaptiveManagerState(cfg *PoolConfig) *adaptiveManagerState {
	return &adaptiveManagerState{
		Enabled:             cfg.AdaptiveEnabled,
		CurrentSize:         cfg.MaxOpenConns,
		MinSize:             cfg.AdaptiveMinFloor,
		MaxSize:             cfg.AdaptiveMaxCeiling,
		ScaleUpThreshold:    cfg.AdaptiveScaleUpThresh,
		ScaleDownThreshold:  cfg.AdaptiveScaleDownThresh,
		Step:                DefaultAdaptiveStep,
		CooldownPeriod:      DefaultAdaptiveCooldown,
		RequiredHighPeriods: DefaultConsecutiveHighPeriods,
		RequiredLowPeriods:  DefaultConsecutiveLowPeriods,
	}
}

// GetAdaptiveState returns the current adaptive state for health reporting
// This converts the internal state to the public AdaptiveState type from stats.go
func GetAdaptiveManagerState() *AdaptiveState {
	if globalAdaptiveManager == nil {
		return nil
	}
	return globalAdaptiveManager.GetState()
}

// AdaptiveManager manages dynamic pool sizing
// Task Reference: T036
type AdaptiveManager struct {
	db       *sql.DB
	state    *adaptiveManagerState
	interval time.Duration

	ctx     context.Context
	cancel  context.CancelFunc
	wg      sync.WaitGroup
	running bool
	mu      sync.RWMutex
}

// Global adaptive manager instance
var globalAdaptiveManager *AdaptiveManager

// NewAdaptiveManager creates a new AdaptiveManager
// Task Reference: T036
func NewAdaptiveManager(db *sql.DB, cfg *PoolConfig) *AdaptiveManager {
	return &AdaptiveManager{
		db:       db,
		state:    newAdaptiveManagerState(cfg),
		interval: DefaultAdaptiveInterval,
	}
}

// Start begins the adaptive sizing goroutine
// Task Reference: T041
func (am *AdaptiveManager) Start() error {
	am.mu.Lock()
	defer am.mu.Unlock()

	if am.running {
		return NewPoolError("adaptive manager already running")
	}

	if !am.state.Enabled {
		log.Printf("[pool/adaptive] Adaptive pool sizing disabled")
		return nil
	}

	am.ctx, am.cancel = context.WithCancel(context.Background())
	am.running = true

	// Initialize metric with current size
	adaptiveCurrentSize.Set(float64(am.state.CurrentSize))

	am.wg.Add(1)
	go am.run()

	log.Printf("[pool/adaptive] Started adaptive manager (interval=%s, floor=%d, ceiling=%d, step=%d)",
		am.interval, am.state.MinSize, am.state.MaxSize, am.state.Step)

	return nil
}

// Stop gracefully stops the adaptive manager
// Task Reference: T042
func (am *AdaptiveManager) Stop() error {
	am.mu.Lock()
	defer am.mu.Unlock()

	if !am.running {
		return nil
	}

	am.cancel()
	am.wg.Wait()
	am.running = false

	log.Printf("[pool/adaptive] Stopped adaptive manager (total scale ups: %d, downs: %d)",
		am.state.TotalScaleUps, am.state.TotalScaleDowns)

	return nil
}

// IsRunning returns whether the adaptive manager is running
func (am *AdaptiveManager) IsRunning() bool {
	am.mu.RLock()
	defer am.mu.RUnlock()
	return am.running
}

// GetState returns the adaptive state for health reporting
// Converts internal state to the public AdaptiveState type from stats.go
func (am *AdaptiveManager) GetState() *AdaptiveState {
	am.mu.RLock()
	defer am.mu.RUnlock()

	return &AdaptiveState{
		CurrentMax:     am.state.CurrentSize,
		LastEvaluation: am.state.LastEvaluationAt,
		LastAdjustment: am.state.LastResizeAt,
		ScaleUpCount:   int64(am.state.TotalScaleUps),
		ScaleDownCount: int64(am.state.TotalScaleDowns),
		Stable:         am.state.ConsecutiveHighPeriods == 0 && am.state.ConsecutiveLowPeriods == 0,
	}
}

// run is the main adaptive sizing loop
func (am *AdaptiveManager) run() {
	defer am.wg.Done()

	ticker := time.NewTicker(am.interval)
	defer ticker.Stop()

	for {
		select {
		case <-am.ctx.Done():
			return
		case <-ticker.C:
			am.evaluateAndResize()
		}
	}
}

// evaluateAndResize checks utilization and resizes if needed
// Task Reference: T037
func (am *AdaptiveManager) evaluateAndResize() {
	am.mu.Lock()
	defer am.mu.Unlock()

	// Get current stats
	stats := am.db.Stats()
	am.state.LastEvaluationAt = time.Now()

	// Calculate utilization percentage
	var utilization float64
	if am.state.CurrentSize > 0 {
		utilization = float64(stats.InUse) / float64(am.state.CurrentSize) * 100
	}
	am.state.LastUtilization = utilization
	adaptiveUtilization.Set(utilization)

	// Check cooldown
	if !am.state.LastResizeAt.IsZero() && time.Since(am.state.LastResizeAt) < am.state.CooldownPeriod {
		adaptiveDecisions.WithLabelValues("cooldown").Inc()
		return
	}

	// Evaluate and decide
	if utilization > float64(am.state.ScaleUpThreshold) {
		am.state.ConsecutiveHighPeriods++
		am.state.ConsecutiveLowPeriods = 0

		if am.state.ConsecutiveHighPeriods >= am.state.RequiredHighPeriods {
			am.scaleUp()
		} else {
			adaptiveDecisions.WithLabelValues("no_change").Inc()
		}
	} else if utilization < float64(am.state.ScaleDownThreshold) {
		am.state.ConsecutiveLowPeriods++
		am.state.ConsecutiveHighPeriods = 0

		if am.state.ConsecutiveLowPeriods >= am.state.RequiredLowPeriods {
			am.scaleDown()
		} else {
			adaptiveDecisions.WithLabelValues("no_change").Inc()
		}
	} else {
		// Utilization in normal range - reset counters
		am.state.ConsecutiveHighPeriods = 0
		am.state.ConsecutiveLowPeriods = 0
		adaptiveDecisions.WithLabelValues("no_change").Inc()
	}
}

// scaleUp increases the pool size
// Task Reference: T038, T040
func (am *AdaptiveManager) scaleUp() {
	// Calculate new size respecting ceiling
	newSize := am.state.CurrentSize + am.state.Step
	if newSize > am.state.MaxSize {
		newSize = am.state.MaxSize
	}

	// Don't scale if already at max
	if newSize == am.state.CurrentSize {
		adaptiveDecisions.WithLabelValues("no_change").Inc()
		log.Printf("[pool/adaptive] Pool at ceiling (%d), cannot scale up", am.state.MaxSize)
		return
	}

	// Apply new size
	am.db.SetMaxOpenConns(newSize)
	oldSize := am.state.CurrentSize
	am.state.CurrentSize = newSize
	am.state.LastResizeAt = time.Now()
	am.state.TotalScaleUps++
	am.state.ConsecutiveHighPeriods = 0

	// Update metrics
	adaptiveCurrentSize.Set(float64(newSize))
	adaptiveResizeTotal.WithLabelValues("up").Inc()
	adaptiveDecisions.WithLabelValues("scale_up").Inc()

	log.Printf("[pool/adaptive] Scaled UP: %d -> %d (utilization: %.1f%%, threshold: %d%%)",
		oldSize, newSize, am.state.LastUtilization, am.state.ScaleUpThreshold)
}

// scaleDown decreases the pool size
// Task Reference: T039, T040
func (am *AdaptiveManager) scaleDown() {
	// Calculate new size respecting floor
	newSize := am.state.CurrentSize - am.state.Step
	if newSize < am.state.MinSize {
		newSize = am.state.MinSize
	}

	// Don't scale if already at min
	if newSize == am.state.CurrentSize {
		adaptiveDecisions.WithLabelValues("no_change").Inc()
		log.Printf("[pool/adaptive] Pool at floor (%d), cannot scale down", am.state.MinSize)
		return
	}

	// Apply new size
	am.db.SetMaxOpenConns(newSize)
	oldSize := am.state.CurrentSize
	am.state.CurrentSize = newSize
	am.state.LastResizeAt = time.Now()
	am.state.TotalScaleDowns++
	am.state.ConsecutiveLowPeriods = 0

	// Update metrics
	adaptiveCurrentSize.Set(float64(newSize))
	adaptiveResizeTotal.WithLabelValues("down").Inc()
	adaptiveDecisions.WithLabelValues("scale_down").Inc()

	log.Printf("[pool/adaptive] Scaled DOWN: %d -> %d (utilization: %.1f%%, threshold: %d%%)",
		oldSize, newSize, am.state.LastUtilization, am.state.ScaleDownThreshold)
}

// StartAdaptiveManager starts the global adaptive manager
// Task Reference: T044
func StartAdaptiveManager(db *sql.DB, cfg *PoolConfig) error {
	if globalAdaptiveManager != nil {
		return NewPoolError("adaptive manager already initialized")
	}

	globalAdaptiveManager = NewAdaptiveManager(db, cfg)
	return globalAdaptiveManager.Start()
}

// StopAdaptiveManager stops the global adaptive manager
func StopAdaptiveManager() error {
	if globalAdaptiveManager == nil {
		return nil
	}

	err := globalAdaptiveManager.Stop()
	globalAdaptiveManager = nil
	return err
}

// IsAdaptiveEnabled returns whether adaptive sizing is enabled
func IsAdaptiveEnabled() bool {
	if globalAdaptiveManager == nil {
		return false
	}
	return globalAdaptiveManager.state.Enabled
}
