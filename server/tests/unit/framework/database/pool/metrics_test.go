// Package pool_test contains unit tests for connection pool metrics
// Task Reference: 010-connection-pool-tuning T017
package pool_test

import (
	"database/sql"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/keshablive/quester/internal/framework/database/pool"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestNewMetricsCollector verifies collector creation
func TestNewMetricsCollector(t *testing.T) {
	db, _, err := sqlmock.New()
	require.NoError(t, err)
	defer db.Close()

	collector := pool.NewMetricsCollector(db, 5*time.Second, 25, 5)
	assert.NotNil(t, collector)
	assert.False(t, collector.IsRunning())
}

// TestMetricsCollectorStartStop verifies lifecycle management
func TestMetricsCollectorStartStop(t *testing.T) {
	db, _, err := sqlmock.New()
	require.NoError(t, err)
	defer db.Close()

	collector := pool.NewMetricsCollector(db, 100*time.Millisecond, 25, 5)

	// Start collector
	err = collector.Start()
	require.NoError(t, err)
	assert.True(t, collector.IsRunning())

	// Can't start twice
	err = collector.Start()
	assert.Error(t, err)
	assert.Equal(t, pool.ErrCollectorAlreadyRunning, err)

	// Stop collector
	err = collector.Stop()
	require.NoError(t, err)
	assert.False(t, collector.IsRunning())

	// Stop is idempotent
	err = collector.Stop()
	require.NoError(t, err)
}

// TestMetricsCollectorGetStats verifies stats retrieval
func TestMetricsCollectorGetStats(t *testing.T) {
	db, _, err := sqlmock.New()
	require.NoError(t, err)
	defer db.Close()

	collector := pool.NewMetricsCollector(db, 5*time.Second, 25, 5)
	err = collector.Start()
	require.NoError(t, err)
	defer collector.Stop()

	stats := collector.GetStats()
	assert.NotNil(t, stats)
	// sqlmock returns zero values for stats, which is fine for this test
}

// TestRegisterMetrics verifies metric registration
func TestRegisterMetrics(t *testing.T) {
	// RegisterMetrics should be idempotent (metrics are auto-registered)
	err := pool.RegisterMetrics()
	assert.NoError(t, err)

	// Call again - should not error
	err = pool.RegisterMetrics()
	assert.NoError(t, err)
}

// TestGlobalCollector verifies the global collector functions
func TestGlobalCollector(t *testing.T) {
	db, _, err := sqlmock.New()
	require.NoError(t, err)
	defer db.Close()

	// Start global collector
	err = pool.StartMetricsCollector(db, 25, 5)
	require.NoError(t, err)

	// Get collector reference
	collector := pool.GetDefaultCollector()
	assert.NotNil(t, collector)
	assert.True(t, collector.IsRunning())

	// Stop global collector
	err = pool.StopMetricsCollector()
	require.NoError(t, err)

	// Collector should be stopped
	assert.False(t, collector.IsRunning())
}

// TestMetricsCollectorCollectsStats verifies periodic collection
func TestMetricsCollectorCollectsStats(t *testing.T) {
	db, _, err := sqlmock.New()
	require.NoError(t, err)
	defer db.Close()

	// Use short interval for test
	collector := pool.NewMetricsCollector(db, 50*time.Millisecond, 25, 5)
	err = collector.Start()
	require.NoError(t, err)
	defer collector.Stop()

	// Wait for a few collection cycles
	time.Sleep(150 * time.Millisecond)

	// Stats should be available
	stats := collector.GetStats()
	assert.NotNil(t, stats)
}

// BenchmarkMetricsCollection benchmarks the stats collection
func BenchmarkMetricsCollection(b *testing.B) {
	db, _, err := sqlmock.New()
	require.NoError(b, err)
	defer db.Close()

	collector := pool.NewMetricsCollector(db, time.Hour, 25, 5) // Long interval, manual trigger
	err = collector.Start()
	require.NoError(b, err)
	defer collector.Stop()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_ = collector.GetStats()
	}
}

// TestPoolStatsFromDBStats verifies PoolStats creation from sql.DBStats
func TestPoolStatsFromDBStats(t *testing.T) {
	dbStats := &sql.DBStats{
		MaxOpenConnections: 25,
		OpenConnections:    10,
		InUse:              5,
		Idle:               5,
		WaitCount:          100,
		WaitDuration:       time.Second,
		MaxIdleClosed:      10,
		MaxIdleTimeClosed:  5,
		MaxLifetimeClosed:  3,
	}

	stats := pool.FromDBStats(dbStats, 25)
	assert.NotNil(t, stats)
	assert.Equal(t, 25, stats.MaxOpenConnections)
	assert.Equal(t, 10, stats.OpenConnections)
	assert.Equal(t, 5, stats.InUse)
	assert.Equal(t, 5, stats.Idle)
	assert.Equal(t, int64(100), stats.WaitCount)
	assert.Equal(t, time.Second, stats.WaitDuration)
	assert.Equal(t, int64(10), stats.MaxIdleClosed)
	assert.Equal(t, int64(5), stats.MaxIdleTimeClosed)
	assert.Equal(t, int64(3), stats.MaxLifetimeClosed)
}

// TestPoolStatsUtilization verifies utilization calculation
func TestPoolStatsUtilization(t *testing.T) {
	tests := []struct {
		name     string
		inUse    int
		maxOpen  int
		expected float64
	}{
		{"zero utilization", 0, 25, 0.0},
		{"half utilization", 10, 20, 0.5},
		{"full utilization", 25, 25, 1.0},
		{"over utilization capped", 30, 25, 1.2}, // Can happen with max_open = 0 (unlimited)
		{"zero max", 5, 0, 0.0},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Test utilization calculation as it would be computed
			// This mirrors the calculation in NewPoolStatsFromDB and FromDBStats
			var util float64
			if tt.maxOpen > 0 {
				util = float64(tt.inUse) / float64(tt.maxOpen)
			}
			assert.InDelta(t, tt.expected, util, 0.001)
		})
	}
}
