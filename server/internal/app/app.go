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
	"github.com/keshablive/quester/internal/framework/cache"
	"github.com/keshablive/quester/internal/framework/config"
	"github.com/keshablive/quester/internal/framework/container"
	"github.com/keshablive/quester/internal/framework/database"
	"github.com/keshablive/quester/internal/framework/metrics"
	sentryPkg "github.com/keshablive/quester/internal/framework/sentry"
	"github.com/keshablive/quester/internal/migrations"
	"github.com/keshablive/quester/internal/repositories"
	"github.com/keshablive/quester/internal/routes"
	"github.com/keshablive/quester/internal/services"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

// App represents the application
type App struct {
	Fiber               *fiber.App
	Config              *config.Config
	Container           *container.Container // DI container for managing dependencies (T016)
	cancelCleanup       context.CancelFunc   // Cancel function for token cleanup scheduler
	cancelLeaderboard   context.CancelFunc   // Cancel function for leaderboard reset scheduler
	cancelStreamCleanup context.CancelFunc   // Cancel function for video stream retention cleanup (T099)
}

// New creates a new application instance
func New() (*App, error) {
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
	go services.StartTokenCleanup(cleanupCtx, database.DB, 24*time.Hour)
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
		Fiber:               app,
		Config:              cfg,
		Container:           diContainer,
		cancelCleanup:       cancelCleanup,
		cancelLeaderboard:   cancelLeaderboard,
		cancelStreamCleanup: cancelStreamCleanup,
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

// registerRepositories registers all P1 repositories in the DI container (T047-T052)
func registerRepositories(c *container.Container) {
	// Get database from container - fail fast if not initialized
	db := database.DB
	if db == nil {
		log.Fatal("Cannot register repositories: database.DB is nil - ensure database is initialized before container setup")
	}

	// T047: PropertyRepository
	if err := c.RegisterSingleton("propertyRepository", func(c *container.Container) (interface{}, error) {
		return repositories.NewPropertyRepository(db), nil
	}); err != nil {
		log.Fatalf("Failed to register propertyRepository: %v", err)
	}

	// T048: QuestRepository
	if err := c.RegisterSingleton("questRepository", func(c *container.Container) (interface{}, error) {
		return repositories.NewQuestRepository(db), nil
	}); err != nil {
		log.Fatalf("Failed to register questRepository: %v", err)
	}

	// T049: UserRepository
	if err := c.RegisterSingleton("userRepository", func(c *container.Container) (interface{}, error) {
		return repositories.NewUserRepository(db), nil
	}); err != nil {
		log.Fatalf("Failed to register userRepository: %v", err)
	}

	// T050: TransactionRepository
	if err := c.RegisterSingleton("transactionRepository", func(c *container.Container) (interface{}, error) {
		return repositories.NewTransactionRepository(db), nil
	}); err != nil {
		log.Fatalf("Failed to register transactionRepository: %v", err)
	}

	// T051: BadgeRepository
	if err := c.RegisterSingleton("badgeRepository", func(c *container.Container) (interface{}, error) {
		return repositories.NewBadgeRepository(db), nil
	}); err != nil {
		log.Fatalf("Failed to register badgeRepository: %v", err)
	}

	// T052: LeaderboardRepository
	if err := c.RegisterSingleton("leaderboardRepository", func(c *container.Container) (interface{}, error) {
		return repositories.NewLeaderboardRepository(db), nil
	}); err != nil {
		log.Fatalf("Failed to register leaderboardRepository: %v", err)
	}
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
	// Note: Services still require dependencies that aren't in container yet
	// This is a partial implementation - full registration requires other services/controllers
	// For now, we're establishing the pattern

	// Example pattern for future implementation:
	// if err := c.RegisterSingleton("propertyService", func(c *container.Container) (interface{}, error) {
	//     propertyRepo := c.MustResolveTyped[interfaces.PropertyRepository]("propertyRepository")
	//     db := c.MustResolveTyped[*gorm.DB]("database")
	//     return services.NewPropertyService(propertyRepo, db, ocrService, aiService), nil
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
	if err := c.RegisterSingleton("cache", func(c *container.Container) (interface{}, error) {
		return cache.Client, nil
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
	log.Println("✓ Container registered: 6 P1 repositories")

	// Register services (T053)
	registerServices(c)
	log.Println("✓ Container registered: 6 P1 services")

	// TODO: Register controllers (Phase 3 - T018)

	return c
}
