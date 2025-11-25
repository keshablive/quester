package controllers

import (
	"github.com/gofiber/fiber/v2"

	"github.com/yourusername/quester/internal/framework/websocket"
	"github.com/yourusername/quester/internal/services"
)

// WebSocketController handles WebSocket connections
type WebSocketController struct {
	wsHandler           *websocket.Handler
	redisManager        *websocket.RedisManager
	typingIndicator     *websocket.TypingIndicator
	messagingService    *services.MessagingService
	notificationService *services.NotificationService
}

// NewWebSocketController creates a new WebSocket controller
func NewWebSocketController(
	wsHandler *websocket.Handler,
	redisManager *websocket.RedisManager,
	typingIndicator *websocket.TypingIndicator,
	messagingService *services.MessagingService,
	notificationService *services.NotificationService,
) *WebSocketController {
	return &WebSocketController{
		wsHandler:           wsHandler,
		redisManager:        redisManager,
		typingIndicator:     typingIndicator,
		messagingService:    messagingService,
		notificationService: notificationService,
	}
}

// HandleConnection handles WebSocket connection upgrades
func (c *WebSocketController) HandleConnection() fiber.Handler {
	return c.wsHandler.Upgrade()
}

// GetConnectionStats returns WebSocket connection statistics
func (c *WebSocketController) GetConnectionStats(ctx *fiber.Ctx) error {
	// Extract user info from context (set by auth middleware)
	userID := ctx.Locals("user_id").(string)
	tenantID := ctx.Locals("tenant_id").(string)

	// Get connection count
	totalConnections := c.wsHandler.GetConnectionCount()
	userConnections := c.wsHandler.GetUserConnections(userID, tenantID)
	isOnline := c.wsHandler.IsUserOnline(userID, tenantID)

	// Get active subscriptions
	activeSubscriptions := c.redisManager.GetActiveSubscriptions()

	return ctx.JSON(fiber.Map{
		"total_connections":    totalConnections,
		"user_connections":     len(userConnections),
		"is_online":            isOnline,
		"active_subscriptions": activeSubscriptions,
		"subscription_count":   len(activeSubscriptions),
	})
}

// SendTestNotification sends a test notification via WebSocket
func (c *WebSocketController) SendTestNotification(ctx *fiber.Ctx) error {
	userID := ctx.Locals("user_id").(string)
	tenantID := ctx.Locals("tenant_id").(string)

	type Request struct {
		Title   string                 `json:"title" validate:"required"`
		Message string                 `json:"message" validate:"required"`
		Data    map[string]interface{} `json:"data"`
	}

	var req Request
	if err := ctx.BodyParser(&req); err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// Send notification via WebSocket
	notification := map[string]interface{}{
		"title":   req.Title,
		"message": req.Message,
		"data":    req.Data,
	}

	c.wsHandler.SendNotification(userID, tenantID, notification)

	return ctx.JSON(fiber.Map{
		"message": "Test notification sent",
	})
}

// CheckUserOnlineStatus checks if a user is online
func (c *WebSocketController) CheckUserOnlineStatus(ctx *fiber.Ctx) error {
	tenantID := ctx.Locals("tenant_id").(string)
	targetUserID := ctx.Params("userId")

	if targetUserID == "" {
		return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "User ID is required",
		})
	}

	isOnline := c.wsHandler.IsUserOnline(targetUserID, tenantID)
	connections := c.wsHandler.GetUserConnections(targetUserID, tenantID)

	return ctx.JSON(fiber.Map{
		"user_id":          targetUserID,
		"is_online":        isOnline,
		"connection_count": len(connections),
	})
}

// GetTypingStatus gets typing status for a chat
func (c *WebSocketController) GetTypingStatus(ctx *fiber.Ctx) error {
	tenantID := ctx.Locals("tenant_id").(string)
	recipientID := ctx.Query("recipient_id")
	groupID := ctx.Query("group_id")

	if recipientID == "" && groupID == "" {
		return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Either recipient_id or group_id is required",
		})
	}

	var typingUsers []string
	var err error

	if groupID != "" {
		// Group chat typing status
		typingUsers, err = c.typingIndicator.GetGroupTypingUsers(groupID, tenantID)
	} else {
		// Direct chat typing status
		userID := ctx.Locals("user_id").(string)
		chatID := getChatID(userID, recipientID)
		typingUsers, err = c.typingIndicator.GetTypingUsers(chatID, tenantID)
	}

	if err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to get typing status",
		})
	}

	return ctx.JSON(fiber.Map{
		"typing_users": typingUsers,
		"count":        len(typingUsers),
	})
}

// HealthCheck checks WebSocket and Redis health
func (c *WebSocketController) HealthCheck(ctx *fiber.Ctx) error {
	// Check Redis connectivity
	if err := c.redisManager.Ping(); err != nil {
		return ctx.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
			"status":  "unhealthy",
			"error":   "Redis connection failed",
			"details": err.Error(),
		})
	}

	// Get connection stats
	totalConnections := c.wsHandler.GetConnectionCount()
	activeSubscriptions := c.redisManager.GetActiveSubscriptions()

	return ctx.JSON(fiber.Map{
		"status":               "healthy",
		"total_connections":    totalConnections,
		"active_subscriptions": len(activeSubscriptions),
	})
}

// getChatID creates a consistent chat ID from two user IDs
func getChatID(userID1, userID2 string) string {
	if userID1 < userID2 {
		return userID1 + "_" + userID2
	}
	return userID2 + "_" + userID1
}
