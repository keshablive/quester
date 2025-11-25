package websocket

import (
	"context"
	"encoding/json"
	"fmt"
	"sync"
	"time"

	"github.com/gofiber/contrib/websocket"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

// Connection represents a WebSocket connection with metadata
type Connection struct {
	ID          string
	UserID      string
	TenantID    string
	Conn        *websocket.Conn
	Send        chan []byte
	ConnectedAt time.Time
	LastPingAt  time.Time
	manager     *Manager // Reference to manager for callbacks
	rooms       []string // Rooms this connection is subscribed to
	mu          sync.RWMutex
}

// Handler manages WebSocket connections
type Handler struct {
	connections  map[string]*Connection
	mu           sync.RWMutex
	register     chan *Connection
	unregister   chan *Connection
	broadcast    chan *Message
	ctx          context.Context
	cancel       context.CancelFunc
	redisManager *RedisManager // Redis pub/sub for horizontal scaling
}

// Message represents a WebSocket message
type Message struct {
	Type      string                 `json:"type"`
	From      string                 `json:"from,omitempty"`
	To        string                 `json:"to,omitempty"`
	Content   string                 `json:"content,omitempty"`
	Data      map[string]interface{} `json:"data,omitempty"`
	Timestamp time.Time              `json:"timestamp"`
}

// MessageType constants
const (
	MessageTypeChat         = "chat"
	MessageTypeTyping       = "typing"
	MessageTypeRead         = "read"
	MessageTypeDelivered    = "delivered"
	MessageTypeNotification = "notification"
	MessageTypePing         = "ping"
	MessageTypePong         = "pong"
	MessageTypeError        = "error"
	MessageTypeConnect      = "connect"
	MessageTypeDisconnect   = "disconnect"
	MessageTypeGroupMessage = "group_message"
	MessageTypeGroupTyping  = "group_typing"
)

// NewHandler creates a new WebSocket handler
func NewHandler() *Handler {
	ctx, cancel := context.WithCancel(context.Background())

	h := &Handler{
		connections:  make(map[string]*Connection),
		register:     make(chan *Connection, 256),
		unregister:   make(chan *Connection, 256),
		broadcast:    make(chan *Message, 1024),
		ctx:          ctx,
		cancel:       cancel,
		redisManager: nil, // Set via SetRedisManager()
	}

	go h.run()
	return h
}

// SetRedisManager sets the Redis manager for horizontal scaling
func (h *Handler) SetRedisManager(rm *RedisManager) {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.redisManager = rm
}

// run starts the connection manager event loop
func (h *Handler) run() {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case conn := <-h.register:
			h.mu.Lock()
			h.connections[conn.ID] = conn
			h.mu.Unlock()

			// Send connection confirmation
			msg := &Message{
				Type: MessageTypeConnect,
				Data: map[string]interface{}{
					"connection_id": conn.ID,
					"user_id":       conn.UserID,
				},
				Timestamp: time.Now(),
			}
			h.sendToConnection(conn, msg)

		case conn := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.connections[conn.ID]; ok {
				delete(h.connections, conn.ID)
				close(conn.Send)
			}
			h.mu.Unlock()

		case msg := <-h.broadcast:
			h.broadcastMessage(msg)

		case <-ticker.C:
			h.pingConnections()

		case <-h.ctx.Done():
			return
		}
	}
}

// Upgrade upgrades an HTTP connection to WebSocket
func (h *Handler) Upgrade() fiber.Handler {
	return websocket.New(func(c *websocket.Conn) {
		// Extract user info from context (set by auth middleware)
		userID := c.Locals("user_id")
		tenantID := c.Locals("tenant_id")

		if userID == nil || tenantID == nil {
			c.WriteJSON(fiber.Map{
				"error": "Unauthorized",
			})
			c.Close()
			return
		}

		// Create connection
		conn := &Connection{
			ID:          uuid.New().String(),
			UserID:      userID.(string),
			TenantID:    tenantID.(string),
			Conn:        c,
			Send:        make(chan []byte, 256),
			ConnectedAt: time.Now(),
			LastPingAt:  time.Now(),
		}

		// Register connection
		h.register <- conn

		// Start goroutines
		go h.writePump(conn)
		h.readPump(conn)
	})
}

// readPump reads messages from the WebSocket connection
func (h *Handler) readPump(conn *Connection) {
	defer func() {
		h.unregister <- conn
		conn.Conn.Close()
	}()

	conn.Conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	conn.Conn.SetPongHandler(func(string) error {
		conn.mu.Lock()
		conn.LastPingAt = time.Now()
		conn.mu.Unlock()
		conn.Conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})

	for {
		messageType, message, err := conn.Conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				fmt.Printf("WebSocket error: %v\n", err)
			}
			break
		}

		if messageType == websocket.TextMessage || messageType == websocket.BinaryMessage {
			h.handleMessage(conn, message)
		}
	}
}

// writePump writes messages to the WebSocket connection
func (h *Handler) writePump(conn *Connection) {
	ticker := time.NewTicker(54 * time.Second)
	defer func() {
		ticker.Stop()
		conn.Conn.Close()
	}()

	for {
		select {
		case message, ok := <-conn.Send:
			conn.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if !ok {
				conn.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			if err := conn.Conn.WriteMessage(websocket.TextMessage, message); err != nil {
				return
			}

		case <-ticker.C:
			conn.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := conn.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

// handleMessage processes incoming WebSocket messages
func (h *Handler) handleMessage(conn *Connection, rawMessage []byte) {
	var msg Message
	if err := json.Unmarshal(rawMessage, &msg); err != nil {
		h.sendError(conn, "Invalid message format")
		return
	}

	// Set message metadata
	msg.From = conn.UserID
	msg.Timestamp = time.Now()

	// Handle different message types
	switch msg.Type {
	case MessageTypePing:
		h.handlePing(conn)
	case MessageTypeChat:
		h.handleChatMessage(conn, &msg)
	case MessageTypeTyping:
		h.handleTypingIndicator(conn, &msg)
	case MessageTypeRead:
		h.handleReadReceipt(conn, &msg)
	case MessageTypeGroupMessage:
		h.handleGroupMessage(conn, &msg)
	case MessageTypeGroupTyping:
		h.handleGroupTyping(conn, &msg)
	default:
		h.sendError(conn, fmt.Sprintf("Unknown message type: %s", msg.Type))
	}
}

// handlePing responds to ping messages
func (h *Handler) handlePing(conn *Connection) {
	msg := &Message{
		Type:      MessageTypePong,
		Timestamp: time.Now(),
	}
	h.sendToConnection(conn, msg)
}

// handleChatMessage processes chat messages
func (h *Handler) handleChatMessage(conn *Connection, msg *Message) {
	// Validate recipient
	if msg.To == "" {
		h.sendError(conn, "Recipient is required")
		return
	}

	// Send to recipient if online
	h.sendToUser(msg.To, conn.TenantID, msg)

	// Send delivery confirmation to sender
	deliveryMsg := &Message{
		Type: MessageTypeDelivered,
		Data: map[string]interface{}{
			"message_id": msg.Data["message_id"],
			"to":         msg.To,
		},
		Timestamp: time.Now(),
	}
	h.sendToConnection(conn, deliveryMsg)
}

// handleTypingIndicator broadcasts typing indicators
func (h *Handler) handleTypingIndicator(conn *Connection, msg *Message) {
	if msg.To == "" {
		return
	}

	// Forward to recipient
	typingMsg := &Message{
		Type: MessageTypeTyping,
		From: conn.UserID,
		Data: map[string]interface{}{
			"is_typing": msg.Data["is_typing"],
		},
		Timestamp: time.Now(),
	}
	h.sendToUser(msg.To, conn.TenantID, typingMsg)
}

// handleReadReceipt processes read receipts
func (h *Handler) handleReadReceipt(conn *Connection, msg *Message) {
	// Forward read receipt to sender
	if messageID, ok := msg.Data["message_id"].(string); ok {
		if senderID, ok := msg.Data["sender_id"].(string); ok {
			readMsg := &Message{
				Type: MessageTypeRead,
				From: conn.UserID,
				Data: map[string]interface{}{
					"message_id": messageID,
					"read_at":    time.Now(),
				},
				Timestamp: time.Now(),
			}
			h.sendToUser(senderID, conn.TenantID, readMsg)
		}
	}
}

// handleGroupMessage processes group chat messages
func (h *Handler) handleGroupMessage(conn *Connection, msg *Message) {
	groupID, ok := msg.Data["group_id"].(string)
	if !ok || groupID == "" {
		h.sendError(conn, "Group ID is required")
		return
	}

	// Broadcast to all group members except sender
	h.sendToGroup(groupID, conn.TenantID, conn.UserID, msg)
}

// handleGroupTyping processes group typing indicators
func (h *Handler) handleGroupTyping(conn *Connection, msg *Message) {
	groupID, ok := msg.Data["group_id"].(string)
	if !ok || groupID == "" {
		return
	}

	// Broadcast to all group members except sender
	typingMsg := &Message{
		Type: MessageTypeGroupTyping,
		From: conn.UserID,
		Data: map[string]interface{}{
			"group_id":  groupID,
			"is_typing": msg.Data["is_typing"],
		},
		Timestamp: time.Now(),
	}
	h.sendToGroup(groupID, conn.TenantID, conn.UserID, typingMsg)
}

// sendToConnection sends a message to a specific connection
func (h *Handler) sendToConnection(conn *Connection, msg *Message) {
	data, err := json.Marshal(msg)
	if err != nil {
		fmt.Printf("Error marshaling message: %v\n", err)
		return
	}

	select {
	case conn.Send <- data:
	default:
		h.unregister <- conn
	}
}

// sendToUser sends a message to all connections of a specific user
func (h *Handler) sendToUser(userID, tenantID string, msg *Message) {
	h.mu.RLock()
	localConnections := 0
	for _, conn := range h.connections {
		if conn.UserID == userID && conn.TenantID == tenantID {
			h.sendToConnection(conn, msg)
			localConnections++
		}
	}
	h.mu.RUnlock()

	// If user not connected locally and Redis is available, publish to Redis
	// This allows other server instances to deliver the message
	if localConnections == 0 && h.redisManager != nil {
		if err := h.redisManager.PublishToUser(userID, tenantID, msg); err != nil {
			fmt.Printf("[WebSocket] Failed to publish to Redis for user %s: %v\n", userID, err)
		}
	}
}

// sendToGroup sends a message to all members of a group except the sender
func (h *Handler) sendToGroup(groupID, tenantID, senderID string, msg *Message) {
	// TODO: Fetch group members from database
	// For now, this is a placeholder that broadcasts to all connections
	// In production, this should query the group_members table

	h.mu.RLock()
	defer h.mu.RUnlock()

	for _, conn := range h.connections {
		if conn.TenantID == tenantID && conn.UserID != senderID {
			// TODO: Check if user is a member of the group
			h.sendToConnection(conn, msg)
		}
	}
}

// broadcastMessage broadcasts a message to all connections
func (h *Handler) broadcastMessage(msg *Message) {
	h.mu.RLock()
	defer h.mu.RUnlock()

	for _, conn := range h.connections {
		h.sendToConnection(conn, msg)
	}
}

// sendError sends an error message to a connection
func (h *Handler) sendError(conn *Connection, errorMsg string) {
	msg := &Message{
		Type: MessageTypeError,
		Data: map[string]interface{}{
			"error": errorMsg,
		},
		Timestamp: time.Now(),
	}
	h.sendToConnection(conn, msg)
}

// pingConnections sends ping messages to all connections
func (h *Handler) pingConnections() {
	h.mu.RLock()
	defer h.mu.RUnlock()

	now := time.Now()
	for _, conn := range h.connections {
		conn.mu.RLock()
		lastPing := conn.LastPingAt
		conn.mu.RUnlock()

		// Close stale connections (no pong for 90 seconds)
		if now.Sub(lastPing) > 90*time.Second {
			h.unregister <- conn
		}
	}
}

// GetConnectionCount returns the number of active connections
func (h *Handler) GetConnectionCount() int {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return len(h.connections)
}

// GetUserConnections returns all connections for a specific user
func (h *Handler) GetUserConnections(userID, tenantID string) []*Connection {
	h.mu.RLock()
	defer h.mu.RUnlock()

	var connections []*Connection
	for _, conn := range h.connections {
		if conn.UserID == userID && conn.TenantID == tenantID {
			connections = append(connections, conn)
		}
	}
	return connections
}

// IsUserOnline checks if a user has any active connections
func (h *Handler) IsUserOnline(userID, tenantID string) bool {
	return len(h.GetUserConnections(userID, tenantID)) > 0
}

// SendNotification sends a notification to a specific user
func (h *Handler) SendNotification(userID, tenantID string, notification map[string]interface{}) {
	msg := &Message{
		Type:      MessageTypeNotification,
		Data:      notification,
		Timestamp: time.Now(),
	}
	h.sendToUser(userID, tenantID, msg)
}

// SendToUser sends a message to a specific user (public method for Redis manager)
func (h *Handler) SendToUser(userID, tenantID string, msg Message) {
	h.sendToUser(userID, tenantID, &msg)
}

// BroadcastMessage broadcasts a message to all connections (public method for Redis manager)
func (h *Handler) BroadcastMessage(msg Message) {
	h.broadcastMessage(&msg)
}

// Shutdown gracefully shuts down the handler
func (h *Handler) Shutdown() {
	h.cancel()

	h.mu.Lock()
	defer h.mu.Unlock()

	for _, conn := range h.connections {
		close(conn.Send)
		conn.Conn.Close()
	}
}
