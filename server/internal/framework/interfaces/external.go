// External service interfaces for framework layer
package interfaces

import (
	"context"
	"io"
	"time"
)

// PushNotificationService sends push notifications to devices.
// Application implements this interface using FCM, APNs, or other providers.
type PushNotificationService interface {
	// SendToDevice sends a notification to a specific device token.
	SendToDevice(ctx context.Context, deviceToken, title, body string, data map[string]string) error

	// SendToTopic sends a notification to all subscribers of a topic.
	SendToTopic(ctx context.Context, topic, title, body string, data map[string]string) error

	// SendToMultipleDevices sends notifications to multiple devices.
	SendToMultipleDevices(ctx context.Context, deviceTokens []string, title, body string, data map[string]string) error
}

// ObjectStorage provides object/blob storage operations.
// Application implements this interface using S3, GCS, or other providers.
type ObjectStorage interface {
	// Upload stores data at the specified key.
	Upload(ctx context.Context, bucket, key string, data io.Reader, contentType string) error

	// Download retrieves data from the specified key.
	Download(ctx context.Context, bucket, key string) (io.ReadCloser, error)

	// Delete removes the object at the specified key.
	Delete(ctx context.Context, bucket, key string) error

	// GetSignedURL generates a pre-signed URL for direct access.
	GetSignedURL(ctx context.Context, bucket, key string, expiry time.Duration) (string, error)

	// Exists checks if an object exists at the specified key.
	Exists(ctx context.Context, bucket, key string) (bool, error)
}

// EmailService sends emails.
// Application implements this interface using SMTP, SendGrid, SES, etc.
type EmailService interface {
	// SendEmail sends an email to the specified recipient.
	SendEmail(ctx context.Context, to, subject, body string) error

	// SendTemplatedEmail sends an email using a template.
	SendTemplatedEmail(ctx context.Context, to, templateID string, data map[string]interface{}) error
}

// SMSService sends SMS messages.
// Application implements this interface using Twilio, SNS, etc.
type SMSService interface {
	// SendSMS sends an SMS message to the specified phone number.
	SendSMS(ctx context.Context, phoneNumber, message string) error
}
