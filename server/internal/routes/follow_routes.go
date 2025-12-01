package routes

import (
	"github.com/gofiber/fiber/v2"

	"github.com/keshablive/quester/internal/controllers"
	"github.com/keshablive/quester/internal/framework/middleware"
)

// SetupFollowRoutes registers follow-related routes
func SetupFollowRoutes(api fiber.Router, followCtrl *controllers.FollowController) {
	// Follow routes - all require authentication
	follow := api.Group("/users/:userId")
	follow.Use(middleware.Auth())

	// Follow/Unfollow
	follow.Post("/follow", followCtrl.FollowUser)
	follow.Delete("/follow", followCtrl.UnfollowUser)

	// Get followers and following
	follow.Get("/followers", followCtrl.GetFollowers)
	follow.Get("/following", followCtrl.GetFollowing)

	// Follow stats
	follow.Get("/follow-stats", followCtrl.GetFollowStats)

	// Check if following
	follow.Get("/is-following", followCtrl.CheckIfFollowing)
}
