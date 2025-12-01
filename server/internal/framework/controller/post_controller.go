package controller

import (
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	"github.com/keshablive/quester/internal/framework/service"
)

// PostController handles post-related HTTP requests
type PostController struct {
	postService *service.PostService
}

// NewPostController creates a new post controller
func NewPostController(postService *service.PostService) *PostController {
	return &PostController{
		postService: postService,
	}
}

// CreatePost handles POST /api/v1/posts
func (ctrl *PostController) CreatePost(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uuid.UUID)
	tenantID := c.Locals("tenant_id").(uuid.UUID)

	// Parse request body
	var req struct {
		Content    string `json:"content"`
		MediaType  string `json:"media_type"`
		MediaURL   string `json:"media_url"`
		Visibility string `json:"visibility"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// Validate required fields
	if req.Content == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Content is required",
		})
	}

	if req.MediaType == "" {
		req.MediaType = "text"
	}

	if req.Visibility == "" {
		req.Visibility = "public"
	}

	// Create post
	post, err := ctrl.postService.CreatePost(c.Context(), userID, tenantID, req.Content, req.MediaType, req.MediaURL, req.Visibility)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"message": "Post created successfully",
		"post":    post,
	})
}

// GetPost handles GET /api/v1/posts/:postId
func (ctrl *PostController) GetPost(c *fiber.Ctx) error {
	tenantID := c.Locals("tenant_id").(uuid.UUID)

	// Get viewer ID (may be nil for unauthenticated requests)
	var viewerID *uuid.UUID
	if userID := c.Locals("user_id"); userID != nil {
		uid := userID.(uuid.UUID)
		viewerID = &uid
	}

	// Get post ID from params
	postIDStr := c.Params("postId")
	postID, err := uuid.Parse(postIDStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid post ID",
		})
	}

	// Get post
	post, err := ctrl.postService.GetPost(c.Context(), postID, tenantID, viewerID)
	if err != nil {
		if err.Error() == "post not found" {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "Post not found",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to get post",
		})
	}

	return c.JSON(post)
}

// UpdatePost handles PUT /api/v1/posts/:postId
func (ctrl *PostController) UpdatePost(c *fiber.Ctx) error {
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
		Content    string `json:"content"`
		Visibility string `json:"visibility"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// Update post
	post, err := ctrl.postService.UpdatePost(c.Context(), postID, userID, tenantID, req.Content, req.Visibility)
	if err != nil {
		if err.Error() == "unauthorized" {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "Unauthorized",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to update post",
		})
	}

	return c.JSON(fiber.Map{
		"message": "Post updated successfully",
		"post":    post,
	})
}

// DeletePost handles DELETE /api/v1/posts/:postId
func (ctrl *PostController) DeletePost(c *fiber.Ctx) error {
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

	// Delete post
	if err := ctrl.postService.DeletePost(c.Context(), postID, userID, tenantID); err != nil {
		if err.Error() == "unauthorized" {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "Unauthorized",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to delete post",
		})
	}

	return c.JSON(fiber.Map{
		"message": "Post deleted successfully",
	})
}

// GetUserPosts handles GET /api/v1/users/:userId/posts
func (ctrl *PostController) GetUserPosts(c *fiber.Ctx) error {
	tenantID := c.Locals("tenant_id").(uuid.UUID)

	// Get user ID from params
	userIDStr := c.Params("userId")
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid user ID",
		})
	}

	// Parse pagination
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "20"))

	// Get user posts
	posts, total, err := ctrl.postService.GetUserPosts(c.Context(), userID, tenantID, page, limit)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to get posts",
		})
	}

	return c.JSON(fiber.Map{
		"posts": posts,
		"total": total,
		"page":  page,
		"limit": limit,
	})
}

// GetFeed handles GET /api/v1/feed
func (ctrl *PostController) GetFeed(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uuid.UUID)
	tenantID := c.Locals("tenant_id").(uuid.UUID)

	// Parse pagination
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "20"))

	// Get feed type (following or public)
	feedType := c.Query("type", "following")

	var posts interface{}
	var total int64
	var err error

	if feedType == "public" {
		posts, total, err = ctrl.postService.GetPublicFeed(c.Context(), tenantID, page, limit)
	} else {
		posts, total, err = ctrl.postService.GetFollowingFeed(c.Context(), userID, tenantID, page, limit)
	}

	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to get feed",
		})
	}

	return c.JSON(fiber.Map{
		"posts": posts,
		"total": total,
		"page":  page,
		"limit": limit,
	})
}

// SearchPosts handles GET /api/v1/posts/search
func (ctrl *PostController) SearchPosts(c *fiber.Ctx) error {
	tenantID := c.Locals("tenant_id").(uuid.UUID)

	// Get search query
	query := c.Query("q")
	if query == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Search query is required",
		})
	}

	// Parse pagination
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "20"))

	// Search posts
	posts, total, err := ctrl.postService.SearchPosts(c.Context(), query, tenantID, page, limit)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to search posts",
		})
	}

	return c.JSON(fiber.Map{
		"posts": posts,
		"total": total,
		"page":  page,
		"limit": limit,
	})
}
