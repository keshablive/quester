package controller

import (
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	"github.com/keshablive/quester/internal/framework/service"
)

// AnalyticsController handles analytics HTTP requests
type AnalyticsController struct {
	service *service.AnalyticsService
}

// NewAnalyticsController creates a new analytics controller
func NewAnalyticsController(service *service.AnalyticsService) *AnalyticsController {
	return &AnalyticsController{service: service}
}

// TrackUserActivity tracks user activity
// POST /api/analytics/users/:userId/track
func (c *AnalyticsController) TrackUserActivity(ctx *fiber.Ctx) error {
	tenantID := ctx.Locals("tenantId").(uuid.UUID)

	userID, err := uuid.Parse(ctx.Params("userId"))
	if err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid user ID",
		})
	}

	var req struct {
		Date     *time.Time     `json:"date"`
		Activity map[string]int `json:"activity"`
	}

	if err := ctx.BodyParser(&req); err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	date := time.Now()
	if req.Date != nil {
		date = *req.Date
	}

	if err := c.service.TrackUserActivity(tenantID, userID, date, req.Activity); err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to track user activity",
		})
	}

	return ctx.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "Activity tracked successfully",
	})
}

// GetUserAnalyticsSummary retrieves user analytics summary
// GET /api/analytics/users/:userId/summary?period=30days
func (c *AnalyticsController) GetUserAnalyticsSummary(ctx *fiber.Ctx) error {
	tenantID := ctx.Locals("tenantId").(uuid.UUID)

	userID, err := uuid.Parse(ctx.Params("userId"))
	if err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid user ID",
		})
	}

	period := ctx.Query("period", "30days")

	summary, err := c.service.GetUserAnalyticsSummary(tenantID, userID, period)
	if err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to retrieve analytics summary",
		})
	}

	return ctx.JSON(fiber.Map{
		"summary": summary,
		"period":  period,
	})
}

// GetUserAnalyticsTimeSeries retrieves user analytics time series
// GET /api/analytics/users/:userId/timeseries?period=30days
func (c *AnalyticsController) GetUserAnalyticsTimeSeries(ctx *fiber.Ctx) error {
	tenantID := ctx.Locals("tenantId").(uuid.UUID)

	userID, err := uuid.Parse(ctx.Params("userId"))
	if err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid user ID",
		})
	}

	period := ctx.Query("period", "30days")

	timeSeries, err := c.service.GetUserAnalyticsTimeSeries(tenantID, userID, period)
	if err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to retrieve time series data",
		})
	}

	return ctx.JSON(fiber.Map{
		"data":   timeSeries,
		"period": period,
		"count":  len(timeSeries),
	})
}

// TrackCourseActivity tracks course activity
// POST /api/analytics/courses/:courseId/track
func (c *AnalyticsController) TrackCourseActivity(ctx *fiber.Ctx) error {
	tenantID := ctx.Locals("tenantId").(uuid.UUID)

	courseID, err := uuid.Parse(ctx.Params("courseId"))
	if err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid course ID",
		})
	}

	var req struct {
		Date    *time.Time             `json:"date"`
		Metrics map[string]interface{} `json:"metrics"`
	}

	if err := ctx.BodyParser(&req); err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	date := time.Now()
	if req.Date != nil {
		date = *req.Date
	}

	if err := c.service.TrackCourseActivity(tenantID, courseID, date, req.Metrics); err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to track course activity",
		})
	}

	return ctx.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "Course activity tracked successfully",
	})
}

// GetCourseAnalyticsSummary retrieves course analytics summary
// GET /api/analytics/courses/:courseId/summary?period=30days
func (c *AnalyticsController) GetCourseAnalyticsSummary(ctx *fiber.Ctx) error {
	tenantID := ctx.Locals("tenantId").(uuid.UUID)

	courseID, err := uuid.Parse(ctx.Params("courseId"))
	if err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid course ID",
		})
	}

	period := ctx.Query("period", "30days")

	summary, err := c.service.GetCourseAnalyticsSummary(tenantID, courseID, period)
	if err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to retrieve course analytics",
		})
	}

	return ctx.JSON(fiber.Map{
		"summary": summary,
		"period":  period,
	})
}

// GetCourseAnalyticsTimeSeries retrieves course analytics time series
// GET /api/analytics/courses/:courseId/timeseries?period=30days
func (c *AnalyticsController) GetCourseAnalyticsTimeSeries(ctx *fiber.Ctx) error {
	tenantID := ctx.Locals("tenantId").(uuid.UUID)

	courseID, err := uuid.Parse(ctx.Params("courseId"))
	if err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid course ID",
		})
	}

	period := ctx.Query("period", "30days")

	timeSeries, err := c.service.GetCourseAnalyticsTimeSeries(tenantID, courseID, period)
	if err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to retrieve time series data",
		})
	}

	return ctx.JSON(fiber.Map{
		"data":   timeSeries,
		"period": period,
		"count":  len(timeSeries),
	})
}

// GetTopCourses retrieves top performing courses
// GET /api/analytics/courses/top?period=30days&orderBy=enrollments&limit=10
func (c *AnalyticsController) GetTopCourses(ctx *fiber.Ctx) error {
	tenantID := ctx.Locals("tenantId").(uuid.UUID)

	period := ctx.Query("period", "30days")
	orderBy := ctx.Query("orderBy", "enrollments")
	limit, _ := strconv.Atoi(ctx.Query("limit", "10"))

	if limit <= 0 || limit > 100 {
		limit = 10
	}

	courses, err := c.service.GetTopCourses(tenantID, period, orderBy, limit)
	if err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to retrieve top courses",
		})
	}

	return ctx.JSON(fiber.Map{
		"courses": courses,
		"period":  period,
		"orderBy": orderBy,
		"count":   len(courses),
	})
}

// TrackEngagementActivity tracks platform engagement
// POST /api/analytics/engagement/track
func (c *AnalyticsController) TrackEngagementActivity(ctx *fiber.Ctx) error {
	tenantID := ctx.Locals("tenantId").(uuid.UUID)

	var req struct {
		Date    *time.Time             `json:"date"`
		Metrics map[string]interface{} `json:"metrics"`
	}

	if err := ctx.BodyParser(&req); err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	date := time.Now()
	if req.Date != nil {
		date = *req.Date
	}

	if err := c.service.TrackEngagementActivity(tenantID, date, req.Metrics); err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to track engagement activity",
		})
	}

	return ctx.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "Engagement activity tracked successfully",
	})
}

// GetEngagementAnalyticsSummary retrieves engagement analytics summary
// GET /api/analytics/engagement/summary?period=30days
func (c *AnalyticsController) GetEngagementAnalyticsSummary(ctx *fiber.Ctx) error {
	tenantID := ctx.Locals("tenantId").(uuid.UUID)

	period := ctx.Query("period", "30days")

	summary, err := c.service.GetEngagementAnalyticsSummary(tenantID, period)
	if err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to retrieve engagement analytics",
		})
	}

	return ctx.JSON(fiber.Map{
		"summary": summary,
		"period":  period,
	})
}

// GetEngagementAnalyticsTimeSeries retrieves engagement analytics time series
// GET /api/analytics/engagement/timeseries?period=30days
func (c *AnalyticsController) GetEngagementAnalyticsTimeSeries(ctx *fiber.Ctx) error {
	tenantID := ctx.Locals("tenantId").(uuid.UUID)

	period := ctx.Query("period", "30days")

	timeSeries, err := c.service.GetEngagementAnalyticsTimeSeries(tenantID, period)
	if err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to retrieve time series data",
		})
	}

	return ctx.JSON(fiber.Map{
		"data":   timeSeries,
		"period": period,
		"count":  len(timeSeries),
	})
}
