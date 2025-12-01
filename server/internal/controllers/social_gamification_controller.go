package controllers

import (
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	"github.com/keshablive/quester/internal/models"
	"github.com/keshablive/quester/internal/framework/service"
)

// SocialGamificationController handles social gamification HTTP requests
// Implements FR-003 for XP viewing and feedback endpoints
type SocialGamificationController struct {
	gamifService       *service.SocialGamificationService
	leaderboardService *service.LeaderboardService // T057: For social leaderboard endpoint
}

// NewSocialGamificationController creates a new social gamification controller
func NewSocialGamificationController(gamifService *service.SocialGamificationService) *SocialGamificationController {
	return &SocialGamificationController{
		gamifService: gamifService,
	}
}

// SetLeaderboardService sets the leaderboard service for social leaderboard endpoints (T057)
func (ctrl *SocialGamificationController) SetLeaderboardService(ls *service.LeaderboardService) {
	ctrl.leaderboardService = ls
}

// GetSocialXP handles GET /api/v1/social/xp
// Returns user's social XP summary including total, today's, weekly, and breakdown by action
func (ctrl *SocialGamificationController) GetSocialXP(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uuid.UUID)
	tenantID := c.Locals("tenant_id").(uuid.UUID)

	summary, err := ctrl.gamifService.GetXPSummary(c.Context(), tenantID, userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to get XP summary",
		})
	}

	return c.JSON(fiber.Map{
		"xp": summary,
	})
}

// GetSocialStats handles GET /api/v1/social/stats
// Returns user's social activity statistics
func (ctrl *SocialGamificationController) GetSocialStats(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uuid.UUID)
	tenantID := c.Locals("tenant_id").(uuid.UUID)

	stats, err := ctrl.gamifService.GetUserSocialStats(c.Context(), tenantID, userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to get social stats",
		})
	}

	return c.JSON(fiber.Map{
		"stats": stats,
	})
}

// GetXPHistory handles GET /api/v1/social/xp/history
// Returns paginated XP transaction history
func (ctrl *SocialGamificationController) GetXPHistory(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uuid.UUID)
	tenantID := c.Locals("tenant_id").(uuid.UUID)

	// Parse limit from query params
	limit := 20
	if limitStr := c.Query("limit"); limitStr != "" {
		if parsedLimit, err := strconv.Atoi(limitStr); err == nil && parsedLimit > 0 && parsedLimit <= 100 {
			limit = parsedLimit
		}
	}

	history, err := ctrl.gamifService.GetUserXPHistory(c.Context(), tenantID, userID, limit)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to get XP history",
		})
	}

	return c.JSON(fiber.Map{
		"history": history,
		"limit":   limit,
	})
}

// GetDailyChallenges handles GET /api/v1/social/challenges
// Returns today's daily challenges with user progress
func (ctrl *SocialGamificationController) GetDailyChallenges(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uuid.UUID)
	tenantID := c.Locals("tenant_id").(uuid.UUID)

	challenges, err := ctrl.gamifService.GetUserDailyChallenges(c.Context(), tenantID, userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to get daily challenges",
		})
	}

	return c.JSON(fiber.Map{
		"challenges": challenges,
	})
}

// GetUserSocialXP handles GET /api/v1/users/:userId/social/xp
// Returns another user's public social XP stats (for leaderboard/profile)
func (ctrl *SocialGamificationController) GetUserSocialXP(c *fiber.Ctx) error {
	tenantID := c.Locals("tenant_id").(uuid.UUID)

	// Parse target user ID
	userIDStr := c.Params("userId")
	targetUserID, err := uuid.Parse(userIDStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid user ID",
		})
	}

	stats, err := ctrl.gamifService.GetUserSocialStats(c.Context(), tenantID, targetUserID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "User not found",
		})
	}

	// Return only public stats
	return c.JSON(fiber.Map{
		"user_id":         targetUserID,
		"total_xp":        stats.TotalSocialXP,
		"posts_count":     stats.PostsCount,
		"likes_given":     stats.LikesGivenCount,
		"likes_received":  stats.LikesReceivedCount,
		"comments_count":  stats.CommentsCount,
		"following_count": stats.FollowingCount,
		"followers_count": stats.FollowersCount,
		"shares_count":    stats.SharesCount,
	})
}

// GetMySocialAchievements handles GET /api/v1/social/achievements
// T049: Returns current user's social achievements with progress
func (ctrl *SocialGamificationController) GetMySocialAchievements(c *fiber.Ctx) error {
	tenantID := c.Locals("tenant_id").(uuid.UUID)
	userID := c.Locals("user_id").(uuid.UUID)

	achievements, err := ctrl.gamifService.GetUserSocialAchievements(c.Context(), tenantID, userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to get achievements",
		})
	}

	// Transform to response format
	var response []fiber.Map
	for _, ua := range achievements {
		item := fiber.Map{
			"id":            ua.AchievementID,
			"name":          ua.Achievement.Name,
			"description":   ua.Achievement.Description,
			"icon_url":      ua.Achievement.IconURL,
			"category":      ua.Achievement.Category,
			"difficulty":    ua.Achievement.Difficulty,
			"target_count":  ua.Achievement.TargetCount,
			"current_count": ua.CurrentCount,
			"completed":     ua.Completed,
			"xp_reward":     ua.Achievement.XPReward,
		}
		if ua.Completed && ua.CompletedAt != nil {
			item["completed_at"] = ua.CompletedAt
		}
		response = append(response, item)
	}

	return c.JSON(fiber.Map{
		"achievements": response,
		"total":        len(response),
	})
}

// GetUserSocialAchievements handles GET /api/v1/users/:userId/social/achievements
// Returns another user's completed social achievements (for profile)
func (ctrl *SocialGamificationController) GetUserSocialAchievements(c *fiber.Ctx) error {
	tenantID := c.Locals("tenant_id").(uuid.UUID)

	// Parse target user ID
	userIDStr := c.Params("userId")
	targetUserID, err := uuid.Parse(userIDStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid user ID",
		})
	}

	achievements, err := ctrl.gamifService.GetUserSocialAchievements(c.Context(), tenantID, targetUserID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to get achievements",
		})
	}

	// Return only completed achievements for other users
	var response []fiber.Map
	for _, ua := range achievements {
		if !ua.Completed {
			continue // Skip incomplete achievements for other users
		}
		response = append(response, fiber.Map{
			"id":           ua.AchievementID,
			"name":         ua.Achievement.Name,
			"description":  ua.Achievement.Description,
			"icon_url":     ua.Achievement.IconURL,
			"difficulty":   ua.Achievement.Difficulty,
			"completed_at": ua.CompletedAt,
		})
	}

	return c.JSON(fiber.Map{
		"user_id":      targetUserID,
		"achievements": response,
		"total":        len(response),
	})
}

// GetSocialLeaderboard handles GET /api/v1/leaderboards/social
// T057: Returns top users by social XP with optional period filter
func (ctrl *SocialGamificationController) GetSocialLeaderboard(c *fiber.Ctx) error {
	tenantID := c.Locals("tenant_id").(uuid.UUID)
	userID := c.Locals("user_id").(uuid.UUID)

	if ctrl.leaderboardService == nil {
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
			"error": "Leaderboard service not available",
		})
	}

	// Parse period from query params (default: alltime)
	periodStr := c.Query("period", "alltime")
	period := models.LeaderboardPeriodAllTime
	if periodStr == "monthly" {
		period = models.LeaderboardPeriodMonthly
	}

	// Parse limit from query params
	limit := 20
	if limitStr := c.Query("limit"); limitStr != "" {
		if parsedLimit, err := strconv.Atoi(limitStr); err == nil && parsedLimit > 0 && parsedLimit <= 100 {
			limit = parsedLimit
		}
	}

	// Get top entries
	entries, err := ctrl.leaderboardService.GetSocialLeaderboard(c.Context(), tenantID, period, limit)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to get leaderboard",
		})
	}

	// Get current user's position
	userPosition, err := ctrl.leaderboardService.GetUserSocialRank(c.Context(), tenantID, userID, period)
	if err != nil {
		// Non-fatal error, user might not be in leaderboard
		userPosition = nil
	}

	// Transform entries to response format
	var leaderboardEntries []fiber.Map
	for _, entry := range entries {
		leaderboardEntries = append(leaderboardEntries, fiber.Map{
			"rank":       entry.Rank,
			"user_id":    entry.UserID,
			"username":   entry.Username,
			"avatar_url": entry.Avatar,
			"social_xp":  entry.MetricValue,
		})
	}

	response := fiber.Map{
		"entries": leaderboardEntries,
		"period":  periodStr,
		"limit":   limit,
	}

	if userPosition != nil {
		response["user_position"] = fiber.Map{
			"rank":       userPosition.Rank,
			"social_xp":  userPosition.MetricValue,
			"percentile": userPosition.Percentile,
		}
	}

	// Cache for 5 minutes
	c.Set("Cache-Control", "public, max-age=300")

	return c.JSON(response)
}
