// Quest CRUD operations
package controllers

import (
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/yourusername/quester/internal/framework/middleware"
	"github.com/yourusername/quester/internal/framework/utils"
	"github.com/yourusername/quester/internal/models"
	"github.com/yourusername/quester/internal/services"
	"gorm.io/datatypes"
)

type QuestController struct {
	questService *services.QuestService
}

func NewQuestController(questService *services.QuestService) *QuestController {
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
		middleware.FiberRoleMiddleware(models.RoleInstructor),
		qc.CreateQuest,
	)

	// PUT /api/v1/quests/:quest_id - Update quest (instructors/admins only)
	quests.Put("/:quest_id",
		middleware.FiberRoleMiddleware(models.RoleInstructor),
		qc.UpdateQuest,
	)

	// DELETE /api/v1/quests/:quest_id - Delete quest (moderators/admins only)
	quests.Delete("/:quest_id",
		middleware.FiberRoleMiddleware(models.RoleModerator),
		qc.DeleteQuest,
	)
}

// ListQuests returns all quests in a tenant
// GET /api/v1/quests/:tenant_id
func (qc *QuestController) ListQuests(c *fiber.Ctx) error {
	// Extract tenant_id from context (validated by TenantIsolationMiddleware)
	tenantID, ok := middleware.GetTenantIDFromFiberContext(c)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "tenant context not found",
		})
	}

	// Parse optional filters
	filters := make(map[string]interface{})
	if status := c.Query("status"); status != "" {
		filters["status"] = status
	}
	if questType := c.Query("type"); questType != "" {
		filters["type"] = questType
	}

	quests, err := qc.questService.ListQuests(c.Context(), tenantID, filters)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "failed to retrieve quests",
		})
	}

	return c.JSON(fiber.Map{
		"quests":    quests,
		"tenant_id": tenantID.String(),
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
	// Extract tenant_id from context
	tenantID, ok := middleware.GetTenantIDFromFiberContext(c)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "tenant context not found",
		})
	}

	var req CreateQuestRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid request body",
		})
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

	createdQuest, err := qc.questService.CreateQuest(c.Context(), tenantID, quest)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "failed to create quest",
		})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"quest":     createdQuest,
		"tenant_id": tenantID.String(),
	})
}

// GetQuest returns a specific quest by ID
// GET /api/v1/quests/:tenant_id/:quest_id
func (qc *QuestController) GetQuest(c *fiber.Ctx) error {
	// Extract tenant_id from context
	tenantID, ok := middleware.GetTenantIDFromFiberContext(c)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "tenant context not found",
		})
	}

	// Extract quest_id from URL params
	questIDStr := c.Params("quest_id")
	questID, err := uuid.Parse(questIDStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid quest_id format",
		})
	}

	quest, err := qc.questService.GetQuest(c.Context(), tenantID, questID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "quest not found",
		})
	}

	return c.JSON(fiber.Map{
		"quest":     quest,
		"tenant_id": tenantID.String(),
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
	// Extract tenant_id from context
	tenantID, ok := middleware.GetTenantIDFromFiberContext(c)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "tenant context not found",
		})
	}

	// Extract quest_id from URL params
	questIDStr := c.Params("quest_id")
	questID, err := uuid.Parse(questIDStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid quest_id format",
		})
	}

	var req UpdateQuestRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid request body",
		})
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

	updatedQuest, err := qc.questService.UpdateQuest(c.Context(), tenantID, questID, updates)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "failed to update quest",
		})
	}

	return c.JSON(fiber.Map{
		"quest":     updatedQuest,
		"tenant_id": tenantID.String(),
	})
}

// DeleteQuest deletes a quest
// DELETE /api/v1/quests/:tenant_id/:quest_id
// Requires: MODERATOR or ADMIN role
func (qc *QuestController) DeleteQuest(c *fiber.Ctx) error {
	// Extract tenant_id from context
	tenantID, ok := middleware.GetTenantIDFromFiberContext(c)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "tenant context not found",
		})
	}

	// Extract quest_id from URL params
	questIDStr := c.Params("quest_id")
	questID, err := uuid.Parse(questIDStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid quest_id format",
		})
	}

	if err := qc.questService.DeleteQuest(c.Context(), tenantID, questID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "failed to delete quest",
		})
	}

	return c.JSON(fiber.Map{
		"message":   "quest deleted successfully",
		"tenant_id": tenantID.String(),
	})
}
