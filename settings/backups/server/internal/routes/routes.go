package routes

import (
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/yourusername/quester/internal/controllers"
	"github.com/yourusername/quester/internal/framework/config"
	"github.com/yourusername/quester/internal/framework/middleware"
	"github.com/yourusername/quester/internal/framework/payment"
	"github.com/yourusername/quester/internal/models"
	"github.com/yourusername/quester/internal/repositories"
	"github.com/yourusername/quester/internal/services"
	"gorm.io/gorm"
)

// Setup configures all routes with Property & Classified Ad endpoints
func Setup(app *fiber.App, db *gorm.DB, cfg *config.Config) {
	// Health check
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"status":  "ok",
			"message": "Server is running",
		})
	})

	// Initialize Property & Classified Ad services (Feature #002)
	ocrService := services.NewOCRService()
	openAIService := services.NewOpenAIService()
	propertyService := services.NewPropertyService(db, ocrService, openAIService)
	classifiedAdService := services.NewClassifiedAdService(db)

	// Initialize Property & Classified Ad controllers (Phase 3)
	propertyController := controllers.NewPropertyController(propertyService)
	classifiedAdController := controllers.NewClassifiedAdController(classifiedAdService)

	// Initialize Video Streaming services (Feature #003 Phase 2 - T506, T507)
	videoStreamingService := services.NewVideoStreamingService(db, nil) // Redis TBD

	// Initialize S3 client for DVR recordings (C4: DVR Permanent Storage)
	var s3ClientForDVR services.S3Uploader = nil
	s3Enabled := false
	if cfg.S3Bucket != "" && cfg.S3AccessKey != "" && cfg.S3SecretKey != "" {
		// S3 is configured, enable S3 storage
		s3Enabled = true
		// TODO: Initialize actual S3 client using storage.NewS3Client() when needed
		// For now, DVR will work with local storage only
	}

	// Initialize DVR service with S3 support (C4: DVR Permanent Storage)
	dvrConfig := &services.DVRConfig{
		BaseDir:   "./dvr_storage",
		S3Bucket:  cfg.S3Bucket,
		S3Enabled: s3Enabled,
	}
	dvrService, err := services.NewDVRService(dvrConfig, s3ClientForDVR)
	if err != nil {
		// If DVR cannot be initialized, continue without it but log (routes package doesn't have logger here)
		// For now, fallback to nil DVR and controller should handle nil safely.
		dvrService = nil
	}

	videoController := controllers.NewVideoStreamingController(db, videoStreamingService, dvrService)

	// Initialize Certificate service and controller (Feature #003 FR-003: T612-T614)
	certificateService := services.NewCertificateService(db)
	certificateController := controllers.NewCertificateController(certificateService)

	// Initialize Badge controller (Gamification features)
	badgeController := controllers.NewBadgeController(db)
	badgeController.RegisterRoutes(app) // Registers /api/v1/badges routes

	// Initialize Achievement controller (FR-006: Achievement System)
	achievementController := controllers.NewAchievementController(db)
	achievementController.RegisterRoutes(app) // Registers /api/v1/achievements routes

	// Initialize Quest system (C1: Quest System Implementation)
	badgeRepo := repositories.NewBadgeRepository(db)
	notificationService := services.NewNotificationService(db)
	badgeService := services.NewBadgeService(badgeRepo, nil, notificationService) // Redis TBD
	questService := services.NewQuestService(db, badgeService, notificationService)
	questController := controllers.NewQuestController(questService)
	questController.RegisterRoutes(app) // Registers /api/v1/quests routes

	// Initialize Course controller (Core LMS)
	courseController := controllers.NewCourseController(db)
	courseController.RegisterRoutes(app) // Registers /api/v1/courses routes

	// Initialize Lesson controller (Core LMS)
	lessonController := controllers.NewLessonController(db)
	lessonController.RegisterRoutes(app) // Registers /api/v1/lessons routes

	// Initialize Enrollment controller (Core LMS)
	enrollmentController := controllers.NewEnrollmentController(db)
	enrollmentController.RegisterRoutes(app) // Registers enrollment routes

	// API v1 group
	v1 := app.Group("/api/v1")

	// Auth routes - T111, T112 (FR-001: BlacklistService Integration)
	auth := v1.Group("/auth")

	// GET /api/v1/auth/blacklist/check - Check if current token is blacklisted
	// T111: Requires authentication (user must be logged in)
	auth.Get("/blacklist/check",
		middleware.FiberAuthMiddleware(),
		middleware.FiberRateLimitByIP(100, 1*time.Minute),
		controllers.CheckBlacklistStatus,
	)

	// DELETE /api/v1/auth/blacklist/cleanup - Manual cleanup of expired tokens
	// T112: Admin only, though Redis TTL handles automatic expiration
	auth.Delete("/blacklist/cleanup",
		middleware.FiberAuthMiddleware(),
		middleware.FiberRoleMiddleware(models.RoleAdmin),
		middleware.FiberRateLimitByIP(10, 1*time.Hour),
		controllers.CleanupBlacklist,
	)

	// Property routes (Feature #002 - T183-T186)
	properties := v1.Group("/properties")
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

	// Classified Ad routes (Feature #002 - T185-T186)
	classifieds := v1.Group("/classifieds")
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

	// Certificate routes (Feature #003 FR-003: T612-T614)
	certificates := v1.Group("/certificates")
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
	v1.Get("/certificates/verify/:code",
		middleware.FiberRateLimitByIP(200, 1*time.Minute),
		certificateController.VerifyCertificate,
	)

	// Video Streaming routes (Feature #003 Phase 2 - T506, T507)
	streams := v1.Group("/streams")

	// POST /api/v1/streams - Create new stream (requires auth)
	// T506: Creates stream with generated key, returns RTMP/HLS endpoints
	streams.Post("",
		middleware.FiberAuthMiddleware(),
		middleware.FiberRateLimitByIP(10, 1*time.Hour),
		videoController.CreateStream,
	)

	// POST /api/v1/streams/validate - RTMP auth callback (NO auth middleware)
	// T507: Called by nginx-rtmp on_publish, validates stream key
	streams.Post("/validate",
		middleware.FiberRateLimitByIP(1000, 1*time.Minute), // High rate for nginx callbacks
		videoController.ValidateStream,
	)

	// POST /api/v1/streams/publish-done - RTMP publish done callback (NO auth middleware)
	// Called by nginx-rtmp on_publish_done, marks stream as ended
	streams.Post("/publish-done",
		middleware.FiberRateLimitByIP(1000, 1*time.Minute),
		videoController.PublishDone,
	)

	// GET /api/v1/streams/:key/master.m3u8 - Get master ABR playlist
	// T524, T529: Serves enhanced HLS master playlist with full ABR metadata
	streams.Get("/:key/master.m3u8",
		middleware.FiberRateLimitByIP(1000, 1*time.Minute), // High rate for video playback
		videoController.GetMasterPlaylist,
	)

	// GET /api/v1/streams/:key/dvr/playlist.m3u8 - Get DVR playlist for time-shifted playback
	// T533: Serves DVR playlist with optional seek parameter
	streams.Get("/:key/dvr/playlist.m3u8",
		middleware.FiberRateLimitByIP(1000, 1*time.Minute),
		videoController.GetDVRPlaylist,
	)

	// Recordings routes (Feature #003 Phase 2 - T535-T537)
	recordings := v1.Group("/recordings")

	// GET /api/v1/recordings/:id - Get recording details
	// T536: Retrieves metadata and playback URL for saved recording
	recordings.Get("/:id",
		middleware.FiberRateLimitByIP(100, 1*time.Minute),
		videoController.GetRecording,
	)

	// DELETE /api/v1/recordings/:id - Delete recording
	// T537: Deletes recording from database and S3 storage
	recordings.Delete("/:id",
		middleware.FiberAuthMiddleware(),
		middleware.FiberRateLimitByIP(10, 1*time.Hour),
		videoController.DeleteRecording,
	)

	// Admin routes (Feature #003 - T218-T220: KMS Management)
	admin := v1.Group("/admin")
	admin.Use(middleware.FiberAuthMiddleware())
	admin.Use(middleware.FiberRoleMiddleware(models.RoleAdmin))

	// Initialize KMS controller
	kmsController, err := controllers.NewKMSController()
	if err != nil {
		// KMS not configured - skip KMS routes
	} else {
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

	// Initialize Transaction services and controller
	// Initialize repositories
	transactionRepo := repositories.NewTransactionRepository(db)
	marketplaceRepo := repositories.NewMarketplaceListingRepository(db)
	userRepo := repositories.NewUserRepository(db)
	notificationRepo := repositories.NewNotificationRepository(db)
	notificationSettingsRepo := repositories.NewNotificationSettingsRepository(db)
	fcmTokenRepo := repositories.NewFCMTokenRepository(db)

	// Initialize payment manager (TODO: Add payment credentials to config)
	// For now, create empty config - payment features won't work until configured
	razorpayConfig := &payment.RazorpayConfig{
		KeyID:         "", // TODO: Add RAZORPAY_KEY_ID to .env and config
		KeySecret:     "", // TODO: Add RAZORPAY_KEY_SECRET to .env and config
		WebhookSecret: cfg.RazorpayWebhookSecret,
	}
	stripeConfig := &payment.StripeConfig{
		SecretKey:     "", // TODO: Add STRIPE_SECRET_KEY to .env and config
		WebhookSecret: cfg.StripeWebhookSecret,
	}
	paymentManager, err := payment.NewPaymentManager(razorpayConfig, stripeConfig)
	if err != nil {
		// Payment manager initialization failed - this is non-fatal, continue without it
		paymentManager = nil
	}

	// Initialize transaction service
	transactionService := services.NewTransactionService(
		db,
		transactionRepo,
		marketplaceRepo,
		userRepo,
		paymentManager,
		notificationService,
	)

	// Initialize transaction controller
	transactionController := controllers.NewTransactionController(transactionService, cfg)

	// Suppress unused variable warnings for now
	_ = notificationRepo
	_ = notificationSettingsRepo
	_ = fcmTokenRepo

	// Transaction routes
	transactions := v1.Group("/transactions")
	transactions.Use(middleware.FiberAuthMiddleware())

	// POST /api/v1/transactions - Initiate a new transaction
	transactions.Post("",
		middleware.FiberRateLimitByIP(20, 1*time.Hour),
		transactionController.InitiateTransaction,
	)

	// POST /api/v1/transactions/:id/confirm - Confirm payment
	transactions.Post("/:id/confirm",
		middleware.FiberRateLimitByIP(20, 1*time.Hour),
		transactionController.ConfirmPayment,
	)

	// POST /api/v1/transactions/:id/delivery - Confirm delivery
	transactions.Post("/:id/delivery",
		middleware.FiberRateLimitByIP(20, 1*time.Hour),
		transactionController.ConfirmDelivery,
	)

	// POST /api/v1/transactions/:id/release - Release funds
	transactions.Post("/:id/release",
		middleware.FiberRateLimitByIP(20, 1*time.Hour),
		transactionController.ReleaseFunds,
	)

	// POST /api/v1/transactions/:id/dispute - Open dispute
	transactions.Post("/:id/dispute",
		middleware.FiberRateLimitByIP(10, 1*time.Hour),
		transactionController.OpenDispute,
	)

	// POST /api/v1/transactions/:id/resolve - Resolve dispute (admin only)
	transactions.Post("/:id/resolve",
		middleware.FiberRoleMiddleware(models.RoleAdmin),
		middleware.FiberRateLimitByIP(50, 1*time.Hour),
		transactionController.ResolveDispute,
	)

	// GET /api/v1/transactions/:id - Get transaction details
	transactions.Get("/:id",
		middleware.FiberRateLimitByIP(100, 1*time.Minute),
		transactionController.GetTransaction,
	)

	// GET /api/v1/transactions - Get my transactions
	transactions.Get("",
		middleware.FiberRateLimitByIP(100, 1*time.Minute),
		transactionController.GetMyTransactions,
	)

	// GET /api/v1/transactions/disputed - Get disputed transactions (admin only)
	transactions.Get("/disputed",
		middleware.FiberRoleMiddleware(models.RoleAdmin),
		middleware.FiberRateLimitByIP(100, 1*time.Minute),
		transactionController.GetDisputedTransactions,
	)

	// Webhook routes (no auth required, verified by signature)
	webhooks := app.Group("/api/webhooks")

	// POST /api/webhooks/razorpay - Razorpay webhook
	webhooks.Post("/razorpay",
		middleware.FiberRateLimitByIP(100, 1*time.Minute),
		transactionController.WebhookRazorpay,
	)

	// POST /api/webhooks/stripe - Stripe webhook
	webhooks.Post("/stripe",
		middleware.FiberRateLimitByIP(100, 1*time.Minute),
		transactionController.WebhookStripe,
	)

	// Suppress "declared and not used" warnings
	_ = propertyService
	_ = classifiedAdService
}
