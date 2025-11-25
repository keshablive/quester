package payment

import (
	"context"
	"fmt"

	"github.com/keshablive/quester/internal/framework/config"
)

// PaymentGateway defines the interface for payment gateway operations
type PaymentGateway interface {
	// CreateOrder creates a new payment order/intent
	CreateOrder(ctx context.Context, amount float64, currency string, receipt string, metadata map[string]interface{}) (interface{}, error)

	// CapturePayment captures a payment (moves funds to platform escrow)
	CapturePayment(ctx context.Context, paymentID string, amount float64, currency string) (interface{}, error)

	// RefundPayment refunds a payment (full or partial)
	RefundPayment(ctx context.Context, paymentID string, amount *float64, reason string) (interface{}, error)

	// FetchPayment fetches payment details
	FetchPayment(ctx context.Context, paymentID string) (interface{}, error)

	// VerifyWebhookSignature verifies webhook signature for security
	VerifyWebhookSignature(payload []byte, signature string) (interface{}, error)
}

// TransferGateway defines the interface for payout operations (seller payouts)
type TransferGateway interface {
	// CreateTransfer creates a transfer to seller account (payout after escrow release)
	CreateTransfer(ctx context.Context, amount float64, currency string, destination string, metadata map[string]interface{}) (interface{}, error)
}

// PaymentManager manages multiple payment gateways
// T046: Updated to use PaymentConfig for provider selection
type PaymentManager struct {
	razorpay *RazorpayClient
	stripe   *StripeClient
	provider string // "stripe", "razorpay", or "both"
}

// NewPaymentManager creates a new payment manager
func NewPaymentManager(razorpayConfig *RazorpayConfig, stripeConfig *StripeConfig) (*PaymentManager, error) {
	manager := &PaymentManager{}

	// Initialize Razorpay if config provided
	if razorpayConfig != nil && razorpayConfig.KeyID != "" {
		client, err := NewRazorpayClient(razorpayConfig)
		if err != nil {
			return nil, err
		}
		manager.razorpay = client
	}

	// Initialize Stripe if config provided
	if stripeConfig != nil && stripeConfig.SecretKey != "" {
		client, err := NewStripeClient(stripeConfig)
		if err != nil {
			return nil, err
		}
		manager.stripe = client
	}

	return manager, nil
}

// NewPaymentManagerFromConfig creates a payment manager using PaymentConfig
// T046: Provider-based initialization from environment config
func NewPaymentManagerFromConfig(cfg *config.PaymentConfig) (*PaymentManager, error) {
	if cfg == nil {
		return nil, fmt.Errorf("payment config is nil")
	}

	// Validate config first
	if err := cfg.Validate(); err != nil {
		return nil, fmt.Errorf("payment config validation failed: %w", err)
	}

	manager := &PaymentManager{
		provider: cfg.Provider,
	}

	// Initialize Stripe if enabled
	if cfg.IsStripeEnabled() {
		stripeConfig := &StripeConfig{
			SecretKey:     cfg.StripeAPIKey,
			WebhookSecret: cfg.StripeWebhookSecret,
		}
		client, err := NewStripeClient(stripeConfig)
		if err != nil {
			return nil, fmt.Errorf("failed to initialize Stripe: %w", err)
		}
		manager.stripe = client
	}

	// Initialize Razorpay if enabled
	if cfg.IsRazorpayEnabled() {
		razorpayConfig := &RazorpayConfig{
			KeyID:         cfg.RazorpayKeyID,
			KeySecret:     cfg.RazorpayKeySecret,
			WebhookSecret: cfg.RazorpayWebhookSecret,
		}
		client, err := NewRazorpayClient(razorpayConfig)
		if err != nil {
			return nil, fmt.Errorf("failed to initialize Razorpay: %w", err)
		}
		manager.razorpay = client
	}

	return manager, nil
}

// GetProvider returns the configured payment provider
func (pm *PaymentManager) GetProvider() string {
	return pm.provider
}

// GetRazorpay returns the Razorpay client
func (pm *PaymentManager) GetRazorpay() *RazorpayClient {
	return pm.razorpay
}

// GetStripe returns the Stripe client
func (pm *PaymentManager) GetStripe() *StripeClient {
	return pm.stripe
}

// HasRazorpay checks if Razorpay is configured
func (pm *PaymentManager) HasRazorpay() bool {
	return pm.razorpay != nil
}

// HasStripe checks if Stripe is configured
func (pm *PaymentManager) HasStripe() bool {
	return pm.stripe != nil
}
