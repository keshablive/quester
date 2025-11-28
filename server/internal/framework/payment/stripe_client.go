package payment

import (
	"context"
	"errors"
	"fmt"

	"github.com/stripe/stripe-go/v76"
	"github.com/stripe/stripe-go/v76/checkout/session"
	"github.com/stripe/stripe-go/v76/paymentintent"
	"github.com/stripe/stripe-go/v76/refund"
	"github.com/stripe/stripe-go/v76/transfer"
	"github.com/stripe/stripe-go/v76/webhook"
)

// StripeClient handles Stripe payment operations
type StripeClient struct {
	config *StripeConfig
}

// StripeConfig holds Stripe configuration
type StripeConfig struct {
	SecretKey      string
	PublishableKey string
	WebhookSecret  string
}

// StripePaymentIntent represents a Stripe payment intent
type StripePaymentIntent struct {
	ID            string
	Amount        float64
	Currency      string
	Status        string
	ClientSecret  string
	PaymentMethod string
	ReceiptEmail  string
	Metadata      map[string]string
}

// StripeCheckoutSession represents a Stripe checkout session
type StripeCheckoutSession struct {
	ID              string
	PaymentIntentID string
	PaymentStatus   string
	CustomerEmail   string
	AmountTotal     float64
	Currency        string
	URL             string
}

// StripeTransfer represents a Stripe transfer (payout to sellers)
type StripeTransfer struct {
	ID                string
	Amount            float64
	Currency          string
	Destination       string
	Status            string
	SourceTransaction string
}

// NewStripeClient creates a new Stripe client
func NewStripeClient(config *StripeConfig) (*StripeClient, error) {
	if config.SecretKey == "" {
		return nil, errors.New("stripe secret_key is required")
	}

	// Set the secret key globally
	stripe.Key = config.SecretKey

	return &StripeClient{
		config: config,
	}, nil
}

// CreatePaymentIntent creates a new Stripe payment intent for escrow-protected transaction
func (s *StripeClient) CreatePaymentIntent(ctx context.Context, amount float64, currency string, customerEmail string, metadata map[string]string) (*StripePaymentIntent, error) {
	if amount <= 0 {
		return nil, errors.New("amount must be greater than 0")
	}

	if currency == "" {
		currency = "inr"
	}

	// Convert amount to smallest currency unit (paise for INR, cents for USD)
	amountInSmallestUnit := int64(amount * 100)

	params := &stripe.PaymentIntentParams{
		Amount:        stripe.Int64(amountInSmallestUnit),
		Currency:      stripe.String(currency),
		ReceiptEmail:  stripe.String(customerEmail),
		CaptureMethod: stripe.String("manual"), // Manual capture for escrow
	}

	// Add metadata
	for key, value := range metadata {
		params.AddMetadata(key, value)
	}

	pi, err := paymentintent.New(params)
	if err != nil {
		return nil, fmt.Errorf("failed to create payment intent: %w", err)
	}

	intent := &StripePaymentIntent{
		ID:           pi.ID,
		Amount:       float64(pi.Amount) / 100,
		Currency:     string(pi.Currency),
		Status:       string(pi.Status),
		ClientSecret: pi.ClientSecret,
	}

	if pi.PaymentMethod != nil {
		intent.PaymentMethod = pi.PaymentMethod.ID
	}

	if pi.ReceiptEmail != "" {
		intent.ReceiptEmail = pi.ReceiptEmail
	}

	if len(pi.Metadata) > 0 {
		intent.Metadata = pi.Metadata
	}

	return intent, nil
}

// CreateCheckoutSession creates a Stripe checkout session
func (s *StripeClient) CreateCheckoutSession(ctx context.Context, amount float64, currency string, successURL string, cancelURL string, metadata map[string]string) (*StripeCheckoutSession, error) {
	if amount <= 0 {
		return nil, errors.New("amount must be greater than 0")
	}

	if currency == "" {
		currency = "inr"
	}

	if successURL == "" || cancelURL == "" {
		return nil, errors.New("success_url and cancel_url are required")
	}

	// Convert amount to smallest currency unit
	amountInSmallestUnit := int64(amount * 100)

	params := &stripe.CheckoutSessionParams{
		Mode: stripe.String(string(stripe.CheckoutSessionModePayment)),
		LineItems: []*stripe.CheckoutSessionLineItemParams{
			{
				PriceData: &stripe.CheckoutSessionLineItemPriceDataParams{
					Currency: stripe.String(currency),
					ProductData: &stripe.CheckoutSessionLineItemPriceDataProductDataParams{
						Name: stripe.String("Marketplace Purchase"),
					},
					UnitAmount: stripe.Int64(amountInSmallestUnit),
				},
				Quantity: stripe.Int64(1),
			},
		},
		SuccessURL: stripe.String(successURL),
		CancelURL:  stripe.String(cancelURL),
		PaymentIntentData: &stripe.CheckoutSessionPaymentIntentDataParams{
			CaptureMethod: stripe.String("manual"), // Manual capture for escrow
		},
	}

	// Add metadata
	for key, value := range metadata {
		params.AddMetadata(key, value)
	}

	sess, err := session.New(params)
	if err != nil {
		return nil, fmt.Errorf("failed to create checkout session: %w", err)
	}

	checkoutSession := &StripeCheckoutSession{
		ID:            sess.ID,
		PaymentStatus: string(sess.PaymentStatus),
		AmountTotal:   float64(sess.AmountTotal) / 100,
		Currency:      string(sess.Currency),
		URL:           sess.URL,
	}

	if sess.PaymentIntent != nil {
		checkoutSession.PaymentIntentID = sess.PaymentIntent.ID
	}

	if sess.CustomerDetails != nil && sess.CustomerDetails.Email != "" {
		checkoutSession.CustomerEmail = sess.CustomerDetails.Email
	}

	return checkoutSession, nil
}

// CapturePayment captures a payment intent (moves funds to platform escrow)
func (s *StripeClient) CapturePayment(ctx context.Context, paymentIntentID string) (*StripePaymentIntent, error) {
	if paymentIntentID == "" {
		return nil, errors.New("payment_intent_id is required")
	}

	params := &stripe.PaymentIntentCaptureParams{}

	pi, err := paymentintent.Capture(paymentIntentID, params)
	if err != nil {
		return nil, fmt.Errorf("failed to capture payment intent: %w", err)
	}

	intent := &StripePaymentIntent{
		ID:       pi.ID,
		Amount:   float64(pi.Amount) / 100,
		Currency: string(pi.Currency),
		Status:   string(pi.Status),
	}

	if pi.PaymentMethod != nil {
		intent.PaymentMethod = pi.PaymentMethod.ID
	}

	if pi.ReceiptEmail != "" {
		intent.ReceiptEmail = pi.ReceiptEmail
	}

	if len(pi.Metadata) > 0 {
		intent.Metadata = pi.Metadata
	}

	return intent, nil
}

// FetchPaymentIntent fetches a payment intent
func (s *StripeClient) FetchPaymentIntent(ctx context.Context, paymentIntentID string) (*StripePaymentIntent, error) {
	if paymentIntentID == "" {
		return nil, errors.New("payment_intent_id is required")
	}

	pi, err := paymentintent.Get(paymentIntentID, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch payment intent: %w", err)
	}

	intent := &StripePaymentIntent{
		ID:       pi.ID,
		Amount:   float64(pi.Amount) / 100,
		Currency: string(pi.Currency),
		Status:   string(pi.Status),
	}

	if pi.PaymentMethod != nil {
		intent.PaymentMethod = pi.PaymentMethod.ID
	}

	if pi.ReceiptEmail != "" {
		intent.ReceiptEmail = pi.ReceiptEmail
	}

	if len(pi.Metadata) > 0 {
		intent.Metadata = pi.Metadata
	}

	return intent, nil
}

// RefundPayment refunds a payment intent (for disputes resolved in buyer's favor)
func (s *StripeClient) RefundPayment(ctx context.Context, paymentIntentID string, amount *float64, reason string) (*stripe.Refund, error) {
	if paymentIntentID == "" {
		return nil, errors.New("payment_intent_id is required")
	}

	params := &stripe.RefundParams{
		PaymentIntent: stripe.String(paymentIntentID),
	}

	// If amount is specified, do partial refund
	if amount != nil && *amount > 0 {
		params.Amount = stripe.Int64(int64(*amount * 100))
	}

	// Add reason if provided
	if reason != "" {
		params.Reason = stripe.String(reason)
	}

	r, err := refund.New(params)
	if err != nil {
		return nil, fmt.Errorf("failed to refund payment: %w", err)
	}

	return r, nil
}

// CreateTransfer creates a transfer from platform to seller (payout after escrow release)
func (s *StripeClient) CreateTransfer(ctx context.Context, amount float64, currency string, destination string, metadata map[string]string) (*StripeTransfer, error) {
	if amount <= 0 {
		return nil, errors.New("amount must be greater than 0")
	}

	if destination == "" {
		return nil, errors.New("destination (connected account ID) is required")
	}

	if currency == "" {
		currency = "inr"
	}

	// Convert amount to smallest currency unit
	amountInSmallestUnit := int64(amount * 100)

	params := &stripe.TransferParams{
		Amount:      stripe.Int64(amountInSmallestUnit),
		Currency:    stripe.String(currency),
		Destination: stripe.String(destination),
	}

	// Add metadata
	for key, value := range metadata {
		params.AddMetadata(key, value)
	}

	t, err := transfer.New(params)
	if err != nil {
		return nil, fmt.Errorf("failed to create transfer: %w", err)
	}

	transferResult := &StripeTransfer{
		ID:          t.ID,
		Amount:      float64(t.Amount) / 100,
		Currency:    string(t.Currency),
		Destination: t.Destination.ID,
	}

	if t.SourceTransaction != nil {
		transferResult.SourceTransaction = t.SourceTransaction.ID
	}

	return transferResult, nil
}

// VerifyWebhookSignature verifies webhook signature for security
func (s *StripeClient) VerifyWebhookSignature(payload []byte, signature string) (*stripe.Event, error) {
	if s.config.WebhookSecret == "" {
		return nil, errors.New("webhook_secret is required for signature verification")
	}

	event, err := webhook.ConstructEvent(payload, signature, s.config.WebhookSecret)
	if err != nil {
		return nil, fmt.Errorf("failed to verify webhook signature: %w", err)
	}

	return &event, nil
}

// CancelPaymentIntent cancels a payment intent before capture
func (s *StripeClient) CancelPaymentIntent(ctx context.Context, paymentIntentID string) (*StripePaymentIntent, error) {
	if paymentIntentID == "" {
		return nil, errors.New("payment_intent_id is required")
	}

	params := &stripe.PaymentIntentCancelParams{}

	pi, err := paymentintent.Cancel(paymentIntentID, params)
	if err != nil {
		return nil, fmt.Errorf("failed to cancel payment intent: %w", err)
	}

	intent := &StripePaymentIntent{
		ID:       pi.ID,
		Amount:   float64(pi.Amount) / 100,
		Currency: string(pi.Currency),
		Status:   string(pi.Status),
	}

	return intent, nil
}
