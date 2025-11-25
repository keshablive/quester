package routes

import (
	"log"

	"github.com/gofiber/fiber/v2"
	"github.com/keshablive/quester/internal/controllers"
	"github.com/keshablive/quester/internal/framework/cache"
	"github.com/keshablive/quester/internal/framework/config"
	"github.com/keshablive/quester/internal/framework/container"
	"github.com/keshablive/quester/internal/framework/payment"
	"github.com/keshablive/quester/internal/framework/websocket"
	"github.com/keshablive/quester/internal/models"
	"github.com/keshablive/quester/internal/repositories"
	"github.com/keshablive/quester/internal/services"
	"gorm.io/gorm"
)

// Setup configures all routes with Property & Classified Ad endpoints
func Setup(app *fiber.App, cont *container.Container) {
	// Resolve infrastructure dependencies from container
	db := cont.MustResolve("database").(*gorm.DB)
	cfg := cont.MustResolve("config").(*config.Config)
	// Health check
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"status":  "ok",
			"message": "Server is running",
		})
	})

	// API v1 group
	v1 := app.Group("/api/v1")

	// =========================================================================
	// Initialization Phase
	// =========================================================================
	// Note: Repositories are registered in DI container (T047-T052) but routes.go
	// still uses local instantiation for now. Full service resolution from container
	// will be implemented in Phase 5 when all service dependencies are containerized.

	// Initialize Repositories
	transactionRepo := repositories.NewTransactionRepository(db)
	marketplaceRepo := repositories.NewMarketplaceListingRepository(db)
	userRepo := repositories.NewUserRepository(db)
	notificationRepo := repositories.NewNotificationRepository(db)
	notificationSettingsRepo := repositories.NewNotificationSettingsRepository(db)
	fcmTokenRepo := repositories.NewFCMTokenRepository(db)
	badgeRepo := repositories.NewBadgeRepository(db)
	likeRepo := repositories.NewLikeRepository(db)
	commentRepo := repositories.NewCommentRepository(db)
	postRepo := repositories.NewPostRepository(db)
	activityRepo := repositories.NewActivityRepository(db)
	followRepo := repositories.NewFollowRepository(db)
	analyticsRepo := repositories.NewAnalyticsRepository(db)

	// Initialize Services
	notificationService := services.NewNotificationService(db)
	ocrService := services.NewOCRService()
	openAIService := services.NewOpenAIService()
	propertyRepo := repositories.NewPropertyRepository(db)
	propertyService := services.NewPropertyService(propertyRepo, db, ocrService, openAIService)
	classifiedAdService := services.NewClassifiedAdService(db)
	videoStreamingService := services.NewVideoStreamingService(db, nil) // Redis TBD
	certificateService := services.NewCertificateService(db)
	badgeService := services.NewBadgeService(badgeRepo, badgeRepo, nil, notificationService) // Redis TBD
	questRepo := repositories.NewQuestRepository(db)
	questService := services.NewQuestService(questRepo, userRepo, badgeService, notificationService)

	// Two-Factor Service with repositories
	twoFactorRepo := repositories.NewTwoFactorRepository(db)
	backupCodeRepo := repositories.NewBackupCodeRepository(db)
	trustedDeviceRepo := repositories.NewTrustedDeviceRepository(db)
	authAuditLogRepo := repositories.NewAuthAuditLogRepository(db)
	encKeyRepo := repositories.NewEncryptionKeyRepository(db)
	twoFactorService := services.NewTwoFactorService(cfg, twoFactorRepo, backupCodeRepo, trustedDeviceRepo, authAuditLogRepo, encKeyRepo)

	// Auth Service and Controller
	refreshTokenRepo := repositories.NewRefreshTokenRepository(db)
	blacklistService := services.NewBlacklistService(cache.Client)
	authService := services.NewAuthService(userRepo, refreshTokenRepo, blacklistService)

	analyticsService := services.NewAnalyticsService(analyticsRepo)
	messagingService := services.NewMessagingService(db)
	fcmService, _ := services.NewFCMService(cfg.FirebaseCredentialsPath, fcmTokenRepo)

	// Payment Manager - T047: Initialize using PaymentConfig from framework config
	var paymentManager *payment.PaymentManager
	if cfg.Payment != nil {
		pm, err := payment.NewPaymentManagerFromConfig(cfg.Payment)
		if err != nil {
			// Log warning but continue - payment is optional
			log.Printf("⚠ Payment manager initialization failed: %v (payment features disabled)", err)
		} else {
			paymentManager = pm
			log.Printf("✓ Payment manager initialized (provider: %s)", cfg.Payment.Provider)
		}
	} else {
		log.Println("⚠ Payment config not available (payment features disabled)")
	}

	transactionService := services.NewTransactionService(
		transactionRepo,
		db,
		marketplaceRepo,
		userRepo,
		paymentManager,
		notificationService,
	)

	socialService := services.NewSocialService(
		likeRepo,
		commentRepo,
		postRepo,
		activityRepo,
		userRepo,
		followRepo,
		notificationService,
	)

	// DVR Service
	var s3ClientForDVR services.S3Uploader = nil
	s3Enabled := false
	if cfg.S3Bucket != "" && cfg.S3AccessKey != "" && cfg.S3SecretKey != "" {
		s3Enabled = true
	}
	dvrConfig := &services.DVRConfig{
		BaseDir:   "./dvr_storage",
		S3Bucket:  cfg.S3Bucket,
		S3Enabled: s3Enabled,
	}
	dvrService, err := services.NewDVRService(dvrConfig, s3ClientForDVR)
	if err != nil {
		dvrService = nil
	}

	// WebSocket Components
	// Initialize WebSocket handler for real-time communication
	wsHandler := websocket.NewHandler()

	// Initialize Redis manager for WebSocket pub/sub (if Redis is available)
	var redisManager *websocket.RedisManager
	var typingIndicator *websocket.TypingIndicator
	redisClient := cache.Client // Get Redis client from cache package
	if redisClient != nil {
		redisManager = websocket.NewRedisManager(redisClient, wsHandler)
		typingIndicator = websocket.NewTypingIndicator(redisClient)
		wsHandler.SetRedisManager(redisManager)
	}

	// Initialize Controllers
	propertyController := controllers.NewPropertyController(propertyService)
	classifiedAdController := controllers.NewClassifiedAdController(classifiedAdService)
	videoController := controllers.NewVideoStreamingController(db, videoStreamingService, dvrService)
	certificateController := controllers.NewCertificateController(certificateService)
	badgeController := controllers.NewBadgeController(db)
	achievementController := controllers.NewAchievementController(db)
	questController := controllers.NewQuestController(questService)
	courseController := controllers.NewCourseController(db)
	lessonController := controllers.NewLessonController(db)
	enrollmentController := controllers.NewEnrollmentController(db)
	twoFactorController := controllers.NewTwoFactorController(twoFactorService, userRepo)
	authController := controllers.NewAuthController(authService, twoFactorService)
	transactionController := controllers.NewTransactionController(transactionService, cfg)
	socialController := controllers.NewSocialController(socialService)
	analyticsController := controllers.NewAnalyticsController(analyticsService)
	messagesController := controllers.NewMessagesController(messagingService, wsHandler, redisManager, typingIndicator)
	groupsController := controllers.NewGroupsController(messagingService)
	notificationsController := controllers.NewNotificationsController(notificationService, fcmService)

	// KMS Controller (Admin)
	kmsController, err := controllers.NewKMSController()
	if err != nil {
		kmsController = nil
	}

	// =========================================================================
	// Route Setup Phase
	// =========================================================================

	// Auth Routes
	// Note: AuthController is not initialized in the original file, assuming it uses static methods or needs init
	// Looking at original routes.go, controllers.Signup/Login are used directly.
	// But SetupAuthRoutes expects *controllers.AuthController.
	// Wait, original routes.go used `controllers.Signup`, `controllers.Login`.
	// These look like functions, not methods on a controller struct.
	// My SetupAuthRoutes expects `*controllers.AuthController`.
	// I need to check if `AuthController` exists or if I should change `SetupAuthRoutes` to use functions.
	// Auth routes - using AuthController
	SetupAuthRoutes(v1, authController, twoFactorController)

	// Property Routes
	SetupPropertyRoutes(v1, propertyController)

	// Classified Routes
	SetupClassifiedRoutes(v1, classifiedAdController)

	// Certificate Routes
	SetupCertificateRoutes(v1, certificateController)

	// Stream Routes
	SetupStreamRoutes(v1, videoController)

	// Transaction Routes
	SetupTransactionRoutes(v1, app, transactionController)

	// Admin Routes
	SetupAdminRoutes(v1, kmsController)

	// LMS Routes
	SetupLMSRoutes(app, courseController, lessonController, enrollmentController)

	// Gamification Routes
	SetupGamificationRoutes(app, badgeController, achievementController, questController)

	// Social Routes
	SetupSocialRoutes(v1, socialController)

	// Analytics Routes
	SetupAnalyticsRoutes(v1, analyticsController)

	// Messages Routes
	SetupMessagesRoutes(app, messagesController, groupsController)

	// Notifications Routes
	SetupNotificationsRoutes(app, notificationsController)

	// WebSocket Routes
	websocketController := controllers.NewWebSocketController(wsHandler, redisManager, typingIndicator, messagingService, notificationService)
	SetupWebSocketRoutes(app, websocketController)

	// Register event handlers
	registerEventHandlers(app, notificationService)

	// Suppress unused variable warnings
	_ = notificationRepo
	_ = notificationSettingsRepo
	_ = fcmTokenRepo
	_ = models.RoleAdmin // Used in other files
}

// registerEventHandlers registers event handlers for the application
func registerEventHandlers(app *fiber.App, notificationService *services.NotificationService) {
	// TODO: Implement event handlers registration
	// This function was missing after refactoring.
	// It likely subscribes to an event bus for notifications.
}
