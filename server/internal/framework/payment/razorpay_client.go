package payment

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"

	"github.com/razorpay/razorpay-go"
)

// RazorpayClient handles Razorpay payment operations
type RazorpayClient struct {
	client *razorpay.Client
	config *RazorpayConfig
}

// RazorpayConfig holds Razorpay configuration
type RazorpayConfig struct {
	KeyID         string
	KeySecret     string
	WebhookSecret string
}

// RazorpayOrder represents a Razorpay order
type RazorpayOrder struct {
	ID         string  `json:"id"`
	Amount     float64 `json:"amount"`
	AmountPaid float64 `json:"amount_paid"`
	AmountDue  float64 `json:"amount_due"`
	Currency   string  `json:"currency"`
	Receipt    string  `json:"receipt"`
	Status     string  `json:"status"`
	Attempts   int     `json:"attempts"`
}

// RazorpayPayment represents a Razorpay payment
type RazorpayPayment struct {
	ID               string  `json:"id"`
	Entity           string  `json:"entity"`
	Amount           float64 `json:"amount"`
	Currency         string  `json:"currency"`
	Status           string  `json:"status"`
	OrderID          string  `json:"order_id"`
	Method           string  `json:"method"`
	Captured         bool    `json:"captured"`
	Email            string  `json:"email"`
	Contact          string  `json:"contact"`
	Fee              float64 `json:"fee"`
	Tax              float64 `json:"tax"`
	ErrorCode        string  `json:"error_code"`
	ErrorDescription string  `json:"error_description"`
}

// RazorpayTransfer represents a Razorpay transfer (for payouts to sellers)
type RazorpayTransfer struct {
	ID         string  `json:"id"`
	Amount     float64 `json:"amount"`
	Currency   string  `json:"currency"`
	Recipient  string  `json:"recipient"`
	Status     string  `json:"status"`
	SourceID   string  `json:"source"`
	SourceType string  `json:"source_type"`
}

// NewRazorpayClient creates a new Razorpay client
func NewRazorpayClient(config *RazorpayConfig) (*RazorpayClient, error) {
	if config.KeyID == "" || config.KeySecret == "" {
		return nil, errors.New("razorpay key_id and key_secret are required")
	}

	client := razorpay.NewClient(config.KeyID, config.KeySecret)

	return &RazorpayClient{
		client: client,
		config: config,
	}, nil
}

// CreateOrder creates a new Razorpay order for escrow-protected transaction
func (r *RazorpayClient) CreateOrder(ctx context.Context, amount float64, currency string, receipt string, notes map[string]interface{}) (*RazorpayOrder, error) {
	if amount <= 0 {
		return nil, errors.New("amount must be greater than 0")
	}

	if currency == "" {
		currency = "INR"
	}

	// Convert amount to paise (smallest currency unit)
	amountInPaise := int(amount * 100)

	data := map[string]interface{}{
		"amount":   amountInPaise,
		"currency": currency,
		"receipt":  receipt,
		"notes":    notes,
	}

	body, err := r.client.Order.Create(data, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create razorpay order: %w", err)
	}

	order := &RazorpayOrder{
		ID:       body["id"].(string),
		Amount:   float64(body["amount"].(int)) / 100,
		Currency: body["currency"].(string),
		Receipt:  body["receipt"].(string),
		Status:   body["status"].(string),
		Attempts: int(body["attempts"].(float64)),
	}

	if amountPaid, ok := body["amount_paid"].(int); ok {
		order.AmountPaid = float64(amountPaid) / 100
	}

	if amountDue, ok := body["amount_due"].(int); ok {
		order.AmountDue = float64(amountDue) / 100
	}

	return order, nil
}

// FetchOrder fetches an existing Razorpay order
func (r *RazorpayClient) FetchOrder(ctx context.Context, orderID string) (*RazorpayOrder, error) {
	if orderID == "" {
		return nil, errors.New("order_id is required")
	}

	body, err := r.client.Order.Fetch(orderID, nil, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch razorpay order: %w", err)
	}

	order := &RazorpayOrder{
		ID:       body["id"].(string),
		Amount:   float64(body["amount"].(int)) / 100,
		Currency: body["currency"].(string),
		Receipt:  body["receipt"].(string),
		Status:   body["status"].(string),
		Attempts: int(body["attempts"].(float64)),
	}

	if amountPaid, ok := body["amount_paid"].(int); ok {
		order.AmountPaid = float64(amountPaid) / 100
	}

	if amountDue, ok := body["amount_due"].(int); ok {
		order.AmountDue = float64(amountDue) / 100
	}

	return order, nil
}

// CapturePayment captures a payment after order confirmation (moves funds to platform escrow)
func (r *RazorpayClient) CapturePayment(ctx context.Context, paymentID string, amount float64, currency string) (*RazorpayPayment, error) {
	if paymentID == "" {
		return nil, errors.New("payment_id is required")
	}

	if amount <= 0 {
		return nil, errors.New("amount must be greater than 0")
	}

	if currency == "" {
		currency = "INR"
	}

	// Convert amount to paise
	amountInPaise := int(amount * 100)

	data := map[string]interface{}{
		"amount":   amountInPaise,
		"currency": currency,
	}

	body, err := r.client.Payment.Capture(paymentID, amountInPaise, data, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to capture payment: %w", err)
	}

	payment := &RazorpayPayment{
		ID:       body["id"].(string),
		Entity:   body["entity"].(string),
		Amount:   float64(body["amount"].(int)) / 100,
		Currency: body["currency"].(string),
		Status:   body["status"].(string),
		Method:   body["method"].(string),
		Captured: body["captured"].(bool),
	}

	if orderID, ok := body["order_id"].(string); ok {
		payment.OrderID = orderID
	}

	if email, ok := body["email"].(string); ok {
		payment.Email = email
	}

	if contact, ok := body["contact"].(string); ok {
		payment.Contact = contact
	}

	if fee, ok := body["fee"].(int); ok {
		payment.Fee = float64(fee) / 100
	}

	if tax, ok := body["tax"].(int); ok {
		payment.Tax = float64(tax) / 100
	}

	return payment, nil
}

// FetchPayment fetches payment details
func (r *RazorpayClient) FetchPayment(ctx context.Context, paymentID string) (*RazorpayPayment, error) {
	if paymentID == "" {
		return nil, errors.New("payment_id is required")
	}

	body, err := r.client.Payment.Fetch(paymentID, nil, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch payment: %w", err)
	}

	payment := &RazorpayPayment{
		ID:       body["id"].(string),
		Entity:   body["entity"].(string),
		Amount:   float64(body["amount"].(int)) / 100,
		Currency: body["currency"].(string),
		Status:   body["status"].(string),
		Method:   body["method"].(string),
		Captured: body["captured"].(bool),
	}

	if orderID, ok := body["order_id"].(string); ok {
		payment.OrderID = orderID
	}

	if email, ok := body["email"].(string); ok {
		payment.Email = email
	}

	if contact, ok := body["contact"].(string); ok {
		payment.Contact = contact
	}

	if errorCode, ok := body["error_code"].(string); ok {
		payment.ErrorCode = errorCode
	}

	if errorDesc, ok := body["error_description"].(string); ok {
		payment.ErrorDescription = errorDesc
	}

	return payment, nil
}

// RefundPayment refunds a captured payment (for disputes resolved in buyer's favor)
func (r *RazorpayClient) RefundPayment(ctx context.Context, paymentID string, amount *float64, notes map[string]interface{}) (map[string]interface{}, error) {
	if paymentID == "" {
		return nil, errors.New("payment_id is required")
	}

	data := map[string]interface{}{
		"notes": notes,
	}

	// If amount is specified, do partial refund
	if amount != nil && *amount > 0 {
		data["amount"] = int(*amount * 100)
	}

	body, err := r.client.Payment.Refund(paymentID, 0, data, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to refund payment: %w", err)
	}

	return body, nil
}

// CreateTransfer creates a transfer from platform to seller (payout after escrow release)
func (r *RazorpayClient) CreateTransfer(ctx context.Context, paymentID string, transfers []map[string]interface{}) (*RazorpayTransfer, error) {
	if paymentID == "" {
		return nil, errors.New("payment_id is required")
	}

	if len(transfers) == 0 {
		return nil, errors.New("at least one transfer is required")
	}

	data := map[string]interface{}{
		"transfers": transfers,
	}

	body, err := r.client.Payment.Transfer(paymentID, data, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create transfer: %w", err)
	}

	// Extract first transfer from response
	transfersData := body["items"].([]interface{})
	if len(transfersData) == 0 {
		return nil, errors.New("no transfers created")
	}

	firstTransfer := transfersData[0].(map[string]interface{})

	transfer := &RazorpayTransfer{
		ID:       firstTransfer["id"].(string),
		Amount:   float64(firstTransfer["amount"].(int)) / 100,
		Currency: firstTransfer["currency"].(string),
		Status:   firstTransfer["status"].(string),
	}

	if recipient, ok := firstTransfer["recipient"].(string); ok {
		transfer.Recipient = recipient
	}

	if source, ok := firstTransfer["source"].(string); ok {
		transfer.SourceID = source
	}

	if sourceType, ok := firstTransfer["source_type"].(string); ok {
		transfer.SourceType = sourceType
	}

	return transfer, nil
}

// VerifyPaymentSignature verifies the Razorpay payment signature for webhook security
func (r *RazorpayClient) VerifyPaymentSignature(orderID string, paymentID string, signature string) bool {
	// Manual verification using HMAC SHA256
	// Expected signature = hmac_sha256(order_id + "|" + payment_id, secret)
	h := hmac.New(sha256.New, []byte(r.config.KeySecret))
	h.Write([]byte(orderID + "|" + paymentID))
	expectedSignature := hex.EncodeToString(h.Sum(nil))
	return hmac.Equal([]byte(expectedSignature), []byte(signature))
}

// VerifyWebhookSignature verifies webhook signature for security
func (r *RazorpayClient) VerifyWebhookSignature(body []byte, signature string) bool {
	// Manual webhook verification using HMAC SHA256
	h := hmac.New(sha256.New, []byte(r.config.WebhookSecret))
	h.Write(body)
	expectedSignature := hex.EncodeToString(h.Sum(nil))
	return hmac.Equal([]byte(expectedSignature), []byte(signature))
}
