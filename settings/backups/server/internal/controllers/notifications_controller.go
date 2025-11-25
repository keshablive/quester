package controllers

import (
	"strconv"

	"github.com/gofiber/fiber/v2"

	"github.com/yourusername/quester/internal/models"
	"github.com/yourusername/quester/internal/services"
)

// NotificationsController handles notification-related requests
type NotificationsController struct {
	notificationService *services.NotificationService
	fcmService          *services.FCMService
}

// NewNotificationsController creates a new notifications controller
func NewNotificationsController(
	notificationService *services.NotificationService,
	fcmService *services.FCMService,
) *NotificationsController {
	return &NotificationsController{
		notificationService: notificationService,
		fcmService:          fcmService,
	}
}

// GetNotifications retrieves notifications for a user
func (c *NotificationsController) GetNotifications(ctx *fiber.Ctx) error {
	userID := ctx.Locals("user_id").(string)
	tenantID := ctx.Locals("tenant_id").(string)

	// Parse query params
	unreadOnly := ctx.Query("unread") == "true"
	page, _ := strconv.Atoi(ctx.Query("page", "1"))
	limit, _ := strconv.Atoi(ctx.Query("limit", "20"))

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 50 {
		limit = 20
	}

	notifications, total, err := c.notificationService.GetNotifications(
		ctx.Context(),
		tenantID,
		userID,
		unreadOnly,
		page,
		limit,
	)
	if err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return ctx.JSON(fiber.Map{
		"notifications": notifications,
		"pagination": fiber.Map{
			"page":        page,
			"limit":       limit,
			"total":       total,
			"total_pages": (total + int64(limit) - 1) / int64(limit),
		},
	})
}

// GetNotification retrieves a single notification
func (c *NotificationsController) GetNotification(ctx *fiber.Ctx) error {
	userID := ctx.Locals("user_id").(string)
	tenantID := ctx.Locals("tenant_id").(string)
	notificationID := ctx.Params("notificationId")

	notification, err := c.notificationService.GetNotificationByID(ctx.Context(), notificationID, tenantID, userID)
	if err != nil {
		return ctx.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Notification not found",
		})
	}

	return ctx.JSON(notification)
}

// MarkNotificationAsRead marks a notification as read
func (c *NotificationsController) MarkNotificationAsRead(ctx *fiber.Ctx) error {
	userID := ctx.Locals("user_id").(string)
	tenantID := ctx.Locals("tenant_id").(string)
	notificationID := ctx.Params("notificationId")

	if err := c.notificationService.MarkNotificationAsRead(ctx.Context(), notificationID, tenantID, userID); err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	// Get updated notification
	notification, err := c.notificationService.GetNotificationByID(ctx.Context(), notificationID, tenantID, userID)
	if err != nil {
		return ctx.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Notification not found",
		})
	}

	return ctx.JSON(notification)
}

// MarkAllNotificationsAsRead marks all notifications as read
func (c *NotificationsController) MarkAllNotificationsAsRead(ctx *fiber.Ctx) error {
	userID := ctx.Locals("user_id").(string)
	tenantID := ctx.Locals("tenant_id").(string)

	updatedCount, err := c.notificationService.MarkAllAsRead(ctx.Context(), tenantID, userID)
	if err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return ctx.JSON(fiber.Map{
		"message":       "All notifications marked as read",
		"updated_count": updatedCount,
	})
}

// DeleteNotification deletes a notification
func (c *NotificationsController) DeleteNotification(ctx *fiber.Ctx) error {
	userID := ctx.Locals("user_id").(string)
	tenantID := ctx.Locals("tenant_id").(string)
	notificationID := ctx.Params("notificationId")

	if err := c.notificationService.DeleteNotification(ctx.Context(), notificationID, tenantID, userID); err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return ctx.Status(fiber.StatusNoContent).Send(nil)
}

// GetUnreadCount gets unread notification count
func (c *NotificationsController) GetUnreadCount(ctx *fiber.Ctx) error {
	userID := ctx.Locals("user_id").(string)
	tenantID := ctx.Locals("tenant_id").(string)

	count, err := c.notificationService.GetUnreadCount(ctx.Context(), tenantID, userID)
	if err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return ctx.JSON(fiber.Map{
		"unread_count": count,
	})
}

// GetNotificationSettings retrieves notification settings
func (c *NotificationsController) GetNotificationSettings(ctx *fiber.Ctx) error {
	userID := ctx.Locals("user_id").(string)
	tenantID := ctx.Locals("tenant_id").(string)

	settings, err := c.notificationService.GetNotificationSettings(ctx.Context(), tenantID, userID)
	if err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return ctx.JSON(settings)
}

// UpdateNotificationSettings updates notification settings
func (c *NotificationsController) UpdateNotificationSettings(ctx *fiber.Ctx) error {
	userID := ctx.Locals("user_id").(string)
	tenantID := ctx.Locals("tenant_id").(string)

	type Request struct {
		Channels    map[string]bool    `json:"channels"`
		Preferences map[string]bool    `json:"preferences"`
		QuietHours  *models.QuietHours `json:"quiet_hours"`
	}

	var req Request
	if err := ctx.BodyParser(&req); err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	settings, err := c.notificationService.UpdateNotificationSettings(
		ctx.Context(),
		tenantID,
		userID,
		req.Channels,
		req.Preferences,
		req.QuietHours,
	)
	if err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return ctx.JSON(settings)
}

// RegisterFCMToken registers a Firebase Cloud Messaging token
func (c *NotificationsController) RegisterFCMToken(ctx *fiber.Ctx) error {
	userID := ctx.Locals("user_id").(string)
	tenantID := ctx.Locals("tenant_id").(string)

	type Request struct {
		Token      string `json:"token" validate:"required"`
		DeviceType string `json:"device_type" validate:"required,oneof=ios android web"`
		DeviceID   string `json:"device_id" validate:"required"`
	}

	var req Request
	if err := ctx.BodyParser(&req); err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	fcmToken, err := c.notificationService.RegisterFCMToken(
		ctx.Context(),
		tenantID,
		userID,
		req.Token,
		req.DeviceType,
		req.DeviceID,
	)
	if err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return ctx.Status(fiber.StatusCreated).JSON(fcmToken)
}

// UnregisterFCMToken unregisters a Firebase Cloud Messaging token
func (c *NotificationsController) UnregisterFCMToken(ctx *fiber.Ctx) error {
	type Request struct {
		Token string `json:"token" validate:"required"`
	}

	var req Request
	if err := ctx.BodyParser(&req); err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	if err := c.notificationService.UnregisterFCMToken(ctx.Context(), req.Token); err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return ctx.JSON(fiber.Map{
		"message": "FCM token unregistered successfully",
	})
}

// GetFCMTokens retrieves all FCM tokens for the current user
func (c *NotificationsController) GetFCMTokens(ctx *fiber.Ctx) error {
	userID := ctx.Locals("user_id").(string)
	tenantID := ctx.Locals("tenant_id").(string)

	tokens, err := c.notificationService.GetUserFCMTokens(ctx.Context(), tenantID, userID)
	if err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return ctx.JSON(fiber.Map{
		"tokens": tokens,
		"count":  len(tokens),
	})
}

// SendTestNotification sends a test push notification
func (c *NotificationsController) SendTestNotification(ctx *fiber.Ctx) error {
	userID := ctx.Locals("user_id").(string)
	tenantID := ctx.Locals("tenant_id").(string)

	type Request struct {
		Title string `json:"title" validate:"required"`
		Body  string `json:"body" validate:"required"`
	}

	var req Request
	if err := ctx.BodyParser(&req); err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// Send test notification
	if err := c.fcmService.SendToUser(
		ctx.Context(),
		tenantID,
		userID,
		req.Title,
		req.Body,
		"",
		map[string]string{
			"type": "test",
		},
	); err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return ctx.JSON(fiber.Map{
		"message": "Test notification sent",
	})
}

// GetNotificationStats gets notification statistics
func (c *NotificationsController) GetNotificationStats(ctx *fiber.Ctx) error {
	userID := ctx.Locals("user_id").(string)
	tenantID := ctx.Locals("tenant_id").(string)

	stats, err := c.notificationService.GetNotificationStats(ctx.Context(), tenantID, userID)
	if err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return ctx.JSON(stats)
}
