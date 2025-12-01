package routes

import (
	"log"

	"github.com/gofiber/fiber/v2"
	"github.com/keshablive/quester/internal/controllers"
	"github.com/keshablive/quester/internal/framework/cache"
	"github.com/keshablive/quester/internal/framework/config"
	"github.com/keshablive/quester/internal/framework/container"
	fmiddleware "github.com/keshablive/quester/internal/framework/middleware"
	"github.com/keshablive/quester/internal/framework/payment"
	"github.com/keshablive/quester/internal/framework/websocket"
	"github.com/keshablive/quester/internal/models"
	"github.com/keshablive/quester/internal/repositories"
	"github.com/keshablive/quester/internal/framework/service"
	"gorm.io/gorm"
)

// Setup configures all routes with Property & Classified Ad endpoints
func Setup(app *fiber.App, cont *container.Container) {
	// Resolve infrastructure dependencies from container
	db := cont.MustResolve("database").(*gorm.DB)
	cfg := cont.MustResolve("config").(*config.Config)

	// Resolve CacheService from container (007-api-performance-caching T036)
	var cacheService *service.CacheService
	if cs, err := cont.Resolve("cacheService"); err == nil && cs != nil {
		cacheService = cs.(*service.CacheService)
		log.Println("✓ CacheService resolved for route injection (007-api-performance-caching)")
	} else {
		log.Println("⚠ CacheService not available - caching disabled for services")
	}

	// =========================================================================
	// 008-api-response-optimization: Response Optimization Middleware
	// =========================================================================
	// T008: Wire request_id middleware (early in chain)
	app.Use(fmiddleware.RequestID())
	log.Println("✓ RequestID middleware enabled (008-api-response-optimization)")

	// T009: Wire response_version middleware (API version detection)
	app.Use(fmiddleware.ResponseVersion())
	log.Println("✓ ResponseVersion middleware enabled (008-api-response-optimization)")

	// T016: Wire fields middleware (sparse fieldsets)
	app.Use(fmiddleware.Fields())
	log.Println("✓ Fields middleware enabled (008-api-response-optimization)")

	// T042: Wire cache_control middleware
	app.Use(fmiddleware.CacheControl())
	log.Println("✓ CacheControl middleware enabled (008-api-response-optimization)")

	// Health check
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"status":  "ok",
			"message": "Server is running",
		})
	})

	// API v1 group
	v1 := app.Group("/api/v1")

	// T023: Wire ETag middleware for API routes (after response generation)
	v1.Use(fmiddleware.ETag(fmiddleware.ETagConfig{
		IncludeUserID: true, // FR-010: Include user ID for user-specific responses
	}))
	log.Println("✓ ETag middleware enabled for /api/v1 (008-api-response-optimization)")

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
	notificationService := service.NewNotificationService(db)
	ocrService := service.NewOCRService()
	openAIService := service.NewOpenAIService()
	propertyRepo := repositories.NewPropertyRepository(db)
	propertyService := service.NewPropertyService(propertyRepo, db, ocrService, openAIService)
	classifiedAdService := service.NewClassifiedAdService(db)
	videoStreamingService := service.NewVideoStreamingService(db, nil) // Redis TBD
	certificateService := service.NewCertificateService(db)
	badgeService := service.NewBadgeService(db, nil, badgeRepo, badgeRepo, nil, notificationService) // logger=nil, Redis=nil (TBD)
	questRepo := repositories.NewQuestRepository(db)
	// 007-api-performance-caching T036: Inject CacheService into QuestService
	var questService *service.QuestService
	if cacheService != nil {
		questService = service.NewQuestServiceWithCache(db, nil, nil, questRepo, userRepo, badgeService, notificationService, cacheService)
	} else {
		questService = service.NewQuestService(db, nil, nil, questRepo, userRepo, badgeService, notificationService)
	}

	// Two-Factor Service with repositories
	twoFactorRepo := repositories.NewTwoFactorRepository(db)
	backupCodeRepo := repositories.NewBackupCodeRepository(db)
	trustedDeviceRepo := repositories.NewTrustedDeviceRepository(db)
	authAuditLogRepo := repositories.NewAuthAuditLogRepository(db)
	encKeyRepo := repositories.NewEncryptionKeyRepository(db)
	twoFactorService := service.NewTwoFactorService(cfg, twoFactorRepo, backupCodeRepo, trustedDeviceRepo, authAuditLogRepo, encKeyRepo)

	// Auth Service and Controller
	refreshTokenRepo := repositories.NewRefreshTokenRepository(db)
	blacklistService := service.NewBlacklistService(cache.Client)
	authService := service.NewAuthService(userRepo, refreshTokenRepo, blacklistService)

	analyticsService := service.NewAnalyticsService(analyticsRepo)
	messagingService := service.NewMessagingService(db)
	fcmService, _ := service.NewFCMService(cfg.FirebaseCredentialsPath, fcmTokenRepo)

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

	transactionService := service.NewTransactionService(
		transactionRepo,
		db,
		marketplaceRepo,
		userRepo,
		paymentManager,
		notificationService,
	)

	socialService := service.NewSocialService(
		likeRepo,
		commentRepo,
		postRepo,
		activityRepo,
		userRepo,
		followRepo,
		notificationService,
	)

	// DVR Service
	var s3ClientForDVR service.S3Uploader = nil
	s3Enabled := false
	if cfg.S3Bucket != "" && cfg.S3AccessKey != "" && cfg.S3SecretKey != "" {
		s3Enabled = true
	}
	dvrConfig := &service.DVRConfig{
		BaseDir:   "./dvr_storage",
		S3Bucket:  cfg.S3Bucket,
		S3Enabled: s3Enabled,
	}
	dvrService, err := service.NewDVRService(dvrConfig, s3ClientForDVR)
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

	// Social Gamification Service (005-social-feed-gamification)
	// Must be after redisClient initialization
	socialXPRepo := repositories.NewSocialXPRepository(db)
	dailyChallengeRepo := repositories.NewDailyChallengeRepository(db)
	contentMilestoneRepo := repositories.NewContentMilestoneRepository(db)

	// Initialize queue service for async XP processing (FR-013)
	var queueService *service.QueueService
	if redisClient != nil {
		queueService = service.NewQueueService(redisClient)
	}

	socialGamifService := service.NewSocialGamificationService(
		socialXPRepo,
		dailyChallengeRepo,
		contentMilestoneRepo,
		userRepo,
	)
	// Inject optional dependencies
	if queueService != nil {
		socialGamifService.SetQueueService(queueService)
	}
	if notificationService != nil {
		socialGamifService.SetNotificationService(notificationService)
	}

	// Link gamification service to social service
	socialService.SetGamificationService(socialGamifService)

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
	socialGamifController := controllers.NewSocialGamificationController(socialGamifService) // 005-social-feed-gamification T027
	analyticsController := controllers.NewAnalyticsController(analyticsService)
	messagesController := controllers.NewMessagesController(messagingService, wsHandler, redisManager, typingIndicator)
	groupsController := controllers.NewGroupsController(messagingService)
	notificationsController := controllers.NewNotificationsController(notificationService, fcmService)

	// Learning Gamification Service (006-course-gamification T024)
	// Resolve from container where it was registered in app.go
	var learningGamifController *controllers.LearningGamificationController
	if learningGamifSvc, err := cont.Resolve("learningGamificationService"); err == nil {
		if learningGamifService, ok := learningGamifSvc.(*service.LearningGamificationService); ok && learningGamifService != nil {
			// Inject optional dependencies
			if queueService != nil {
				learningGamifService.SetQueueService(queueService)
			}
			if notificationService != nil {
				learningGamifService.SetNotificationService(notificationService)
			}
			learningGamifController = controllers.NewLearningGamificationController(learningGamifService)
		}
	}

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

	// Social Gamification Routes (005-social-feed-gamification T028)
	SetupSocialGamificationRoutes(v1, socialGamifController)

	// Learning Gamification Routes (006-course-gamification T033)
	if learningGamifController != nil {
		SetupLearningGamificationRoutes(v1, learningGamifController)
	}

	// Leaderboard Controller (013-leaderboard-controller-integration T007)
	// Resolve LeaderboardService from container and create controller
	var leaderboardController *controllers.LeaderboardController
	if leaderboardSvc, err := cont.Resolve("leaderboardService"); err == nil {
		if leaderboardService, ok := leaderboardSvc.(*service.LeaderboardService); ok && leaderboardService != nil {
			leaderboardController = controllers.NewLeaderboardController(leaderboardService)
			log.Println("✓ LeaderboardController initialized (013-leaderboard-controller-integration)")
		}
	}

	// Leaderboard Routes (013-leaderboard-controller-integration T007)
	if leaderboardController != nil {
		SetupLeaderboardRoutes(v1, leaderboardController)
	}

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
func registerEventHandlers(app *fiber.App, notificationService *service.NotificationService) {
	// TODO: Implement event handlers registration
	// This function was missing after refactoring.
	// It likely subscribes to an event bus for notifications.
}
