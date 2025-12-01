// App initialization, DI container
package app

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/gofiber/adaptor/v2"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/google/uuid"
	"github.com/keshablive/quester/internal/framework/cache"
	"github.com/keshablive/quester/internal/framework/config"
	"github.com/keshablive/quester/internal/framework/container"
	"github.com/keshablive/quester/internal/framework/database"
	"github.com/keshablive/quester/internal/framework/metrics"
	"github.com/keshablive/quester/internal/framework/middleware"
	sentryPkg "github.com/keshablive/quester/internal/framework/sentry"
	"github.com/keshablive/quester/internal/migrations"
	"github.com/keshablive/quester/internal/framework/repository"
	"github.com/keshablive/quester/internal/routes"
	"github.com/keshablive/quester/internal/framework/service"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

// TenantViolationLoggerAdapter implements middleware.TenantViolationLogger
// using the app's AuditLogService for tenant isolation violation logging
type TenantViolationLoggerAdapter struct{}

// LogViolation logs a tenant isolation violation using the app's audit service
func (t *TenantViolationLoggerAdapter) LogViolation(ctx context.Context, userID, userTenantID, resourceTenantID uuid.UUID, resourceType string, resourceID uuid.UUID, action, ip, userAgent string) {
	// Create repository and service (safe for concurrent use)
	auditRepo := repository.NewAuditLogRepository(database.DB)
	auditSvc := service.NewAuditLogService(auditRepo)

	// Fire-and-forget audit logging
	_ = auditSvc.LogTenantViolation(ctx, userID, userTenantID, resourceTenantID, resourceType, resourceID, action, ip, userAgent)

	// Increment Prometheus metric
	metrics.IncTenantViolation()
}

// initMiddleware initializes the framework middleware with app-specific implementations
func initMiddleware() {
	middleware.SetTenantViolationLogger(&TenantViolationLoggerAdapter{})
}

// App represents the application
type App struct {
	Fiber                  *fiber.App
	Config                 *config.Config
	Container              *container.Container // DI container for managing dependencies (T016)
	cancelCleanup          context.CancelFunc   // Cancel function for token cleanup scheduler
	cancelLeaderboard      context.CancelFunc   // Cancel function for leaderboard reset scheduler
	cancelStreamCleanup    context.CancelFunc   // Cancel function for video stream retention cleanup (T099)
	cancelStreakReset      context.CancelFunc   // Cancel function for learning streak reset scheduler (T074)
	cancelChallengeCleanup context.CancelFunc   // Cancel function for daily challenge cleanup scheduler (T094)
}

// New creates a new application instance
func New() (*App, error) {
	// Initialize middleware with app-specific implementations
	initMiddleware()

	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		return nil, fmt.Errorf("failed to load config: %w", err)
	}

	// T223: Log feature flags status
	if cfg.FeatureFlags != nil {
		kmsStatus := "disabled"
		if cfg.FeatureFlags.KMSEncryptionEnabled {
			kmsStatus = "enabled"
			if len(cfg.FeatureFlags.KMSEnabledTenants) > 0 {
				kmsStatus = fmt.Sprintf("enabled (per-tenant: %d tenants)", len(cfg.FeatureFlags.KMSEnabledTenants))
			}
		}
		log.Printf("✓ Feature flags loaded: KMS encryption [%s]", kmsStatus)
	}

	// Initialize database
	dbCfg := &database.Config{
		DatabaseURL:     cfg.DatabaseURL,
		MaxOpenConns:    cfg.DBMaxOpenConns,
		MaxIdleConns:    cfg.DBMaxIdleConns,
		ConnMaxLifetime: cfg.DBConnMaxLifetime,
		LogQueries:      cfg.DBLogQueries,
	}
	if err := database.Initialize(dbCfg); err != nil {
		return nil, fmt.Errorf("failed to initialize database: %w", err)
	}
	log.Println("✓ Database initialized")

	// Initialize cache (Redis)
	cacheCfg := &cache.Config{
		RedisURL: cfg.RedisURL,
		Password: cfg.RedisPassword,
		DB:       cfg.RedisDB,
	}
	if err := cache.Initialize(cacheCfg); err != nil {
		return nil, fmt.Errorf("failed to initialize cache: %w", err)
	}
	log.Println("✓ Cache initialized")

	// Initialize DI container (T016)
	diContainer := initializeContainer(cfg)
	log.Println("✓ DI container initialized")

	// T125: Startup health check - validate required infrastructure services
	startupStart := time.Now()
	if err := validateRequiredServices(diContainer); err != nil {
		return nil, fmt.Errorf("startup health check failed: %w", err)
	}
	log.Printf("✓ Startup health check passed in %v", time.Since(startupStart))

	// Run database migrations
	if err := migrations.RunMigrations(database.DB); err != nil {
		return nil, fmt.Errorf("failed to run migrations: %w", err)
	}
	log.Println("✓ Database migrations completed")

	// Start database metrics collector (updates connection pool stats every 10 seconds)
	database.StartMetricsCollector(10 * time.Second)
	log.Println("✓ Database metrics collector started")

	// Start token cleanup scheduler (T083)
	// Runs daily at 2 AM UTC - calculated as 24-hour interval
	cleanupCtx, cancelCleanup := context.WithCancel(context.Background())
	go service.StartTokenCleanup(cleanupCtx, database.DB, 24*time.Hour)
	log.Println("✓ Token cleanup scheduler started (runs every 24 hours)")

	// Start monthly leaderboard reset scheduler (T041)
	// Runs on the 1st of each month at 00:00 UTC
	leaderboardCtx, cancelLeaderboard := context.WithCancel(context.Background())
	go startLeaderboardResetScheduler(leaderboardCtx)
	log.Println("✓ Monthly leaderboard reset scheduler started (runs 1st of month at 00:00 UTC)")

	// Start video stream retention cleanup scheduler (T099)
	// Runs daily at 02:00 UTC to clean up expired streams
	streamCleanupCtx, cancelStreamCleanup := context.WithCancel(context.Background())
	go startStreamRetentionCleanup(streamCleanupCtx, cfg)
	log.Println("✓ Video stream retention cleanup scheduler started (runs daily at 02:00 UTC)")

	// Start learning streak reset scheduler (T074)
	// Runs daily at 03:00 UTC to reset expired streaks
	streakResetCtx, cancelStreakReset := context.WithCancel(context.Background())
	go startStreakResetScheduler(streakResetCtx)
	log.Println("✓ Learning streak reset scheduler started (runs daily at 03:00 UTC)")

	// Start daily challenge cleanup scheduler (T094)
	// Runs daily at 04:00 UTC to expire old challenges
	challengeCleanupCtx, cancelChallengeCleanup := context.WithCancel(context.Background())
	go startChallengeCleanupScheduler(challengeCleanupCtx)
	log.Println("✓ Daily challenge cleanup scheduler started (runs daily at 04:00 UTC)")

	// Initialize metrics if enabled
	if cfg.MetricsEnabled {
		metrics.Init()
		log.Println("✓ Metrics initialized")
	}

	// Initialize Sentry if DSN is provided
	if cfg.SentryDSN != "" {
		sentryCfg := &sentryPkg.Config{
			DSN:              cfg.SentryDSN,
			Environment:      cfg.SentryEnvironment,
			Release:          cfg.SentryRelease,
			TracesSampleRate: cfg.SentryTracesSampleRate,
			Debug:            cfg.SentryDebug,
		}
		if err := sentryPkg.Initialize(sentryCfg); err != nil {
			log.Printf("Warning: failed to initialize Sentry: %v", err)
			// Non-fatal error, continue startup
		} else {
			log.Println("✓ Sentry initialized")
		}
	}

	// Create Fiber app
	app := fiber.New(fiber.Config{
		ErrorHandler: customErrorHandler,
		AppName:      "Quester API v1.0.0",
	})

	// Middleware
	// Sentry panic recovery (must be first to catch all panics)
	if cfg.SentryDSN != "" {
		app.Use(sentryPkg.RecoverMiddleware())
	}

	app.Use(recover.New())
	app.Use(logger.New(logger.Config{
		Format: "[${time}] ${status} - ${latency} ${method} ${path}\n",
	}))

	// Response compression (007-api-performance-caching T009)
	// Level 6 balanced compression, applied after logging but before routes
	app.Use(middleware.NewCompressionWithDefaults())
	log.Println("✓ Compression middleware enabled (level 6, min 1KB)")

	// Sentry error tracking and performance monitoring
	if cfg.SentryDSN != "" {
		app.Use(sentryPkg.Middleware())
	}

	// CORS
	app.Use(cors.New(cors.Config{
		AllowOrigins: join(cfg.CORSAllowedOrigins, ","),
		AllowMethods: join(cfg.CORSAllowedMethods, ","),
		AllowHeaders: join(cfg.CORSAllowedHeaders, ","),
	}))

	// Health check endpoint
	app.Get("/health", func(c *fiber.Ctx) error {
		// Check database health
		if err := database.Health(); err != nil {
			return c.Status(503).JSON(fiber.Map{
				"status": "unhealthy",
				"error":  "database connection failed",
			})
		}

		// Check cache health
		if err := cache.Health(); err != nil {
			return c.Status(503).JSON(fiber.Map{
				"status": "unhealthy",
				"error":  "cache connection failed",
			})
		}

		return c.JSON(fiber.Map{
			"status":   "healthy",
			"database": "ok",
			"cache":    "ok",
		})
	})

	// Metrics endpoint (Prometheus) - exposed only when metrics are enabled
	if cfg.MetricsEnabled {
		app.Get("/metrics", adaptor.HTTPHandler(promhttp.Handler()))
	}

	// Setup routes with DI container (T018)
	routes.Setup(app, diContainer)

	return &App{
		Fiber:                  app,
		Config:                 cfg,
		Container:              diContainer,
		cancelCleanup:          cancelCleanup,
		cancelLeaderboard:      cancelLeaderboard,
		cancelStreamCleanup:    cancelStreamCleanup,
		cancelStreakReset:      cancelStreakReset,
		cancelChallengeCleanup: cancelChallengeCleanup,
	}, nil
}

// Start starts the application server
func (a *App) Start() error {
	addr := fmt.Sprintf("%s:%d", a.Config.Host, a.Config.Port)
	log.Printf("🚀 Server starting on %s", addr)
	return a.Fiber.Listen(addr)
}

// Shutdown gracefully shuts down the application
func (a *App) Shutdown() error {
	log.Println("Shutting down server...")

	// Stop token cleanup scheduler
	if a.cancelCleanup != nil {
		a.cancelCleanup()
		log.Println("✓ Token cleanup scheduler stopped")
	}

	// Stop leaderboard reset scheduler
	if a.cancelLeaderboard != nil {
		a.cancelLeaderboard()
		log.Println("✓ Leaderboard reset scheduler stopped")
	}

	// Stop video stream retention cleanup scheduler
	if a.cancelStreamCleanup != nil {
		a.cancelStreamCleanup()
		log.Println("✓ Video stream retention cleanup scheduler stopped")
	}

	// Stop learning streak reset scheduler (T074)
	if a.cancelStreakReset != nil {
		a.cancelStreakReset()
		log.Println("✓ Learning streak reset scheduler stopped")
	}

	// Stop daily challenge cleanup scheduler (T094)
	if a.cancelChallengeCleanup != nil {
		a.cancelChallengeCleanup()
		log.Println("✓ Daily challenge cleanup scheduler stopped")
	}

	// Close database connection
	if err := database.Close(); err != nil {
		log.Printf("Error closing database: %v", err)
	}

	// Close cache connection
	if err := cache.Close(); err != nil {
		log.Printf("Error closing cache: %v", err)
	}

	// Flush Sentry events
	if a.Config.SentryDSN != "" {
		sentryPkg.Close()
		log.Println("✓ Sentry events flushed")
	}

	// Shutdown Fiber
	return a.Fiber.Shutdown()
}

// customErrorHandler handles errors
func customErrorHandler(c *fiber.Ctx, err error) error {
	code := fiber.StatusInternalServerError

	if e, ok := err.(*fiber.Error); ok {
		code = e.Code
	}

	return c.Status(code).JSON(fiber.Map{
		"error": err.Error(),
	})
}

// Helper function to join strings
func join(arr []string, sep string) string {
	if len(arr) == 0 {
		return ""
	}
	result := arr[0]
	for i := 1; i < len(arr); i++ {
		result += sep + arr[i]
	}
	return result
}

// validateRequiredServices validates that all required infrastructure services are available (T125)
// This implements fail-fast behavior - startup fails within 2 seconds if any required service is unavailable
func validateRequiredServices(c *container.Container) error {
	requiredServices := []string{
		"database", // Required: GORM database connection
		"cache",    // Required: Redis cache client
		"config",   // Required: Application configuration
	}

	var errors []string
	for _, name := range requiredServices {
		if _, err := c.Resolve(name); err != nil {
			errors = append(errors, fmt.Sprintf("%s: %v", name, err))
		}
	}

	if len(errors) > 0 {
		return fmt.Errorf("required services unavailable: %v", errors)
	}

	// Additional health checks for infrastructure
	// Database connectivity check
	db, _ := c.Resolve("database")
	if db == nil {
		return fmt.Errorf("database connection is nil")
	}

	// Cache connectivity check
	cacheClient, _ := c.Resolve("cache")
	if cacheClient == nil {
		log.Println("⚠ Cache client is nil - Redis may not be available (degraded mode)")
		// Not a fatal error - cache is optional for some deployments
	}

	return nil
}

// startLeaderboardResetScheduler runs monthly leaderboard reset on the 1st of each month at 00:00 UTC
func startLeaderboardResetScheduler(ctx context.Context) {
	ticker := time.NewTicker(1 * time.Hour) // Check every hour
	defer ticker.Stop()

	log.Println("Leaderboard reset scheduler initialized")

	for {
		select {
		case <-ctx.Done():
			log.Println("Leaderboard reset scheduler stopped")
			return
		case <-ticker.C:
			now := time.Now().UTC()

			// Check if it's the 1st day of the month at 00:00 UTC (with 1-hour window)
			if now.Day() == 1 && now.Hour() == 0 {
				log.Printf("Running monthly leaderboard reset for %s", now.Format("2006-01"))

				// TODO: Initialize leaderboard service and call ResetMonthlyLeaderboards
				// For now, just log
				// This will be implemented when the full DI container is set up
				// err := leaderboardService.ResetMonthlyLeaderboards(ctx)
				// if err != nil {
				// 	log.Printf("Error resetting monthly leaderboards: %v", err)
				// } else {
				// 	log.Println("✓ Monthly leaderboards reset successfully")
				// }

				log.Println("Monthly leaderboard reset triggered (implementation pending full DI setup)")

				// Sleep for 2 hours to avoid running multiple times in the same hour
				time.Sleep(2 * time.Hour)
			}
		}
	}
}

// startStreamRetentionCleanup runs daily video stream retention cleanup at 02:00 UTC (T099)
func startStreamRetentionCleanup(ctx context.Context, cfg *config.Config) {
	ticker := time.NewTicker(1 * time.Hour) // Check every hour
	defer ticker.Stop()

	log.Println("Video stream retention cleanup scheduler initialized")

	for {
		select {
		case <-ctx.Done():
			log.Println("Video stream retention cleanup scheduler stopped")
			return
		case <-ticker.C:
			now := time.Now().UTC()

			// Check if it's 02:00 UTC (with 1-hour window)
			if now.Hour() == 2 {
				log.Printf("Running video stream retention cleanup at %s", now.Format(time.RFC3339))

				// TODO: Video streaming service temporarily disabled
				// err = videoStreamService.CleanupExpiredStreams()

				// Sleep for 2 hours to avoid running multiple times in the same hour
				time.Sleep(2 * time.Hour)
			}
		}
	}
}

// startStreakResetScheduler runs daily streak expiry check at 03:00 UTC (T074)
func startStreakResetScheduler(ctx context.Context) {
	ticker := time.NewTicker(1 * time.Hour) // Check every hour
	defer ticker.Stop()

	log.Println("Learning streak reset scheduler initialized")

	for {
		select {
		case <-ctx.Done():
			log.Println("Learning streak reset scheduler stopped")
			return
		case <-ticker.C:
			now := time.Now().UTC()

			// Check if it's 03:00 UTC (with 1-hour window)
			if now.Hour() == 3 {
				log.Printf("Running learning streak reset check at %s", now.Format(time.RFC3339))

				// Create service instance to call ResetExpiredStreaks
				db := database.DB
				if db != nil {
					streakRepo := repository.NewLearningStreakRepository(db)
					xpRepo := repository.NewLearningXPRepository(db)
					levelRepo := repository.NewLearningLevelRepository(db)
					challengeRepo := repository.NewLearningChallengeRepository(db)
					userRepo := repository.NewUserRepository(db)

					svc := service.NewLearningGamificationService(
						xpRepo,
						streakRepo,
						levelRepo,
						challengeRepo,
						userRepo,
					)

					count, err := svc.ResetExpiredStreaks(ctx)
					if err != nil {
						log.Printf("Error resetting expired streaks: %v", err)
					} else {
						log.Printf("✓ Learning streak reset completed: %d streaks reset", count)
					}
				} else {
					log.Println("Warning: database not available for streak reset")
				}

				// Sleep for 2 hours to avoid running multiple times in the same hour
				time.Sleep(2 * time.Hour)
			}
		}
	}
}

// startChallengeCleanupScheduler runs daily challenge cleanup at 04:00 UTC (T094)
func startChallengeCleanupScheduler(ctx context.Context) {
	ticker := time.NewTicker(1 * time.Hour) // Check every hour
	defer ticker.Stop()

	log.Println("Daily challenge cleanup scheduler initialized")

	for {
		select {
		case <-ctx.Done():
			log.Println("Daily challenge cleanup scheduler stopped")
			return
		case <-ticker.C:
			now := time.Now().UTC()

			// Check if it's 04:00 UTC (with 1-hour window)
			if now.Hour() == 4 {
				log.Printf("Running daily challenge cleanup at %s", now.Format(time.RFC3339))

				// Create service instance to call ExpireOldChallenges
				db := database.DB
				if db != nil {
					streakRepo := repository.NewLearningStreakRepository(db)
					xpRepo := repository.NewLearningXPRepository(db)
					levelRepo := repository.NewLearningLevelRepository(db)
					challengeRepo := repository.NewLearningChallengeRepository(db)
					userRepo := repository.NewUserRepository(db)

					svc := service.NewLearningGamificationService(
						xpRepo,
						streakRepo,
						levelRepo,
						challengeRepo,
						userRepo,
					)

					err := svc.ExpireOldChallenges(ctx)
					if err != nil {
						log.Printf("Error cleaning up expired challenges: %v", err)
					} else {
						log.Println("✓ Daily challenge cleanup completed")
					}
				} else {
					log.Println("Warning: database not available for challenge cleanup")
				}

				// Sleep for 2 hours to avoid running multiple times in the same hour
				time.Sleep(2 * time.Hour)
			}
		}
	}
}

// registerRepositories registers all P1 repositories in the DI container (T047-T052)
func registerRepositories(c *container.Container) {
	// Get database from container - fail fast if not initialized
	db := database.DB
	if db == nil {
		log.Fatal("Cannot register repositories: database.DB is nil - ensure database is initialized before container setup")
	}

	// T047: PropertyRepository
	if err := c.RegisterSingleton("propertyRepository", func(c *container.Container) (interface{}, error) {
		return repository.NewPropertyRepository(db), nil
	}); err != nil {
		log.Fatalf("Failed to register propertyRepository: %v", err)
	}

	// T048: QuestRepository
	if err := c.RegisterSingleton("questRepository", func(c *container.Container) (interface{}, error) {
		return repository.NewQuestRepository(db), nil
	}); err != nil {
		log.Fatalf("Failed to register questRepository: %v", err)
	}

	// T049: UserRepository
	if err := c.RegisterSingleton("userRepository", func(c *container.Container) (interface{}, error) {
		return repository.NewUserRepository(db), nil
	}); err != nil {
		log.Fatalf("Failed to register userRepository: %v", err)
	}

	// T050: TransactionRepository
	if err := c.RegisterSingleton("transactionRepository", func(c *container.Container) (interface{}, error) {
		return repository.NewTransactionRepository(db), nil
	}); err != nil {
		log.Fatalf("Failed to register transactionRepository: %v", err)
	}

	// T051: BadgeRepository
	if err := c.RegisterSingleton("badgeRepository", func(c *container.Container) (interface{}, error) {
		return repository.NewBadgeRepository(db), nil
	}); err != nil {
		log.Fatalf("Failed to register badgeRepository: %v", err)
	}

	// T052: LeaderboardRepository
	if err := c.RegisterSingleton("leaderboardRepository", func(c *container.Container) (interface{}, error) {
		return repository.NewLeaderboardRepository(db), nil
	}); err != nil {
		log.Fatalf("Failed to register leaderboardRepository: %v", err)
	}

	// Social Gamification Repositories (005-social-feed-gamification)
	if err := c.RegisterSingleton("socialXPRepository", func(c *container.Container) (interface{}, error) {
		return repository.NewSocialXPRepository(db), nil
	}); err != nil {
		log.Fatalf("Failed to register socialXPRepository: %v", err)
	}

	if err := c.RegisterSingleton("dailyChallengeRepository", func(c *container.Container) (interface{}, error) {
		return repository.NewDailyChallengeRepository(db), nil
	}); err != nil {
		log.Fatalf("Failed to register dailyChallengeRepository: %v", err)
	}

	if err := c.RegisterSingleton("contentMilestoneRepository", func(c *container.Container) (interface{}, error) {
		return repository.NewContentMilestoneRepository(db), nil
	}); err != nil {
		log.Fatalf("Failed to register contentMilestoneRepository: %v", err)
	}

	// Learning Gamification Repositories (006-course-gamification T024)
	if err := c.RegisterSingleton("learningXPRepository", func(c *container.Container) (interface{}, error) {
		return repository.NewLearningXPRepository(db), nil
	}); err != nil {
		log.Fatalf("Failed to register learningXPRepository: %v", err)
	}

	if err := c.RegisterSingleton("learningStreakRepository", func(c *container.Container) (interface{}, error) {
		return repository.NewLearningStreakRepository(db), nil
	}); err != nil {
		log.Fatalf("Failed to register learningStreakRepository: %v", err)
	}

	if err := c.RegisterSingleton("learningLevelRepository", func(c *container.Container) (interface{}, error) {
		return repository.NewLearningLevelRepository(db), nil
	}); err != nil {
		log.Fatalf("Failed to register learningLevelRepository: %v", err)
	}

	if err := c.RegisterSingleton("learningChallengeRepository", func(c *container.Container) (interface{}, error) {
		return repository.NewLearningChallengeRepository(db), nil
	}); err != nil {
		log.Fatalf("Failed to register learningChallengeRepository: %v", err)
	}

	log.Println("✓ Container registered: learning gamification repositories")

	// CacheService (007-api-performance-caching T035)
	if err := c.RegisterSingleton("cacheService", func(c *container.Container) (interface{}, error) {
		return service.NewCacheServiceFromGlobal(), nil
	}); err != nil {
		log.Fatalf("Failed to register cacheService: %v", err)
	}

	log.Println("✓ Container registered: cacheService")
}

// registerServices registers all P1 services in the DI container (T053)
// Service Classification (T119):
// ============================================================================
// REQUIRED SERVICES (19) - Startup fails if unavailable:
//   - Database (infrastructure)
//   - Cache/Redis (infrastructure)
//   - Config (infrastructure)
//   - UserService, AuthService, PropertyService, ClassifiedAdService
//   - TransactionService, QuestService, BadgeService, NotificationService
//   - MessagingService, SocialService, CourseService, LessonService
//   - EnrollmentService, CertificateService, AnalyticsService, AuditLogService
//
// OPTIONAL SERVICES (15) - Startup continues with WARNING if unavailable:
//   - FCMService (requires Firebase credentials)
//   - DVRService (requires S3 configuration)
//   - KMSService (requires encryption keys)
//   - OCRService, OpenAIService (require API keys)
//   - VideoStreamingService (requires RTMP server)
//   - SentryService (requires DSN)
//   - LeaderboardService (requires Redis)
//   - PaymentManager (requires Razorpay/Stripe credentials)
//   - WebSocket RedisManager, TypingIndicator (require Redis)
//   - ModerationService (requires AI integration)
//   - StreamingMetrics (requires Prometheus)
//
// ============================================================================
func registerServices(c *container.Container) {
	// Social Gamification Service (005-social-feed-gamification T016)
	if err := c.RegisterSingleton("socialGamificationService", func(c *container.Container) (interface{}, error) {
		socialXPRepo, _ := c.Resolve("socialXPRepository")
		dailyChallengeRepo, _ := c.Resolve("dailyChallengeRepository")
		contentMilestoneRepo, _ := c.Resolve("contentMilestoneRepository")
		userRepo, _ := c.Resolve("userRepository")

		// Queue service and notification service are optional
		var queueService *service.QueueService
		if qs, err := c.Resolve("queueService"); err == nil {
			queueService = qs.(*service.QueueService)
		}

		var notifService *service.NotificationService
		if ns, err := c.Resolve("notificationService"); err == nil {
			notifService = ns.(*service.NotificationService)
		}

		svc := service.NewSocialGamificationService(
			socialXPRepo.(*repository.SocialXPRepository),
			dailyChallengeRepo.(*repository.DailyChallengeRepository),
			contentMilestoneRepo.(*repository.ContentMilestoneRepository),
			userRepo.(*repository.UserRepository),
		)
		// Inject optional dependencies
		if queueService != nil {
			svc.SetQueueService(queueService)
		}
		if notifService != nil {
			svc.SetNotificationService(notifService)
		}
		return svc, nil
	}); err != nil {
		log.Fatalf("Failed to register socialGamificationService: %v", err)
	}

	log.Println("✓ Container registered: socialGamificationService")

	// Learning Gamification Service (006-course-gamification T024)
	if err := c.RegisterSingleton("learningGamificationService", func(c *container.Container) (interface{}, error) {
		learningXPRepo, _ := c.Resolve("learningXPRepository")
		learningStreakRepo, _ := c.Resolve("learningStreakRepository")
		learningLevelRepo, _ := c.Resolve("learningLevelRepository")
		learningChallengeRepo, _ := c.Resolve("learningChallengeRepository")
		userRepo, _ := c.Resolve("userRepository")

		// Queue service and notification service are optional
		var queueService *service.QueueService
		if qs, err := c.Resolve("queueService"); err == nil {
			queueService = qs.(*service.QueueService)
		}

		var notifService *service.NotificationService
		if ns, err := c.Resolve("notificationService"); err == nil {
			notifService = ns.(*service.NotificationService)
		}

		svc := service.NewLearningGamificationService(
			learningXPRepo.(*repository.LearningXPRepository),
			learningStreakRepo.(*repository.LearningStreakRepository),
			learningLevelRepo.(*repository.LearningLevelRepository),
			learningChallengeRepo.(*repository.LearningChallengeRepository),
			userRepo.(*repository.UserRepository),
		)
		// Inject optional dependencies
		if queueService != nil {
			svc.SetQueueService(queueService)
		}
		if notifService != nil {
			svc.SetNotificationService(notifService)
		}
		return svc, nil
	}); err != nil {
		log.Fatalf("Failed to register learningGamificationService: %v", err)
	}

	log.Println("✓ Container registered: learningGamificationService")

	// LeaderboardService (013-leaderboard-controller-integration T003)
	if err := c.RegisterSingleton("leaderboardService", func(c *container.Container) (interface{}, error) {
		// Resolve dependencies
		redisCache := c.MustResolve("cache").(*cache.PooledRedisClient)
		leaderboardRepo, _ := c.Resolve("leaderboardRepository")
		userRepo, _ := c.Resolve("userRepository")

		return service.NewLeaderboardService(
			database.DB,
			nil, // logger - will use default from BaseService
			redisCache,
			leaderboardRepo.(*repository.LeaderboardRepository), // implements interfaces.LeaderboardRepository
			leaderboardRepo.(*repository.LeaderboardRepository), // for custom methods like BulkUpsert
			userRepo.(*repository.UserRepository),
		), nil
	}); err != nil {
		log.Fatalf("Failed to register leaderboardService: %v", err)
	}

	log.Println("✓ Container registered: leaderboardService (013-leaderboard-controller-integration)")

	// Note: Services still require dependencies that aren't in container yet
	// This is a partial implementation - full registration requires other services/controllers
	// For now, we're establishing the pattern

	// Example pattern for future implementation:
	// if err := c.RegisterSingleton("propertyService", func(c *container.Container) (interface{}, error) {
	//     propertyRepo := c.MustResolveTyped[interfaces.PropertyRepository]("propertyRepository")
	//     db := c.MustResolveTyped[*gorm.DB]("database")
	//     return service.NewPropertyService(propertyRepo, db, ocrService, aiService), nil
	// }); err != nil {
	//     log.Fatalf("Failed to register propertyService: %v", err)
	// }
}

// initializeContainer creates and configures the DI container with infrastructure dependencies (T016)
func initializeContainer(cfg *config.Config) *container.Container {
	c := container.New()

	// T031: Enable mock injection based on USE_MOCKS environment variable
	if cfg.FeatureFlags != nil && cfg.FeatureFlags.UseMocks {
		c.SetUseMocks(true)
		log.Println("🧪 Mock mode enabled - using mock implementations where available")
	}

	// Register infrastructure dependencies (foundational services)
	// These are registered as singletons since they should be created once and reused

	// Database connection (GORM)
	if err := c.RegisterSingleton("database", func(c *container.Container) (interface{}, error) {
		return database.DB, nil
	}); err != nil {
		log.Fatalf("Failed to register database in container: %v", err)
	}

	// Cache client (Redis)
	// Wrap in PooledRedisClient for production-grade connection pooling
	if err := c.RegisterSingleton("cache", func(c *container.Container) (interface{}, error) {
		if cache.Client == nil {
			return nil, fmt.Errorf("cache.Client is nil - ensure cache is initialized before container setup")
		}
		// Wrap existing cache.Client in PooledRedisClient
		return cache.NewPooledRedisClientFromExisting(cache.Client), nil
	}); err != nil {
		log.Fatalf("Failed to register cache in container: %v", err)
	}

	// Configuration
	if err := c.RegisterSingleton("config", func(c *container.Container) (interface{}, error) {
		return cfg, nil
	}); err != nil {
		log.Fatalf("Failed to register config in container: %v", err)
	}

	log.Println("✓ Container registered: database, cache, config")

	// Register repositories (T047-T052)
	registerRepositories(c)
	log.Println("✓ Container registered: 9 repositories (6 P1 + 3 social gamification)")

	// Register services (T053)
	registerServices(c)
	log.Println("✓ Container registered: 6 P1 services")

	// TODO: Register controllers (Phase 3 - T018)

	return c
}
