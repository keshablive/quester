package controllers

import (
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	"github.com/keshablive/quester/internal/framework/core"
	"github.com/keshablive/quester/internal/models"
	"github.com/keshablive/quester/internal/services"
)

// ModerationController handles AI moderation HTTP requests
type ModerationController struct {
	service *services.ModerationService
}

// NewModerationController creates a new moderation controller
func NewModerationController(service *services.ModerationService) *ModerationController {
	return &ModerationController{
		service: service,
	}
}

// GetModerationQueue retrieves pending moderation queue items
// GET /api/moderation/queue?status=pending&limit=20&page=1
func (mc *ModerationController) GetModerationQueue(c *fiber.Ctx) error {
	claims := c.Locals("claims").(*core.Claims)

	// Check admin role
	if claims.Role != "ADMIN" {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "Admin access required",
		})
	}

	// Parse tenant ID
	tenantID, err := uuid.Parse(claims.TenantID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid tenant ID",
		})
	}

	tenantIDUint := uint(tenantID.ID())

	// Parse query parameters
	statusStr := c.Query("status", "pending")
	limit, _ := strconv.Atoi(c.Query("limit", "20"))
	page, _ := strconv.Atoi(c.Query("page", "1"))

	if limit <= 0 || limit > 100 {
		limit = 20
	}
	if page <= 0 {
		page = 1
	}

	offset := (page - 1) * limit

	// Build query
	query := core.GetDB().
		Where("tenant_id = ?", tenantIDUint).
		Preload("Interaction").
		Preload("Reviewer")

	// Filter by status
	if statusStr == "pending" {
		query = query.Where("reviewed_at IS NULL")
	} else if statusStr == "reviewed" {
		query = query.Where("reviewed_at IS NOT NULL")
	}

	// Get total count
	var total int64
	if err := query.Model(&models.ModerationQueue{}).Count(&total).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to count queue items",
		})
	}

	// Fetch queue items
	var items []models.ModerationQueue
	if err := query.
		Order("created_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&items).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch queue items",
		})
	}

	return c.JSON(fiber.Map{
		"items": items,
		"meta": fiber.Map{
			"total": total,
			"page":  page,
			"limit": limit,
			"pages": (total + int64(limit) - 1) / int64(limit),
		},
	})
}

// ReviewContent processes moderator's review of flagged content
// POST /api/moderation/:id/review
func (mc *ModerationController) ReviewContent(c *fiber.Ctx) error {
	claims := c.Locals("claims").(*core.Claims)

	// Check admin role
	if claims.Role != "ADMIN" {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "Admin access required",
		})
	}

	// Parse queue item ID
	queueID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid queue item ID",
		})
	}

	// Parse request
	var req struct {
		Action string `json:"action"`
		Notes  string `json:"notes"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// Parse moderator ID
	moderatorID, err := uuid.Parse(claims.Subject)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Invalid user ID",
		})
	}

	// Map action to ModerationAction
	var action models.ModerationAction
	switch req.Action {
	case "approve":
		action = models.ModerationActionApproved
	case "remove":
		action = models.ModerationActionRemoved
	case "warn":
		action = models.ModerationActionWarned
	case "ban":
		action = models.ModerationActionBanned
	default:
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid action",
		})
	}

	// Review content
	if err := mc.service.ReviewContent(uint(queueID), uint(moderatorID.ID()), action, req.Notes); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"message": "Content reviewed successfully",
		"action":  req.Action,
	})
}

// GetModerationStats retrieves moderation statistics
// GET /api/moderation/stats
func (mc *ModerationController) GetModerationStats(c *fiber.Ctx) error {
	claims := c.Locals("claims").(*core.Claims)

	// Check admin role
	if claims.Role != "ADMIN" {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "Admin access required",
		})
	}

	// Parse tenant ID
	tenantID, err := uuid.Parse(claims.TenantID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid tenant ID",
		})
	}

	// Get stats
	stats, err := mc.service.GetModerationStats(uint(tenantID.ID()))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"stats": stats,
	})
}

// DetectDrift analyzes moderation drift
// GET /api/moderation/drift?days=30
func (mc *ModerationController) DetectDrift(c *fiber.Ctx) error {
	claims := c.Locals("claims").(*core.Claims)

	// Check admin role
	if claims.Role != "ADMIN" {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "Admin access required",
		})
	}

	// Parse tenant ID
	tenantID, err := uuid.Parse(claims.TenantID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid tenant ID",
		})
	}

	// Parse days
	days, _ := strconv.Atoi(c.Query("days", "30"))
	if days <= 0 {
		days = 30
	}

	// Detect drift
	analysis, err := mc.service.DetectDrift(uint(tenantID.ID()), days)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"analysis": analysis,
	})
}

// ModerateContent moderates content with AI
// POST /api/moderation/moderate
func (mc *ModerationController) ModerateContent(c *fiber.Ctx) error {
	var req struct {
		Content string `json:"content"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	decision, err := mc.service.ModerateContent(req.Content)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"decision": decision,
	})
}
