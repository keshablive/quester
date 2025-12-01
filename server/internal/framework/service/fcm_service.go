package service

import (
	"context"
	"fmt"
	"log"

	firebase "firebase.google.com/go/v4"
	"firebase.google.com/go/v4/messaging"
	"google.golang.org/api/option"

	"github.com/keshablive/quester/internal/models"
	"github.com/keshablive/quester/internal/repositories"
)

// FCMService handles Firebase Cloud Messaging push notifications
type FCMService struct {
	client       *messaging.Client
	fcmTokenRepo *repositories.FCMTokenRepository
}

// NewFCMService creates a new FCM service
func NewFCMService(credentialsPath string, fcmTokenRepo *repositories.FCMTokenRepository) (*FCMService, error) {
	opt := option.WithCredentialsFile(credentialsPath)
	app, err := firebase.NewApp(context.Background(), nil, opt)
	if err != nil {
		return nil, fmt.Errorf("error initializing firebase app: %w", err)
	}

	client, err := app.Messaging(context.Background())
	if err != nil {
		return nil, fmt.Errorf("error creating messaging client: %w", err)
	}

	return &FCMService{
		client:       client,
		fcmTokenRepo: fcmTokenRepo,
	}, nil
}

// SendNotification sends a push notification to a single device
func (s *FCMService) SendNotification(ctx context.Context, token, title, body, imageURL string, data map[string]string) error {
	message := &messaging.Message{
		Token: token,
		Notification: &messaging.Notification{
			Title:    title,
			Body:     body,
			ImageURL: imageURL,
		},
		Data: data,
		Android: &messaging.AndroidConfig{
			Priority: "high",
			Notification: &messaging.AndroidNotification{
				Sound:        "default",
				ChannelID:    "quester_notifications",
				Priority:     messaging.PriorityHigh,
				DefaultSound: true,
			},
		},
		APNS: &messaging.APNSConfig{
			Payload: &messaging.APNSPayload{
				Aps: &messaging.Aps{
					Sound: "default",
					Badge: nil, // Will be set dynamically
				},
			},
		},
		Webpush: &messaging.WebpushConfig{
			Notification: &messaging.WebpushNotification{
				Title: title,
				Body:  body,
				Icon:  imageURL,
			},
		},
	}

	response, err := s.client.Send(ctx, message)
	if err != nil {
		// Check if error is due to invalid token
		if messaging.IsInvalidArgument(err) || messaging.IsUnregistered(err) {
			// Deactivate the token
			if fcmToken, err := s.fcmTokenRepo.FindByToken(ctx, token); err == nil {
				fcmToken.Deactivate()
				s.fcmTokenRepo.Update(ctx, fcmToken)
			}
		}
		return fmt.Errorf("error sending message: %w", err)
	}

	log.Printf("Successfully sent message: %s", response)
	return nil
}

// SendMulticast sends a push notification to multiple devices
func (s *FCMService) SendMulticast(ctx context.Context, tokens []string, title, body, imageURL string, data map[string]string) (*messaging.BatchResponse, error) {
	message := &messaging.MulticastMessage{
		Tokens: tokens,
		Notification: &messaging.Notification{
			Title:    title,
			Body:     body,
			ImageURL: imageURL,
		},
		Data: data,
		Android: &messaging.AndroidConfig{
			Priority: "high",
			Notification: &messaging.AndroidNotification{
				Sound:        "default",
				ChannelID:    "quester_notifications",
				Priority:     messaging.PriorityHigh,
				DefaultSound: true,
			},
		},
		APNS: &messaging.APNSConfig{
			Payload: &messaging.APNSPayload{
				Aps: &messaging.Aps{
					Sound: "default",
				},
			},
		},
	}

	response, err := s.client.SendEachForMulticast(ctx, message)
	if err != nil {
		return nil, fmt.Errorf("error sending multicast: %w", err)
	}

	// Handle failures and deactivate invalid tokens
	if response.FailureCount > 0 {
		for idx, resp := range response.Responses {
			if !resp.Success {
				token := tokens[idx]
				// Deactivate invalid token
				if fcmToken, err := s.fcmTokenRepo.FindByToken(ctx, token); err == nil {
					fcmToken.Deactivate()
					s.fcmTokenRepo.Update(ctx, fcmToken)
				}
				log.Printf("Failed to send to token %s: %v", token, resp.Error)
			}
		}
	}

	log.Printf("Successfully sent %d messages, %d failures", response.SuccessCount, response.FailureCount)
	return response, nil
}

// SendToUser sends a push notification to all devices of a user
func (s *FCMService) SendToUser(ctx context.Context, tenantID, userID, title, body, imageURL string, data map[string]string) error {
	// Get all active FCM tokens for user
	fcmTokens, err := s.fcmTokenRepo.FindByUser(ctx, tenantID, userID, true)
	if err != nil {
		return fmt.Errorf("failed to get FCM tokens: %w", err)
	}

	if len(fcmTokens) == 0 {
		return fmt.Errorf("no active FCM tokens for user")
	}

	// Extract token strings
	tokens := make([]string, len(fcmTokens))
	for i, t := range fcmTokens {
		tokens[i] = t.Token
	}

	// Send multicast
	_, err = s.SendMulticast(ctx, tokens, title, body, imageURL, data)
	return err
}

// SendNotificationFromModel sends a push notification from a Notification model
func (s *FCMService) SendNotificationFromModel(ctx context.Context, notification *models.Notification) error {
	// Check if push channel is enabled
	hasPush := false
	for _, channel := range notification.Channels {
		if channel == models.NotificationChannelPush {
			hasPush = true
			break
		}
	}

	if !hasPush {
		return nil // Push not enabled for this notification
	}

	// Prepare data
	data := map[string]string{
		"notification_id":   notification.ID,
		"notification_type": notification.NotificationType,
		"priority":          notification.Priority,
	}

	if notification.ActionURL != nil {
		data["action_url"] = *notification.ActionURL
	}

	// Add metadata to data
	for key, value := range notification.Metadata {
		if str, ok := value.(string); ok {
			data[key] = str
		}
	}

	// Get icon URL
	imageURL := ""
	if notification.IconURL != nil {
		imageURL = *notification.IconURL
	}

	// Send notification
	return s.SendToUser(ctx, notification.TenantID, notification.UserID, notification.Title, notification.Message, imageURL, data)
}

// SendDataMessage sends a data-only message (no notification)
func (s *FCMService) SendDataMessage(ctx context.Context, token string, data map[string]string) error {
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

	response, err := s.client.Send(ctx, message)
	if err != nil {
		// Deactivate invalid token
		if messaging.IsInvalidArgument(err) || messaging.IsUnregistered(err) {
			if fcmToken, err := s.fcmTokenRepo.FindByToken(ctx, token); err == nil {
				fcmToken.Deactivate()
				s.fcmTokenRepo.Update(ctx, fcmToken)
			}
		}
		return fmt.Errorf("error sending data message: %w", err)
	}

	log.Printf("Successfully sent data message: %s", response)
	return nil
}

// SendSilentNotification sends a silent notification for background updates
func (s *FCMService) SendSilentNotification(ctx context.Context, token string, data map[string]string) error {
	message := &messaging.Message{
		Token: token,
		Data:  data,
		Android: &messaging.AndroidConfig{
			Priority: "high",
		},
		APNS: &messaging.APNSConfig{
			Headers: map[string]string{
				"apns-priority":  "5",
				"apns-push-type": "background",
			},
			Payload: &messaging.APNSPayload{
				Aps: &messaging.Aps{
					ContentAvailable: true,
				},
			},
		},
	}

	response, err := s.client.Send(ctx, message)
	if err != nil {
		// Deactivate invalid token
		if messaging.IsInvalidArgument(err) || messaging.IsUnregistered(err) {
			if fcmToken, err := s.fcmTokenRepo.FindByToken(ctx, token); err == nil {
				fcmToken.Deactivate()
				s.fcmTokenRepo.Update(ctx, fcmToken)
			}
		}
		return fmt.Errorf("error sending silent notification: %w", err)
	}

	log.Printf("Successfully sent silent notification: %s", response)
	return nil
}

// SendToTopic sends a notification to a topic
func (s *FCMService) SendToTopic(ctx context.Context, topic, title, body, imageURL string, data map[string]string) error {
	message := &messaging.Message{
		Topic: topic,
		Notification: &messaging.Notification{
			Title:    title,
			Body:     body,
			ImageURL: imageURL,
		},
		Data: data,
		Android: &messaging.AndroidConfig{
			Priority: "high",
			Notification: &messaging.AndroidNotification{
				Sound:        "default",
				ChannelID:    "quester_notifications",
				Priority:     messaging.PriorityHigh,
				DefaultSound: true,
			},
		},
		APNS: &messaging.APNSConfig{
			Payload: &messaging.APNSPayload{
				Aps: &messaging.Aps{
					Sound: "default",
				},
			},
		},
	}

	response, err := s.client.Send(ctx, message)
	if err != nil {
		return fmt.Errorf("error sending to topic: %w", err)
	}

	log.Printf("Successfully sent message to topic %s: %s", topic, response)
	return nil
}

// SubscribeToTopic subscribes tokens to a topic
func (s *FCMService) SubscribeToTopic(ctx context.Context, tokens []string, topic string) error {
	response, err := s.client.SubscribeToTopic(ctx, tokens, topic)
	if err != nil {
		return fmt.Errorf("error subscribing to topic: %w", err)
	}

	log.Printf("Successfully subscribed %d tokens to topic %s, %d failures", response.SuccessCount, topic, response.FailureCount)
	return nil
}

// UnsubscribeFromTopic unsubscribes tokens from a topic
func (s *FCMService) UnsubscribeFromTopic(ctx context.Context, tokens []string, topic string) error {
	response, err := s.client.UnsubscribeFromTopic(ctx, tokens, topic)
	if err != nil {
		return fmt.Errorf("error unsubscribing from topic: %w", err)
	}

	log.Printf("Successfully unsubscribed %d tokens from topic %s, %d failures", response.SuccessCount, topic, response.FailureCount)
	return nil
}
