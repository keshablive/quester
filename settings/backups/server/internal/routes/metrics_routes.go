package routes

import (
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/adaptor"
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

	// Readiness probe (checks dependencies: DB, Redis)
	app.Get("/ready", func(c *fiber.Ctx) error {
		// TODO: Check database connection
		// TODO: Check Redis connection
		return c.JSON(fiber.Map{
			"status":  "ready",
			"service": "quester-platform",
		})
	})

	// Liveness probe (simple health check)
	app.Get("/live", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"status": "alive",
		})
	})
}
