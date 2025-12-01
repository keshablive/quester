package controllers

import (
	"strconv"

	"github.com/gofiber/fiber/v2"

	"github.com/keshablive/quester/internal/framework/websocket"
	"github.com/keshablive/quester/internal/framework/service"
)

// MessagesController handles message-related requests
type MessagesController struct {
	messagingService *service.MessagingService
	wsHandler        *websocket.Handler
	redisManager     *websocket.RedisManager
	typingIndicator  *websocket.TypingIndicator
}

// NewMessagesController creates a new messages controller
func NewMessagesController(
	messagingService *service.MessagingService,
	wsHandler *websocket.Handler,
	redisManager *websocket.RedisManager,
	typingIndicator *websocket.TypingIndicator,
) *MessagesController {
	return &MessagesController{
		messagingService: messagingService,
		wsHandler:        wsHandler,
		redisManager:     redisManager,
		typingIndicator:  typingIndicator,
	}
}

// SendDirectMessage sends a direct message to a user
func (c *MessagesController) SendDirectMessage(ctx *fiber.Ctx) error {
	userID := ctx.Locals("user_id").(string)
	tenantID := ctx.Locals("tenant_id").(string)

	type Request struct {
		RecipientID string                 `json:"recipient_id" validate:"required,uuid"`
		Content     string                 `json:"content" validate:"required"`
		MessageType string                 `json:"message_type" validate:"required"`
		MediaURL    string                 `json:"media_url"`
		Metadata    map[string]interface{} `json:"metadata"`
	}

	var req Request
	if err := ctx.BodyParser(&req); err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// Create message
	message, err := c.messagingService.SendDirectMessage(
		ctx.Context(),
		tenantID,
		userID,
		req.RecipientID,
		req.Content,
		req.MediaURL,
		req.MessageType,
		req.Metadata,
	)
	if err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	// Send via WebSocket if recipient is online
	if c.wsHandler.IsUserOnline(req.RecipientID, tenantID) {
		wsMessage := &websocket.Message{
			Type: websocket.MessageTypeChat,
			From: userID,
			To:   req.RecipientID,
			Data: map[string]interface{}{
				"message_id":   message.ID,
				"content":      message.Content,
				"message_type": message.MessageType,
				"media_url":    message.MediaURL,
				"created_at":   message.CreatedAt,
			},
		}
		c.redisManager.PublishToUser(req.RecipientID, tenantID, wsMessage)
	}

	return ctx.Status(fiber.StatusCreated).JSON(message)
}

// SendGroupMessage sends a message to a group
func (c *MessagesController) SendGroupMessage(ctx *fiber.Ctx) error {
	userID := ctx.Locals("user_id").(string)
	tenantID := ctx.Locals("tenant_id").(string)

	type Request struct {
		GroupID     string                 `json:"group_id" validate:"required,uuid"`
		Content     string                 `json:"content" validate:"required"`
		MessageType string                 `json:"message_type" validate:"required"`
		MediaURL    string                 `json:"media_url"`
		Metadata    map[string]interface{} `json:"metadata"`
	}

	var req Request
	if err := ctx.BodyParser(&req); err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// Create message
	message, err := c.messagingService.SendGroupMessage(
		ctx.Context(),
		tenantID,
		userID,
		req.GroupID,
		req.Content,
		req.MediaURL,
		req.MessageType,
		req.Metadata,
	)
	if err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	// Broadcast to group via Redis pub/sub
	wsMessage := &websocket.Message{
		Type: websocket.MessageTypeGroupMessage,
		From: userID,
		Data: map[string]interface{}{
			"group_id":     req.GroupID,
			"message_id":   message.ID,
			"content":      message.Content,
			"message_type": message.MessageType,
			"media_url":    message.MediaURL,
			"created_at":   message.CreatedAt,
		},
	}
	c.redisManager.PublishToGroup(req.GroupID, tenantID, userID, wsMessage)

	return ctx.Status(fiber.StatusCreated).JSON(message)
}

// GetDirectMessages retrieves messages between two users
func (c *MessagesController) GetDirectMessages(ctx *fiber.Ctx) error {
	userID := ctx.Locals("user_id").(string)
	tenantID := ctx.Locals("tenant_id").(string)
	recipientID := ctx.Params("userId")

	// Parse pagination params
	page, _ := strconv.Atoi(ctx.Query("page", "1"))
	limit, _ := strconv.Atoi(ctx.Query("limit", "50"))

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 50
	}

	messages, total, err := c.messagingService.GetDirectMessages(
		ctx.Context(),
		tenantID,
		userID,
		recipientID,
		page,
		limit,
	)
	if err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return ctx.JSON(fiber.Map{
		"messages": messages,
		"pagination": fiber.Map{
			"page":        page,
			"limit":       limit,
			"total":       total,
			"total_pages": (total + int64(limit) - 1) / int64(limit),
		},
	})
}

// GetGroupMessages retrieves messages in a group
func (c *MessagesController) GetGroupMessages(ctx *fiber.Ctx) error {
	tenantID := ctx.Locals("tenant_id").(string)
	groupID := ctx.Params("groupId")

	// Parse pagination params
	page, _ := strconv.Atoi(ctx.Query("page", "1"))
	limit, _ := strconv.Atoi(ctx.Query("limit", "50"))

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 50
	}

	messages, total, err := c.messagingService.GetGroupMessages(
		ctx.Context(),
		tenantID,
		groupID,
		page,
		limit,
	)
	if err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return ctx.JSON(fiber.Map{
		"messages": messages,
		"pagination": fiber.Map{
			"page":        page,
			"limit":       limit,
			"total":       total,
			"total_pages": (total + int64(limit) - 1) / int64(limit),
		},
	})
}

// GetMessage retrieves a single message by ID
func (c *MessagesController) GetMessage(ctx *fiber.Ctx) error {
	tenantID := ctx.Locals("tenant_id").(string)
	messageID := ctx.Params("messageId")

	message, err := c.messagingService.GetMessageByID(ctx.Context(), messageID, tenantID)
	if err != nil {
		return ctx.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Message not found",
		})
	}

	return ctx.JSON(message)
}

// MarkMessageAsRead marks a message as read
func (c *MessagesController) MarkMessageAsRead(ctx *fiber.Ctx) error {
	userID := ctx.Locals("user_id").(string)
	tenantID := ctx.Locals("tenant_id").(string)
	messageID := ctx.Params("messageId")

	if err := c.messagingService.MarkMessageAsRead(ctx.Context(), messageID, tenantID, userID); err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	// Get updated message
	message, err := c.messagingService.GetMessageByID(ctx.Context(), messageID, tenantID)
	if err != nil {
		return ctx.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Message not found",
		})
	}

	// Send read receipt via WebSocket
	wsMessage := &websocket.Message{
		Type: websocket.MessageTypeRead,
		From: userID,
		Data: map[string]interface{}{
			"message_id": messageID,
			"read_at":    message.ReadAt,
		},
	}
	c.redisManager.PublishToUser(message.SenderID, tenantID, wsMessage)

	return ctx.JSON(message)
}

// MarkMultipleAsRead marks multiple messages as read
func (c *MessagesController) MarkMultipleAsRead(ctx *fiber.Ctx) error {
	userID := ctx.Locals("user_id").(string)
	tenantID := ctx.Locals("tenant_id").(string)

	type Request struct {
		MessageIDs []string `json:"message_ids" validate:"required"`
	}

	var req Request
	if err := ctx.BodyParser(&req); err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	if err := c.messagingService.MarkMultipleAsRead(ctx.Context(), req.MessageIDs, tenantID, userID); err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return ctx.JSON(fiber.Map{
		"message":       "Messages marked as read",
		"updated_count": len(req.MessageIDs),
	})
}

// DeleteMessage deletes a message
func (c *MessagesController) DeleteMessage(ctx *fiber.Ctx) error {
	userID := ctx.Locals("user_id").(string)
	tenantID := ctx.Locals("tenant_id").(string)
	messageID := ctx.Params("messageId")

	if err := c.messagingService.DeleteMessage(ctx.Context(), messageID, tenantID, userID); err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return ctx.Status(fiber.StatusNoContent).Send(nil)
}

// GetUnreadCount gets unread message count
func (c *MessagesController) GetUnreadCount(ctx *fiber.Ctx) error {
	userID := ctx.Locals("user_id").(string)
	tenantID := ctx.Locals("tenant_id").(string)

	count, err := c.messagingService.GetUnreadCount(ctx.Context(), tenantID, userID)
	if err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return ctx.JSON(fiber.Map{
		"unread_count": count,
	})
}

// GetMessageThreads gets all message threads for a user
func (c *MessagesController) GetMessageThreads(ctx *fiber.Ctx) error {
	userID := ctx.Locals("user_id").(string)
	tenantID := ctx.Locals("tenant_id").(string)

	// Parse pagination params
	page, _ := strconv.Atoi(ctx.Query("page", "1"))
	limit, _ := strconv.Atoi(ctx.Query("limit", "20"))

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 50 {
		limit = 20
	}

	threads, err := c.messagingService.GetMessageThreads(ctx.Context(), tenantID, userID, page, limit)
	if err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return ctx.JSON(fiber.Map{
		"threads": threads,
		"pagination": fiber.Map{
			"page":  page,
			"limit": limit,
		},
	})
}

// SearchMessages searches for messages
func (c *MessagesController) SearchMessages(ctx *fiber.Ctx) error {
	userID := ctx.Locals("user_id").(string)
	tenantID := ctx.Locals("tenant_id").(string)
	keyword := ctx.Query("q")

	if keyword == "" {
		return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Search keyword is required",
		})
	}

	// Parse pagination params
	page, _ := strconv.Atoi(ctx.Query("page", "1"))
	limit, _ := strconv.Atoi(ctx.Query("limit", "20"))

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 50 {
		limit = 20
	}

	messages, total, err := c.messagingService.SearchMessages(ctx.Context(), tenantID, userID, keyword, page, limit)
	if err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return ctx.JSON(fiber.Map{
		"messages": messages,
		"pagination": fiber.Map{
			"page":        page,
			"limit":       limit,
			"total":       total,
			"total_pages": (total + int64(limit) - 1) / int64(limit),
		},
	})
}

// GetMessageStats gets messaging statistics
func (c *MessagesController) GetMessageStats(ctx *fiber.Ctx) error {
	userID := ctx.Locals("user_id").(string)
	tenantID := ctx.Locals("tenant_id").(string)

	stats, err := c.messagingService.GetMessageStats(ctx.Context(), tenantID, userID)
	if err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return ctx.JSON(stats)
}

// SetTypingIndicator sets typing indicator for a chat
func (c *MessagesController) SetTypingIndicator(ctx *fiber.Ctx) error {
	userID := ctx.Locals("user_id").(string)
	tenantID := ctx.Locals("tenant_id").(string)

	type Request struct {
		RecipientID string `json:"recipient_id"`
		GroupID     string `json:"group_id"`
		IsTyping    bool   `json:"is_typing"`
	}

	var req Request
	if err := ctx.BodyParser(&req); err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	if req.RecipientID == "" && req.GroupID == "" {
		return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Either recipient_id or group_id is required",
		})
	}

	var err error
	if req.GroupID != "" {
		// Group typing
		err = c.typingIndicator.SetGroupTyping(userID, req.GroupID, tenantID, req.IsTyping)
	} else {
		// Direct chat typing
		err = c.typingIndicator.SetTyping(userID, req.RecipientID, tenantID, req.IsTyping)
	}

	if err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return ctx.JSON(fiber.Map{
		"message": "Typing indicator updated",
	})
}
