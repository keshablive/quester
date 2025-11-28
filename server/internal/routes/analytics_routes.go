package routes

import (
	"time"

	"github.com/gofiber/fiber/v2"

	"github.com/keshablive/quester/internal/controllers"
	fwmiddleware "github.com/keshablive/quester/internal/framework/middleware"
)

// SetupAnalyticsRoutes sets up analytics routes
func SetupAnalyticsRoutes(v1 fiber.Router, analyticsController *controllers.AnalyticsController) {
	// Analytics routes group
	analytics := v1.Group("/analytics")

	// User analytics routes
	analytics.Post("/users/:userId/track", fwmiddleware.FiberRateLimitByIP(60, 1*time.Minute), analyticsController.TrackUserActivity)
	analytics.Get("/users/:userId/summary", analyticsController.GetUserAnalyticsSummary)
	analytics.Get("/users/:userId/timeseries", analyticsController.GetUserAnalyticsTimeSeries)

	// Course analytics routes
	analytics.Post("/courses/:courseId/track", fwmiddleware.FiberRateLimitByIP(60, 1*time.Minute), analyticsController.TrackCourseActivity)
	analytics.Get("/courses/:courseId/summary", analyticsController.GetCourseAnalyticsSummary)
	analytics.Get("/courses/:courseId/timeseries", analyticsController.GetCourseAnalyticsTimeSeries)
	analytics.Get("/courses/top", analyticsController.GetTopCourses)

	// Engagement analytics routes
	analytics.Post("/engagement/track", fwmiddleware.FiberRateLimitByIP(60, 1*time.Minute), analyticsController.TrackEngagementActivity)
	analytics.Get("/engagement/summary", analyticsController.GetEngagementAnalyticsSummary)
	analytics.Get("/engagement/timeseries", analyticsController.GetEngagementAnalyticsTimeSeries)

	// Note: Metrics routes disabled - metrics_controller requires service layer updates
}
