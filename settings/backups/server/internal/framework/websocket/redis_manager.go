package websocket

import (
	"context"
	"encoding/json"
	"fmt"
	"sync"
	"time"

	"github.com/redis/go-redis/v9"
)

// RedisManager handles Redis pub/sub for cross-server WebSocket communication
type RedisManager struct {
	client      *redis.Client
	handler     *Handler
	ctx         context.Context
	cancel      context.CancelFunc
	mu          sync.RWMutex
	subscribers map[string]*redis.PubSub
}

// RedisMessage represents a message to be published to Redis
type RedisMessage struct {
	Type      string                 `json:"type"`
	From      string                 `json:"from"`
	To        string                 `json:"to,omitempty"`
	GroupID   string                 `json:"group_id,omitempty"`
	TenantID  string                 `json:"tenant_id"`
	Data      map[string]interface{} `json:"data"`
	Timestamp time.Time              `json:"timestamp"`
}

// Channel prefixes for Redis pub/sub
const (
	ChannelPrefixUser      = "ws:user:"
	ChannelPrefixGroup     = "ws:group:"
	ChannelPrefixTenant    = "ws:tenant:"
	ChannelPrefixBroadcast = "ws:broadcast"
	ChannelPrefixTyping    = "ws:typing:"
)

// NewRedisManager creates a new Redis manager
func NewRedisManager(redisClient *redis.Client, handler *Handler) *RedisManager {
	ctx, cancel := context.WithCancel(context.Background())

	rm := &RedisManager{
		client:      redisClient,
		handler:     handler,
		ctx:         ctx,
		cancel:      cancel,
		subscribers: make(map[string]*redis.PubSub),
	}

	// Subscribe to broadcast channel
	go rm.subscribeToBroadcast()

	return rm
}

// PublishToUser publishes a message to a specific user
func (rm *RedisManager) PublishToUser(userID, tenantID string, msg *Message) error {
	redisMsg := &RedisMessage{
		Type:      msg.Type,
		From:      msg.From,
		To:        userID,
		TenantID:  tenantID,
		Data:      msg.Data,
		Timestamp: msg.Timestamp,
	}

	data, err := json.Marshal(redisMsg)
	if err != nil {
		return fmt.Errorf("failed to marshal message: %w", err)
	}

	channel := ChannelPrefixUser + userID
	return rm.client.Publish(rm.ctx, channel, data).Err()
}

// PublishToGroup publishes a message to all members of a group
func (rm *RedisManager) PublishToGroup(groupID, tenantID, senderID string, msg *Message) error {
	redisMsg := &RedisMessage{
		Type:      msg.Type,
		From:      senderID,
		GroupID:   groupID,
		TenantID:  tenantID,
		Data:      msg.Data,
		Timestamp: msg.Timestamp,
	}

	data, err := json.Marshal(redisMsg)
	if err != nil {
		return fmt.Errorf("failed to marshal message: %w", err)
	}

	channel := ChannelPrefixGroup + groupID
	return rm.client.Publish(rm.ctx, channel, data).Err()
}

// PublishToTenant publishes a message to all users in a tenant
func (rm *RedisManager) PublishToTenant(tenantID string, msg *Message) error {
	redisMsg := &RedisMessage{
		Type:      msg.Type,
		From:      msg.From,
		TenantID:  tenantID,
		Data:      msg.Data,
		Timestamp: msg.Timestamp,
	}

	data, err := json.Marshal(redisMsg)
	if err != nil {
		return fmt.Errorf("failed to marshal message: %w", err)
	}

	channel := ChannelPrefixTenant + tenantID
	return rm.client.Publish(rm.ctx, channel, data).Err()
}

// PublishBroadcast publishes a message to all connected clients
func (rm *RedisManager) PublishBroadcast(msg *Message) error {
	redisMsg := &RedisMessage{
		Type:      msg.Type,
		From:      msg.From,
		Data:      msg.Data,
		Timestamp: msg.Timestamp,
	}

	data, err := json.Marshal(redisMsg)
	if err != nil {
		return fmt.Errorf("failed to marshal message: %w", err)
	}

	return rm.client.Publish(rm.ctx, ChannelPrefixBroadcast, data).Err()
}

// SubscribeToUser subscribes to messages for a specific user
func (rm *RedisManager) SubscribeToUser(userID string) error {
	channel := ChannelPrefixUser + userID

	rm.mu.Lock()
	if _, exists := rm.subscribers[channel]; exists {
		rm.mu.Unlock()
		return nil // Already subscribed
	}

	pubsub := rm.client.Subscribe(rm.ctx, channel)
	rm.subscribers[channel] = pubsub
	rm.mu.Unlock()

	go rm.handleSubscription(pubsub, channel)
	return nil
}

// SubscribeToGroup subscribes to messages for a specific group
func (rm *RedisManager) SubscribeToGroup(groupID string) error {
	channel := ChannelPrefixGroup + groupID

	rm.mu.Lock()
	if _, exists := rm.subscribers[channel]; exists {
		rm.mu.Unlock()
		return nil // Already subscribed
	}

	pubsub := rm.client.Subscribe(rm.ctx, channel)
	rm.subscribers[channel] = pubsub
	rm.mu.Unlock()

	go rm.handleSubscription(pubsub, channel)
	return nil
}

// SubscribeToTenant subscribes to messages for a specific tenant
func (rm *RedisManager) SubscribeToTenant(tenantID string) error {
	channel := ChannelPrefixTenant + tenantID

	rm.mu.Lock()
	if _, exists := rm.subscribers[channel]; exists {
		rm.mu.Unlock()
		return nil // Already subscribed
	}

	pubsub := rm.client.Subscribe(rm.ctx, channel)
	rm.subscribers[channel] = pubsub
	rm.mu.Unlock()

	go rm.handleSubscription(pubsub, channel)
	return nil
}

// subscribeToBroadcast subscribes to the broadcast channel
func (rm *RedisManager) subscribeToBroadcast() {
	pubsub := rm.client.Subscribe(rm.ctx, ChannelPrefixBroadcast)

	rm.mu.Lock()
	rm.subscribers[ChannelPrefixBroadcast] = pubsub
	rm.mu.Unlock()

	rm.handleSubscription(pubsub, ChannelPrefixBroadcast)
}

// handleSubscription handles incoming messages from a Redis subscription
func (rm *RedisManager) handleSubscription(pubsub *redis.PubSub, channel string) {
	ch := pubsub.Channel()

	for {
		select {
		case msg := <-ch:
			if msg == nil {
				return
			}
			rm.handleRedisMessage(msg.Payload)

		case <-rm.ctx.Done():
			pubsub.Close()
			return
		}
	}
}

// handleRedisMessage processes a message received from Redis
func (rm *RedisManager) handleRedisMessage(payload string) {
	var redisMsg RedisMessage
	if err := json.Unmarshal([]byte(payload), &redisMsg); err != nil {
		fmt.Printf("Error unmarshaling Redis message: %v\n", err)
		return
	}

	// Convert to WebSocket message
	msg := &Message{
		Type:      redisMsg.Type,
		From:      redisMsg.From,
		To:        redisMsg.To,
		Data:      redisMsg.Data,
		Timestamp: redisMsg.Timestamp,
	}

	// Route message to appropriate recipients
	if redisMsg.To != "" {
		// Direct message to specific user
		rm.handler.sendToUser(redisMsg.To, redisMsg.TenantID, msg)
	} else if redisMsg.GroupID != "" {
		// Group message
		rm.handler.sendToGroup(redisMsg.GroupID, redisMsg.TenantID, redisMsg.From, msg)
	} else if redisMsg.TenantID != "" {
		// Tenant-wide message
		rm.sendToTenant(redisMsg.TenantID, msg)
	} else {
		// Broadcast to all connections
		rm.handler.broadcastMessage(msg)
	}
}

// sendToTenant sends a message to all connections in a tenant
func (rm *RedisManager) sendToTenant(tenantID string, msg *Message) {
	rm.handler.mu.RLock()
	defer rm.handler.mu.RUnlock()

	for _, conn := range rm.handler.connections {
		if conn.TenantID == tenantID {
			rm.handler.sendToConnection(conn, msg)
		}
	}
}

// Unsubscribe unsubscribes from a channel
func (rm *RedisManager) Unsubscribe(channel string) error {
	rm.mu.Lock()
	defer rm.mu.Unlock()

	if pubsub, exists := rm.subscribers[channel]; exists {
		if err := pubsub.Close(); err != nil {
			return err
		}
		delete(rm.subscribers, channel)
	}

	return nil
}

// GetActiveSubscriptions returns the list of active subscriptions
func (rm *RedisManager) GetActiveSubscriptions() []string {
	rm.mu.RLock()
	defer rm.mu.RUnlock()

	channels := make([]string, 0, len(rm.subscribers))
	for channel := range rm.subscribers {
		channels = append(channels, channel)
	}
	return channels
}

// RegisterConnection registers a new WebSocket connection and subscribes to relevant channels
func (rm *RedisManager) RegisterConnection(userID, tenantID string) error {
	// Subscribe to user-specific channel
	if err := rm.SubscribeToUser(userID); err != nil {
		return fmt.Errorf("failed to subscribe to user channel: %w", err)
	}

	// Subscribe to tenant channel
	if err := rm.SubscribeToTenant(tenantID); err != nil {
		return fmt.Errorf("failed to subscribe to tenant channel: %w", err)
	}

	return nil
}

// UnregisterConnection cleans up subscriptions when a connection closes
func (rm *RedisManager) UnregisterConnection(userID, tenantID string) error {
	// Check if there are any remaining connections for this user
	if !rm.handler.IsUserOnline(userID, tenantID) {
		// No more connections, unsubscribe from user channel
		userChannel := ChannelPrefixUser + userID
		if err := rm.Unsubscribe(userChannel); err != nil {
			return fmt.Errorf("failed to unsubscribe from user channel: %w", err)
		}
	}

	// Check if there are any remaining connections for this tenant
	hasOtherTenantConnections := false
	rm.handler.mu.RLock()
	for _, conn := range rm.handler.connections {
		if conn.TenantID == tenantID {
			hasOtherTenantConnections = true
			break
		}
	}
	rm.handler.mu.RUnlock()

	if !hasOtherTenantConnections {
		// No more connections for this tenant, unsubscribe
		tenantChannel := ChannelPrefixTenant + tenantID
		if err := rm.Unsubscribe(tenantChannel); err != nil {
			return fmt.Errorf("failed to unsubscribe from tenant channel: %w", err)
		}
	}

	return nil
}

// Shutdown gracefully shuts down the Redis manager
func (rm *RedisManager) Shutdown() {
	rm.cancel()

	rm.mu.Lock()
	defer rm.mu.Unlock()

	for _, pubsub := range rm.subscribers {
		pubsub.Close()
	}

	rm.subscribers = make(map[string]*redis.PubSub)
}

// Ping checks Redis connectivity
func (rm *RedisManager) Ping() error {
	ctx, cancel := context.WithTimeout(rm.ctx, 5*time.Second)
	defer cancel()

	return rm.client.Ping(ctx).Err()
}

// GetSubscriberCount returns the number of subscribers for a channel
func (rm *RedisManager) GetSubscriberCount(channel string) (int64, error) {
	ctx, cancel := context.WithTimeout(rm.ctx, 5*time.Second)
	defer cancel()

	result := rm.client.PubSubNumSub(ctx, channel)
	channels, err := result.Result()
	if err != nil {
		return 0, err
	}

	if count, ok := channels[channel]; ok {
		return count, nil
	}

	return 0, nil
}
