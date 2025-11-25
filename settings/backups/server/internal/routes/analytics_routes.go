package routes

import (
	"github.com/gofiber/fiber/v2"

	"github.com/yourusername/quester/internal/controllers"
	"github.com/yourusername/quester/internal/framework/middleware"
	"github.com/yourusername/quester/internal/services"
)

// RegisterAnalyticsRoutes registers analytics routes
func RegisterAnalyticsRoutes(app *fiber.App, analyticsService *services.AnalyticsService, authMiddleware fiber.Handler) {
	// Create controller
	analyticsController := controllers.NewAnalyticsController(analyticsService)

	// Analytics routes group
	analytics := app.Group("/api/analytics")
	analytics.Use(authMiddleware)
	analytics.Use(middleware.TenantMiddleware())

	// User analytics routes
	analytics.Post("/users/:userId/track", middleware.RateLimiter(), analyticsController.TrackUserActivity)
	analytics.Get("/users/:userId/summary", analyticsController.GetUserAnalyticsSummary)
	analytics.Get("/users/:userId/timeseries", analyticsController.GetUserAnalyticsTimeSeries)

	// Course analytics routes
	analytics.Post("/courses/:courseId/track", middleware.RateLimiter(), analyticsController.TrackCourseActivity)
	analytics.Get("/courses/:courseId/summary", analyticsController.GetCourseAnalyticsSummary)
	analytics.Get("/courses/:courseId/timeseries", analyticsController.GetCourseAnalyticsTimeSeries)
	analytics.Get("/courses/top", analyticsController.GetTopCourses)

	// Engagement analytics routes
	analytics.Post("/engagement/track", middleware.RateLimiter(), analyticsController.TrackEngagementActivity)
	analytics.Get("/engagement/summary", analyticsController.GetEngagementAnalyticsSummary)
	analytics.Get("/engagement/timeseries", analyticsController.GetEngagementAnalyticsTimeSeries)

	// Note: Metrics routes disabled - metrics_controller requires service layer updates
}
