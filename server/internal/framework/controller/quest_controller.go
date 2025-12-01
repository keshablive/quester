// Quest CRUD operations
package controller

import (
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/keshablive/quester/internal/framework/middleware"
	"github.com/keshablive/quester/internal/framework/responses"
	"github.com/keshablive/quester/internal/framework/utils"
	"github.com/keshablive/quester/internal/models"
	"github.com/keshablive/quester/internal/framework/service"
	"gorm.io/datatypes"
)

type QuestController struct {
	questService *service.QuestService
}

func NewQuestController(questService *service.QuestService) *QuestController {
	return &QuestController{questService: questService}
}

// RegisterRoutes registers quest routes
func (qc *QuestController) RegisterRoutes(app *fiber.App) {
	quests := app.Group("/api/v1/quests")

	// Protected routes - require authentication
	quests.Use(middleware.FiberAuthMiddleware())

	// GET /api/v1/quests - List all active quests for tenant
	quests.Get("/", qc.ListQuests)

	// GET /api/v1/quests/:quest_id - Get specific quest
	quests.Get("/:quest_id", qc.GetQuest)

	// POST /api/v1/quests - Create quest (instructors/admins only)
	quests.Post("/",
		middleware.FiberRoleMiddlewareString(string(models.RoleInstructor)),
		qc.CreateQuest,
	)

	// PUT /api/v1/quests/:quest_id - Update quest (instructors/admins only)
	quests.Put("/:quest_id",
		middleware.FiberRoleMiddlewareString(string(models.RoleInstructor)),
		qc.UpdateQuest,
	)

	// DELETE /api/v1/quests/:quest_id - Delete quest (moderators/admins only)
	quests.Delete("/:quest_id",
		middleware.FiberRoleMiddlewareString(string(models.RoleModerator)),
		qc.DeleteQuest,
	)
}

// ListQuests returns all quests in a tenant
// GET /api/v1/quests/:tenant_id
func (qc *QuestController) ListQuests(c *fiber.Ctx) error {
	// Use framework helper for auth context extraction
	auth, err := GetAuthContext(c)
	if err != nil {
		return responses.Unauthorized(c, err.Error())
	}

	// Parse optional filters
	filters := make(map[string]interface{})
	if status := c.Query("status"); status != "" {
		filters["status"] = status
	}
	if questType := c.Query("type"); questType != "" {
		filters["type"] = questType
	}

	quests, err := qc.questService.ListQuests(c.Context(), auth.TenantID, filters)
	if err != nil {
		return responses.InternalError(c, "failed to retrieve quests")
	}

	return responses.Success(c, fiber.Map{
		"quests":    quests,
		"tenant_id": auth.TenantID.String(),
	})
}

type CreateQuestRequest struct {
	Title        string             `json:"title" validate:"required"`
	Description  string             `json:"description" validate:"required"`
	Type         models.QuestType   `json:"type" validate:"required"`
	Status       models.QuestStatus `json:"status"`
	Points       int                `json:"points" validate:"min=0"`
	BadgeID      *uuid.UUID         `json:"badge_id"`
	Requirements datatypes.JSON     `json:"requirements"`
	StartDate    time.Time          `json:"start_date"`
	EndDate      *time.Time         `json:"end_date"`
}

// CreateQuest creates a new quest in a tenant
// POST /api/v1/quests/:tenant_id
// Requires: INSTRUCTOR or ADMIN role
func (qc *QuestController) CreateQuest(c *fiber.Ctx) error {
	// Use framework helper for auth context extraction
	auth, err := GetAuthContext(c)
	if err != nil {
		return responses.Unauthorized(c, err.Error())
	}

	var req CreateQuestRequest
	if err := c.BodyParser(&req); err != nil {
		return responses.BadRequest(c, "invalid request body")
	}

	// Sanitize user input to prevent XSS attacks
	sanitizedTitle := utils.SanitizeHTML(req.Title)
	sanitizedDescription := utils.SanitizeHTML(req.Description)

	quest := &models.Quest{
		Title:        sanitizedTitle,
		Description:  sanitizedDescription,
		Type:         req.Type,
		Status:       req.Status,
		Points:       req.Points,
		BadgeID:      req.BadgeID,
		Requirements: req.Requirements,
		StartDate:    req.StartDate,
		EndDate:      req.EndDate,
	}

	if quest.Status == "" {
		quest.Status = "active"
	}

	createdQuest, err := qc.questService.CreateQuest(c.Context(), auth.TenantID, quest)
	if err != nil {
		return responses.InternalError(c, "failed to create quest")
	}

	return responses.Created(c, fiber.Map{
		"quest":     createdQuest,
		"tenant_id": auth.TenantID.String(),
	})
}

// GetQuest returns a specific quest by ID
// GET /api/v1/quests/:tenant_id/:quest_id
func (qc *QuestController) GetQuest(c *fiber.Ctx) error {
	// Use framework helper for auth context extraction
	auth, err := GetAuthContext(c)
	if err != nil {
		return responses.Unauthorized(c, err.Error())
	}

	// Extract quest_id from URL params
	questIDStr := c.Params("quest_id")
	questID, err := uuid.Parse(questIDStr)
	if err != nil {
		return responses.BadRequest(c, "invalid quest_id format")
	}

	quest, err := qc.questService.GetQuest(c.Context(), auth.TenantID, questID)
	if err != nil {
		return responses.NotFound(c, "quest not found")
	}

	return responses.Success(c, fiber.Map{
		"quest":     quest,
		"tenant_id": auth.TenantID.String(),
	})
}

type UpdateQuestRequest struct {
	Title        string             `json:"title"`
	Description  string             `json:"description"`
	Type         models.QuestType   `json:"type"`
	Status       models.QuestStatus `json:"status"`
	Points       int                `json:"points"`
	BadgeID      *uuid.UUID         `json:"badge_id"`
	Requirements datatypes.JSON     `json:"requirements"`
	EndDate      *time.Time         `json:"end_date"`
}

// UpdateQuest updates an existing quest
// PUT /api/v1/quests/:tenant_id/:quest_id
// Requires: INSTRUCTOR or ADMIN role
func (qc *QuestController) UpdateQuest(c *fiber.Ctx) error {
	// Use framework helper for auth context extraction
	auth, err := GetAuthContext(c)
	if err != nil {
		return responses.Unauthorized(c, err.Error())
	}

	// Extract quest_id from URL params
	questIDStr := c.Params("quest_id")
	questID, err := uuid.Parse(questIDStr)
	if err != nil {
		return responses.BadRequest(c, "invalid quest_id format")
	}

	var req UpdateQuestRequest
	if err := c.BodyParser(&req); err != nil {
		return responses.BadRequest(c, "invalid request body")
	}

	// Sanitize user input to prevent XSS attacks
	sanitizedTitle := utils.SanitizeHTML(req.Title)
	sanitizedDescription := utils.SanitizeHTML(req.Description)

	updates := &models.Quest{
		Title:        sanitizedTitle,
		Description:  sanitizedDescription,
		Type:         req.Type,
		Status:       req.Status,
		Points:       req.Points,
		BadgeID:      req.BadgeID,
		Requirements: req.Requirements,
		EndDate:      req.EndDate,
	}

	updatedQuest, err := qc.questService.UpdateQuest(c.Context(), auth.TenantID, questID, updates)
	if err != nil {
		return responses.InternalError(c, "failed to update quest")
	}

	return responses.Success(c, fiber.Map{
		"quest":     updatedQuest,
		"tenant_id": auth.TenantID.String(),
	})
}

// DeleteQuest deletes a quest
// DELETE /api/v1/quests/:tenant_id/:quest_id
// Requires: MODERATOR or ADMIN role
func (qc *QuestController) DeleteQuest(c *fiber.Ctx) error {
	// Use framework helper for auth context extraction
	auth, err := GetAuthContext(c)
	if err != nil {
		return responses.Unauthorized(c, err.Error())
	}

	// Extract quest_id from URL params
	questIDStr := c.Params("quest_id")
	questID, err := uuid.Parse(questIDStr)
	if err != nil {
		return responses.BadRequest(c, "invalid quest_id format")
	}

	if err := qc.questService.DeleteQuest(c.Context(), auth.TenantID, questID); err != nil {
		return responses.InternalError(c, "failed to delete quest")
	}

	return responses.Success(c, fiber.Map{
		"message":   "quest deleted successfully",
		"tenant_id": auth.TenantID.String(),
	})
}
