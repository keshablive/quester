package websocket

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/gofiber/contrib/websocket"
	"github.com/gofiber/fiber/v2"
)

// Server manages WebSocket connections and rooms
// CONSTITUTION: Mobile-Offline - Real-time bidirectional communication
type Server struct {
	connections     map[string]*Connection // connectionID -> Connection
	rooms           map[string]*Room       // roomID -> Room
	mu              sync.RWMutex
	heartbeat       time.Duration
	cleanupInterval time.Duration
}

// Connection represents a WebSocket client connection
type Connection struct {
	ID            string
	TenantID      string
	UserID        uint
	Conn          *websocket.Conn
	Rooms         map[string]bool // Set of room IDs this connection is in
	LastHeartbeat time.Time
	mu            sync.RWMutex
}

// Room represents a WebSocket room (chat room, live stream, etc.)
type Room struct {
	ID          string
	Type        string // "chat", "live_stream", "quest", "marketplace"
	TenantID    string
	Connections map[string]*Connection // connectionID -> Connection
	mu          sync.RWMutex
}

// Message represents a WebSocket message
type Message struct {
	Type      string                 `json:"type"`
	Room      string                 `json:"room,omitempty"`
	From      uint                   `json:"from,omitempty"`
	To        uint                   `json:"to,omitempty"`
	Data      map[string]interface{} `json:"data"`
	Timestamp time.Time              `json:"timestamp"`
}

// NewServer creates a new WebSocket server instance
func NewServer() *Server {
	return &Server{
		connections:     make(map[string]*Connection),
		rooms:           make(map[string]*Room),
		heartbeat:       30 * time.Second,
		cleanupInterval: 60 * time.Second,
	}
}

// HandleConnection handles a new WebSocket connection
func (s *Server) HandleConnection(c *websocket.Conn, tenantID string, userID uint) {
	connectionID := generateConnectionID()

	conn := &Connection{
		ID:            connectionID,
		TenantID:      tenantID,
		UserID:        userID,
		Conn:          c,
		Rooms:         make(map[string]bool),
		LastHeartbeat: time.Now(),
	}

	// Register connection
	s.mu.Lock()
	s.connections[connectionID] = conn
	s.mu.Unlock()

	// Send connection confirmation
	s.sendToConnection(conn, Message{
		Type: "connected",
		Data: map[string]interface{}{
			"connection_id": connectionID,
			"user_id":       userID,
		},
		Timestamp: time.Now(),
	})

	// Handle messages
	go s.handleMessages(conn)

	// Start heartbeat checker
	go s.heartbeatChecker(conn)
}

// handleMessages processes incoming WebSocket messages
func (s *Server) handleMessages(conn *Connection) {
	defer s.disconnect(conn)

	for {
		var msg Message
		if err := conn.Conn.ReadJSON(&msg); err != nil {
			break
		}

		// Update last heartbeat
		conn.LastHeartbeat = time.Now()

		// Handle message based on type
		switch msg.Type {
		case "ping":
			s.sendToConnection(conn, Message{
				Type:      "pong",
				Timestamp: time.Now(),
			})

		case "join_room":
			if roomID, ok := msg.Data["room_id"].(string); ok {
				s.JoinRoom(conn, roomID, msg.Data["room_type"].(string))
			}

		case "leave_room":
			if roomID, ok := msg.Data["room_id"].(string); ok {
				s.LeaveRoom(conn, roomID)
			}

		case "message":
			if roomID, ok := msg.Data["room_id"].(string); ok {
				msg.From = conn.UserID
				msg.Timestamp = time.Now()
				s.BroadcastToRoom(roomID, msg)
			}

		case "direct_message":
			if toUserID, ok := msg.Data["to_user_id"].(float64); ok {
				msg.From = conn.UserID
				msg.To = uint(toUserID)
				msg.Timestamp = time.Now()
				s.SendToUser(conn.TenantID, uint(toUserID), msg)
			}
		}
	}
}

// JoinRoom adds a connection to a room
func (s *Server) JoinRoom(conn *Connection, roomID string, roomType string) {
	s.mu.Lock()
	defer s.mu.Unlock()

	// Get or create room
	room, exists := s.rooms[roomID]
	if !exists {
		room = &Room{
			ID:          roomID,
			Type:        roomType,
			TenantID:    conn.TenantID,
			Connections: make(map[string]*Connection),
		}
		s.rooms[roomID] = room
	}

	// Add connection to room
	room.mu.Lock()
	room.Connections[conn.ID] = conn
	room.mu.Unlock()

	// Track room in connection
	conn.mu.Lock()
	conn.Rooms[roomID] = true
	conn.mu.Unlock()

	// Notify room members
	s.BroadcastToRoom(roomID, Message{
		Type: "user_joined",
		Room: roomID,
		From: conn.UserID,
		Data: map[string]interface{}{
			"user_id": conn.UserID,
			"count":   len(room.Connections),
		},
		Timestamp: time.Now(),
	})
}

// LeaveRoom removes a connection from a room
func (s *Server) LeaveRoom(conn *Connection, roomID string) {
	s.mu.Lock()
	defer s.mu.Unlock()

	room, exists := s.rooms[roomID]
	if !exists {
		return
	}

	// Remove connection from room
	room.mu.Lock()
	delete(room.Connections, conn.ID)
	connectionCount := len(room.Connections)
	room.mu.Unlock()

	// Remove room from connection
	conn.mu.Lock()
	delete(conn.Rooms, roomID)
	conn.mu.Unlock()

	// Notify room members
	s.BroadcastToRoom(roomID, Message{
		Type: "user_left",
		Room: roomID,
		From: conn.UserID,
		Data: map[string]interface{}{
			"user_id": conn.UserID,
			"count":   connectionCount,
		},
		Timestamp: time.Now(),
	})

	// Delete room if empty
	if connectionCount == 0 {
		delete(s.rooms, roomID)
	}
}

// BroadcastToRoom sends a message to all connections in a room
func (s *Server) BroadcastToRoom(roomID string, msg Message) {
	s.mu.RLock()
	room, exists := s.rooms[roomID]
	s.mu.RUnlock()

	if !exists {
		return
	}

	room.mu.RLock()
	defer room.mu.RUnlock()

	for _, conn := range room.Connections {
		s.sendToConnection(conn, msg)
	}
}

// SendToUser sends a message to a specific user (all their connections)
func (s *Server) SendToUser(tenantID string, userID uint, msg Message) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	for _, conn := range s.connections {
		if conn.TenantID == tenantID && conn.UserID == userID {
			s.sendToConnection(conn, msg)
		}
	}
}

// sendToConnection sends a message to a specific connection
func (s *Server) sendToConnection(conn *Connection, msg Message) {
	conn.mu.Lock()
	defer conn.mu.Unlock()

	if err := conn.Conn.WriteJSON(msg); err != nil {
		// Connection is broken, will be cleaned up by heartbeat checker
		return
	}
}

// disconnect removes a connection and cleans up rooms
func (s *Server) disconnect(conn *Connection) {
	// Leave all rooms
	conn.mu.RLock()
	rooms := make([]string, 0, len(conn.Rooms))
	for roomID := range conn.Rooms {
		rooms = append(rooms, roomID)
	}
	conn.mu.RUnlock()

	for _, roomID := range rooms {
		s.LeaveRoom(conn, roomID)
	}

	// Remove connection
	s.mu.Lock()
	delete(s.connections, conn.ID)
	s.mu.Unlock()

	// Close WebSocket
	conn.Conn.Close()
}

// heartbeatChecker monitors connection health
func (s *Server) heartbeatChecker(conn *Connection) {
	ticker := time.NewTicker(s.heartbeat)
	defer ticker.Stop()

	for range ticker.C {
		conn.mu.RLock()
		lastHeartbeat := conn.LastHeartbeat
		conn.mu.RUnlock()

		// Disconnect if no heartbeat for 2x heartbeat interval
		if time.Since(lastHeartbeat) > s.heartbeat*2 {
			s.disconnect(conn)
			return
		}

		// Send ping
		s.sendToConnection(conn, Message{
			Type:      "ping",
			Timestamp: time.Now(),
		})
	}
}

// StartCleanup starts periodic cleanup of stale connections
func (s *Server) StartCleanup(ctx context.Context) {
	ticker := time.NewTicker(s.cleanupInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			s.cleanup()
		}
	}
}

// cleanup removes stale connections
func (s *Server) cleanup() {
	s.mu.Lock()
	defer s.mu.Unlock()

	now := time.Now()
	staleConnections := make([]*Connection, 0)

	for _, conn := range s.connections {
		if now.Sub(conn.LastHeartbeat) > s.heartbeat*2 {
			staleConnections = append(staleConnections, conn)
		}
	}

	// Disconnect stale connections
	for _, conn := range staleConnections {
		go s.disconnect(conn)
	}
}

// GetRoomCount returns the number of active rooms
func (s *Server) GetRoomCount() int {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return len(s.rooms)
}

// GetConnectionCount returns the number of active connections
func (s *Server) GetConnectionCount() int {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return len(s.connections)
}

// GetRoomConnections returns connection count for a specific room
func (s *Server) GetRoomConnections(roomID string) int {
	s.mu.RLock()
	room, exists := s.rooms[roomID]
	s.mu.RUnlock()

	if !exists {
		return 0
	}

	room.mu.RLock()
	defer room.mu.RUnlock()
	return len(room.Connections)
}

// Helper functions

func generateConnectionID() string {
	return fmt.Sprintf("conn_%d", time.Now().UnixNano())
}

// SetupWebSocketRoutes configures WebSocket routes
func SetupWebSocketRoutes(app *fiber.App, server *Server) {
	app.Use("/ws", func(c *fiber.Ctx) error {
		// Check if request is WebSocket upgrade
		if websocket.IsWebSocketUpgrade(c) {
			return c.Next()
		}
		return fiber.ErrUpgradeRequired
	})

	app.Get("/ws", websocket.New(func(c *websocket.Conn) {
		// Extract tenant_id and user_id from query or context
		tenantID := c.Query("tenant_id")
		userID := c.Locals("user_id").(uint)

		server.HandleConnection(c, tenantID, userID)
	}))
}
