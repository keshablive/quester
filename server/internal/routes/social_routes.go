package routes

import (
	"time"

	"github.com/gofiber/fiber/v2"

	"github.com/keshablive/quester/internal/framework/controller"
	"github.com/keshablive/quester/internal/framework/middleware"
)

// SetupSocialRoutes registers social feature routes (posts, likes, comments, follows)
func SetupSocialRoutes(
	api fiber.Router,
	socialCtrl *controller.SocialController,
) {
	// Post routes
	posts := api.Group("/posts")

	// Public routes (no auth required)
	posts.Get("/:postId", socialCtrl.GetPost)
	posts.Get("/search", socialCtrl.SearchPosts)

	// Protected routes (auth required)
	posts.Use(middleware.FiberAuthMiddleware())
	posts.Post("/", middleware.FiberRateLimitByIP(30, 1*time.Minute), socialCtrl.CreatePost) // 30 posts per minute
	posts.Put("/:postId", socialCtrl.UpdatePost)
	posts.Delete("/:postId", socialCtrl.DeletePost)

	// Like routes (auth required)
	posts.Post("/:postId/like", middleware.FiberRateLimitByIP(60, 1*time.Minute), socialCtrl.LikePost) // 60 likes per minute
	posts.Delete("/:postId/like", socialCtrl.UnlikePost)
	posts.Get("/:postId/likes", socialCtrl.GetPostLikes)
	posts.Get("/:postId/is-liked", socialCtrl.CheckIfLiked)

	// Share routes (auth required)
	posts.Post("/:postId/share", middleware.FiberRateLimitByIP(30, 1*time.Minute), socialCtrl.SharePost) // 30 shares per minute

	// Comment routes (auth required)
	posts.Post("/:postId/comments", middleware.FiberRateLimitByIP(60, 1*time.Minute), socialCtrl.AddComment) // 60 comments per minute
	posts.Get("/:postId/comments", socialCtrl.GetPostComments)

	// Comment management routes
	comments := api.Group("/comments")
	comments.Use(middleware.FiberAuthMiddleware())
	comments.Put("/:commentId", socialCtrl.UpdateComment)
	comments.Delete("/:commentId", socialCtrl.DeleteComment)
	comments.Get("/:commentId/replies", socialCtrl.GetCommentReplies)

	// Feed routes (auth required)
	feed := api.Group("/feed")
	feed.Use(middleware.FiberAuthMiddleware())
	feed.Get("/", socialCtrl.GetFeed) // ?type=following or ?type=public

	// User posts (auth required)
	users := api.Group("/users")
	users.Use(middleware.FiberAuthMiddleware())
	users.Get("/:userId/posts", socialCtrl.GetUserPosts)

	// Follow routes (auth required)
	users.Post("/:userId/follow", socialCtrl.FollowUser)
	users.Delete("/:userId/follow", socialCtrl.UnfollowUser)
	users.Get("/:userId/followers", socialCtrl.GetFollowers)
	users.Get("/:userId/following", socialCtrl.GetFollowing)
	users.Get("/:userId/follow-stats", socialCtrl.GetFollowStats)
	users.Get("/:userId/is-following", socialCtrl.CheckIfFollowing)
}
