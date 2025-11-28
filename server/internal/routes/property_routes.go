package routes

import (
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/keshablive/quester/internal/controllers"
	"github.com/keshablive/quester/internal/framework/middleware"
)

// SetupPropertyRoutes sets up property routes
func SetupPropertyRoutes(router fiber.Router, propertyController *controllers.PropertyController) {
	// Property routes (Feature #002 - T183-T186)
	properties := router.Group("/properties")
	properties.Use(middleware.FiberAuthMiddleware())

	// POST /api/v1/properties - Create property listing
	properties.Post("",
		middleware.FiberRateLimitByIP(10, 1*time.Hour),
		propertyController.Create,
	)

	// GET /api/v1/properties/search - Search properties with geo-spatial filtering
	properties.Post("/search",
		middleware.FiberRateLimitByIP(100, 1*time.Minute),
		propertyController.Search,
	)

	// GET /api/v1/properties/stats - Get property statistics
	properties.Get("/stats",
		middleware.FiberRateLimitByIP(100, 1*time.Minute),
		propertyController.GetStats,
	)

	// GET /api/v1/properties/:id - Get property details
	properties.Get("/:id",
		middleware.FiberRateLimitByIP(200, 1*time.Minute),
		propertyController.Get,
	)

	// PUT /api/v1/properties/:id - Update property
	properties.Put("/:id",
		middleware.FiberRateLimitByIP(20, 1*time.Hour),
		propertyController.Update,
	)

	// DELETE /api/v1/properties/:id - Delete property
	properties.Delete("/:id",
		middleware.FiberRateLimitByIP(10, 1*time.Hour),
		propertyController.Delete,
	)

	// POST /api/v1/properties/:id/documents - Upload verification documents
	properties.Post("/:id/documents",
		middleware.FiberRateLimitByIP(10, 1*time.Hour),
		propertyController.UploadDocuments,
	)

	// POST /api/v1/properties/:id/verify - Trigger OCR + AI document verification
	properties.Post("/:id/verify",
		middleware.FiberRateLimitByIP(5, 1*time.Hour),
		propertyController.VerifyDocuments,
	)

	// POST /api/v1/properties/:id/publish - Publish property listing
	properties.Post("/:id/publish",
		middleware.FiberRateLimitByIP(10, 1*time.Hour),
		propertyController.Publish,
	)

	// POST /api/v1/properties/:id/contact - Increment contact count
	properties.Post("/:id/contact",
		middleware.FiberRateLimitByIP(50, 1*time.Hour),
		propertyController.IncrementContactCount,
	)
}
