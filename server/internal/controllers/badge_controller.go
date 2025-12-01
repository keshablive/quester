package controllers

import (
	"log"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/keshablive/quester/internal/framework/cache"
	"github.com/keshablive/quester/internal/framework/controller"
	"github.com/keshablive/quester/internal/framework/middleware"
	"github.com/keshablive/quester/internal/framework/responses"
	"github.com/keshablive/quester/internal/models"
	"github.com/keshablive/quester/internal/repositories"
	"github.com/keshablive/quester/internal/framework/service"
	"gorm.io/gorm"
)

// BadgeController handles badge-related HTTP requests
type BadgeController struct {
	badgeService *service.BadgeService
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
	notificationService := service.NewNotificationService(db)
	log.Println("✓ Notification service initialized")

	// Initialize badge repository and service
	badgeRepo := repositories.NewBadgeRepository(db)
	badgeService := service.NewBadgeService(db, nil, badgeRepo, badgeRepo, redisClient, notificationService)

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
	// Parse pagination using framework helper
	pagination := controller.ParsePagination(c)

	// TODO: Implement service call when BadgeService is properly initialized
	if ctrl.badgeService == nil {
		return responses.InternalError(c, "Badge service not available")
	}

	return responses.Success(c, fiber.Map{
		"data": []interface{}{},
		"pagination": fiber.Map{
			"page":        pagination.Page,
			"limit":       pagination.PageSize,
			"total":       0,
			"total_pages": 0,
		},
	})
}

// GetMyBadges handles GET /api/v1/badges/user
// Returns badges earned by the authenticated user
func (ctrl *BadgeController) GetMyBadges(c *fiber.Ctx) error {
	// Use framework helper for auth context extraction
	auth, err := controller.GetAuthContext(c)
	if err != nil {
		return responses.Unauthorized(c, err.Error())
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
			return responses.BadRequest(c, "Invalid status filter. Must be: pending, approved, rejected, or revoked")
		}
	}

	// Call badge service to get user's badges
	if ctrl.badgeService == nil {
		return responses.InternalError(c, "Badge service not available")
	}

	userBadges, err := ctrl.badgeService.GetUserBadges(c.Context(), auth.TenantID, auth.UserID, statusFilter)
	if err != nil {
		return responses.InternalError(c, err.Error())
	}

	return responses.Success(c, userBadges)
}

// GetUserBadges handles GET /api/v1/badges/user/:userID
// Returns badges earned by a specific user
func (ctrl *BadgeController) GetUserBadges(c *fiber.Ctx) error {
	// Use framework helper for auth context extraction
	auth, err := controller.GetAuthContext(c)
	if err != nil {
		return responses.Unauthorized(c, err.Error())
	}

	// Parse target user ID from URL
	userIDStr := c.Params("userID")
	targetUserID, err := uuid.Parse(userIDStr)
	if err != nil {
		return responses.BadRequest(c, "Invalid user ID format")
	}

	// Authorization: Users can only view their own badges unless admin/moderator
	if auth.UserID != targetUserID && auth.Role != string(models.RoleAdmin) && auth.Role != string(models.RoleModerator) {
		return responses.Forbidden(c, "You can only view your own badges")
	}

	// Parse optional status filter
	statusFilter := c.Query("status", "")

	// Call badge service to get user's badges
	if ctrl.badgeService == nil {
		return responses.InternalError(c, "Badge service not available")
	}

	userBadges, err := ctrl.badgeService.GetUserBadges(c.Context(), auth.TenantID, targetUserID, statusFilter)
	if err != nil {
		return responses.InternalError(c, err.Error())
	}

	return responses.Success(c, userBadges)
}

// AwardBadge handles POST /api/v1/badges/:badgeID/award/:userID
// Awards a badge to a user (admin/moderator only)
func (ctrl *BadgeController) AwardBadge(c *fiber.Ctx) error {
	// Use framework helper for auth context extraction
	auth, err := controller.GetAuthContext(c)
	if err != nil {
		return responses.Unauthorized(c, err.Error())
	}

	// Authorization: Only admins/moderators can award badges
	if auth.Role != string(models.RoleAdmin) && auth.Role != string(models.RoleModerator) {
		return responses.Forbidden(c, "Only admins and moderators can award badges")
	}

	// Parse badge ID
	badgeIDStr := c.Params("badgeID")
	badgeID, err := uuid.Parse(badgeIDStr)
	if err != nil {
		return responses.BadRequest(c, "Invalid badge ID format")
	}

	// Parse user ID
	userIDStr := c.Params("userID")
	targetUserID, err := uuid.Parse(userIDStr)
	if err != nil {
		return responses.BadRequest(c, "Invalid user ID format")
	}

	// Call badge service to award badge
	if ctrl.badgeService == nil {
		return responses.InternalError(c, "Badge service not available")
	}

	if err := ctrl.badgeService.AwardBadge(c.Context(), auth.TenantID, targetUserID, badgeID); err != nil {
		return responses.BadRequest(c, err.Error())
	}

	return responses.Success(c, fiber.Map{
		"message":  "Badge awarded successfully",
		"badge_id": badgeID.String(),
		"user_id":  targetUserID.String(),
	})
}

// ApproveBadge handles POST /api/v1/badges/user-badges/:userBadgeID/approve
// Approves a pending badge award (admin/moderator only)
func (ctrl *BadgeController) ApproveBadge(c *fiber.Ctx) error {
	// Use framework helper for auth context extraction
	auth, err := controller.GetAuthContext(c)
	if err != nil {
		return responses.Unauthorized(c, err.Error())
	}

	// Authorization: Only admins/moderators can approve badges
	if auth.Role != string(models.RoleAdmin) && auth.Role != string(models.RoleModerator) {
		return responses.Forbidden(c, "Only admins and moderators can approve badges")
	}

	// Parse user badge ID
	userBadgeIDStr := c.Params("userBadgeID")
	userBadgeID, err := uuid.Parse(userBadgeIDStr)
	if err != nil {
		return responses.BadRequest(c, "Invalid user badge ID format")
	}

	// Call badge service to approve badge
	if ctrl.badgeService == nil {
		return responses.InternalError(c, "Badge service not available")
	}

	if err := ctrl.badgeService.ApproveBadge(c.Context(), auth.TenantID, userBadgeID, auth.UserID); err != nil {
		return responses.BadRequest(c, err.Error())
	}

	return responses.Success(c, fiber.Map{
		"message":       "Badge approved successfully",
		"user_badge_id": userBadgeID.String(),
	})
}

// RejectBadge handles POST /api/v1/badges/user-badges/:userBadgeID/reject
// Rejects a pending badge award (admin/moderator only)
func (ctrl *BadgeController) RejectBadge(c *fiber.Ctx) error {
	// Use framework helper for auth context extraction
	auth, err := controller.GetAuthContext(c)
	if err != nil {
		return responses.Unauthorized(c, err.Error())
	}

	// Authorization: Only admins/moderators can reject badges
	if auth.Role != string(models.RoleAdmin) && auth.Role != string(models.RoleModerator) {
		return responses.Forbidden(c, "Only admins and moderators can reject badges")
	}

	// Parse user badge ID
	userBadgeIDStr := c.Params("userBadgeID")
	userBadgeID, err := uuid.Parse(userBadgeIDStr)
	if err != nil {
		return responses.BadRequest(c, "Invalid user badge ID format")
	}

	// Parse request body for rejection reason
	var req struct {
		Reason string `json:"reason"`
	}
	if err := c.BodyParser(&req); err != nil {
		return responses.BadRequest(c, "Invalid request body")
	}

	if req.Reason == "" {
		return responses.BadRequest(c, "Rejection reason is required")
	}

	// Call badge service to reject badge
	if ctrl.badgeService == nil {
		return responses.InternalError(c, "Badge service not available")
	}

	if err := ctrl.badgeService.RejectBadge(c.Context(), auth.TenantID, userBadgeID, auth.UserID, req.Reason); err != nil {
		return responses.BadRequest(c, err.Error())
	}

	return responses.Success(c, fiber.Map{
		"message":       "Badge rejected successfully",
		"user_badge_id": userBadgeID.String(),
		"reason":        req.Reason,
	})
}

// RevokeBadge handles POST /api/v1/badges/user-badges/:userBadgeID/revoke
// Revokes an approved badge (admin/moderator only)
func (ctrl *BadgeController) RevokeBadge(c *fiber.Ctx) error {
	// Use framework helper for auth context extraction
	auth, err := controller.GetAuthContext(c)
	if err != nil {
		return responses.Unauthorized(c, err.Error())
	}

	// Authorization: Only admins/moderators can revoke badges
	if auth.Role != string(models.RoleAdmin) && auth.Role != string(models.RoleModerator) {
		return responses.Forbidden(c, "Only admins and moderators can revoke badges")
	}

	// Parse user badge ID
	userBadgeIDStr := c.Params("userBadgeID")
	userBadgeID, err := uuid.Parse(userBadgeIDStr)
	if err != nil {
		return responses.BadRequest(c, "Invalid user badge ID format")
	}

	// Parse request body for revocation reason
	var req struct {
		Reason string `json:"reason"`
	}
	if err := c.BodyParser(&req); err != nil {
		return responses.BadRequest(c, "Invalid request body")
	}

	if req.Reason == "" {
		return responses.BadRequest(c, "Revocation reason is required")
	}

	// Call badge service to revoke badge
	if ctrl.badgeService == nil {
		return responses.InternalError(c, "Badge service not available")
	}

	if err := ctrl.badgeService.RevokeBadge(c.Context(), auth.TenantID, userBadgeID, auth.UserID, req.Reason); err != nil {
		return responses.BadRequest(c, err.Error())
	}

	return responses.Success(c, fiber.Map{
		"message":       "Badge revoked successfully",
		"user_badge_id": userBadgeID.String(),
		"reason":        req.Reason,
	})
}
