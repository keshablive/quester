package controllers

import (
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	"github.com/keshablive/quester/internal/framework/service"
)

// CommentController handles comment-related HTTP requests
type CommentController struct {
	socialService *service.SocialService
}

// NewCommentController creates a new comment controller
func NewCommentController(socialService *service.SocialService) *CommentController {
	return &CommentController{
		socialService: socialService,
	}
}

// AddComment handles POST /api/v1/posts/:postId/comments
func (ctrl *CommentController) AddComment(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uuid.UUID)
	tenantID := c.Locals("tenant_id").(uuid.UUID)

	// Get post ID from params
	postIDStr := c.Params("postId")
	postID, err := uuid.Parse(postIDStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid post ID",
		})
	}

	// Parse request body
	var req struct {
		Content  string     `json:"content"`
		ParentID *uuid.UUID `json:"parent_id"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// Validate content
	if req.Content == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Comment content is required",
		})
	}

	// Add comment
	comment, err := ctrl.socialService.AddComment(c.Context(), userID, postID, tenantID, req.Content, req.ParentID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"message": "Comment added successfully",
		"comment": comment,
	})
}

// UpdateComment handles PUT /api/v1/comments/:commentId
func (ctrl *CommentController) UpdateComment(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uuid.UUID)
	tenantID := c.Locals("tenant_id").(uuid.UUID)

	// Get comment ID from params
	commentIDStr := c.Params("commentId")
	commentID, err := uuid.Parse(commentIDStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid comment ID",
		})
	}

	// Parse request body
	var req struct {
		Content string `json:"content"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// Validate content
	if req.Content == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Comment content is required",
		})
	}

	// Update comment
	comment, err := ctrl.socialService.UpdateComment(c.Context(), commentID, userID, tenantID, req.Content)
	if err != nil {
		if err.Error() == "unauthorized" {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "Unauthorized",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to update comment",
		})
	}

	return c.JSON(fiber.Map{
		"message": "Comment updated successfully",
		"comment": comment,
	})
}

// DeleteComment handles DELETE /api/v1/comments/:commentId
func (ctrl *CommentController) DeleteComment(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uuid.UUID)
	tenantID := c.Locals("tenant_id").(uuid.UUID)

	// Get comment ID from params
	commentIDStr := c.Params("commentId")
	commentID, err := uuid.Parse(commentIDStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid comment ID",
		})
	}

	// Delete comment
	if err := ctrl.socialService.DeleteComment(c.Context(), commentID, userID, tenantID); err != nil {
		if err.Error() == "unauthorized" {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "Unauthorized",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to delete comment",
		})
	}

	return c.JSON(fiber.Map{
		"message": "Comment deleted successfully",
	})
}

// GetPostComments handles GET /api/v1/posts/:postId/comments
func (ctrl *CommentController) GetPostComments(c *fiber.Ctx) error {
	tenantID := c.Locals("tenant_id").(uuid.UUID)

	// Get post ID from params
	postIDStr := c.Params("postId")
	postID, err := uuid.Parse(postIDStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid post ID",
		})
	}

	// Parse pagination
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "20"))

	// Get comments
	comments, total, err := ctrl.socialService.GetPostComments(c.Context(), postID, tenantID, page, limit)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to get comments",
		})
	}

	return c.JSON(fiber.Map{
		"comments": comments,
		"total":    total,
		"page":     page,
		"limit":    limit,
	})
}

// GetCommentReplies handles GET /api/v1/comments/:commentId/replies
func (ctrl *CommentController) GetCommentReplies(c *fiber.Ctx) error {
	tenantID := c.Locals("tenant_id").(uuid.UUID)

	// Get comment ID from params
	commentIDStr := c.Params("commentId")
	commentID, err := uuid.Parse(commentIDStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid comment ID",
		})
	}

	// Parse pagination
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "20"))

	// Get replies
	replies, total, err := ctrl.socialService.GetCommentReplies(c.Context(), commentID, tenantID, page, limit)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to get replies",
		})
	}

	return c.JSON(fiber.Map{
		"replies": replies,
		"total":   total,
		"page":    page,
		"limit":   limit,
	})
}
