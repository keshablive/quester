package push

import (
	"context"
	"fmt"

	firebase "firebase.google.com/go/v4"
	"firebase.google.com/go/v4/messaging"
	"google.golang.org/api/option"
)

// FCMClient wraps Firebase Cloud Messaging for push notifications
type FCMClient struct {
	client *messaging.Client
	app    *firebase.App
}

// FCMConfig holds Firebase configuration
type FCMConfig struct {
	CredentialsPath string // Path to service account JSON file
	ProjectID       string // Firebase project ID
}

// NewFCMClient creates a Firebase Cloud Messaging client
func NewFCMClient(ctx context.Context, cfg FCMConfig) (*FCMClient, error) {
	// Initialize Firebase app with service account
	opt := option.WithCredentialsFile(cfg.CredentialsPath)
	app, err := firebase.NewApp(ctx, &firebase.Config{
		ProjectID: cfg.ProjectID,
	}, opt)
	if err != nil {
		return nil, fmt.Errorf("failed to initialize Firebase app: %w", err)
	}

	// Get FCM client
	client, err := app.Messaging(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get FCM client: %w", err)
	}

	return &FCMClient{
		client: client,
		app:    app,
	}, nil
}

// Notification represents a push notification payload
type Notification struct {
	Title    string            // Notification title (e.g., "New Badge Unlocked!")
	Body     string            // Notification body (e.g., "You earned the 'Course Creator' badge!")
	ImageURL string            // Optional image URL
	Data     map[string]string // Custom data payload (user_id, badge_id, etc.)
}

// SendToToken sends a notification to a specific device token
func (f *FCMClient) SendToToken(ctx context.Context, token string, notif Notification) (string, error) {
	message := &messaging.Message{
		Token: token,
		Notification: &messaging.Notification{
			Title:    notif.Title,
			Body:     notif.Body,
			ImageURL: notif.ImageURL,
		},
		Data: notif.Data,
	}

	// Send message
	response, err := f.client.Send(ctx, message)
	if err != nil {
		return "", fmt.Errorf("failed to send notification to token %s: %w", token, err)
	}

	return response, nil
}

// SendToTokens sends a notification to multiple device tokens (max 500)
func (f *FCMClient) SendToTokens(ctx context.Context, tokens []string, notif Notification) (*messaging.BatchResponse, error) {
	if len(tokens) > 500 {
		return nil, fmt.Errorf("cannot send to more than 500 tokens at once (got %d)", len(tokens))
	}

	message := &messaging.MulticastMessage{
		Notification: &messaging.Notification{
			Title:    notif.Title,
			Body:     notif.Body,
			ImageURL: notif.ImageURL,
		},
		Data:   notif.Data,
		Tokens: tokens,
	}

	// Send multicast message
	response, err := f.client.SendEachForMulticast(ctx, message)
	if err != nil {
		return nil, fmt.Errorf("failed to send multicast notification: %w", err)
	}

	return response, nil
}

// SendToTopic sends a notification to all devices subscribed to a topic
// Useful for: Guild announcements, leaderboard updates, system notifications
func (f *FCMClient) SendToTopic(ctx context.Context, topic string, notif Notification) (string, error) {
	message := &messaging.Message{
		Topic: topic,
		Notification: &messaging.Notification{
			Title:    notif.Title,
			Body:     notif.Body,
			ImageURL: notif.ImageURL,
		},
		Data: notif.Data,
	}

	// Send message
	response, err := f.client.Send(ctx, message)
	if err != nil {
		return "", fmt.Errorf("failed to send notification to topic %s: %w", topic, err)
	}

	return response, nil
}

// SubscribeToTopic subscribes device tokens to a topic
func (f *FCMClient) SubscribeToTopic(ctx context.Context, tokens []string, topic string) error {
	_, err := f.client.SubscribeToTopic(ctx, tokens, topic)
	if err != nil {
		return fmt.Errorf("failed to subscribe tokens to topic %s: %w", topic, err)
	}
	return nil
}

// UnsubscribeFromTopic unsubscribes device tokens from a topic
func (f *FCMClient) UnsubscribeFromTopic(ctx context.Context, tokens []string, topic string) error {
	_, err := f.client.UnsubscribeFromTopic(ctx, tokens, topic)
	if err != nil {
		return fmt.Errorf("failed to unsubscribe tokens from topic %s: %w", topic, err)
	}
	return nil
}

// SendDataOnly sends a silent notification with only data payload (no UI notification)
// Useful for: Background data sync, real-time updates without interrupting user
func (f *FCMClient) SendDataOnly(ctx context.Context, token string, data map[string]string) (string, error) {
	message := &messaging.Message{
		Token: token,
		Data:  data,
		Android: &messaging.AndroidConfig{
			Priority: "high",
		},
		APNS: &messaging.APNSConfig{
			Headers: map[string]string{
				"apns-priority": "10",
			},
			Payload: &messaging.APNSPayload{
				Aps: &messaging.Aps{
					ContentAvailable: true,
				},
			},
		},
	}

	response, err := f.client.Send(ctx, message)
	if err != nil {
		return "", fmt.Errorf("failed to send data-only notification to token %s: %w", token, err)
	}

	return response, nil
}

// Close closes the FCM client (no-op for Firebase SDK)
func (f *FCMClient) Close() error {
	// Firebase SDK doesn't require explicit cleanup
	return nil
}
