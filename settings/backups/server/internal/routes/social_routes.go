package routes

import (
	"github.com/gofiber/fiber/v2"

	"github.com/yourusername/quester/internal/controllers"
	"github.com/yourusername/quester/internal/framework/middleware"
)

// SetupSocialRoutes registers social feature routes (posts, likes, comments)
func SetupSocialRoutes(
	api fiber.Router,
	postCtrl *controllers.PostController,
	commentCtrl *controllers.CommentController,
	likeCtrl *controllers.LikeController,
) {
	// Post routes
	posts := api.Group("/posts")

	// Public routes (no auth required)
	posts.Get("/:postId", postCtrl.GetPost)
	posts.Get("/search", postCtrl.SearchPosts)

	// Protected routes (auth required)
	posts.Use(middleware.Auth())
	posts.Post("/", middleware.RateLimit(30), postCtrl.CreatePost) // 30 posts per minute
	posts.Put("/:postId", postCtrl.UpdatePost)
	posts.Delete("/:postId", postCtrl.DeletePost)

	// Like routes (auth required)
	posts.Post("/:postId/like", middleware.RateLimit(60), likeCtrl.LikePost) // 60 likes per minute
	posts.Delete("/:postId/like", likeCtrl.UnlikePost)
	posts.Get("/:postId/likes", likeCtrl.GetPostLikes)
	posts.Get("/:postId/is-liked", likeCtrl.CheckIfLiked)

	// Share routes (auth required)
	posts.Post("/:postId/share", middleware.RateLimit(30), likeCtrl.SharePost) // 30 shares per minute

	// Comment routes (auth required)
	posts.Post("/:postId/comments", middleware.RateLimit(60), commentCtrl.AddComment) // 60 comments per minute
	posts.Get("/:postId/comments", commentCtrl.GetPostComments)

	// Comment management routes
	comments := api.Group("/comments")
	comments.Use(middleware.Auth())
	comments.Put("/:commentId", commentCtrl.UpdateComment)
	comments.Delete("/:commentId", commentCtrl.DeleteComment)
	comments.Get("/:commentId/replies", commentCtrl.GetCommentReplies)

	// Feed routes (auth required)
	feed := api.Group("/feed")
	feed.Use(middleware.Auth())
	feed.Get("/", postCtrl.GetFeed) // ?type=following or ?type=public

	// User posts (auth required)
	users := api.Group("/users")
	users.Use(middleware.Auth())
	users.Get("/:userId/posts", postCtrl.GetUserPosts)
}
