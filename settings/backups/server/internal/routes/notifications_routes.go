package routes

import (
	"github.com/gofiber/fiber/v2"

	"github.com/yourusername/quester/internal/controllers"
	"github.com/yourusername/quester/internal/framework/middleware"
)

// SetupNotificationsRoutes sets up notifications routes
func SetupNotificationsRoutes(app *fiber.App, notificationsController *controllers.NotificationsController) {
	notifications := app.Group("/api/v1/notifications")
	notifications.Use(middleware.Auth())

	// Notifications CRUD
	notifications.Get("/", notificationsController.GetNotifications)
	notifications.Get("/unread/count", notificationsController.GetUnreadCount)
	notifications.Get("/stats", notificationsController.GetNotificationStats)
	notifications.Get("/:notificationId", notificationsController.GetNotification)

	// Mark as read
	notifications.Post("/:notificationId/read", notificationsController.MarkNotificationAsRead)
	notifications.Post("/read-all", notificationsController.MarkAllNotificationsAsRead)

	// Delete notification
	notifications.Delete("/:notificationId", notificationsController.DeleteNotification)

	// Notification settings
	notifications.Get("/settings", notificationsController.GetNotificationSettings)
	notifications.Put("/settings", notificationsController.UpdateNotificationSettings)

	// FCM token management
	notifications.Post("/fcm/register", middleware.RateLimiter(), notificationsController.RegisterFCMToken)
	notifications.Post("/fcm/unregister", notificationsController.UnregisterFCMToken)
	notifications.Get("/fcm/tokens", notificationsController.GetFCMTokens)

	// Test notification (for development)
	notifications.Post("/test", middleware.RateLimiter(), notificationsController.SendTestNotification)
}
