package controller

import (
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/keshablive/quester/internal/framework/responses"
	"github.com/keshablive/quester/internal/models"
	"github.com/keshablive/quester/internal/framework/service"

	"github.com/gofiber/fiber/v2"
)

// LeaderboardController handles leaderboard-related HTTP endpoints
// T004: Struct-based controller pattern matching QuestController (013-leaderboard-controller-integration)
type LeaderboardController struct {
	leaderboardService *service.LeaderboardService
}

// NewLeaderboardController creates a new LeaderboardController with injected dependencies
// T005: Constructor for DI injection (013-leaderboard-controller-integration)
func NewLeaderboardController(leaderboardService *service.LeaderboardService) *LeaderboardController {
	return &LeaderboardController{
		leaderboardService: leaderboardService,
	}
}

// GetLeaderboard handles GET /api/v1/leaderboards/{type}
// Returns paginated leaderboard with rank, username, XP
// Path params: type (global, category)
// Query params: period (alltime, monthly), category (for category type), page (default: 1), limit (default: 20, max: 100)
// T008: Refactored to method on LeaderboardController struct
// T009: Wired to service.GetTopN() instead of mock response
// T010: Pagination limit enforcement (max 100) per FR-008
// T011: Redis error handling returning 503 per FR-010
func (lc *LeaderboardController) GetLeaderboard(c *fiber.Ctx) error {
	// Check if service is available
	if lc.leaderboardService == nil {
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
			"success":    false,
			"error":      "Leaderboard service not available",
			"code":       fiber.StatusServiceUnavailable,
			"request_id": c.GetRespHeader("X-Request-ID"),
		})
	}

	// Use framework helper for auth context extraction
	auth, err := GetAuthContext(c)
	if err != nil {
		return responses.Unauthorized(c, err.Error())
	}

	// Parse path parameter: type (global, category) - FR-005
	leaderboardTypeStr := c.Params("type")
	if leaderboardTypeStr != "global" && leaderboardTypeStr != "category" {
		return responses.BadRequest(c, "Leaderboard type must be 'global' or 'category'")
	}
	leaderboardType := models.LeaderboardType(leaderboardTypeStr)

	// Parse query parameters - FR-006
	periodStr := c.Query("period", "alltime")
	if periodStr != "alltime" && periodStr != "monthly" {
		return responses.BadRequest(c, "Period must be 'alltime' or 'monthly'")
	}
	period := models.LeaderboardPeriod(periodStr)

	// Category is required for category leaderboards - FR-007 (T017)
	category := c.Query("category", "")
	if leaderboardType == models.LeaderboardTypeCategory && category == "" {
		return responses.BadRequest(c, "Category parameter is required for category leaderboards")
	}

	// Parse pagination using framework helper
	pagination := ParsePagination(c)

	// T010: Enforce pagination limits - FR-008 (default 20, max 100)
	limit := pagination.PageSize
	if limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}

	// T009: Get leaderboard entries from service (wired to GetTopN)
	entries, err := lc.leaderboardService.GetTopN(
		c.Context(),
		auth.TenantID,
		leaderboardType,
		period,
		category,
		limit,
	)
	// T011: Redis error handling - FR-010
	if err != nil {
		// Check if this is a Redis connection error
		if strings.Contains(err.Error(), "Redis") || strings.Contains(err.Error(), "redis") {
			return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
				"success":    false,
				"error":      "Leaderboard service temporarily unavailable",
				"code":       fiber.StatusServiceUnavailable,
				"request_id": c.GetRespHeader("X-Request-ID"),
			})
		}
		return responses.InternalError(c, fmt.Sprintf("Failed to retrieve leaderboard: %v", err))
	}

	// Calculate pagination metadata
	total := len(entries)
	totalPages := 1
	if limit > 0 {
		totalPages = (total + limit - 1) / limit
	}

	// FR-009: Cache the response for 5 minutes (T024)
	c.Set("Cache-Control", "public, max-age=300")

	return responses.Success(c, fiber.Map{
		"leaderboard_type": leaderboardType,
		"period":           period,
		"category":         category,
		"entries":          entries,
		"pagination": fiber.Map{
			"page":        pagination.Page,
			"limit":       limit,
			"total":       total,
			"total_pages": totalPages,
		},
	})
}

// GetUserPosition handles GET /api/v1/users/{id}/leaderboard-position
// Returns user's rank, percentile, and surrounding context
// Path params: id (user ID)
// Query params: type (global, category), period (alltime, monthly), category (for category type)
// T013: Refactored to method on LeaderboardController struct
// T014: Wired to service.GetUserRank() instead of mock response
// T015: Redis error handling returning 503 per FR-010
func (lc *LeaderboardController) GetUserPosition(c *fiber.Ctx) error {
	// Check if service is available
	if lc.leaderboardService == nil {
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
			"success":    false,
			"error":      "Leaderboard service not available",
			"code":       fiber.StatusServiceUnavailable,
			"request_id": c.GetRespHeader("X-Request-ID"),
		})
	}

	// Use framework helper for auth context extraction
	auth, err := GetAuthContext(c)
	if err != nil {
		return responses.Unauthorized(c, err.Error())
	}

	// Parse user ID from URL params
	userIDStr := c.Params("id")
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return responses.BadRequest(c, "User ID must be a valid UUID")
	}

	// Parse query parameters - FR-005, FR-006
	leaderboardTypeStr := c.Query("type", "global")
	if leaderboardTypeStr != "global" && leaderboardTypeStr != "category" {
		return responses.BadRequest(c, "Leaderboard type must be 'global' or 'category'")
	}
	leaderboardType := models.LeaderboardType(leaderboardTypeStr)

	periodStr := c.Query("period", "alltime")
	if periodStr != "alltime" && periodStr != "monthly" {
		return responses.BadRequest(c, "Period must be 'alltime' or 'monthly'")
	}
	period := models.LeaderboardPeriod(periodStr)

	// FR-007: Category required for category leaderboards
	category := c.Query("category", "")
	if leaderboardType == models.LeaderboardTypeCategory && category == "" {
		return responses.BadRequest(c, "Category parameter is required for category leaderboards")
	}

	// T014: Get user's position from service (wired to GetUserRank)
	position, err := lc.leaderboardService.GetUserRank(
		c.Context(),
		auth.TenantID,
		userID,
		leaderboardType,
		period,
		category,
	)
	// T015: Redis error handling - FR-010
	if err != nil {
		// Check if this is a Redis connection error
		if strings.Contains(err.Error(), "Redis") || strings.Contains(err.Error(), "redis") {
			return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
				"success":    false,
				"error":      "Leaderboard service temporarily unavailable",
				"code":       fiber.StatusServiceUnavailable,
				"request_id": c.GetRespHeader("X-Request-ID"),
			})
		}
		return responses.InternalError(c, fmt.Sprintf("Failed to retrieve user position: %v", err))
	}

	// FR-009: Cache the response for 2 minutes (shorter cache for user-specific data) (T024)
	c.Set("Cache-Control", "private, max-age=120")

	return responses.Success(c, position)
}

// InvalidateLeaderboardCache handles POST /api/v1/admin/leaderboards/invalidate
// Admin-only endpoint to invalidate leaderboard cache
// T019: Refactored to method on LeaderboardController struct
// T020: Wired to service.InvalidateCache() instead of mock response
// T021: Admin role middleware check handled in route setup
func (lc *LeaderboardController) InvalidateLeaderboardCache(c *fiber.Ctx) error {
	// Check if service is available
	if lc.leaderboardService == nil {
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
			"success":    false,
			"error":      "Leaderboard service not available",
			"code":       fiber.StatusServiceUnavailable,
			"request_id": c.GetRespHeader("X-Request-ID"),
		})
	}

	// Use framework helper for auth context extraction
	auth, err := GetAuthContext(c)
	if err != nil {
		return responses.Unauthorized(c, err.Error())
	}

	// Note: Admin role check is handled by middleware in route setup (T021)

	// Parse request body
	var req struct {
		LeaderboardType string `json:"leaderboard_type"` // "global" or "category"
		Category        string `json:"category,omitempty"`
	}

	if err := c.BodyParser(&req); err != nil {
		return responses.BadRequest(c, "Failed to parse request body")
	}

	// Validate leaderboard type - FR-005
	if req.LeaderboardType != "global" && req.LeaderboardType != "category" {
		return responses.BadRequest(c, "Leaderboard type must be 'global' or 'category'")
	}

	leaderboardType := models.LeaderboardType(req.LeaderboardType)

	// T020: Invalidate cache via service (wired to InvalidateCache)
	err = lc.leaderboardService.InvalidateCache(
		c.Context(),
		auth.TenantID,
		leaderboardType,
		req.Category,
	)
	if err != nil {
		// Check if this is a Redis connection error
		if strings.Contains(err.Error(), "Redis") || strings.Contains(err.Error(), "redis") {
			return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
				"success":    false,
				"error":      "Cache service temporarily unavailable",
				"code":       fiber.StatusServiceUnavailable,
				"request_id": c.GetRespHeader("X-Request-ID"),
			})
		}
		return responses.InternalError(c, fmt.Sprintf("Failed to invalidate cache: %v", err))
	}

	return responses.Success(c, fiber.Map{
		"message":          "Leaderboard cache invalidated successfully",
		"leaderboard_type": req.LeaderboardType,
		"category":         req.Category,
		"invalidated_at":   time.Now().UTC().Format(time.RFC3339),
	})
}
