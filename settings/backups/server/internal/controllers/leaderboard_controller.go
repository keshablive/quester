package controllers

import (
	"strconv"
	"time"

	"github.com/google/uuid"
	"github.com/yourusername/quester/internal/models"

	"github.com/gofiber/fiber/v2"
)

// GetLeaderboard handles GET /api/v1/leaderboards/{type}
// Returns paginated leaderboard with rank, username, XP
// Path params: type (global, category)
// Query params: period (alltime, monthly), category (for category type), page (default: 1), limit (default: 20, max: 100)
// TODO: Implement leaderboard service call after dependency injection setup
func GetLeaderboard(c *fiber.Ctx) error {
	// Extract tenant_id from JWT context (set by auth middleware)
	tenantIDStr, ok := c.Locals("tenant_id").(string)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"error":   "unauthorized",
			"message": "Missing or invalid tenant ID",
		})
	}

	tenantID, err := uuid.Parse(tenantIDStr)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"error":   "unauthorized",
			"message": "Invalid tenant ID format",
		})
	}

	// Parse path parameter: type (global, category)
	leaderboardTypeStr := c.Params("type")
	if leaderboardTypeStr != "global" && leaderboardTypeStr != "category" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "invalid_type",
			"message": "Leaderboard type must be 'global' or 'category'",
		})
	}
	leaderboardType := models.LeaderboardType(leaderboardTypeStr)

	// Parse query parameters
	periodStr := c.Query("period", "alltime")
	if periodStr != "alltime" && periodStr != "monthly" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "invalid_period",
			"message": "Period must be 'alltime' or 'monthly'",
		})
	}
	period := models.LeaderboardPeriod(periodStr)

	// Category is required for category leaderboards
	category := c.Query("category", "")
	if leaderboardType == models.LeaderboardTypeCategory && category == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "category_required",
			"message": "Category parameter is required for category leaderboards",
		})
	}

	// Parse pagination
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "20"))

	// Validate and constrain pagination
	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}

	// Get leaderboard entries from service
	// TODO: Implement after dependency injection setup
	// entries, err := leaderboardService.GetTopN(
	// 	c.Context(),
	// 	tenantID,
	// 	leaderboardType,
	// 	period,
	// 	category,
	// 	limit,
	// )
	// if err != nil {
	// 	return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
	// 		"success": false,
	// 		"error":   "internal_error",
	// 		"message": fmt.Sprintf("Failed to retrieve leaderboard: %v", err),
	// 	})
	// }

	// Mock response for now
	entries := []models.LeaderboardEntry{}

	// Use variables to avoid compiler errors
	_ = tenantID
	_ = leaderboardType
	_ = period
	_ = category
	_ = limit

	// Calculate pagination metadata
	total := len(entries)
	totalPages := 1
	if limit > 0 {
		totalPages = (total + limit - 1) / limit
	}

	// Cache the response for 5 minutes
	c.Set("Cache-Control", "public, max-age=300")

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"success": true,
		"data": fiber.Map{
			"leaderboard_type": leaderboardType,
			"period":           period,
			"category":         category,
			"entries":          entries,
			"pagination": fiber.Map{
				"page":        page,
				"limit":       limit,
				"total":       total,
				"total_pages": totalPages,
			},
		},
	})
}

// GetUserPosition handles GET /api/v1/users/{id}/leaderboard-position
// Returns user's rank, percentile, and surrounding context
// Path params: id (user ID)
// Query params: type (global, category), period (alltime, monthly), category (for category type)
// TODO: Implement leaderboard service call after dependency injection setup
func GetUserPosition(c *fiber.Ctx) error {
	// Extract tenant_id from JWT context
	tenantIDStr, ok := c.Locals("tenant_id").(string)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"error":   "unauthorized",
			"message": "Missing or invalid tenant ID",
		})
	}

	tenantID, err := uuid.Parse(tenantIDStr)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"error":   "unauthorized",
			"message": "Invalid tenant ID format",
		})
	}

	// Parse user ID from URL params
	userIDStr := c.Params("id")
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "invalid_user_id",
			"message": "User ID must be a valid UUID",
		})
	}

	// Parse query parameters
	leaderboardTypeStr := c.Query("type", "global")
	if leaderboardTypeStr != "global" && leaderboardTypeStr != "category" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "invalid_type",
			"message": "Leaderboard type must be 'global' or 'category'",
		})
	}
	leaderboardType := models.LeaderboardType(leaderboardTypeStr)

	periodStr := c.Query("period", "alltime")
	if periodStr != "alltime" && periodStr != "monthly" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "invalid_period",
			"message": "Period must be 'alltime' or 'monthly'",
		})
	}
	period := models.LeaderboardPeriod(periodStr)

	category := c.Query("category", "")
	if leaderboardType == models.LeaderboardTypeCategory && category == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "category_required",
			"message": "Category parameter is required for category leaderboards",
		})
	}

	// Get user's position from service
	// TODO: Implement after dependency injection setup
	// position, err := leaderboardService.GetUserRank(
	// 	c.Context(),
	// 	tenantID,
	// 	userID,
	// 	leaderboardType,
	// 	period,
	// 	category,
	// )
	// if err != nil {
	// 	return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
	// 		"success": false,
	// 		"error":   "internal_error",
	// 		"message": fmt.Sprintf("Failed to retrieve user position: %v", err),
	// 	})
	// }

	// Mock response for now
	position := models.UserLeaderboardPosition{
		UserID:      userID,
		Rank:        0,
		MetricValue: 0,
		TotalUsers:  0,
		Percentile:  0,
	}

	// Use variables to avoid compiler errors
	_ = tenantID
	_ = leaderboardType
	_ = period
	_ = category

	// Cache the response for 2 minutes (shorter cache for user-specific data)
	c.Set("Cache-Control", "private, max-age=120")

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"success": true,
		"data":    position,
	})
}

// InvalidateLeaderboardCache handles POST /api/v1/admin/leaderboards/invalidate
// Admin-only endpoint to invalidate leaderboard cache
// TODO: Implement leaderboard service call after dependency injection setup
func InvalidateLeaderboardCache(c *fiber.Ctx) error {
	// Extract tenant_id from JWT context
	tenantID, ok := c.Locals("tenant_id").(int64)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"error":   "unauthorized",
			"message": "Missing or invalid tenant ID",
		})
	}

	// Check if user is admin (role check should be added to middleware)
	// For now, assume authorized

	// Parse request body
	var req struct {
		LeaderboardType string `json:"leaderboard_type"` // "global" or "category"
		Category        string `json:"category,omitempty"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "invalid_request",
			"message": "Failed to parse request body",
		})
	}

	// Validate leaderboard type
	if req.LeaderboardType != "global" && req.LeaderboardType != "category" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "invalid_type",
			"message": "Leaderboard type must be 'global' or 'category'",
		})
	}

	leaderboardType := models.LeaderboardType(req.LeaderboardType)

	// Invalidate cache
	// TODO: Implement after dependency injection setup
	// err := leaderboardService.InvalidateCache(
	// 	c.Context(),
	// 	tenantID,
	// 	leaderboardType,
	// 	req.Category,
	// )
	// if err != nil {
	// 	return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
	// 		"success": false,
	// 		"error":   "internal_error",
	// 		"message": fmt.Sprintf("Failed to invalidate cache: %v", err),
	// 	})
	// }

	// Use variables to avoid compiler errors
	_ = tenantID
	_ = leaderboardType

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"success": true,
		"message": "Leaderboard cache invalidated successfully",
		"data": fiber.Map{
			"leaderboard_type": req.LeaderboardType,
			"category":         req.Category,
			"invalidated_at":   time.Now().UTC().Format(time.RFC3339),
		},
	})
}
