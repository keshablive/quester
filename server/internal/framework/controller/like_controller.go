package controller

import (
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	"github.com/keshablive/quester/internal/framework/service"
)

// LikeController handles like-related HTTP requests
type LikeController struct {
	socialService *service.SocialService
}

// NewLikeController creates a new like controller
func NewLikeController(socialService *service.SocialService) *LikeController {
	return &LikeController{
		socialService: socialService,
	}
}

// LikePost handles POST /api/v1/posts/:postId/like
func (ctrl *LikeController) LikePost(c *fiber.Ctx) error {
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

	// Like post
	if err := ctrl.socialService.LikePost(c.Context(), userID, postID, tenantID); err != nil {
		if err.Error() == "already liked this post" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": err.Error(),
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to like post",
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "Post liked successfully",
	})
}

// UnlikePost handles DELETE /api/v1/posts/:postId/like
func (ctrl *LikeController) UnlikePost(c *fiber.Ctx) error {
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

	// Unlike post
	if err := ctrl.socialService.UnlikePost(c.Context(), userID, postID, tenantID); err != nil {
		if err.Error() == "post not liked" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": err.Error(),
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to unlike post",
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "Post unliked successfully",
	})
}

// GetPostLikes handles GET /api/v1/posts/:postId/likes
func (ctrl *LikeController) GetPostLikes(c *fiber.Ctx) error {
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

	// Get likers
	likers, total, err := ctrl.socialService.GetPostLikes(c.Context(), postID, tenantID, page, limit)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to get likes",
		})
	}

	return c.JSON(fiber.Map{
		"likers": likers,
		"total":  total,
		"page":   page,
		"limit":  limit,
	})
}

// CheckIfLiked handles GET /api/v1/posts/:postId/is-liked
func (ctrl *LikeController) CheckIfLiked(c *fiber.Ctx) error {
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

	// Check if liked
	isLiked, err := ctrl.socialService.IsPostLiked(c.Context(), userID, postID, tenantID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to check like status",
		})
	}

	return c.JSON(fiber.Map{
		"is_liked": isLiked,
	})
}

// SharePost handles POST /api/v1/posts/:postId/share
func (ctrl *LikeController) SharePost(c *fiber.Ctx) error {
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

	// Share post
	if err := ctrl.socialService.SharePost(c.Context(), userID, postID, tenantID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to share post",
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "Post shared successfully",
	})
}
