package controllers

import (
	"log"
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/yourusername/quester/internal/framework/cache"
	"github.com/yourusername/quester/internal/framework/middleware"
	"github.com/yourusername/quester/internal/models"
	"github.com/yourusername/quester/internal/repositories"
	"github.com/yourusername/quester/internal/services"
	"gorm.io/gorm"
)

// AchievementController handles achievement HTTP requests
type AchievementController struct {
	achievementService *services.AchievementService
}

// NewAchievementController creates a new achievement controller
func NewAchievementController(db *gorm.DB) *AchievementController {
	achievementService := services.NewAchievementService(db)

	// Inject NotificationService
	notificationSvc := services.NewNotificationService(db)
	achievementService.SetNotificationService(notificationSvc)

	// Best-effort injection of BadgeService and Badge UUID Adapter
	// Mirror logic used in BadgeController
	redisConfig := cache.DefaultPoolConfig()
	redisConfig.URL = "redis://localhost:6379/0"
	redisClient, err := cache.NewPooledRedisClient(redisConfig)
	if err == nil {
		badgeRepo := repositories.NewBadgeRepository(db)
		// Create a notification service for badge awards
		notificationService := services.NewNotificationService(db)
		badgeService := services.NewBadgeService(badgeRepo, redisClient, notificationService)

		// Inject legacy BadgeService (for reference)
		achievementService.SetBadgeService(badgeService)

		// Inject Badge UUID Adapter (preferred for achievement-to-badge integration)
		// Note: NewBadgeUUIDAwardAdapter might not exist yet, commenting out for now
		// badgeAdapter := services.NewBadgeUUIDAwardAdapter(db, badgeService)
		// achievementService.SetBadgeAdapter(badgeAdapter)

		log.Println("BadgeService injected into AchievementService")
	} else {
		log.Println("Warning: Redis not available, BadgeService will not be injected")
	}

	return &AchievementController{
		achievementService: achievementService,
	}
}

// RegisterRoutes registers achievement routes
func (ctrl *AchievementController) RegisterRoutes(app *fiber.App) {
	achievements := app.Group("/api/v1/achievements")

	// Public routes (require authentication)
	achievements.Use(middleware.FiberAuthMiddleware())

	achievements.Get("/", ctrl.GetAchievements)                       // GET /api/v1/achievements
	achievements.Get("/:id", ctrl.GetAchievement)                     // GET /api/v1/achievements/:id
	achievements.Get("/user/progress", ctrl.GetUserAchievements)      // GET /api/v1/achievements/user/progress
	achievements.Get("/user/stats", ctrl.GetUserStats)                // GET /api/v1/achievements/user/stats
	achievements.Get("/user/recent", ctrl.GetRecentUnlocks)           // GET /api/v1/achievements/user/recent
	achievements.Get("/user/completion-rate", ctrl.GetCompletionRate) // GET /api/v1/achievements/user/completion-rate

	// Admin routes
	achievements.Post("/", middleware.FiberRoleMiddleware(models.RoleAdmin), ctrl.CreateAchievement)      // POST /api/v1/achievements
	achievements.Put("/:id", middleware.FiberRoleMiddleware(models.RoleAdmin), ctrl.UpdateAchievement)    // PUT /api/v1/achievements/:id
	achievements.Delete("/:id", middleware.FiberRoleMiddleware(models.RoleAdmin), ctrl.DeleteAchievement) // DELETE /api/v1/achievements/:id
}

// GetAchievements handles GET /api/v1/achievements
// Returns list of all available achievements
func (ctrl *AchievementController) GetAchievements(c *fiber.Ctx) error {
	tenantID := c.Locals("tenant_id").(uuid.UUID)

	// Parse category filter
	categoryParam := c.Query("category")
	var category *models.AchievementCategory
	if categoryParam != "" {
		cat := models.AchievementCategory(categoryParam)
		if !cat.IsValid() {
			return c.Status(400).JSON(fiber.Map{
				"success": false,
				"error":   "invalid_category",
				"message": "Invalid achievement category",
			})
		}
		category = &cat
	}

	achievements, err := ctrl.achievementService.GetAchievements(c.Context(), tenantID, category)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"error":   "fetch_failed",
			"message": "Failed to retrieve achievements",
		})
	}

	return c.JSON(fiber.Map{
		"success":      true,
		"achievements": achievements,
		"total":        len(achievements),
	})
}

// GetAchievement handles GET /api/v1/achievements/:id
// Returns detailed information about a specific achievement
func (ctrl *AchievementController) GetAchievement(c *fiber.Ctx) error {
	achievementID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"error":   "invalid_id",
			"message": "Invalid achievement ID",
		})
	}

	achievement, err := ctrl.achievementService.GetAchievement(c.Context(), achievementID)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return c.Status(404).JSON(fiber.Map{
				"success": false,
				"error":   "not_found",
				"message": "Achievement not found",
			})
		}
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"error":   "fetch_failed",
			"message": "Failed to retrieve achievement",
		})
	}

	return c.JSON(fiber.Map{
		"success":     true,
		"achievement": achievement,
	})
}

// GetUserAchievements handles GET /api/v1/achievements/user/progress
// Returns user's achievement progress
func (ctrl *AchievementController) GetUserAchievements(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uuid.UUID)

	// Parse completed filter
	completedOnly := c.Query("completed") == "true"

	userAchievements, err := ctrl.achievementService.GetUserAchievements(c.Context(), userID, completedOnly)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"error":   "fetch_failed",
			"message": "Failed to retrieve user achievements",
		})
	}

	return c.JSON(fiber.Map{
		"success":      true,
		"achievements": userAchievements,
		"total":        len(userAchievements),
	})
}

// GetUserStats handles GET /api/v1/achievements/user/stats
// Returns achievement statistics for the current user
func (ctrl *AchievementController) GetUserStats(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uuid.UUID)

	stats, err := ctrl.achievementService.GetAchievementStats(c.Context(), userID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"error":   "fetch_failed",
			"message": "Failed to retrieve achievement statistics",
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"stats":   stats,
	})
}

// GetRecentUnlocks handles GET /api/v1/achievements/user/recent
// Returns recently unlocked achievements
func (ctrl *AchievementController) GetRecentUnlocks(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uuid.UUID)

	limit, _ := strconv.Atoi(c.Query("limit", "5"))
	if limit <= 0 || limit > 20 {
		limit = 5
	}

	recentUnlocks, err := ctrl.achievementService.GetRecentUnlocks(c.Context(), userID, limit)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"error":   "fetch_failed",
			"message": "Failed to retrieve recent unlocks",
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"recent":  recentUnlocks,
		"total":   len(recentUnlocks),
	})
}

// GetCompletionRate handles GET /api/v1/achievements/user/completion-rate
// Returns completion rates by category
func (ctrl *AchievementController) GetCompletionRate(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uuid.UUID)

	rates, err := ctrl.achievementService.CalculateCompletionRate(c.Context(), userID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"error":   "calculation_failed",
			"message": "Failed to calculate completion rates",
		})
	}

	return c.JSON(fiber.Map{
		"success":         true,
		"completion_rate": rates,
	})
}

// CreateAchievement handles POST /api/v1/achievements (Admin only)
// Creates a new achievement
func (ctrl *AchievementController) CreateAchievement(c *fiber.Ctx) error {
	var achievement models.Achievement
	if err := c.BodyParser(&achievement); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"error":   "invalid_request",
			"message": "Invalid request body",
		})
	}

	// Set tenant ID from context
	achievement.TenantID = c.Locals("tenant_id").(uuid.UUID)

	if err := ctrl.achievementService.CreateAchievement(c.Context(), &achievement); err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"error":   "creation_failed",
			"message": err.Error(),
		})
	}

	return c.Status(201).JSON(fiber.Map{
		"success":     true,
		"message":     "Achievement created successfully",
		"achievement": achievement,
	})
}

// UpdateAchievement handles PUT /api/v1/achievements/:id (Admin only)
// Updates an existing achievement
func (ctrl *AchievementController) UpdateAchievement(c *fiber.Ctx) error {
	achievementID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"error":   "invalid_id",
			"message": "Invalid achievement ID",
		})
	}

	var achievement models.Achievement
	if err := c.BodyParser(&achievement); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"error":   "invalid_request",
			"message": "Invalid request body",
		})
	}

	achievement.ID = achievementID

	if err := ctrl.achievementService.UpdateAchievement(c.Context(), &achievement); err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"error":   "update_failed",
			"message": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"success":     true,
		"message":     "Achievement updated successfully",
		"achievement": achievement,
	})
}

// DeleteAchievement handles DELETE /api/v1/achievements/:id (Admin only)
// Soft deletes an achievement
func (ctrl *AchievementController) DeleteAchievement(c *fiber.Ctx) error {
	achievementID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"error":   "invalid_id",
			"message": "Invalid achievement ID",
		})
	}

	if err := ctrl.achievementService.DeleteAchievement(c.Context(), achievementID); err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"error":   "deletion_failed",
			"message": "Failed to delete achievement",
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Achievement deleted successfully",
	})
}
