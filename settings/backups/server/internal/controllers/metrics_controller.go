package controllers

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	"github.com/yourusername/quester/internal/models"
	"github.com/yourusername/quester/internal/services"
)

// MetricsController handles dashboard metrics HTTP requests
type MetricsController struct {
	service *services.DashboardService
}

// NewMetricsController creates a new metrics controller
func NewMetricsController(service *services.DashboardService) *MetricsController {
	return &MetricsController{service: service}
}

// CreateMetric creates a new dashboard metric
// POST /api/metrics
func (c *MetricsController) CreateMetric(ctx *fiber.Ctx) error {
	tenantID := ctx.Locals("tenantId").(uuid.UUID)

	var metric models.DashboardMetric
	if err := ctx.BodyParser(&metric); err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	metric.TenantID = tenantID

	if metric.Name == "" || metric.Category == "" {
		return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Metric name and category are required",
		})
	}

	if err := c.service.CreateMetric(&metric); err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return ctx.Status(fiber.StatusCreated).JSON(fiber.Map{
		"metric": metric,
	})
}

// GetMetric retrieves a metric by ID
// GET /api/metrics/:id
func (c *MetricsController) GetMetric(ctx *fiber.Ctx) error {
	metricID, err := uuid.Parse(ctx.Params("id"))
	if err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid metric ID",
		})
	}

	metric, err := c.service.GetMetric(metricID)
	if err != nil {
		return ctx.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Metric not found",
		})
	}

	return ctx.JSON(fiber.Map{
		"metric": metric,
	})
}

// GetMetricByName retrieves a metric by name
// GET /api/metrics/name/:name
func (c *MetricsController) GetMetricByName(ctx *fiber.Ctx) error {
	tenantID := ctx.Locals("tenantId").(uuid.UUID)
	metricName := ctx.Params("name")

	if metricName == "" {
		return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Metric name is required",
		})
	}

	metric, err := c.service.GetMetricByName(tenantID, metricName)
	if err != nil {
		return ctx.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Metric not found",
		})
	}

	return ctx.JSON(fiber.Map{
		"metric": metric,
	})
}

// GetMetricsByCategory retrieves metrics by category
// GET /api/metrics/category/:category?limit=20&offset=0
func (c *MetricsController) GetMetricsByCategory(ctx *fiber.Ctx) error {
	tenantID := ctx.Locals("tenantId").(uuid.UUID)
	category := ctx.Params("category")

	if category == "" {
		return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Category is required",
		})
	}

	// Note: Service doesn't support pagination parameters, returns all metrics for category
	metrics, err := c.service.GetMetricsByCategory(tenantID, category)
	if err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to retrieve metrics",
		})
	}

	return ctx.JSON(fiber.Map{
		"metrics":  metrics,
		"category": category,
		"count":    len(metrics),
	})
}

// GetAllMetrics retrieves all metrics for a tenant
// GET /api/metrics?limit=20&offset=0
func (c *MetricsController) GetAllMetrics(ctx *fiber.Ctx) error {
	tenantID := ctx.Locals("tenantId").(uuid.UUID)

	// Note: Service doesn't support pagination parameters, returns all metrics
	metrics, err := c.service.GetAllMetrics(tenantID)
	if err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to retrieve metrics",
		})
	}

	return ctx.JSON(fiber.Map{
		"metrics": metrics,
		"count":   len(metrics),
	})
}

// UpdateMetric updates a metric
// PUT /api/metrics/:id
func (c *MetricsController) UpdateMetric(ctx *fiber.Ctx) error {
	metricID, err := uuid.Parse(ctx.Params("id"))
	if err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid metric ID",
		})
	}

	var metric models.DashboardMetric
	if err := ctx.BodyParser(&metric); err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	metric.ID = metricID

	if err := c.service.UpdateMetric(&metric); err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return ctx.JSON(fiber.Map{
		"metric": metric,
	})
}

// UpsertMetric creates or updates a metric
// POST /api/metrics/upsert
func (c *MetricsController) UpsertMetric(ctx *fiber.Ctx) error {
	tenantID := ctx.Locals("tenantId").(uuid.UUID)

	var metric models.DashboardMetric
	if err := ctx.BodyParser(&metric); err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	metric.TenantID = tenantID

	if metric.Name == "" {
		return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Metric name is required",
		})
	}

	if err := c.service.UpsertMetric(&metric); err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return ctx.JSON(fiber.Map{
		"metric": metric,
	})
}

// RefreshMetric refreshes a specific metric's value
// POST /api/metrics/:id/refresh
// RefreshMetric refreshes a specific metric's value
// POST /api/metrics/:id/refresh
func (c *MetricsController) RefreshMetric(ctx *fiber.Ctx) error {
	tenantID := ctx.Locals("tenantId").(uuid.UUID)
	metricID, err := uuid.Parse(ctx.Params("id"))
	if err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid metric ID",
		})
	}

	// Get metric to find its name
	metric, err := c.service.GetMetric(metricID)
	if err != nil {
		return ctx.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Metric not found",
		})
	}

	// RefreshMetric takes tenantID and metric name
	if err := c.service.RefreshMetric(tenantID, metric.Name); err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	// Return updated metric
	metric, err = c.service.GetMetric(metricID)
	if err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Metric refreshed but failed to retrieve updated value",
		})
	}

	return ctx.JSON(fiber.Map{
		"metric":  metric,
		"message": "Metric refreshed successfully",
	})
}

// RefreshAllMetrics refreshes all metrics for the tenant
// POST /api/metrics/refresh
func (c *MetricsController) RefreshAllMetrics(ctx *fiber.Ctx) error {
	tenantID := ctx.Locals("tenantId").(uuid.UUID)

	if err := c.service.RefreshAllMetrics(tenantID); err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to refresh metrics",
		})
	}

	return ctx.JSON(fiber.Map{
		"message": "All metrics refreshed successfully",
	})
}

// RefreshMetricByName refreshes a metric by name
// POST /api/metrics/name/:name/refresh
func (c *MetricsController) RefreshMetricByName(ctx *fiber.Ctx) error {
	tenantID := ctx.Locals("tenantId").(uuid.UUID)
	metricName := ctx.Params("name")

	if metricName == "" {
		return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Metric name is required",
		})
	}

	// Get metric by name first
	metric, err := c.service.GetMetricByName(tenantID, metricName)
	if err != nil {
		return ctx.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Metric not found",
		})
	}

	// Refresh the metric (service takes tenantID and metric name)
	if err := c.service.RefreshMetric(tenantID, metricName); err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	// Return updated metric
	metric, err = c.service.GetMetric(metric.ID)
	if err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Metric refreshed but failed to retrieve updated value",
		})
	}

	return ctx.JSON(fiber.Map{
		"metric":  metric,
		"message": "Metric refreshed successfully",
	})
}

// BulkUpdateMetrics updates multiple metrics at once
// POST /api/metrics/bulk
func (c *MetricsController) BulkUpdateMetrics(ctx *fiber.Ctx) error {
	tenantID := ctx.Locals("tenantId").(uuid.UUID)

	var req struct {
		Metrics []models.DashboardMetric `json:"metrics"`
	}

	if err := ctx.BodyParser(&req); err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	if len(req.Metrics) == 0 {
		return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "No metrics provided",
		})
	}

	// Set tenant ID for all metrics and update each one
	// Note: Service doesn't have BulkUpdateMetrics, updating individually
	for i := range req.Metrics {
		req.Metrics[i].TenantID = tenantID
		if err := c.service.UpdateMetric(&req.Metrics[i]); err != nil {
			return ctx.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": err.Error(),
			})
		}
	}

	return ctx.JSON(fiber.Map{
		"message": "Metrics updated successfully",
		"count":   len(req.Metrics),
	})
}

// DeleteMetric deletes a metric
// DELETE /api/metrics/:id
func (c *MetricsController) DeleteMetric(ctx *fiber.Ctx) error {
	_, err := uuid.Parse(ctx.Params("id"))
	if err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid metric ID",
		})
	}

	// Note: Service doesn't have DeleteMetric method
	// This is a placeholder that returns not implemented
	return ctx.Status(fiber.StatusNotImplemented).JSON(fiber.Map{
		"error": "Delete metric not yet implemented in service layer",
	})
}
