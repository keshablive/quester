package routes

import (
	"github.com/gofiber/fiber/v2"

	"github.com/keshablive/quester/internal/framework/controller"
	"github.com/keshablive/quester/internal/framework/middleware"
)

// SetupLearningGamificationRoutes registers learning gamification routes (T033)
// Implements 006-course-gamification XP, progress, streaks, challenges, and levels
func SetupLearningGamificationRoutes(
	api fiber.Router,
	gamifCtrl *controller.LearningGamificationController,
) {
	// Learning gamification routes (all require auth)
	learning := api.Group("/learning")
	learning.Use(middleware.FiberAuthMiddleware())

	// XP endpoints (US1)
	learning.Get("/xp/summary", gamifCtrl.GetXPSummary)           // Get user's learning XP summary
	learning.Get("/xp/transactions", gamifCtrl.GetXPTransactions) // Get XP transaction history

	// Course progress with XP (US2)
	learning.Get("/courses/:courseId/progress", gamifCtrl.GetCourseProgress) // Get course-specific XP and progress

	// Streak endpoints (US5)
	learning.Get("/streak", gamifCtrl.GetStreak) // Get current streak info

	// Level endpoints
	learning.Get("/level", gamifCtrl.GetCurrentLevel) // Get current level with progress
	learning.Get("/levels", gamifCtrl.GetAllLevels)   // Get all level definitions

	// Achievement endpoints (US3 - T053)
	learning.Get("/achievements", gamifCtrl.GetLearningAchievements) // Get learning achievements with progress

	// Daily challenge endpoints (US6)
	challenges := learning.Group("/challenges")
	challenges.Get("/daily", gamifCtrl.GetDailyChallenges) // Get today's challenges with progress

	// Learning leaderboard (US4)
	// Mount under /leaderboards to follow existing pattern
	leaderboards := api.Group("/leaderboards")
	leaderboards.Use(middleware.FiberAuthMiddleware())
	leaderboards.Get("/learning", gamifCtrl.GetLeaderboard)                        // Get learning XP leaderboard (T062)
	leaderboards.Get("/learning/course/:courseId", gamifCtrl.GetCourseLeaderboard) // Get course-specific leaderboard (T062)

	// Admin/Instructor routes for badge management (US6 - T083)
	// Note: Role check is done within the handler since we need to verify course ownership
	admin := learning.Group("/admin")
	admin.Post("/badges/award", gamifCtrl.AwardInstructorBadge) // Award badge to student
}
