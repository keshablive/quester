package routes

import (
	"time"

	"github.com/gofiber/fiber/v2"

	"github.com/keshablive/quester/internal/controllers"
	fwmiddleware "github.com/keshablive/quester/internal/framework/middleware"
	"github.com/keshablive/quester/internal/services"
)

// SetupReportsRoutes registers report and dashboard routes
func SetupReportsRoutes(app *fiber.App, reportService *services.ReportService, dashboardService *services.DashboardService, authMiddleware fiber.Handler) {
	// Create controllers
	reportController := controllers.NewReportController(reportService)
	dashboardController := controllers.NewDashboardController(dashboardService)

	// Reports routes group
	reports := app.Group("/api/reports")
	reports.Use(authMiddleware)
	reports.Use(fwmiddleware.FiberTenantMiddleware())

	// Report CRUD routes
	reports.Post("/", reportController.CreateReport)
	reports.Get("/:id", reportController.GetReport)
	reports.Get("/", reportController.GetUserReports)
	reports.Post("/:id/generate", fwmiddleware.FiberRateLimitByIP(60, 1*time.Minute), reportController.GenerateReport)
	reports.Delete("/:id", reportController.DeleteReport)
	reports.Get("/search", reportController.SearchReports)

	// Report schedule routes
	schedules := reports.Group("/schedules")
	schedules.Post("/", reportController.CreateReportSchedule)
	schedules.Get("/:id", reportController.GetReportSchedule)
	schedules.Get("/", reportController.GetUserReportSchedules)
	schedules.Put("/:id", reportController.UpdateReportSchedule)
	schedules.Patch("/:id/toggle", reportController.ToggleReportSchedule)
	schedules.Delete("/:id", reportController.DeleteReportSchedule)

	// Report execution routes
	schedules.Get("/:id/executions", reportController.GetReportExecutions)
	schedules.Get("/:id/stats", reportController.GetReportExecutionStats)

	// Dashboards routes group
	dashboards := app.Group("/api/dashboards")
	dashboards.Use(authMiddleware)
	dashboards.Use(fwmiddleware.FiberTenantMiddleware())

	// Dashboard CRUD routes
	dashboards.Post("/", dashboardController.CreateDashboard)
	dashboards.Get("/default", dashboardController.GetDefaultDashboard)
	// dashboards.Get("/shared", dashboardController.GetSharedDashboards) // Method not implemented
	dashboards.Get("/search", dashboardController.SearchDashboards)
	dashboards.Get("/:id", dashboardController.GetDashboard)
	dashboards.Get("/", dashboardController.GetUserDashboards)
	dashboards.Put("/:id", dashboardController.UpdateDashboard)
	dashboards.Patch("/:id/default", dashboardController.SetDefaultDashboard)
	dashboards.Post("/:id/clone", dashboardController.CloneDashboard)
	dashboards.Delete("/:id", dashboardController.DeleteDashboard)

	// Dashboard operations
	dashboards.Post("/:id/refresh", fwmiddleware.FiberRateLimitByIP(60, 1*time.Minute), dashboardController.RefreshDashboard)
}
