package routes

import (
	"github.com/gofiber/fiber/v2"
	"github.com/keshablive/quester/internal/framework/controller"
)

// SetupGamificationRoutes sets up gamification routes (Badges, Achievements, Quests)
func SetupGamificationRoutes(app *fiber.App, badgeController *controller.BadgeController, achievementController *controller.AchievementController, questController *controller.QuestController) {
	// Initialize Badge controller (Gamification features)
	badgeController.RegisterRoutes(app) // Registers /api/v1/badges routes

	// Initialize Achievement controller (FR-006: Achievement System)
	achievementController.RegisterRoutes(app) // Registers /api/v1/achievements routes

	// Initialize Quest system (C1: Quest System Implementation)
	questController.RegisterRoutes(app) // Registers /api/v1/quests routes
}
