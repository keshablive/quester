package routes

import (
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/keshablive/quester/internal/framework/controller"
	"github.com/keshablive/quester/internal/framework/middleware"
	"github.com/keshablive/quester/internal/models"
)

// SetupAdminRoutes sets up admin routes
func SetupAdminRoutes(router fiber.Router, kmsController *controller.KMSController) {
	// Admin routes (Feature #003 - T218-T220: KMS Management)
	admin := router.Group("/admin")
	admin.Use(middleware.FiberAuthMiddleware())
	admin.Use(middleware.FiberRoleMiddlewareString(string(models.RoleAdmin)))

	if kmsController != nil {
		kms := admin.Group("/kms")

		// POST /api/v1/admin/kms/rotate-dek - Manually rotate Data Encryption Key
		// T218: Triggers generation of new DEK, marks old DEK as rotated
		kms.Post("/rotate-dek",
			middleware.FiberRateLimitByIP(5, 24*time.Hour), // Max 5 rotations per day
			kmsController.RotateDEK,
		)

		// GET /api/v1/admin/kms/keys - List all encryption keys
		// T219: Returns all DEKs with status, version, algorithm info
		kms.Get("/keys",
			middleware.FiberRateLimitByIP(100, 1*time.Minute),
			kmsController.ListKeys,
		)

		// GET /api/v1/admin/kms/audit-log - Get KMS audit logs
		// T220: Returns audit trail of all key operations
		kms.Get("/audit-log",
			middleware.FiberRateLimitByIP(100, 1*time.Minute),
			kmsController.GetAuditLog,
		)

		// GET /api/v1/admin/kms/stats - Get KMS statistics
		// Bonus: Monitor encryption status, active keys, user migration progress
		kms.Get("/stats",
			middleware.FiberRateLimitByIP(100, 1*time.Minute),
			kmsController.GetStats,
		)
	}
}
