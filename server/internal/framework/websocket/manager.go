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

// Manager manages WebSocket connections for real-time features
type Manager struct {
	connections map[string]*Connection // connection_id -> Connection
	userConns   map[string][]string    // user_id -> []connection_id (user can have multiple devices)
	tenantConns map[string][]string    // tenant_id -> []connection_id
	roomConns   map[string][]string    // room_id -> []connection_id (e.g., guild chat, live stream)
	mu          sync.RWMutex

	// Lifecycle hooks (optional)
	onConnect    func(conn *Connection)
	onDisconnect func(conn *Connection)
	onMessage    func(conn *Connection, msg Message)
}

// NewManager creates a new WebSocket manager
func NewManager() *Manager {
	return &Manager{
		connections: make(map[string]*Connection),
		userConns:   make(map[string][]string),
		tenantConns: make(map[string][]string),
		roomConns:   make(map[string][]string),
	}
}

// SetLifecycleHooks sets optional lifecycle callbacks
func (m *Manager) SetLifecycleHooks(onConnect, onDisconnect func(*Connection), onMessage func(*Connection, Message)) {
	m.onConnect = onConnect
	m.onDisconnect = onDisconnect
	m.onMessage = onMessage
}

// HandleWebSocket handles WebSocket upgrade and connection lifecycle
func (m *Manager) HandleWebSocket(c *fiber.Ctx) error {
	// Extract user and tenant from context (set by JWT middleware)
	userID := c.Locals("user_id").(string)
	tenantID := c.Locals("tenant_id").(string)

	return websocket.New(func(ws *websocket.Conn) {
		// Create connection
		conn := &Connection{
			ID:          uuid.New().String(),
			UserID:      userID,
			TenantID:    tenantID,
			Conn:        ws,
			Send:        make(chan []byte, 256),
			ConnectedAt: time.Now(),
			LastPingAt:  time.Now(),
			manager:     m,
			rooms:       []string{},
		}

		// Register connection
		m.register(conn)
		defer m.unregister(conn)

		// Start send pump (writes to WebSocket)
		go conn.writePump()

		// Run read pump (blocks until connection closes)
		conn.readPump()
	})(c)
}

// register adds a connection to the manager
func (m *Manager) register(conn *Connection) {
	m.mu.Lock()
	defer m.mu.Unlock()

	m.connections[conn.ID] = conn

	// Track user connections (one user can have multiple devices)
	m.userConns[conn.UserID] = append(m.userConns[conn.UserID], conn.ID)

	// Track tenant connections (for tenant-wide broadcasts)
	m.tenantConns[conn.TenantID] = append(m.tenantConns[conn.TenantID], conn.ID)

	// Call lifecycle hook
	if m.onConnect != nil {
		m.onConnect(conn)
	}
}

// unregister removes a connection from the manager
func (m *Manager) unregister(conn *Connection) {
	m.mu.Lock()
	defer m.mu.Unlock()

	// Remove from connections map
	delete(m.connections, conn.ID)

	// Remove from user connections
	m.userConns[conn.UserID] = removeString(m.userConns[conn.UserID], conn.ID)
	if len(m.userConns[conn.UserID]) == 0 {
		delete(m.userConns, conn.UserID)
	}

	// Remove from tenant connections
	m.tenantConns[conn.TenantID] = removeString(m.tenantConns[conn.TenantID], conn.ID)
	if len(m.tenantConns[conn.TenantID]) == 0 {
		delete(m.tenantConns, conn.TenantID)
	}

	// Remove from all rooms
	for _, room := range conn.rooms {
		m.roomConns[room] = removeString(m.roomConns[room], conn.ID)
		if len(m.roomConns[room]) == 0 {
			delete(m.roomConns, room)
		}
	}

	close(conn.Send)

	// Call lifecycle hook
	if m.onDisconnect != nil {
		m.onDisconnect(conn)
	}
}

// SendToUser sends a message to all connections of a specific user
func (m *Manager) SendToUser(ctx context.Context, userID string, msg Message) error {
	m.mu.RLock()
	connIDs := m.userConns[userID]
	m.mu.RUnlock()

	if len(connIDs) == 0 {
		return fmt.Errorf("user %s has no active connections", userID)
	}

	data, err := json.Marshal(msg)
	if err != nil {
		return fmt.Errorf("failed to marshal message: %w", err)
	}

	for _, connID := range connIDs {
		m.mu.RLock()
		conn := m.connections[connID]
		m.mu.RUnlock()

		if conn != nil {
			select {
			case conn.Send <- data:
			case <-ctx.Done():
				return ctx.Err()
			default:
				// Channel full, skip this connection
			}
		}
	}

	return nil
}

// SendToRoom sends a message to all connections in a room (guild chat, live stream)
func (m *Manager) SendToRoom(ctx context.Context, roomID string, msg Message) error {
	m.mu.RLock()
	connIDs := m.roomConns[roomID]
	m.mu.RUnlock()

	if len(connIDs) == 0 {
		return fmt.Errorf("room %s has no active connections", roomID)
	}

	data, err := json.Marshal(msg)
	if err != nil {
		return fmt.Errorf("failed to marshal message: %w", err)
	}

	for _, connID := range connIDs {
		m.mu.RLock()
		conn := m.connections[connID]
		m.mu.RUnlock()

		if conn != nil {
			select {
			case conn.Send <- data:
			case <-ctx.Done():
				return ctx.Err()
			default:
				// Channel full, skip this connection
			}
		}
	}

	return nil
}

// BroadcastToTenant sends a message to all connections in a tenant
func (m *Manager) BroadcastToTenant(ctx context.Context, tenantID string, msg Message) error {
	m.mu.RLock()
	connIDs := m.tenantConns[tenantID]
	m.mu.RUnlock()

	if len(connIDs) == 0 {
		return fmt.Errorf("tenant %s has no active connections", tenantID)
	}

	data, err := json.Marshal(msg)
	if err != nil {
		return fmt.Errorf("failed to marshal message: %w", err)
	}

	for _, connID := range connIDs {
		m.mu.RLock()
		conn := m.connections[connID]
		m.mu.RUnlock()

		if conn != nil {
			select {
			case conn.Send <- data:
			case <-ctx.Done():
				return ctx.Err()
			default:
				// Channel full, skip this connection
			}
		}
	}

	return nil
}

// JoinRoom subscribes a connection to a room
func (m *Manager) JoinRoom(connID, roomID string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	conn := m.connections[connID]
	if conn == nil {
		return fmt.Errorf("connection %s not found", connID)
	}

	// Add room to connection
	conn.rooms = append(conn.rooms, roomID)

	// Add connection to room
	m.roomConns[roomID] = append(m.roomConns[roomID], connID)

	return nil
}

// LeaveRoom unsubscribes a connection from a room
func (m *Manager) LeaveRoom(connID, roomID string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	conn := m.connections[connID]
	if conn == nil {
		return fmt.Errorf("connection %s not found", connID)
	}

	// Remove room from connection
	conn.rooms = removeString(conn.rooms, roomID)

	// Remove connection from room
	m.roomConns[roomID] = removeString(m.roomConns[roomID], connID)
	if len(m.roomConns[roomID]) == 0 {
		delete(m.roomConns, roomID)
	}

	return nil
}

// GetStats returns connection statistics
func (m *Manager) GetStats() map[string]int {
	m.mu.RLock()
	defer m.mu.RUnlock()

	return map[string]int{
		"total_connections": len(m.connections),
		"unique_users":      len(m.userConns),
		"total_rooms":       len(m.roomConns),
	}
}

// readPump reads messages from WebSocket (blocks until connection closes)
func (conn *Connection) readPump() {
	defer conn.Conn.Close()

	conn.Conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	conn.Conn.SetPongHandler(func(string) error {
		conn.Conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})

	for {
		_, message, err := conn.Conn.ReadMessage()
		if err != nil {
			break
		}

		// Parse message
		var msg Message
		if err := json.Unmarshal(message, &msg); err != nil {
			continue
		}

		// Call lifecycle hook
		if conn.manager.onMessage != nil {
			conn.manager.onMessage(conn, msg)
		}
	}
}

// writePump writes messages to WebSocket
func (conn *Connection) writePump() {
	ticker := time.NewTicker(54 * time.Second)
	defer ticker.Stop()

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
			// Send ping
			conn.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := conn.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

// Helper function to remove a string from a slice
func removeString(slice []string, s string) []string {
	for i, v := range slice {
		if v == s {
			return append(slice[:i], slice[i+1:]...)
		}
	}
	return slice
}
