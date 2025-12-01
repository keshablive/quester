package routes

import (
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/keshablive/quester/internal/framework/controller"
	"github.com/keshablive/quester/internal/framework/middleware"
)

// SetupClassifiedRoutes sets up classified ad routes
func SetupClassifiedRoutes(router fiber.Router, classifiedAdController *controller.ClassifiedAdController) {
	// Classified Ad routes (Feature #002 - T185-T186)
	classifieds := router.Group("/classifieds")
	classifieds.Use(middleware.FiberAuthMiddleware())

	// POST /api/v1/classifieds - Create classified ad
	classifieds.Post("",
		middleware.FiberRateLimitByIP(20, 1*time.Hour),
		classifiedAdController.CreateAd,
	)

	// GET /api/v1/classifieds/search - Search classified ads
	classifieds.Get("/search",
		middleware.FiberRateLimitByIP(100, 1*time.Minute),
		classifiedAdController.SearchAds,
	)

	// GET /api/v1/classifieds/my-ads - Get current user's ads
	classifieds.Get("/my-ads",
		middleware.FiberRateLimitByIP(100, 1*time.Minute),
		classifiedAdController.GetMyAds,
	)

	// GET /api/v1/classifieds/recent - Get recent classified ads
	classifieds.Get("/recent",
		middleware.FiberRateLimitByIP(100, 1*time.Minute),
		classifiedAdController.GetRecentAds,
	)

	// GET /api/v1/classifieds/popular - Get popular classified ads
	classifieds.Get("/popular",
		middleware.FiberRateLimitByIP(100, 1*time.Minute),
		classifiedAdController.GetPopularAds,
	)

	// GET /api/v1/classifieds/stats - Get classified ad statistics
	classifieds.Get("/stats",
		middleware.FiberRateLimitByIP(100, 1*time.Minute),
		classifiedAdController.GetAdStats,
	)

	// GET /api/v1/classifieds/:id - Get classified ad details
	classifieds.Get("/:id",
		middleware.FiberRateLimitByIP(200, 1*time.Minute),
		classifiedAdController.GetAd,
	)

	// PUT /api/v1/classifieds/:id - Update classified ad
	classifieds.Put("/:id",
		middleware.FiberRateLimitByIP(30, 1*time.Hour),
		classifiedAdController.UpdateAd,
	)

	// DELETE /api/v1/classifieds/:id - Delete classified ad
	classifieds.Delete("/:id",
		middleware.FiberRateLimitByIP(10, 1*time.Hour),
		classifiedAdController.DeleteAd,
	)

	// POST /api/v1/classifieds/:id/publish - Publish classified ad
	classifieds.Post("/:id/publish",
		middleware.FiberRateLimitByIP(20, 1*time.Hour),
		classifiedAdController.PublishAd,
	)

	// POST /api/v1/classifieds/:id/renew - Renew classified ad (extend by 30 days)
	classifieds.Post("/:id/renew",
		middleware.FiberRateLimitByIP(10, 24*time.Hour),
		classifiedAdController.RenewAd,
	)

	// POST /api/v1/classifieds/:id/sold - Mark classified ad as sold
	classifieds.Post("/:id/sold",
		middleware.FiberRateLimitByIP(10, 1*time.Hour),
		classifiedAdController.MarkAsSold,
	)
}
