package controllers

import (
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	"github.com/keshablive/quester/internal/services"
)

// SocialController handles social interaction HTTP requests (posts, likes, comments, follows)
type SocialController struct {
	socialService *services.SocialService
}

// NewSocialController creates a new social controller
func NewSocialController(socialService *services.SocialService) *SocialController {
	return &SocialController{
		socialService: socialService,
	}
}

// --- Post Handlers ---

// CreatePost handles POST /api/v1/posts
func (ctrl *SocialController) CreatePost(c *fiber.Ctx) error {
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
	post, err := ctrl.socialService.CreatePost(c.Context(), userID, tenantID, req.Content, req.MediaType, req.MediaURL, req.Visibility)
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
func (ctrl *SocialController) GetPost(c *fiber.Ctx) error {
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
	post, err := ctrl.socialService.GetPost(c.Context(), postID, tenantID, viewerID)
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
func (ctrl *SocialController) UpdatePost(c *fiber.Ctx) error {
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
	post, err := ctrl.socialService.UpdatePost(c.Context(), postID, userID, tenantID, req.Content, req.Visibility)
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
func (ctrl *SocialController) DeletePost(c *fiber.Ctx) error {
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
	if err := ctrl.socialService.DeletePost(c.Context(), postID, userID, tenantID); err != nil {
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
func (ctrl *SocialController) GetUserPosts(c *fiber.Ctx) error {
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
	posts, total, err := ctrl.socialService.GetUserPosts(c.Context(), userID, tenantID, page, limit)
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
func (ctrl *SocialController) GetFeed(c *fiber.Ctx) error {
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
		posts, total, err = ctrl.socialService.GetPublicFeed(c.Context(), tenantID, page, limit)
	} else {
		posts, total, err = ctrl.socialService.GetFollowingFeed(c.Context(), userID, tenantID, page, limit)
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
func (ctrl *SocialController) SearchPosts(c *fiber.Ctx) error {
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
	posts, total, err := ctrl.socialService.SearchPosts(c.Context(), query, tenantID, page, limit)
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

// --- Like Handlers ---

// LikePost handles POST /api/v1/posts/:postId/like
func (ctrl *SocialController) LikePost(c *fiber.Ctx) error {
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
func (ctrl *SocialController) UnlikePost(c *fiber.Ctx) error {
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
func (ctrl *SocialController) GetPostLikes(c *fiber.Ctx) error {
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
func (ctrl *SocialController) CheckIfLiked(c *fiber.Ctx) error {
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
func (ctrl *SocialController) SharePost(c *fiber.Ctx) error {
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

// --- Comment Handlers ---

// AddComment handles POST /api/v1/posts/:postId/comments
func (ctrl *SocialController) AddComment(c *fiber.Ctx) error {
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
func (ctrl *SocialController) UpdateComment(c *fiber.Ctx) error {
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
func (ctrl *SocialController) DeleteComment(c *fiber.Ctx) error {
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
func (ctrl *SocialController) GetPostComments(c *fiber.Ctx) error {
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
func (ctrl *SocialController) GetCommentReplies(c *fiber.Ctx) error {
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

// --- Follow Handlers ---

// FollowUser handles POST /api/v1/users/:userId/follow
func (ctrl *SocialController) FollowUser(c *fiber.Ctx) error {
	// Get authenticated user from context
	followerID := c.Locals("user_id").(uuid.UUID)
	tenantID := c.Locals("tenant_id").(uuid.UUID)

	// Get user to follow from params
	followingIDStr := c.Params("userId")
	followingID, err := uuid.Parse(followingIDStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid user ID",
		})
	}

	// Follow user
	if err := ctrl.socialService.FollowUser(c.Context(), followerID, followingID, tenantID); err != nil {
		if err.Error() == "cannot follow yourself" || err.Error() == "already following this user" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": err.Error(),
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to follow user",
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "Successfully followed user",
	})
}

// UnfollowUser handles DELETE /api/v1/users/:userId/follow
func (ctrl *SocialController) UnfollowUser(c *fiber.Ctx) error {
	// Get authenticated user from context
	followerID := c.Locals("user_id").(uuid.UUID)
	tenantID := c.Locals("tenant_id").(uuid.UUID)

	// Get user to unfollow from params
	followingIDStr := c.Params("userId")
	followingID, err := uuid.Parse(followingIDStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid user ID",
		})
	}

	// Unfollow user
	if err := ctrl.socialService.UnfollowUser(c.Context(), followerID, followingID, tenantID); err != nil {
		if err.Error() == "not following this user" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": err.Error(),
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to unfollow user",
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "Successfully unfollowed user",
	})
}

// GetFollowers handles GET /api/v1/users/:userId/followers
func (ctrl *SocialController) GetFollowers(c *fiber.Ctx) error {
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

	// Get followers
	followers, total, err := ctrl.socialService.GetFollowers(c.Context(), userID, tenantID, page, limit)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to get followers",
		})
	}

	return c.JSON(fiber.Map{
		"followers": followers,
		"total":     total,
		"page":      page,
		"limit":     limit,
	})
}

// GetFollowing handles GET /api/v1/users/:userId/following
func (ctrl *SocialController) GetFollowing(c *fiber.Ctx) error {
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

	// Get following
	following, total, err := ctrl.socialService.GetFollowing(c.Context(), userID, tenantID, page, limit)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to get following",
		})
	}

	return c.JSON(fiber.Map{
		"following": following,
		"total":     total,
		"page":      page,
		"limit":     limit,
	})
}

// GetFollowStats handles GET /api/v1/users/:userId/follow-stats
func (ctrl *SocialController) GetFollowStats(c *fiber.Ctx) error {
	tenantID := c.Locals("tenant_id").(uuid.UUID)

	// Get user ID from params
	userIDStr := c.Params("userId")
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid user ID",
		})
	}

	// Get stats
	stats, err := ctrl.socialService.GetFollowStats(c.Context(), userID, tenantID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to get follow stats",
		})
	}

	return c.JSON(stats)
}

// CheckIfFollowing handles GET /api/v1/users/:userId/is-following
func (ctrl *SocialController) CheckIfFollowing(c *fiber.Ctx) error {
	followerID := c.Locals("user_id").(uuid.UUID)
	tenantID := c.Locals("tenant_id").(uuid.UUID)

	// Get user to check from params
	followingIDStr := c.Params("userId")
	followingID, err := uuid.Parse(followingIDStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid user ID",
		})
	}

	// Check if following
	isFollowing, err := ctrl.socialService.IsFollowing(c.Context(), followerID, followingID, tenantID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to check follow status",
		})
	}

	return c.JSON(fiber.Map{
		"is_following": isFollowing,
	})
}
