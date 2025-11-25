package controllers

import (
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	"github.com/yourusername/quester/internal/services"
)

// FollowController handles follow-related HTTP requests
type FollowController struct {
	followService *services.FollowService
}

// NewFollowController creates a new follow controller
func NewFollowController(followService *services.FollowService) *FollowController {
	return &FollowController{
		followService: followService,
	}
}

// FollowUser handles POST /api/v1/users/:userId/follow
func (ctrl *FollowController) FollowUser(c *fiber.Ctx) error {
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
	if err := ctrl.followService.FollowUser(c.Context(), followerID, followingID, tenantID); err != nil {
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
func (ctrl *FollowController) UnfollowUser(c *fiber.Ctx) error {
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
	if err := ctrl.followService.UnfollowUser(c.Context(), followerID, followingID, tenantID); err != nil {
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
func (ctrl *FollowController) GetFollowers(c *fiber.Ctx) error {
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
	followers, total, err := ctrl.followService.GetFollowers(c.Context(), userID, tenantID, page, limit)
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
func (ctrl *FollowController) GetFollowing(c *fiber.Ctx) error {
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
	following, total, err := ctrl.followService.GetFollowing(c.Context(), userID, tenantID, page, limit)
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
func (ctrl *FollowController) GetFollowStats(c *fiber.Ctx) error {
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
	stats, err := ctrl.followService.GetFollowStats(c.Context(), userID, tenantID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to get follow stats",
		})
	}

	return c.JSON(stats)
}

// CheckIfFollowing handles GET /api/v1/users/:userId/is-following
func (ctrl *FollowController) CheckIfFollowing(c *fiber.Ctx) error {
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
	isFollowing, err := ctrl.followService.IsFollowing(c.Context(), followerID, followingID, tenantID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to check follow status",
		})
	}

	return c.JSON(fiber.Map{
		"is_following": isFollowing,
	})
}
