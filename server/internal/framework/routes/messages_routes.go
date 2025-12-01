package routes

import (
	"time"

	"github.com/gofiber/fiber/v2"

	"github.com/keshablive/quester/internal/framework/controller"
	"github.com/keshablive/quester/internal/framework/middleware"
)

// SetupMessagesRoutes sets up messages routes
func SetupMessagesRoutes(app *fiber.App, messagesController *controller.MessagesController, groupsController *controller.GroupsController) {
	messages := app.Group("/api/v1/messages")
	messages.Use(middleware.FiberAuthMiddleware())

	// Direct messages
	messages.Post("/direct", middleware.FiberRateLimitByIP(100, 1*time.Minute), messagesController.SendDirectMessage)
	messages.Get("/users/:userId", messagesController.GetDirectMessages)

	// Group messages
	messages.Post("/groups/:groupId", middleware.FiberRateLimitByIP(100, 1*time.Minute), messagesController.SendGroupMessage)
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
	messages.Post("/typing", middleware.FiberRateLimitByIP(100, 1*time.Minute), messagesController.SetTypingIndicator)

	// Group management routes
	groups := app.Group("/api/v1/groups")
	groups.Use(middleware.FiberAuthMiddleware())

	// Group CRUD
	groups.Post("/", middleware.FiberRateLimitByIP(100, 1*time.Minute), groupsController.CreateGroup)
	groups.Get("/", groupsController.GetUserGroups)
	groups.Get("/:groupId", groupsController.GetGroup)

	// Group members
	groups.Post("/:groupId/members", middleware.FiberRateLimitByIP(100, 1*time.Minute), groupsController.AddGroupMember)
	groups.Get("/:groupId/members", groupsController.GetGroupMembers)
	groups.Delete("/:groupId/members/:userId", groupsController.RemoveGroupMember)
	groups.Put("/:groupId/members/:userId/role", groupsController.UpdateGroupMemberRole)
	groups.Post("/:groupId/leave", groupsController.LeaveGroup)
}
