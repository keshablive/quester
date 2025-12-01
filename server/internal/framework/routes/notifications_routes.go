package routes

import (
	"time"

	"github.com/gofiber/fiber/v2"

	"github.com/keshablive/quester/internal/framework/controller"
	"github.com/keshablive/quester/internal/framework/middleware"
)

// SetupNotificationsRoutes sets up notifications routes
func SetupNotificationsRoutes(app *fiber.App, notificationsController *controller.NotificationsController) {
	notifications := app.Group("/api/v1/notifications")
	notifications.Use(middleware.FiberAuthMiddleware())

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
	notifications.Post("/fcm/register", middleware.FiberRateLimitByIP(100, 1*time.Minute), notificationsController.RegisterFCMToken)
	notifications.Post("/fcm/unregister", notificationsController.UnregisterFCMToken)
	notifications.Get("/fcm/tokens", notificationsController.GetFCMTokens)

	// Test notification (for development)
	notifications.Post("/test", middleware.FiberRateLimitByIP(100, 1*time.Minute), notificationsController.SendTestNotification)
}
