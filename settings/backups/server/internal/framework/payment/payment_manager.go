package payment

import (
	"context"
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
type PaymentManager struct {
	razorpay *RazorpayClient
	stripe   *StripeClient
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
