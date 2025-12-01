package controllers

import (
	"strconv"

	"github.com/gofiber/fiber/v2"

	"github.com/keshablive/quester/internal/framework/service"
)

// GroupsController handles group-related requests
type GroupsController struct {
	messagingService *service.MessagingService
}

// NewGroupsController creates a new groups controller
func NewGroupsController(messagingService *service.MessagingService) *GroupsController {
	return &GroupsController{
		messagingService: messagingService,
	}
}

// CreateGroup creates a new group
func (c *GroupsController) CreateGroup(ctx *fiber.Ctx) error {
	userID := ctx.Locals("user_id").(string)
	tenantID := ctx.Locals("tenant_id").(string)

	type Request struct {
		Name        string `json:"name" validate:"required,min=1,max=255"`
		Description string `json:"description"`
		AvatarURL   string `json:"avatar_url"`
		GroupType   string `json:"group_type" validate:"required,oneof=private public"`
		MaxMembers  int    `json:"max_members" validate:"min=2,max=1000"`
	}

	var req Request
	if err := ctx.BodyParser(&req); err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// Set default max members if not provided
	if req.MaxMembers == 0 {
		req.MaxMembers = 100
	}

	group, err := c.messagingService.CreateGroup(
		ctx.Context(),
		tenantID,
		userID,
		req.Name,
		req.Description,
		req.AvatarURL,
		req.GroupType,
		req.MaxMembers,
	)
	if err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return ctx.Status(fiber.StatusCreated).JSON(group)
}

// GetGroup retrieves a group by ID
func (c *GroupsController) GetGroup(ctx *fiber.Ctx) error {
	groupID := ctx.Params("groupId")
	tenantID := ctx.Locals("tenant_id").(string)

	// Note: In production, add permission check to verify user is a member
	group, err := c.messagingService.GetGroupByID(ctx.Context(), groupID, tenantID)
	if err != nil {
		return ctx.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Group not found",
		})
	}

	return ctx.JSON(group)
}

// GetUserGroups retrieves all groups the user is a member of
func (c *GroupsController) GetUserGroups(ctx *fiber.Ctx) error {
	userID := ctx.Locals("user_id").(string)
	tenantID := ctx.Locals("tenant_id").(string)

	// Parse pagination params
	page, _ := strconv.Atoi(ctx.Query("page", "1"))
	limit, _ := strconv.Atoi(ctx.Query("limit", "20"))

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 50 {
		limit = 20
	}

	groups, total, err := c.messagingService.GetUserGroups(ctx.Context(), tenantID, userID, page, limit)
	if err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return ctx.JSON(fiber.Map{
		"groups": groups,
		"pagination": fiber.Map{
			"page":        page,
			"limit":       limit,
			"total":       total,
			"total_pages": (total + int64(limit) - 1) / int64(limit),
		},
	})
}

// AddGroupMember adds a member to a group
func (c *GroupsController) AddGroupMember(ctx *fiber.Ctx) error {
	adderID := ctx.Locals("user_id").(string)
	tenantID := ctx.Locals("tenant_id").(string)
	groupID := ctx.Params("groupId")

	type Request struct {
		UserID string `json:"user_id" validate:"required,uuid"`
		Role   string `json:"role" validate:"required,oneof=admin moderator member"`
	}

	var req Request
	if err := ctx.BodyParser(&req); err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	member, err := c.messagingService.AddGroupMember(
		ctx.Context(),
		tenantID,
		groupID,
		req.UserID,
		adderID,
		req.Role,
	)
	if err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return ctx.Status(fiber.StatusCreated).JSON(member)
}

// RemoveGroupMember removes a member from a group
func (c *GroupsController) RemoveGroupMember(ctx *fiber.Ctx) error {
	removerID := ctx.Locals("user_id").(string)
	tenantID := ctx.Locals("tenant_id").(string)
	groupID := ctx.Params("groupId")
	userID := ctx.Params("userId")

	if err := c.messagingService.RemoveGroupMember(ctx.Context(), tenantID, groupID, userID, removerID); err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return ctx.Status(fiber.StatusNoContent).Send(nil)
}

// UpdateGroupMemberRole updates a member's role
func (c *GroupsController) UpdateGroupMemberRole(ctx *fiber.Ctx) error {
	updaterID := ctx.Locals("user_id").(string)
	tenantID := ctx.Locals("tenant_id").(string)
	groupID := ctx.Params("groupId")
	userID := ctx.Params("userId")

	type Request struct {
		Role string `json:"role" validate:"required,oneof=admin moderator member"`
	}

	var req Request
	if err := ctx.BodyParser(&req); err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	if err := c.messagingService.UpdateGroupMemberRole(ctx.Context(), tenantID, groupID, userID, updaterID, req.Role); err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return ctx.JSON(fiber.Map{
		"message": "Member role updated successfully",
	})
}

// GetGroupMembers retrieves all members of a group
func (c *GroupsController) GetGroupMembers(ctx *fiber.Ctx) error {
	tenantID := ctx.Locals("tenant_id").(string)
	groupID := ctx.Params("groupId")

	// Parse pagination params
	page, _ := strconv.Atoi(ctx.Query("page", "1"))
	limit, _ := strconv.Atoi(ctx.Query("limit", "50"))

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 50
	}

	members, total, err := c.messagingService.GetGroupMembers(ctx.Context(), tenantID, groupID, page, limit)
	if err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return ctx.JSON(fiber.Map{
		"members": members,
		"pagination": fiber.Map{
			"page":        page,
			"limit":       limit,
			"total":       total,
			"total_pages": (total + int64(limit) - 1) / int64(limit),
		},
	})
}

// LeaveGroup allows a user to leave a group
func (c *GroupsController) LeaveGroup(ctx *fiber.Ctx) error {
	userID := ctx.Locals("user_id").(string)
	tenantID := ctx.Locals("tenant_id").(string)
	groupID := ctx.Params("groupId")

	if err := c.messagingService.RemoveGroupMember(ctx.Context(), tenantID, groupID, userID, userID); err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return ctx.JSON(fiber.Map{
		"message": "Successfully left the group",
	})
}
