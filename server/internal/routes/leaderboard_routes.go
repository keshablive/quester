package routes

import (
	"github.com/gofiber/fiber/v2"

	"github.com/keshablive/quester/internal/controllers"
	"github.com/keshablive/quester/internal/framework/middleware"
	"github.com/keshablive/quester/internal/models"
)

// SetupLeaderboardRoutes registers leaderboard routes for global/category rankings and user positions
// T006: Route setup file (013-leaderboard-controller-integration)
// T012: Register GET /api/v1/leaderboards/:type route
// T016: Register GET /api/v1/users/:id/leaderboard-position route
// T022: Register POST /api/v1/admin/leaderboards/invalidate route
func SetupLeaderboardRoutes(
	api fiber.Router,
	leaderboardController *controllers.LeaderboardController,
) {
	// Skip if controller is nil
	if leaderboardController == nil {
		return
	}

	// =========================================================================
	// Public Leaderboard Routes (authenticated users)
	// =========================================================================
	// T012: GET /api/v1/leaderboards/:type - Get leaderboard rankings (US1, US3)
	leaderboards := api.Group("/leaderboards")
	leaderboards.Use(middleware.FiberAuthMiddleware())
	leaderboards.Get("/:type", leaderboardController.GetLeaderboard)

	// =========================================================================
	// User Position Routes (authenticated users)
	// =========================================================================
	// T016: GET /api/v1/users/:id/leaderboard-position - Get user's position (US2)
	users := api.Group("/users")
	users.Use(middleware.FiberAuthMiddleware())
	users.Get("/:id/leaderboard-position", leaderboardController.GetUserPosition)

	// =========================================================================
	// Admin Routes (admin role required)
	// =========================================================================
	// T021: Admin role middleware for cache invalidation
	// T022: POST /api/v1/admin/leaderboards/invalidate - Invalidate cache (US4)
	admin := api.Group("/admin")
	admin.Use(middleware.FiberAuthMiddleware())
	admin.Use(middleware.FiberRoleMiddlewareString(string(models.RoleAdmin)))
	admin.Post("/leaderboards/invalidate", leaderboardController.InvalidateLeaderboardCache)
}
