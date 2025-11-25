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

// BadgeController handles badge-related HTTP requests
type BadgeController struct {
	badgeService *services.BadgeService
}

// NewBadgeController creates a new badge controller with Redis-backed service
func NewBadgeController(db *gorm.DB) *BadgeController {
	// Create pooled Redis client for badge caching
	redisConfig := cache.DefaultPoolConfig()
	redisConfig.URL = "redis://localhost:6379/0" // Use default Redis from app initialization

	redisClient, err := cache.NewPooledRedisClient(redisConfig)
	if err != nil {
		log.Printf("Warning: Badge service Redis unavailable: %v (badge endpoints will check service availability)", err)
		return &BadgeController{
			badgeService: nil,
		}
	}

	// Initialize notification service
	notificationService := services.NewNotificationService(db)
	log.Println("✓ Notification service initialized")

	// Initialize badge repository and service
	badgeRepo := repositories.NewBadgeRepository(db)
	badgeService := services.NewBadgeService(badgeRepo, redisClient, notificationService)

	log.Println("✓ Badge service initialized with Redis caching and notifications")

	return &BadgeController{
		badgeService: badgeService,
	}
}

// RegisterRoutes registers badge routes
func (ctrl *BadgeController) RegisterRoutes(app *fiber.App) {
	badges := app.Group("/api/v1/badges")

	// Public routes
	badges.Get("/", ctrl.GetBadges) // GET /api/v1/badges

	// Protected routes
	badges.Use(middleware.FiberAuthMiddleware())
	badges.Get("/user", ctrl.GetMyBadges)                               // GET /api/v1/badges/user
	badges.Get("/user/:userID", ctrl.GetUserBadges)                     // GET /api/v1/badges/user/:userID
	badges.Post("/:badgeID/award/:userID", ctrl.AwardBadge)             // POST /api/v1/badges/:badgeID/award/:userID
	badges.Post("/user-badges/:userBadgeID/approve", ctrl.ApproveBadge) // POST /api/v1/badges/user-badges/:userBadgeID/approve
	badges.Post("/user-badges/:userBadgeID/reject", ctrl.RejectBadge)   // POST /api/v1/badges/user-badges/:userBadgeID/reject
	badges.Post("/user-badges/:userBadgeID/revoke", ctrl.RevokeBadge)   // POST /api/v1/badges/user-badges/:userBadgeID/revoke
}

// GetBadges handles GET /api/v1/badges
// Returns paginated list of all available badges
func (ctrl *BadgeController) GetBadges(c *fiber.Ctx) error {
	// Parse pagination parameters
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "20"))

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}

	// TODO: Implement service call when BadgeService is properly initialized
	if ctrl.badgeService == nil {
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
			"error": "Badge service not available",
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"data": []interface{}{},
		"pagination": fiber.Map{
			"page":        page,
			"limit":       limit,
			"total":       0,
			"total_pages": 0,
		},
	})
}

// GetMyBadges handles GET /api/v1/badges/user
// Returns badges earned by the authenticated user
func (ctrl *BadgeController) GetMyBadges(c *fiber.Ctx) error {
	userID, ok := c.Locals(middleware.FiberUserIDKey).(uuid.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Missing or invalid user ID",
		})
	}

	tenantID, ok := c.Locals(middleware.FiberTenantIDKey).(uuid.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Missing or invalid tenant ID",
		})
	}

	// Parse optional status filter
	statusFilter := c.Query("status", "")
	if statusFilter != "" {
		validStatuses := []string{"pending", "approved", "rejected", "revoked"}
		isValid := false
		for _, s := range validStatuses {
			if statusFilter == s {
				isValid = true
				break
			}
		}
		if !isValid {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "Invalid status filter. Must be: pending, approved, rejected, or revoked",
			})
		}
	}

	// Call badge service to get user's badges
	if ctrl.badgeService == nil {
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
			"error": "Badge service not available",
		})
	}

	userBadges, err := ctrl.badgeService.GetUserBadges(c.Context(), tenantID, userID, statusFilter)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"data": userBadges,
	})
}

// GetUserBadges handles GET /api/v1/badges/user/:userID
// Returns badges earned by a specific user
func (ctrl *BadgeController) GetUserBadges(c *fiber.Ctx) error {
	// Get authenticated user
	authUserID, ok := c.Locals(middleware.FiberUserIDKey).(uuid.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Missing or invalid user ID",
		})
	}

	tenantID, ok := c.Locals(middleware.FiberTenantIDKey).(uuid.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Missing or invalid tenant ID",
		})
	}

	// Parse target user ID from URL
	userIDStr := c.Params("userID")
	targetUserID, err := uuid.Parse(userIDStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid user ID format",
		})
	}

	// Authorization: Users can only view their own badges unless admin/moderator
	userRole, _ := c.Locals(middleware.FiberRoleKey).(string)
	if authUserID != targetUserID && userRole != string(models.RoleAdmin) && userRole != string(models.RoleModerator) {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "You can only view your own badges",
		})
	}

	// Parse optional status filter
	statusFilter := c.Query("status", "")

	// Call badge service to get user's badges
	if ctrl.badgeService == nil {
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
			"error": "Badge service not available",
		})
	}

	userBadges, err := ctrl.badgeService.GetUserBadges(c.Context(), tenantID, targetUserID, statusFilter)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"data": userBadges,
	})
}

// AwardBadge handles POST /api/v1/badges/:badgeID/award/:userID
// Awards a badge to a user (admin/moderator only)
func (ctrl *BadgeController) AwardBadge(c *fiber.Ctx) error {
	// Get authenticated user
	_, ok := c.Locals(middleware.FiberUserIDKey).(uuid.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Missing or invalid user ID",
		})
	}

	tenantID, ok := c.Locals(middleware.FiberTenantIDKey).(uuid.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Missing or invalid tenant ID",
		})
	}

	// Authorization: Only admins/moderators can award badges
	userRole, _ := c.Locals(middleware.FiberRoleKey).(string)
	if userRole != string(models.RoleAdmin) && userRole != string(models.RoleModerator) {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "Only admins and moderators can award badges",
		})
	}

	// Parse badge ID
	badgeIDStr := c.Params("badgeID")
	badgeID, err := uuid.Parse(badgeIDStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid badge ID format",
		})
	}

	// Parse user ID
	userIDStr := c.Params("userID")
	targetUserID, err := uuid.Parse(userIDStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid user ID format",
		})
	}

	// Call badge service to award badge
	if ctrl.badgeService == nil {
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
			"error": "Badge service not available",
		})
	}

	if err := ctrl.badgeService.AwardBadge(c.Context(), tenantID, targetUserID, badgeID); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message":  "Badge awarded successfully",
		"badge_id": badgeID.String(),
		"user_id":  targetUserID.String(),
	})
}

// ApproveBadge handles POST /api/v1/badges/user-badges/:userBadgeID/approve
// Approves a pending badge award (admin/moderator only)
func (ctrl *BadgeController) ApproveBadge(c *fiber.Ctx) error {
	// Get authenticated user
	adminUserID, ok := c.Locals(middleware.FiberUserIDKey).(uuid.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Missing or invalid user ID",
		})
	}

	tenantID, ok := c.Locals(middleware.FiberTenantIDKey).(uuid.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Missing or invalid tenant ID",
		})
	}

	// Authorization: Only admins/moderators can approve badges
	userRole, _ := c.Locals(middleware.FiberRoleKey).(string)
	if userRole != string(models.RoleAdmin) && userRole != string(models.RoleModerator) {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "Only admins and moderators can approve badges",
		})
	}

	// Parse user badge ID
	userBadgeIDStr := c.Params("userBadgeID")
	userBadgeID, err := uuid.Parse(userBadgeIDStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid user badge ID format",
		})
	}

	// Call badge service to approve badge
	if ctrl.badgeService == nil {
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
			"error": "Badge service not available",
		})
	}

	if err := ctrl.badgeService.ApproveBadge(c.Context(), tenantID, userBadgeID, adminUserID); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message":       "Badge approved successfully",
		"user_badge_id": userBadgeID.String(),
	})
}

// RejectBadge handles POST /api/v1/badges/user-badges/:userBadgeID/reject
// Rejects a pending badge award (admin/moderator only)
func (ctrl *BadgeController) RejectBadge(c *fiber.Ctx) error {
	// Get authenticated user
	adminUserID, ok := c.Locals(middleware.FiberUserIDKey).(uuid.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Missing or invalid user ID",
		})
	}

	tenantID, ok := c.Locals(middleware.FiberTenantIDKey).(uuid.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Missing or invalid tenant ID",
		})
	}

	// Authorization: Only admins/moderators can reject badges
	userRole, _ := c.Locals(middleware.FiberRoleKey).(string)
	if userRole != string(models.RoleAdmin) && userRole != string(models.RoleModerator) {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "Only admins and moderators can reject badges",
		})
	}

	// Parse user badge ID
	userBadgeIDStr := c.Params("userBadgeID")
	userBadgeID, err := uuid.Parse(userBadgeIDStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid user badge ID format",
		})
	}

	// Parse request body for rejection reason
	var req struct {
		Reason string `json:"reason"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	if req.Reason == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Rejection reason is required",
		})
	}

	// Call badge service to reject badge
	if ctrl.badgeService == nil {
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
			"error": "Badge service not available",
		})
	}

	if err := ctrl.badgeService.RejectBadge(c.Context(), tenantID, userBadgeID, adminUserID, req.Reason); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message":       "Badge rejected successfully",
		"user_badge_id": userBadgeID.String(),
		"reason":        req.Reason,
	})
}

// RevokeBadge handles POST /api/v1/badges/user-badges/:userBadgeID/revoke
// Revokes an approved badge (admin/moderator only)
func (ctrl *BadgeController) RevokeBadge(c *fiber.Ctx) error {
	// Get authenticated user
	adminUserID, ok := c.Locals(middleware.FiberUserIDKey).(uuid.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Missing or invalid user ID",
		})
	}

	tenantID, ok := c.Locals(middleware.FiberTenantIDKey).(uuid.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Missing or invalid tenant ID",
		})
	}

	// Authorization: Only admins/moderators can revoke badges
	userRole, _ := c.Locals(middleware.FiberRoleKey).(string)
	if userRole != string(models.RoleAdmin) && userRole != string(models.RoleModerator) {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "Only admins and moderators can revoke badges",
		})
	}

	// Parse user badge ID
	userBadgeIDStr := c.Params("userBadgeID")
	userBadgeID, err := uuid.Parse(userBadgeIDStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid user badge ID format",
		})
	}

	// Parse request body for revocation reason
	var req struct {
		Reason string `json:"reason"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	if req.Reason == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Revocation reason is required",
		})
	}

	// Call badge service to revoke badge
	if ctrl.badgeService == nil {
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
			"error": "Badge service not available",
		})
	}

	if err := ctrl.badgeService.RevokeBadge(c.Context(), tenantID, userBadgeID, adminUserID, req.Reason); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message":       "Badge revoked successfully",
		"user_badge_id": userBadgeID.String(),
		"reason":        req.Reason,
	})
}
