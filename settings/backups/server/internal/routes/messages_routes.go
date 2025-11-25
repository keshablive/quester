package routes

import (
	"github.com/gofiber/fiber/v2"

	"github.com/yourusername/quester/internal/controllers"
	"github.com/yourusername/quester/internal/framework/middleware"
)

// SetupMessagesRoutes sets up messages routes
func SetupMessagesRoutes(app *fiber.App, messagesController *controllers.MessagesController, groupsController *controllers.GroupsController) {
	messages := app.Group("/api/v1/messages")
	messages.Use(middleware.Auth())

	// Direct messages
	messages.Post("/direct", middleware.RateLimiter(), messagesController.SendDirectMessage)
	messages.Get("/users/:userId", messagesController.GetDirectMessages)

	// Group messages
	messages.Post("/groups/:groupId", middleware.RateLimiter(), messagesController.SendGroupMessage)
	messages.Get("/groups/:groupId", messagesController.GetGroupMessages)

	// Message operations
	messages.Get("/threads", messagesController.GetMessageThreads)
	messages.Get("/search", messagesController.SearchMessages)
	messages.Get("/stats", messagesController.GetMessageStats)
	messages.Get("/unread/count", messagesController.GetUnreadCount)
	messages.Get("/:messageId", messagesController.GetMessage)

	// Mark as read
	messages.Post("/:messageId/read", messagesController.MarkMessageAsRead)
	messages.Post("/read", messagesController.MarkMultipleAsRead)

	// Delete message
	messages.Delete("/:messageId", messagesController.DeleteMessage)

	// Typing indicator
	messages.Post("/typing", middleware.RateLimiter(), messagesController.SetTypingIndicator)

	// Group management routes
	groups := app.Group("/api/v1/groups")
	groups.Use(middleware.Auth())

	// Group CRUD
	groups.Post("/", middleware.RateLimiter(), groupsController.CreateGroup)
	groups.Get("/", groupsController.GetUserGroups)
	groups.Get("/:groupId", groupsController.GetGroup)

	// Group members
	groups.Post("/:groupId/members", middleware.RateLimiter(), groupsController.AddGroupMember)
	groups.Get("/:groupId/members", groupsController.GetGroupMembers)
	groups.Delete("/:groupId/members/:userId", groupsController.RemoveGroupMember)
	groups.Put("/:groupId/members/:userId/role", groupsController.UpdateGroupMemberRole)
	groups.Post("/:groupId/leave", groupsController.LeaveGroup)
}
