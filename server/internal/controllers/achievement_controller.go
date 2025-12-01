package controllers

import (
	"log"
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/keshablive/quester/internal/framework/cache"
	"github.com/keshablive/quester/internal/framework/controller"
	"github.com/keshablive/quester/internal/framework/middleware"
	"github.com/keshablive/quester/internal/framework/responses"
	"github.com/keshablive/quester/internal/models"
	"github.com/keshablive/quester/internal/framework/repository"
	"github.com/keshablive/quester/internal/framework/service"
	"gorm.io/gorm"
)

// AchievementController handles achievement HTTP requests
type AchievementController struct {
	achievementService *service.AchievementService
}

// NewAchievementController creates a new achievement controller
func NewAchievementController(db *gorm.DB) *AchievementController {
	achievementService := service.NewAchievementService(db, nil, nil)

	// Inject NotificationService
	notificationSvc := service.NewNotificationService(db)
	achievementService.SetNotificationService(notificationSvc)

	// Best-effort injection of BadgeService and Badge UUID Adapter
	// Mirror logic used in BadgeController
	redisConfig := cache.DefaultPoolConfig()
	redisConfig.URL = "redis://localhost:6379/0"
	redisClient, err := cache.NewPooledRedisClient(redisConfig)
	if err == nil {
		badgeRepo := repository.NewBadgeRepository(db)
		// Create a notification service for badge awards
		notificationService := service.NewNotificationService(db)
		badgeService := service.NewBadgeService(db, nil, badgeRepo, badgeRepo, redisClient, notificationService)

		// Inject legacy BadgeService (for reference)
		achievementService.SetBadgeService(badgeService)

		// Inject Badge UUID Adapter (preferred for achievement-to-badge integration)
		// Note: NewBadgeUUIDAwardAdapter might not exist yet, commenting out for now
		// badgeAdapter := service.NewBadgeUUIDAwardAdapter(db, badgeService)
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
	achievements.Post("/", middleware.FiberRoleMiddlewareString(string(models.RoleAdmin)), ctrl.CreateAchievement)      // POST /api/v1/achievements
	achievements.Put("/:id", middleware.FiberRoleMiddlewareString(string(models.RoleAdmin)), ctrl.UpdateAchievement)    // PUT /api/v1/achievements/:id
	achievements.Delete("/:id", middleware.FiberRoleMiddlewareString(string(models.RoleAdmin)), ctrl.DeleteAchievement) // DELETE /api/v1/achievements/:id
}

// GetAchievements handles GET /api/v1/achievements
// Returns list of all available achievements
func (ctrl *AchievementController) GetAchievements(c *fiber.Ctx) error {
	// Use framework helper for auth context extraction
	auth, err := controller.GetAuthContext(c)
	if err != nil {
		return responses.Unauthorized(c, err.Error())
	}

	// Parse category filter
	categoryParam := c.Query("category")
	var category *models.AchievementCategory
	if categoryParam != "" {
		cat := models.AchievementCategory(categoryParam)
		if !cat.IsValid() {
			return responses.BadRequest(c, "Invalid achievement category")
		}
		category = &cat
	}

	achievements, err := ctrl.achievementService.GetAchievements(c.Context(), auth.TenantID, category)
	if err != nil {
		return responses.InternalError(c, "Failed to retrieve achievements")
	}

	return responses.Success(c, fiber.Map{
		"achievements": achievements,
		"total":        len(achievements),
	})
}

// GetAchievement handles GET /api/v1/achievements/:id
// Returns detailed information about a specific achievement
func (ctrl *AchievementController) GetAchievement(c *fiber.Ctx) error {
	// Use framework helper for auth context extraction
	auth, err := controller.GetAuthContext(c)
	if err != nil {
		return responses.Unauthorized(c, err.Error())
	}

	achievementID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return responses.BadRequest(c, "Invalid achievement ID")
	}

	achievement, err := ctrl.achievementService.GetAchievement(c.Context(), auth.TenantID, achievementID)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return responses.NotFound(c, "Achievement not found")
		}
		return responses.InternalError(c, "Failed to retrieve achievement")
	}

	return responses.Success(c, fiber.Map{
		"achievement": achievement,
	})
}

// GetUserAchievements handles GET /api/v1/achievements/user/progress
// Returns user's achievement progress
func (ctrl *AchievementController) GetUserAchievements(c *fiber.Ctx) error {
	// Use framework helper for auth context extraction
	auth, err := controller.GetAuthContext(c)
	if err != nil {
		return responses.Unauthorized(c, err.Error())
	}

	// Parse completed filter
	completedOnly := c.Query("completed") == "true"

	userAchievements, err := ctrl.achievementService.GetUserAchievements(c.Context(), auth.UserID, completedOnly)
	if err != nil {
		return responses.InternalError(c, "Failed to retrieve user achievements")
	}

	return responses.Success(c, fiber.Map{
		"achievements": userAchievements,
		"total":        len(userAchievements),
	})
}

// GetUserStats handles GET /api/v1/achievements/user/stats
// Returns achievement statistics for the current user
func (ctrl *AchievementController) GetUserStats(c *fiber.Ctx) error {
	// Use framework helper for auth context extraction
	auth, err := controller.GetAuthContext(c)
	if err != nil {
		return responses.Unauthorized(c, err.Error())
	}

	stats, err := ctrl.achievementService.GetAchievementStats(c.Context(), auth.UserID)
	if err != nil {
		return responses.InternalError(c, "Failed to retrieve achievement statistics")
	}

	return responses.Success(c, fiber.Map{
		"stats": stats,
	})
}

// GetRecentUnlocks handles GET /api/v1/achievements/user/recent
// Returns recently unlocked achievements
func (ctrl *AchievementController) GetRecentUnlocks(c *fiber.Ctx) error {
	// Use framework helper for auth context extraction
	auth, err := controller.GetAuthContext(c)
	if err != nil {
		return responses.Unauthorized(c, err.Error())
	}

	limit, _ := strconv.Atoi(c.Query("limit", "5"))
	if limit <= 0 || limit > 20 {
		limit = 5
	}

	recentUnlocks, err := ctrl.achievementService.GetRecentUnlocks(c.Context(), auth.UserID, limit)
	if err != nil {
		return responses.InternalError(c, "Failed to retrieve recent unlocks")
	}

	return responses.Success(c, fiber.Map{
		"recent": recentUnlocks,
		"total":  len(recentUnlocks),
	})
}

// GetCompletionRate handles GET /api/v1/achievements/user/completion-rate
// Returns completion rates by category
func (ctrl *AchievementController) GetCompletionRate(c *fiber.Ctx) error {
	// Use framework helper for auth context extraction
	auth, err := controller.GetAuthContext(c)
	if err != nil {
		return responses.Unauthorized(c, err.Error())
	}

	rates, err := ctrl.achievementService.CalculateCompletionRate(c.Context(), auth.UserID)
	if err != nil {
		return responses.InternalError(c, "Failed to calculate completion rates")
	}

	return responses.Success(c, fiber.Map{
		"completion_rate": rates,
	})
}

// CreateAchievement handles POST /api/v1/achievements (Admin only)
// Creates a new achievement
func (ctrl *AchievementController) CreateAchievement(c *fiber.Ctx) error {
	// Use framework helper for auth context extraction
	auth, err := controller.GetAuthContext(c)
	if err != nil {
		return responses.Unauthorized(c, err.Error())
	}

	var achievement models.Achievement
	if err := c.BodyParser(&achievement); err != nil {
		return responses.BadRequest(c, "Invalid request body")
	}

	// Set tenant ID from context
	achievement.TenantID = auth.TenantID

	if err := ctrl.achievementService.CreateAchievement(c.Context(), &achievement); err != nil {
		return responses.InternalError(c, err.Error())
	}

	return responses.Created(c, fiber.Map{
		"message":     "Achievement created successfully",
		"achievement": achievement,
	})
}

// UpdateAchievement handles PUT /api/v1/achievements/:id (Admin only)
// Updates an existing achievement
func (ctrl *AchievementController) UpdateAchievement(c *fiber.Ctx) error {
	achievementID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return responses.BadRequest(c, "Invalid achievement ID")
	}

	var achievement models.Achievement
	if err := c.BodyParser(&achievement); err != nil {
		return responses.BadRequest(c, "Invalid request body")
	}

	achievement.ID = achievementID

	if err := ctrl.achievementService.UpdateAchievement(c.Context(), &achievement); err != nil {
		return responses.InternalError(c, err.Error())
	}

	return responses.Success(c, fiber.Map{
		"message":     "Achievement updated successfully",
		"achievement": achievement,
	})
}

// DeleteAchievement handles DELETE /api/v1/achievements/:id (Admin only)
// Soft deletes an achievement
func (ctrl *AchievementController) DeleteAchievement(c *fiber.Ctx) error {
	achievementID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return responses.BadRequest(c, "Invalid achievement ID")
	}

	if err := ctrl.achievementService.DeleteAchievement(c.Context(), achievementID); err != nil {
		return responses.InternalError(c, "Failed to delete achievement")
	}

	return responses.Success(c, fiber.Map{
		"message": "Achievement deleted successfully",
	})
}
