package routes

import (
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/keshablive/quester/internal/controllers"
	"github.com/keshablive/quester/internal/framework/middleware"
)

// SetupCertificateRoutes sets up certificate routes
func SetupCertificateRoutes(router fiber.Router, certificateController *controllers.CertificateController) {
	// Certificate routes (Feature #003 FR-003: T612-T614)
	certificates := router.Group("/certificates")
	certificates.Use(middleware.FiberAuthMiddleware())

	// POST /api/v1/certificates - Issue a new certificate (manual issuance)
	certificates.Post("",
		middleware.FiberRateLimitByIP(10, 1*time.Hour),
		certificateController.IssueCertificate,
	)

	// GET /api/v1/certificates - Get user's certificates
	certificates.Get("",
		middleware.FiberRateLimitByIP(100, 1*time.Minute),
		certificateController.GetUserCertificates,
	)

	// GET /api/v1/certificates/:id - Get certificate by ID
	certificates.Get("/:id",
		middleware.FiberRateLimitByIP(100, 1*time.Minute),
		certificateController.GetCertificate,
	)

	// GET /api/v1/certificates/:id/download - Get download URL for certificate PDF
	certificates.Get("/:id/download",
		middleware.FiberRateLimitByIP(50, 1*time.Hour),
		certificateController.GetDownloadURL,
	)

	// POST /api/v1/certificates/:id/regenerate - Regenerate certificate PDF
	certificates.Post("/:id/regenerate",
		middleware.FiberRateLimitByIP(5, 1*time.Hour),
		certificateController.RegeneratePDF,
	)

	// GET /api/v1/certificates/course/:courseId - Get certificate for a specific course
	certificates.Get("/course/:courseId",
		middleware.FiberRateLimitByIP(100, 1*time.Minute),
		certificateController.GetCourseCertificate,
	)

	// GET /api/v1/certificates/stats/course/:courseId - Get certificate statistics for a course
	certificates.Get("/stats/course/:courseId",
		middleware.FiberRateLimitByIP(100, 1*time.Minute),
		certificateController.GetCourseStatistics,
	)

	// Public verification endpoint (no auth required)
	router.Get("/certificates/verify/:code",
		middleware.FiberRateLimitByIP(200, 1*time.Minute),
		certificateController.VerifyCertificate,
	)
}
