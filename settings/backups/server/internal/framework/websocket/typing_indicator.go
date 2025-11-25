package websocket

import (
	"context"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

// TypingIndicator manages typing indicators using Redis
type TypingIndicator struct {
	client *redis.Client
	ctx    context.Context
}

// TypingStatus represents a user's typing status
type TypingStatus struct {
	UserID    string    `json:"user_id"`
	IsTyping  bool      `json:"is_typing"`
	Timestamp time.Time `json:"timestamp"`
}

const (
	// TypingKeyPrefix is the Redis key prefix for typing indicators
	TypingKeyPrefix = "typing:"
	// TypingTTL is the time-to-live for typing indicators (3 seconds)
	TypingTTL = 3 * time.Second
	// TypingChannelPrefix is the pub/sub channel prefix for typing events
	TypingChannelPrefix = "typing:channel:"
)

// NewTypingIndicator creates a new typing indicator manager
func NewTypingIndicator(redisClient *redis.Client) *TypingIndicator {
	return &TypingIndicator{
		client: redisClient,
		ctx:    context.Background(),
	}
}

// SetTyping sets a user's typing status for a direct chat
func (ti *TypingIndicator) SetTyping(userID, recipientID, tenantID string, isTyping bool) error {
	key := ti.getDirectChatKey(userID, recipientID, tenantID)

	if isTyping {
		// Set typing indicator with TTL
		err := ti.client.Set(ti.ctx, key, userID, TypingTTL).Err()
		if err != nil {
			return fmt.Errorf("failed to set typing indicator: %w", err)
		}

		// Publish typing event
		channel := ti.getDirectChatChannel(recipientID, tenantID)
		status := TypingStatus{
			UserID:    userID,
			IsTyping:  true,
			Timestamp: time.Now(),
		}
		return ti.publishTypingEvent(channel, status)
	}

	// Delete typing indicator immediately
	err := ti.client.Del(ti.ctx, key).Err()
	if err != nil {
		return fmt.Errorf("failed to delete typing indicator: %w", err)
	}

	// Publish stopped typing event
	channel := ti.getDirectChatChannel(recipientID, tenantID)
	status := TypingStatus{
		UserID:    userID,
		IsTyping:  false,
		Timestamp: time.Now(),
	}
	return ti.publishTypingEvent(channel, status)
}

// SetGroupTyping sets a user's typing status for a group chat
func (ti *TypingIndicator) SetGroupTyping(userID, groupID, tenantID string, isTyping bool) error {
	key := ti.getGroupChatKey(groupID, userID, tenantID)

	if isTyping {
		// Set typing indicator with TTL
		err := ti.client.Set(ti.ctx, key, userID, TypingTTL).Err()
		if err != nil {
			return fmt.Errorf("failed to set group typing indicator: %w", err)
		}

		// Publish typing event
		channel := ti.getGroupChatChannel(groupID, tenantID)
		status := TypingStatus{
			UserID:    userID,
			IsTyping:  true,
			Timestamp: time.Now(),
		}
		return ti.publishTypingEvent(channel, status)
	}

	// Delete typing indicator immediately
	err := ti.client.Del(ti.ctx, key).Err()
	if err != nil {
		return fmt.Errorf("failed to delete group typing indicator: %w", err)
	}

	// Publish stopped typing event
	channel := ti.getGroupChatChannel(groupID, tenantID)
	status := TypingStatus{
		UserID:    userID,
		IsTyping:  false,
		Timestamp: time.Now(),
	}
	return ti.publishTypingEvent(channel, status)
}

// IsTyping checks if a user is typing in a direct chat
func (ti *TypingIndicator) IsTyping(userID, recipientID, tenantID string) (bool, error) {
	key := ti.getDirectChatKey(userID, recipientID, tenantID)

	result, err := ti.client.Get(ti.ctx, key).Result()
	if err == redis.Nil {
		return false, nil
	}
	if err != nil {
		return false, fmt.Errorf("failed to check typing status: %w", err)
	}

	return result == userID, nil
}

// IsGroupTyping checks if a user is typing in a group chat
func (ti *TypingIndicator) IsGroupTyping(userID, groupID, tenantID string) (bool, error) {
	key := ti.getGroupChatKey(groupID, userID, tenantID)

	result, err := ti.client.Get(ti.ctx, key).Result()
	if err == redis.Nil {
		return false, nil
	}
	if err != nil {
		return false, fmt.Errorf("failed to check group typing status: %w", err)
	}

	return result == userID, nil
}

// GetTypingUsers returns all users currently typing in a direct chat
func (ti *TypingIndicator) GetTypingUsers(chatID, tenantID string) ([]string, error) {
	pattern := ti.getDirectChatPattern(chatID, tenantID)

	keys, err := ti.client.Keys(ti.ctx, pattern).Result()
	if err != nil {
		return nil, fmt.Errorf("failed to get typing users: %w", err)
	}

	if len(keys) == 0 {
		return []string{}, nil
	}

	values, err := ti.client.MGet(ti.ctx, keys...).Result()
	if err != nil {
		return nil, fmt.Errorf("failed to get typing user values: %w", err)
	}

	userIDs := make([]string, 0, len(values))
	for _, val := range values {
		if val != nil {
			if userID, ok := val.(string); ok {
				userIDs = append(userIDs, userID)
			}
		}
	}

	return userIDs, nil
}

// GetGroupTypingUsers returns all users currently typing in a group chat
func (ti *TypingIndicator) GetGroupTypingUsers(groupID, tenantID string) ([]string, error) {
	pattern := ti.getGroupChatPattern(groupID, tenantID)

	keys, err := ti.client.Keys(ti.ctx, pattern).Result()
	if err != nil {
		return nil, fmt.Errorf("failed to get group typing users: %w", err)
	}

	if len(keys) == 0 {
		return []string{}, nil
	}

	values, err := ti.client.MGet(ti.ctx, keys...).Result()
	if err != nil {
		return nil, fmt.Errorf("failed to get group typing user values: %w", err)
	}

	userIDs := make([]string, 0, len(values))
	for _, val := range values {
		if val != nil {
			if userID, ok := val.(string); ok {
				userIDs = append(userIDs, userID)
			}
		}
	}

	return userIDs, nil
}

// ClearTyping clears all typing indicators for a user
func (ti *TypingIndicator) ClearTyping(userID, tenantID string) error {
	pattern := fmt.Sprintf("%s*:%s:*:%s", TypingKeyPrefix, tenantID, userID)

	keys, err := ti.client.Keys(ti.ctx, pattern).Result()
	if err != nil {
		return fmt.Errorf("failed to find typing keys: %w", err)
	}

	if len(keys) == 0 {
		return nil
	}

	return ti.client.Del(ti.ctx, keys...).Err()
}

// ClearAllTyping clears all typing indicators for a chat
func (ti *TypingIndicator) ClearAllTyping(chatID, tenantID string) error {
	pattern := ti.getDirectChatPattern(chatID, tenantID)

	keys, err := ti.client.Keys(ti.ctx, pattern).Result()
	if err != nil {
		return fmt.Errorf("failed to find typing keys: %w", err)
	}

	if len(keys) == 0 {
		return nil
	}

	return ti.client.Del(ti.ctx, keys...).Err()
}

// ClearGroupTyping clears all typing indicators for a group
func (ti *TypingIndicator) ClearGroupTyping(groupID, tenantID string) error {
	pattern := ti.getGroupChatPattern(groupID, tenantID)

	keys, err := ti.client.Keys(ti.ctx, pattern).Result()
	if err != nil {
		return fmt.Errorf("failed to find group typing keys: %w", err)
	}

	if len(keys) == 0 {
		return nil
	}

	return ti.client.Del(ti.ctx, keys...).Err()
}

// SubscribeToTyping subscribes to typing events for a direct chat
func (ti *TypingIndicator) SubscribeToTyping(recipientID, tenantID string) *redis.PubSub {
	channel := ti.getDirectChatChannel(recipientID, tenantID)
	return ti.client.Subscribe(ti.ctx, channel)
}

// SubscribeToGroupTyping subscribes to typing events for a group chat
func (ti *TypingIndicator) SubscribeToGroupTyping(groupID, tenantID string) *redis.PubSub {
	channel := ti.getGroupChatChannel(groupID, tenantID)
	return ti.client.Subscribe(ti.ctx, channel)
}

// publishTypingEvent publishes a typing event to a channel
func (ti *TypingIndicator) publishTypingEvent(channel string, status TypingStatus) error {
	data := map[string]interface{}{
		"user_id":   status.UserID,
		"is_typing": status.IsTyping,
		"timestamp": status.Timestamp,
	}

	return ti.client.Publish(ti.ctx, channel, data).Err()
}

// getDirectChatKey generates a Redis key for direct chat typing indicator
func (ti *TypingIndicator) getDirectChatKey(userID, recipientID, tenantID string) string {
	// Create a consistent key regardless of user order
	chatID := ti.getChatID(userID, recipientID)
	return fmt.Sprintf("%schat:%s:%s:%s", TypingKeyPrefix, tenantID, chatID, userID)
}

// getGroupChatKey generates a Redis key for group chat typing indicator
func (ti *TypingIndicator) getGroupChatKey(groupID, userID, tenantID string) string {
	return fmt.Sprintf("%sgroup:%s:%s:%s", TypingKeyPrefix, tenantID, groupID, userID)
}

// getDirectChatPattern generates a Redis key pattern for direct chat
func (ti *TypingIndicator) getDirectChatPattern(chatID, tenantID string) string {
	return fmt.Sprintf("%schat:%s:%s:*", TypingKeyPrefix, tenantID, chatID)
}

// getGroupChatPattern generates a Redis key pattern for group chat
func (ti *TypingIndicator) getGroupChatPattern(groupID, tenantID string) string {
	return fmt.Sprintf("%sgroup:%s:%s:*", TypingKeyPrefix, tenantID, groupID)
}

// getDirectChatChannel generates a pub/sub channel for direct chat typing events
func (ti *TypingIndicator) getDirectChatChannel(recipientID, tenantID string) string {
	return fmt.Sprintf("%schat:%s:%s", TypingChannelPrefix, tenantID, recipientID)
}

// getGroupChatChannel generates a pub/sub channel for group chat typing events
func (ti *TypingIndicator) getGroupChatChannel(groupID, tenantID string) string {
	return fmt.Sprintf("%sgroup:%s:%s", TypingChannelPrefix, tenantID, groupID)
}

// getChatID creates a consistent chat ID from two user IDs
func (ti *TypingIndicator) getChatID(userID1, userID2 string) string {
	if userID1 < userID2 {
		return userID1 + "_" + userID2
	}
	return userID2 + "_" + userID1
}

// GetTTL returns the remaining TTL for a typing indicator
func (ti *TypingIndicator) GetTTL(userID, recipientID, tenantID string) (time.Duration, error) {
	key := ti.getDirectChatKey(userID, recipientID, tenantID)

	ttl, err := ti.client.TTL(ti.ctx, key).Result()
	if err != nil {
		return 0, fmt.Errorf("failed to get TTL: %w", err)
	}

	return ttl, nil
}

// RefreshTyping refreshes the TTL for a typing indicator
func (ti *TypingIndicator) RefreshTyping(userID, recipientID, tenantID string) error {
	key := ti.getDirectChatKey(userID, recipientID, tenantID)

	// Check if key exists
	exists, err := ti.client.Exists(ti.ctx, key).Result()
	if err != nil {
		return fmt.Errorf("failed to check key existence: %w", err)
	}

	if exists == 0 {
		// Key doesn't exist, set it
		return ti.SetTyping(userID, recipientID, tenantID, true)
	}

	// Refresh TTL
	return ti.client.Expire(ti.ctx, key, TypingTTL).Err()
}

// RefreshGroupTyping refreshes the TTL for a group typing indicator
func (ti *TypingIndicator) RefreshGroupTyping(userID, groupID, tenantID string) error {
	key := ti.getGroupChatKey(groupID, userID, tenantID)

	// Check if key exists
	exists, err := ti.client.Exists(ti.ctx, key).Result()
	if err != nil {
		return fmt.Errorf("failed to check key existence: %w", err)
	}

	if exists == 0 {
		// Key doesn't exist, set it
		return ti.SetGroupTyping(userID, groupID, tenantID, true)
	}

	// Refresh TTL
	return ti.client.Expire(ti.ctx, key, TypingTTL).Err()
}
