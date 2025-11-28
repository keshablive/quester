// Payment interfaces for framework layer
package interfaces

import (
	"context"
	"time"
)

// PaymentIntent represents an initiated payment.
type PaymentIntent struct {
	ID           string
	ClientSecret string
	Amount       int64
	Currency     string
	Status       string
	Metadata     map[string]string
}

// PaymentResult represents a completed payment.
type PaymentResult struct {
	ID       string
	Status   string
	PaidAt   time.Time
	Metadata map[string]string
}

// RefundResult represents a refund operation result.
type RefundResult struct {
	ID       string
	Amount   int64
	Status   string
	RefundAt time.Time
}

// PaymentProcessor handles payment operations for a single provider.
// Application implements this interface for each payment provider (Stripe, Razorpay, etc.).
type PaymentProcessor interface {
	// Name returns the processor name (e.g., "stripe", "razorpay").
	Name() string

	// CreatePaymentIntent initializes a payment.
	CreatePaymentIntent(ctx context.Context, amount int64, currency string, metadata map[string]string) (*PaymentIntent, error)

	// ConfirmPayment completes a pending payment.
	ConfirmPayment(ctx context.Context, paymentID string) (*PaymentResult, error)

	// RefundPayment refunds a completed payment.
	RefundPayment(ctx context.Context, paymentID string, amount int64) (*RefundResult, error)

	// VerifyWebhook validates webhook authenticity.
	VerifyWebhook(payload []byte, signature string) (bool, error)

	// GetPaymentStatus retrieves the current status of a payment.
	GetPaymentStatus(ctx context.Context, paymentID string) (string, error)
}

// PaymentManager orchestrates multiple payment processors.
// This interface allows selecting the appropriate processor based on configuration.
type PaymentManager interface {
	// GetProcessor returns the default/primary processor.
	GetProcessor(ctx context.Context) (PaymentProcessor, error)

	// GetProcessorByName returns a specific processor by name.
	GetProcessorByName(name string) (PaymentProcessor, error)

	// AvailableProcessors lists enabled payment processors.
	AvailableProcessors() []string

	// IsProcessorAvailable checks if a specific processor is enabled.
	IsProcessorAvailable(name string) bool
}
