// Package metrics provides Prometheus metrics HTTP handler
package metrics

import (
	"github.com/gofiber/adaptor/v2"
	"github.com/gofiber/fiber/v2"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

// Handler returns a Fiber handler for Prometheus metrics endpoint
func Handler() fiber.Handler {
	return adaptor.HTTPHandler(promhttp.Handler())
}
