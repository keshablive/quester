package controllers

import (
	"strconv"

	"github.com/google/uuid"
	"github.com/yourusername/quester/internal/framework/core"
	"github.com/yourusername/quester/internal/framework/responses"
	"github.com/yourusername/quester/internal/models"
	"github.com/yourusername/quester/internal/services"

	"github.com/gofiber/fiber/v2"
)

// InteractionController handles social interaction HTTP requests
type InteractionController struct {
	interactionService *services.InteractionService
}

// NewInteractionController creates a new interaction controller
func NewInteractionController(interactionService *services.InteractionService) *InteractionController {
	return &InteractionController{
		interactionService: interactionService,
	}
}

// CreateInteraction creates a new social interaction (like, comment, share, rate)
// POST /api/interactions
func (ic *InteractionController) CreateInteraction(c *fiber.Ctx) error {
	claims := c.Locals("claims").(*core.Claims)

	tenantID, err := core.GetTenantIDUUID(claims)
	if err != nil {
		return responses.BadRequest(c, "Invalid tenant ID")
	}

	userID, err := core.GetUserID(claims)
	if err != nil {
		return responses.BadRequest(c, "Invalid user ID")
	}

	var req struct {
		TargetType          string     `json:"target_type" validate:"required"`
		TargetID            string     `json:"target_id" validate:"required"`
		InteractionType     string     `json:"interaction_type" validate:"required"`
		Content             string     `json:"content"`
		Rating              *int       `json:"rating"`
		ParentInteractionID *uuid.UUID `json:"parent_interaction_id"`
	}

	if err := c.BodyParser(&req); err != nil {
		return responses.BadRequest(c, "Invalid request body")
	}

	if err := core.Validate.Struct(req); err != nil {
		return responses.ValidationError(c, err)
	}

	targetID, err := uuid.Parse(req.TargetID)
	if err != nil {
		return responses.BadRequest(c, "Invalid target ID")
	}

	// Create interaction
	interaction := &models.Interaction{
		TenantID:            tenantID,
		UserID:              userID,
		TargetType:          req.TargetType,
		TargetID:            targetID,
		InteractionType:     models.InteractionType(req.InteractionType),
		Content:             req.Content,
		Rating:              req.Rating,
		ParentInteractionID: req.ParentInteractionID,
	}

	// Create with AI moderation and rate limiting
	result, err := ic.interactionService.Create(interaction)
	if err != nil {
		// Check for specific errors
		if err == models.ErrRateLimitExceeded {
			return responses.TooManyRequests(c, err.Error())
		}
		if err == models.ErrCommentRequiresContent ||
			err == models.ErrRatingRequiresValue ||
			err == models.ErrInvalidRatingRange ||
			err == models.ErrInvalidInteractionType ||
			err == models.ErrInvalidTargetType {
			return responses.BadRequest(c, err.Error())
		}
		return responses.InternalError(c, "Failed to create interaction: "+err.Error())
	}

	// If content was rejected by AI moderation, return 403
	if result.ModerationStatus == models.ModerationStatusRejected {
		return responses.Forbidden(c, "Content violates community guidelines and was automatically rejected")
	}

	// Return different status codes based on moderation status
	if result.ModerationStatus == models.ModerationStatusFlagged {
		// Content is flagged for review - return 202 Accepted
		return c.Status(fiber.StatusAccepted).JSON(responses.SuccessResponse(result, "Interaction created and flagged for review"))
	}

	// Content approved or pending - return 201 Created
	return responses.Created(c, result)
}

// GetInteractions retrieves interactions for a specific target entity
// GET /api/interactions?target_type=quest&target_id=123&interaction_type=comment&limit=20&page=1
func (ic *InteractionController) GetInteractions(c *fiber.Ctx) error {
	claims := c.Locals("claims").(*core.Claims)

	tenantID, err := core.GetTenantIDUUID(claims)
	if err != nil {
		return responses.BadRequest(c, "Invalid tenant ID")
	}

	// Parse query parameters
	targetType := c.Query("target_type")
	targetIDStr := c.Query("target_id")
	interactionType := c.Query("interaction_type")
	userIDStr := c.Query("user_id")
	parentIDStr := c.Query("parent_id")
	limitStr := c.Query("limit", "20")
	pageStr := c.Query("page", "1")

	// Validate required parameters
	if targetType == "" || targetIDStr == "" {
		return responses.BadRequest(c, "target_type and target_id are required")
	}

	targetID, err := uuid.Parse(targetIDStr)
	if err != nil {
		return responses.BadRequest(c, "Invalid target_id")
	}

	// Parse optional parameters
	var userID uuid.UUID
	if userIDStr != "" {
		uid, err := uuid.Parse(userIDStr)
		if err != nil {
			return responses.BadRequest(c, "Invalid user_id")
		}
		userID = uid
	}

	var parentID uuid.UUID
	if parentIDStr != "" {
		pid, err := uuid.Parse(parentIDStr)
		if err != nil {
			return responses.BadRequest(c, "Invalid parent_id")
		}
		parentID = pid
	}

	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100 // Max limit
	}

	page, err := strconv.Atoi(pageStr)
	if err != nil || page <= 0 {
		page = 1
	}

	offset := (page - 1) * limit

	// Build filters
	filters := services.InteractionFilters{
		TenantID:        tenantID,
		TargetType:      targetType,
		TargetID:        targetID,
		InteractionType: interactionType,
		UserID:          userID,
		ParentID:        parentID,
		Limit:           limit,
		Offset:          offset,
	}

	// Fetch interactions
	interactions, total, err := ic.interactionService.GetByTarget(filters)
	if err != nil {
		return responses.InternalError(c, "Failed to fetch interactions: "+err.Error())
	}

	// Return with pagination metadata
	return responses.SuccessWithMeta(c, interactions, map[string]interface{}{
		"total": total,
		"page":  page,
		"limit": limit,
		"pages": (total + int64(limit) - 1) / int64(limit),
	})
}

// GetInteractionByID retrieves a single interaction by ID
// GET /api/interactions/:id
func (ic *InteractionController) GetInteractionByID(c *fiber.Ctx) error {
	claims := c.Locals("claims").(*core.Claims)

	tenantID, err := core.GetTenantIDUUID(claims)
	if err != nil {
		return responses.BadRequest(c, "Invalid tenant ID")
	}

	idStr := c.Params("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		return responses.BadRequest(c, "Invalid interaction ID")
	}

	interaction, err := ic.interactionService.GetByID(tenantID, id)
	if err != nil {
		return responses.NotFound(c, "Interaction not found")
	}

	return responses.Success(c, interaction)
}

// GetChildInteractions retrieves nested comments for a parent interaction
// GET /api/interactions/:id/children?limit=20&page=1
func (ic *InteractionController) GetChildInteractions(c *fiber.Ctx) error {
	claims := c.Locals("claims").(*core.Claims)

	tenantID, err := core.GetTenantIDUUID(claims)
	if err != nil {
		return responses.BadRequest(c, "Invalid tenant ID")
	}

	parentIDStr := c.Params("id")
	parentID, err := uuid.Parse(parentIDStr)
	if err != nil {
		return responses.BadRequest(c, "Invalid parent interaction ID")
	}

	limitStr := c.Query("limit", "20")
	pageStr := c.Query("page", "1")

	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}

	page, err := strconv.Atoi(pageStr)
	if err != nil || page <= 0 {
		page = 1
	}

	offset := (page - 1) * limit

	// Fetch child interactions
	children, total, err := ic.interactionService.GetChildInteractions(tenantID, parentID, limit, offset)
	if err != nil {
		return responses.InternalError(c, "Failed to fetch child interactions: "+err.Error())
	}

	return responses.SuccessWithMeta(c, children, map[string]interface{}{
		"total": total,
		"page":  page,
		"limit": limit,
		"pages": (total + int64(limit) - 1) / int64(limit),
	})
}

// DeleteInteraction soft deletes an interaction (owner only)
// DELETE /api/interactions/:id
func (ic *InteractionController) DeleteInteraction(c *fiber.Ctx) error {
	claims := c.Locals("claims").(*core.Claims)

	tenantID, err := core.GetTenantIDUUID(claims)
	if err != nil {
		return responses.BadRequest(c, "Invalid tenant ID")
	}

	userID, err := core.GetUserID(claims)
	if err != nil {
		return responses.BadRequest(c, "Invalid user ID")
	}

	idStr := c.Params("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		return responses.BadRequest(c, "Invalid interaction ID")
	}

	// Delete interaction
	err = ic.interactionService.Delete(tenantID, id, userID)
	if err != nil {
		if err.Error() == "unauthorized: user does not own this interaction" {
			return responses.Forbidden(c, "You can only delete your own interactions")
		}
		return responses.InternalError(c, "Failed to delete interaction: "+err.Error())
	}

	return responses.Success(c, map[string]interface{}{
		"message": "Interaction deleted successfully",
	})
}

// GetInteractionCounts retrieves aggregated counts for a target entity
// GET /api/interactions/counts?target_type=quest&target_id=123
func (ic *InteractionController) GetInteractionCounts(c *fiber.Ctx) error {
	claims := c.Locals("claims").(*core.Claims)

	tenantID, err := core.GetTenantIDUint(claims)
	if err != nil {
		return responses.BadRequest(c, "Invalid tenant ID")
	}

	targetType := c.Query("target_type")
	targetIDStr := c.Query("target_id")

	if targetType == "" || targetIDStr == "" {
		return responses.BadRequest(c, "target_type and target_id are required")
	}

	targetID, err := strconv.ParseUint(targetIDStr, 10, 64)
	if err != nil {
		return responses.BadRequest(c, "Invalid target_id")
	}

	counts, err := ic.interactionService.GetInteractionCounts(tenantID, targetType, uint(targetID))
	if err != nil {
		return responses.InternalError(c, "Failed to fetch interaction counts: "+err.Error())
	}

	return responses.Success(c, counts)
}

// GetUserInteractionStatus checks user's interaction status with a target
// GET /api/interactions/status?target_type=quest&target_id=123
func (ic *InteractionController) GetUserInteractionStatus(c *fiber.Ctx) error {
	claims := c.Locals("claims").(*core.Claims)

	tenantID, err := core.GetTenantIDUint(claims)
	if err != nil {
		return responses.BadRequest(c, "Invalid tenant ID")
	}

	userID, err := core.GetUserIDUint(claims)
	if err != nil {
		return responses.BadRequest(c, "Invalid user ID")
	}

	targetType := c.Query("target_type")
	targetIDStr := c.Query("target_id")

	if targetType == "" || targetIDStr == "" {
		return responses.BadRequest(c, "target_type and target_id are required")
	}

	targetID, err := strconv.ParseUint(targetIDStr, 10, 64)
	if err != nil {
		return responses.BadRequest(c, "Invalid target_id")
	}

	// Check if user has liked
	hasLiked, err := ic.interactionService.HasUserLiked(tenantID, userID, targetType, uint(targetID))
	if err != nil {
		return responses.InternalError(c, "Failed to check like status: "+err.Error())
	}

	// Get user's rating if exists
	userRating, err := ic.interactionService.GetUserRating(tenantID, userID, targetType, uint(targetID))
	if err != nil {
		return responses.InternalError(c, "Failed to check rating: "+err.Error())
	}

	return responses.Success(c, map[string]interface{}{
		"has_liked":   hasLiked,
		"user_rating": userRating,
	})
}
