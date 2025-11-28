package routes

import (
	"github.com/gofiber/fiber/v2"

	"github.com/keshablive/quester/internal/controllers"
	"github.com/keshablive/quester/internal/framework/middleware"
)

// SetupSocialGamificationRoutes registers social gamification routes (XP, challenges, stats)
// Implements FR-003 for XP feedback endpoints (005-social-feed-gamification T028)
func SetupSocialGamificationRoutes(
	api fiber.Router,
	gamifCtrl *controllers.SocialGamificationController,
) {
	// Social gamification routes (all require auth)
	social := api.Group("/social")
	social.Use(middleware.FiberAuthMiddleware())

	// XP endpoints
	social.Get("/xp", gamifCtrl.GetSocialXP)          // Get user's XP summary
	social.Get("/xp/history", gamifCtrl.GetXPHistory) // Get XP transaction history
	social.Get("/stats", gamifCtrl.GetSocialStats)    // Get user's social stats

	// Daily challenge endpoints (FR-005, FR-006)
	social.Get("/challenges", gamifCtrl.GetDailyChallenges) // Get today's challenges with progress

	// Achievement endpoints (T049: US3)
	social.Get("/achievements", gamifCtrl.GetMySocialAchievements) // Get user's social achievements

	// T058: Social leaderboard endpoint
	leaderboards := api.Group("/leaderboards")
	leaderboards.Use(middleware.FiberAuthMiddleware())
	leaderboards.Get("/social", gamifCtrl.GetSocialLeaderboard) // Get social XP leaderboard

	// User XP endpoints (public stats for profiles)
	users := api.Group("/users")
	users.Use(middleware.FiberAuthMiddleware())
	users.Get("/:userId/social/xp", gamifCtrl.GetUserSocialXP)                     // Get another user's public XP stats
	users.Get("/:userId/social/achievements", gamifCtrl.GetUserSocialAchievements) // Get another user's achievements
}
