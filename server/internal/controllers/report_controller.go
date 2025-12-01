package controllers

import (
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	"github.com/keshablive/quester/internal/models"
	"github.com/keshablive/quester/internal/framework/service"
)

// ReportController handles report HTTP requests
type ReportController struct {
	service *service.ReportService
}

// NewReportController creates a new report controller
func NewReportController(service *service.ReportService) *ReportController {
	return &ReportController{service: service}
}

// CreateReport creates a new report
// POST /api/reports
func (c *ReportController) CreateReport(ctx *fiber.Ctx) error {
	tenantID := ctx.Locals("tenantId").(uuid.UUID)
	userID := ctx.Locals("userId").(uuid.UUID)

	var req struct {
		Name        string    `json:"name"`
		Description string    `json:"description"`
		Type        string    `json:"type"`
		Period      string    `json:"period"`
		Format      string    `json:"format"`
		StartDate   time.Time `json:"start_date"`
		EndDate     time.Time `json:"end_date"`
	}

	if err := ctx.BodyParser(&req); err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	if req.Name == "" || req.Type == "" || req.Period == "" {
		return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Name, type, and period are required",
		})
	}

	report, err := c.service.CreateReport(
		tenantID, userID,
		req.Name, req.Description,
		req.Type, req.Period, req.Format,
		req.StartDate, req.EndDate,
	)

	if err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return ctx.Status(fiber.StatusCreated).JSON(fiber.Map{
		"report": report,
	})
}

// GetReport retrieves a report by ID
// GET /api/reports/:id
func (c *ReportController) GetReport(ctx *fiber.Ctx) error {
	reportID, err := uuid.Parse(ctx.Params("id"))
	if err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid report ID",
		})
	}

	report, err := c.service.GetReport(reportID)
	if err != nil {
		return ctx.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Report not found",
		})
	}

	return ctx.JSON(fiber.Map{
		"report": report,
	})
}

// GetUserReports retrieves all reports for the current user
// GET /api/reports?limit=20&offset=0
func (c *ReportController) GetUserReports(ctx *fiber.Ctx) error {
	tenantID := ctx.Locals("tenantId").(uuid.UUID)
	userID := ctx.Locals("userId").(uuid.UUID)

	limit, _ := strconv.Atoi(ctx.Query("limit", "20"))
	offset, _ := strconv.Atoi(ctx.Query("offset", "0"))

	if limit <= 0 || limit > 100 {
		limit = 20
	}

	reports, err := c.service.GetUserReports(tenantID, userID, limit, offset)
	if err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to retrieve reports",
		})
	}

	return ctx.JSON(fiber.Map{
		"reports": reports,
		"limit":   limit,
		"offset":  offset,
		"count":   len(reports),
	})
}

// GenerateReport generates report data
// POST /api/reports/:id/generate
func (c *ReportController) GenerateReport(ctx *fiber.Ctx) error {
	reportID, err := uuid.Parse(ctx.Params("id"))
	if err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid report ID",
		})
	}

	// Start report generation asynchronously
	go func() {
		c.service.GenerateReport(reportID)
	}()

	return ctx.Status(fiber.StatusAccepted).JSON(fiber.Map{
		"message":   "Report generation started",
		"report_id": reportID,
	})
}

// DeleteReport deletes a report
// DELETE /api/reports/:id
func (c *ReportController) DeleteReport(ctx *fiber.Ctx) error {
	reportID, err := uuid.Parse(ctx.Params("id"))
	if err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid report ID",
		})
	}

	if err := c.service.DeleteReport(reportID); err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to delete report",
		})
	}

	return ctx.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "Report deleted successfully",
	})
}

// SearchReports searches reports
// GET /api/reports/search?q=monthly&limit=20&offset=0
func (c *ReportController) SearchReports(ctx *fiber.Ctx) error {
	tenantID := ctx.Locals("tenantId").(uuid.UUID)

	query := ctx.Query("q", "")
	if query == "" {
		return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Search query is required",
		})
	}

	limit, _ := strconv.Atoi(ctx.Query("limit", "20"))
	offset, _ := strconv.Atoi(ctx.Query("offset", "0"))

	if limit <= 0 || limit > 100 {
		limit = 20
	}

	reports, err := c.service.SearchReports(tenantID, query, limit, offset)
	if err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to search reports",
		})
	}

	return ctx.JSON(fiber.Map{
		"reports": reports,
		"query":   query,
		"count":   len(reports),
	})
}

// Report Schedule endpoints

// CreateReportSchedule creates a new report schedule
// POST /api/reports/schedules
func (c *ReportController) CreateReportSchedule(ctx *fiber.Ctx) error {
	tenantID := ctx.Locals("tenantId").(uuid.UUID)
	userID := ctx.Locals("userId").(uuid.UUID)

	var schedule models.ReportSchedule
	if err := ctx.BodyParser(&schedule); err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	schedule.TenantID = tenantID
	schedule.UserID = userID

	if err := c.service.CreateReportSchedule(&schedule); err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return ctx.Status(fiber.StatusCreated).JSON(fiber.Map{
		"schedule": schedule,
	})
}

// GetReportSchedule retrieves a schedule by ID
// GET /api/reports/schedules/:id
func (c *ReportController) GetReportSchedule(ctx *fiber.Ctx) error {
	scheduleID, err := uuid.Parse(ctx.Params("id"))
	if err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid schedule ID",
		})
	}

	schedule, err := c.service.GetReportSchedule(scheduleID)
	if err != nil {
		return ctx.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Schedule not found",
		})
	}

	return ctx.JSON(fiber.Map{
		"schedule": schedule,
	})
}

// GetUserReportSchedules retrieves all schedules for the current user
// GET /api/reports/schedules
func (c *ReportController) GetUserReportSchedules(ctx *fiber.Ctx) error {
	tenantID := ctx.Locals("tenantId").(uuid.UUID)
	userID := ctx.Locals("userId").(uuid.UUID)

	schedules, err := c.service.GetUserReportSchedules(tenantID, userID)
	if err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to retrieve schedules",
		})
	}

	return ctx.JSON(fiber.Map{
		"schedules": schedules,
		"count":     len(schedules),
	})
}

// UpdateReportSchedule updates a schedule
// PUT /api/reports/schedules/:id
func (c *ReportController) UpdateReportSchedule(ctx *fiber.Ctx) error {
	scheduleID, err := uuid.Parse(ctx.Params("id"))
	if err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid schedule ID",
		})
	}

	var schedule models.ReportSchedule
	if err := ctx.BodyParser(&schedule); err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	schedule.ID = scheduleID

	if err := c.service.UpdateReportSchedule(&schedule); err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return ctx.JSON(fiber.Map{
		"schedule": schedule,
	})
}

// ToggleReportSchedule activates/deactivates a schedule
// PATCH /api/reports/schedules/:id/toggle
func (c *ReportController) ToggleReportSchedule(ctx *fiber.Ctx) error {
	scheduleID, err := uuid.Parse(ctx.Params("id"))
	if err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid schedule ID",
		})
	}

	var req struct {
		IsActive bool `json:"is_active"`
	}

	if err := ctx.BodyParser(&req); err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	if err := c.service.ToggleReportSchedule(scheduleID, req.IsActive); err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to toggle schedule",
		})
	}

	return ctx.JSON(fiber.Map{
		"message": "Schedule toggled successfully",
	})
}

// DeleteReportSchedule deletes a schedule
// DELETE /api/reports/schedules/:id
func (c *ReportController) DeleteReportSchedule(ctx *fiber.Ctx) error {
	scheduleID, err := uuid.Parse(ctx.Params("id"))
	if err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid schedule ID",
		})
	}

	if err := c.service.DeleteReportSchedule(scheduleID); err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to delete schedule",
		})
	}

	return ctx.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "Schedule deleted successfully",
	})
}

// Report Execution endpoints

// GetReportExecutions retrieves execution history
// GET /api/reports/schedules/:id/executions?limit=20&offset=0
func (c *ReportController) GetReportExecutions(ctx *fiber.Ctx) error {
	scheduleID, err := uuid.Parse(ctx.Params("id"))
	if err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid schedule ID",
		})
	}

	limit, _ := strconv.Atoi(ctx.Query("limit", "20"))
	offset, _ := strconv.Atoi(ctx.Query("offset", "0"))

	if limit <= 0 || limit > 100 {
		limit = 20
	}

	executions, err := c.service.GetReportExecutions(scheduleID, limit, offset)
	if err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to retrieve executions",
		})
	}

	return ctx.JSON(fiber.Map{
		"executions": executions,
		"count":      len(executions),
	})
}

// GetReportExecutionStats retrieves execution statistics
// GET /api/reports/schedules/:id/stats?start_date=2025-01-01&end_date=2025-12-31
func (c *ReportController) GetReportExecutionStats(ctx *fiber.Ctx) error {
	scheduleID, err := uuid.Parse(ctx.Params("id"))
	if err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid schedule ID",
		})
	}

	startDateStr := ctx.Query("start_date")
	endDateStr := ctx.Query("end_date")

	var startDate, endDate time.Time
	if startDateStr != "" {
		startDate, err = time.Parse("2006-01-02", startDateStr)
		if err != nil {
			return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "Invalid start date format",
			})
		}
	} else {
		startDate = time.Now().AddDate(0, -1, 0) // Default: last month
	}

	if endDateStr != "" {
		endDate, err = time.Parse("2006-01-02", endDateStr)
		if err != nil {
			return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "Invalid end date format",
			})
		}
	} else {
		endDate = time.Now()
	}

	stats, err := c.service.GetReportExecutionStats(scheduleID, startDate, endDate)
	if err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to retrieve execution stats",
		})
	}

	return ctx.JSON(fiber.Map{
		"stats":      stats,
		"start_date": startDate.Format("2006-01-02"),
		"end_date":   endDate.Format("2006-01-02"),
	})
}
