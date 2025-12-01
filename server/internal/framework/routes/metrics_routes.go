package routes

import (
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/adaptor"
	"github.com/keshablive/quester/internal/framework/database"
	"github.com/keshablive/quester/internal/framework/database/pool"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

// SetupMetricsRoutes configures Prometheus metrics endpoints
// CONSTITUTION: Performance First - Prometheus monitoring required
func SetupMetricsRoutes(app *fiber.App) {
	// Prometheus metrics endpoint (no authentication required for monitoring)
	// This endpoint is typically accessed by Prometheus server only
	app.Get("/metrics", adaptor.HTTPHandler(promhttp.Handler()))

	// Health check endpoint (for load balancers, K8s probes)
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"status":  "healthy",
			"service": "quester-platform",
		})
	})

	// Database health endpoint with connection pool stats
	// Task Reference: 009-database-query-optimization T049, T061
	app.Get("/health/database", func(c *fiber.Ctx) error {
		// Get database connection pool stats
		stats, err := database.GetStats()
		if err != nil {
			return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
				"status":  "unhealthy",
				"error":   err.Error(),
				"service": "database",
			})
		}

		// Check database health
		if err := database.Health(); err != nil {
			return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
				"status":  "unhealthy",
				"error":   err.Error(),
				"service": "database",
				"pool": fiber.Map{
					"max_open": stats.MaxOpenConnections,
					"open":     stats.OpenConnections,
					"in_use":   stats.InUse,
					"idle":     stats.Idle,
				},
			})
		}

		// Get replica health status (T061)
		replicaHealth := database.GetReplicaHealth()

		return c.JSON(fiber.Map{
			"status":  "healthy",
			"service": "database",
			"pool": fiber.Map{
				"max_open":    stats.MaxOpenConnections,
				"open":        stats.OpenConnections,
				"in_use":      stats.InUse,
				"idle":        stats.Idle,
				"utilization": float64(stats.InUse) / float64(stats.MaxOpenConnections) * 100,
			},
			"replicas": replicaHealth,
		})
	})

	// Connection pool health endpoint (FR-015)
	// Task Reference: 010-connection-pool-tuning T060
	app.Get("/health/database/pool", func(c *fiber.Ctx) error {
		// Get pool metrics collector
		collector := pool.GetDefaultCollector()
		if collector == nil || !collector.IsRunning() {
			return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
				"status":  "unhealthy",
				"error":   "pool metrics collector not running",
				"service": "database-pool",
			})
		}

		// Get detailed pool stats
		stats := collector.GetStats()
		if stats == nil {
			return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
				"status":  "unhealthy",
				"error":   "failed to get pool statistics",
				"service": "database-pool",
			})
		}

		// Calculate health status based on utilization
		utilization := stats.Utilization
		status := "healthy"
		if utilization >= 0.9 {
			status = "warning" // Above 90% utilization
		}
		if utilization >= 0.95 {
			status = "critical" // Above 95% utilization
		}

		// Format wait duration
		waitAvgMs := float64(0)
		if stats.WaitCount > 0 {
			waitAvgMs = float64(stats.WaitDuration.Microseconds()) / float64(stats.WaitCount) / 1000
		}

		return c.JSON(fiber.Map{
			"status":  status,
			"service": "database-pool",
			"connections": fiber.Map{
				"max_open": stats.MaxOpenConnections,
				"open":     stats.OpenConnections,
				"in_use":   stats.InUse,
				"idle":     stats.Idle,
			},
			"utilization": fiber.Map{
				"current_percent":    utilization * 100,
				"threshold_warning":  90,
				"threshold_critical": 95,
			},
			"waits": fiber.Map{
				"total_count": stats.WaitCount,
				"total_ms":    stats.WaitDuration.Milliseconds(),
				"avg_wait_ms": waitAvgMs,
			},
			"closures": fiber.Map{
				"max_idle_exceeded":     stats.MaxIdleClosed,
				"idle_timeout_exceeded": stats.MaxIdleTimeClosed,
				"lifetime_exceeded":     stats.MaxLifetimeClosed,
			},
		})
	})

	// Readiness probe (checks dependencies: DB, Redis)
	// Task Reference: 010-connection-pool-tuning T061
	app.Get("/ready", func(c *fiber.Ctx) error {
		// Check if pool warmup is complete (T061)
		// Returns 503 if warmup is in progress
		warmupState := pool.GetWarmupState()
		if warmupState.InProgress && !warmupState.Complete {
			return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
				"status": "not_ready",
				"reason": "pool_warmup_in_progress",
				"warmup": fiber.Map{
					"in_progress": warmupState.InProgress,
					"started_at":  warmupState.StartedAt,
				},
				"service": "quester-platform",
			})
		}

		// Check database connection
		if err := database.Health(); err != nil {
			return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
				"status":  "not_ready",
				"reason":  "database_unavailable",
				"error":   err.Error(),
				"service": "quester-platform",
			})
		}

		return c.JSON(fiber.Map{
			"status":  "ready",
			"service": "quester-platform",
			"warmup": fiber.Map{
				"complete":    warmupState.Complete,
				"connections": warmupState.Connections,
			},
		})
	})

	// Liveness probe (simple health check)
	app.Get("/live", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"status": "alive",
		})
	})
}
