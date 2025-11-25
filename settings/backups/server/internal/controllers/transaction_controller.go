package controllers

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"log"
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/yourusername/quester/internal/framework/config"
	"github.com/yourusername/quester/internal/framework/core"
	"github.com/yourusername/quester/internal/framework/responses"
	"github.com/yourusername/quester/internal/framework/utils"
	"github.com/yourusername/quester/internal/models"
	"github.com/yourusername/quester/internal/services"
)

// TransactionController handles transaction HTTP requests
type TransactionController struct {
	transactionService *services.TransactionService
	config             *config.Config
}

// NewTransactionController creates a new transaction controller
func NewTransactionController(transactionService *services.TransactionService, cfg *config.Config) *TransactionController {
	return &TransactionController{
		transactionService: transactionService,
		config:             cfg,
	}
}

// InitiateTransaction initiates a new transaction
// POST /api/transactions
func (tc *TransactionController) InitiateTransaction(c *fiber.Ctx) error {
	ctx := c.Context()
	claims := c.Locals("claims").(*core.Claims)

	tenantID, err := core.GetTenantIDUUID(claims)
	if err != nil {
		return responses.BadRequest(c, "Invalid tenant ID")
	}

	userID, err := core.GetUserID(claims)
	if err != nil {
		return responses.BadRequest(c, "Invalid user ID")
	}

	var req struct {
		ListingID      uuid.UUID             `json:"listing_id" validate:"required"`
		PaymentGateway models.PaymentGateway `json:"payment_gateway" validate:"required"`
	}

	if err := c.BodyParser(&req); err != nil {
		return responses.BadRequest(c, "Invalid request body")
	}

	if err := core.ValidateStruct(&req); err != nil {
		return responses.BadRequest(c, err.Error())
	}

	// Validate payment gateway
	validGateways := []models.PaymentGateway{
		models.PaymentGatewayRazorpay,
		models.PaymentGatewayStripe,
		models.PaymentGatewayPayPal,
		models.PaymentGatewayCrypto,
		models.PaymentGatewayUPI,
	}

	isValid := false
	for _, gateway := range validGateways {
		if req.PaymentGateway == gateway {
			isValid = true
			break
		}
	}

	if !isValid {
		return responses.BadRequest(c, "Invalid payment gateway")
	}

	transaction, paymentOrder, err := tc.transactionService.InitiateTransaction(
		ctx,
		tenantID,
		userID,
		req.ListingID,
		req.PaymentGateway,
	)
	if err != nil {
		return responses.HandleServiceError(c, err)
	}

	return responses.Created(c, fiber.Map{
		"transaction":   transaction,
		"payment_order": paymentOrder,
	})
}

// ConfirmPayment confirms payment and moves transaction to escrow
// POST /api/transactions/:id/confirm
func (tc *TransactionController) ConfirmPayment(c *fiber.Ctx) error {
	ctx := c.Context()
	claims := c.Locals("claims").(*core.Claims)

	tenantID, err := core.GetTenantIDUUID(claims)
	if err != nil {
		return responses.BadRequest(c, "Invalid tenant ID")
	}

	transactionID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return responses.BadRequest(c, "Invalid transaction ID")
	}

	var req struct {
		PaymentID string `json:"payment_id" validate:"required"`
		Signature string `json:"signature"` // For webhook verification
	}

	if err := c.BodyParser(&req); err != nil {
		return responses.BadRequest(c, "Invalid request body")
	}

	if err := core.ValidateStruct(&req); err != nil {
		return responses.BadRequest(c, err.Error())
	}

	transaction, err := tc.transactionService.ConfirmPayment(ctx, tenantID, transactionID, req.PaymentID)
	if err != nil {
		return responses.HandleServiceError(c, err)
	}

	return responses.Success(c, transaction)
}

// ConfirmDelivery confirms delivery and triggers fund release
// POST /api/transactions/:id/confirm-delivery
func (tc *TransactionController) ConfirmDelivery(c *fiber.Ctx) error {
	ctx := c.Context()
	claims := c.Locals("claims").(*core.Claims)

	tenantID, err := core.GetTenantIDUUID(claims)
	if err != nil {
		return responses.BadRequest(c, "Invalid tenant ID")
	}

	userID, err := core.GetUserID(claims)
	if err != nil {
		return responses.BadRequest(c, "Invalid user ID")
	}

	transactionID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return responses.BadRequest(c, "Invalid transaction ID")
	}

	transaction, err := tc.transactionService.ConfirmDelivery(ctx, tenantID, transactionID, userID)
	if err != nil {
		return responses.HandleServiceError(c, err)
	}

	return responses.Success(c, transaction)
}

// ReleaseFunds releases funds to seller
// POST /api/transactions/:id/release
func (tc *TransactionController) ReleaseFunds(c *fiber.Ctx) error {
	ctx := c.Context()
	claims := c.Locals("claims").(*core.Claims)

	tenantID, err := core.GetTenantIDUUID(claims)
	if err != nil {
		return responses.BadRequest(c, "Invalid tenant ID")
	}

	userID, err := core.GetUserID(claims)
	if err != nil {
		return responses.BadRequest(c, "Invalid user ID")
	}

	transactionID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return responses.BadRequest(c, "Invalid transaction ID")
	}

	transaction, err := tc.transactionService.ReleaseFunds(ctx, tenantID, transactionID, userID)
	if err != nil {
		return responses.HandleServiceError(c, err)
	}

	return responses.Success(c, transaction)
}

// OpenDispute opens a dispute for a transaction
// POST /api/transactions/:id/dispute
func (tc *TransactionController) OpenDispute(c *fiber.Ctx) error {
	ctx := c.Context()
	claims := c.Locals("claims").(*core.Claims)

	tenantID, err := core.GetTenantIDUUID(claims)
	if err != nil {
		return responses.BadRequest(c, "Invalid tenant ID")
	}

	userID, err := core.GetUserID(claims)
	if err != nil {
		return responses.BadRequest(c, "Invalid user ID")
	}

	transactionID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return responses.BadRequest(c, "Invalid transaction ID")
	}

	var req struct {
		Reason string `json:"reason" validate:"required,min=10"`
	}

	if err := c.BodyParser(&req); err != nil {
		return responses.BadRequest(c, "Invalid request body")
	}

	if err := core.ValidateStruct(&req); err != nil {
		return responses.BadRequest(c, err.Error())
	}

	// Sanitize reason to prevent XSS attacks
	sanitizedReason := utils.SanitizeHTML(req.Reason)

	transaction, err := tc.transactionService.OpenDispute(ctx, tenantID, transactionID, userID, sanitizedReason)
	if err != nil {
		return responses.HandleServiceError(c, err)
	}

	return responses.Success(c, transaction)
}

// ResolveDispute resolves a dispute (admin only)
// POST /api/transactions/:id/resolve-dispute
func (tc *TransactionController) ResolveDispute(c *fiber.Ctx) error {
	ctx := c.Context()
	claims := c.Locals("claims").(*core.Claims)

	tenantID, err := core.GetTenantIDUUID(claims)
	if err != nil {
		return responses.BadRequest(c, "Invalid tenant ID")
	}

	userID, err := core.GetUserID(claims)
	if err != nil {
		return responses.BadRequest(c, "Invalid user ID")
	}

	// TODO: Add admin role check
	// if !claims.IsAdmin() {
	// 	return responses.Forbidden(c, "Admin access required")
	// }

	transactionID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return responses.BadRequest(c, "Invalid transaction ID")
	}

	var req struct {
		InFavorOfBuyer bool   `json:"in_favor_of_buyer"`
		Resolution     string `json:"resolution" validate:"required,min=10"`
	}

	if err := c.BodyParser(&req); err != nil {
		return responses.BadRequest(c, "Invalid request body")
	}

	if err := core.ValidateStruct(&req); err != nil {
		return responses.BadRequest(c, err.Error())
	}

	transaction, err := tc.transactionService.ResolveDispute(
		ctx,
		tenantID,
		transactionID,
		userID,
		req.InFavorOfBuyer,
		req.Resolution,
	)
	if err != nil {
		return responses.HandleServiceError(c, err)
	}

	return responses.Success(c, transaction)
}

// GetTransaction retrieves a single transaction
// GET /api/transactions/:id
func (tc *TransactionController) GetTransaction(c *fiber.Ctx) error {
	ctx := c.Context()
	claims := c.Locals("claims").(*core.Claims)

	tenantID, err := core.GetTenantIDUUID(claims)
	if err != nil {
		return responses.BadRequest(c, "Invalid tenant ID")
	}

	userID, err := core.GetUserID(claims)
	if err != nil {
		return responses.BadRequest(c, "Invalid user ID")
	}

	transactionID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return responses.BadRequest(c, "Invalid transaction ID")
	}

	transaction, err := tc.transactionService.GetTransaction(ctx, tenantID, transactionID)
	if err != nil {
		return responses.HandleServiceError(c, err)
	}

	// Verify user has access (buyer or seller)
	if transaction.BuyerID != userID && transaction.SellerID != userID {
		return responses.Forbidden(c, "You don't have access to this transaction")
	}

	return responses.Success(c, transaction)
}

// GetMyTransactions retrieves user's transactions
// GET /api/transactions
func (tc *TransactionController) GetMyTransactions(c *fiber.Ctx) error {
	ctx := c.Context()
	claims := c.Locals("claims").(*core.Claims)

	tenantID, err := core.GetTenantIDUUID(claims)
	if err != nil {
		return responses.BadRequest(c, "Invalid tenant ID")
	}

	userID, err := core.GetUserID(claims)
	if err != nil {
		return responses.BadRequest(c, "Invalid user ID")
	}

	page, _ := strconv.Atoi(c.Query("page", "1"))
	pageSize, _ := strconv.Atoi(c.Query("page_size", "20"))
	role := c.Query("role", "all") // "buyer", "seller", or "all"

	transactions, total, err := tc.transactionService.GetUserTransactions(
		ctx,
		tenantID,
		userID,
		role,
		page,
		pageSize,
	)
	if err != nil {
		return responses.HandleServiceError(c, err)
	}

	return responses.SuccessWithPagination(c, transactions, int64(page), pageSize, int(total))
}

// GetDisputedTransactions retrieves all disputed transactions (admin only)
// GET /api/transactions/disputed
func (tc *TransactionController) GetDisputedTransactions(c *fiber.Ctx) error {
	// TODO: Implement admin-only disputed transactions endpoint
	// ctx := c.Context()
	// claims := c.Locals("claims").(*core.Claims)
	// page, _ := strconv.Atoi(c.Query("page", "1"))
	// pageSize, _ := strconv.Atoi(c.Query("page_size", "20"))

	return responses.Success(c, fiber.Map{
		"message": "Admin endpoint - not yet implemented",
	})
}

// WebhookRazorpay handles Razorpay webhook events
// POST /api/webhooks/razorpay
func (tc *TransactionController) WebhookRazorpay(c *fiber.Ctx) error {
	// Verify webhook signature
	signature := c.Get("X-Razorpay-Signature")
	if signature == "" {
		log.Printf("[WEBHOOK] Razorpay webhook rejected: missing signature")
		return responses.Unauthorized(c, "Missing webhook signature")
	}

	// Get raw body for signature verification
	body := c.Body()

	// Verify signature using HMAC-SHA256
	if !tc.verifyRazorpaySignature(body, signature) {
		log.Printf("[WEBHOOK] Razorpay webhook rejected: invalid signature")
		return responses.Unauthorized(c, "Invalid webhook signature")
	}

	var event map[string]interface{}
	if err := c.BodyParser(&event); err != nil {
		log.Printf("[WEBHOOK] Razorpay webhook rejected: invalid payload - %v", err)
		return responses.BadRequest(c, "Invalid webhook payload")
	}

	// Process event based on type
	eventType, ok := event["event"].(string)
	if !ok {
		return responses.BadRequest(c, "Missing event type")
	}

	log.Printf("[WEBHOOK] Razorpay webhook received and verified: event=%s", eventType)

	// Handle different event types
	switch eventType {
	case "payment.captured":
		// Payment was captured successfully
		// Auto-confirm transaction and move to escrow
		// TODO: Implement payment captured handler
		log.Printf("[WEBHOOK] Razorpay payment.captured event (handler pending)")

	case "payment.failed":
		// Payment failed
		// Update transaction status to failed
		// TODO: Implement payment failed handler
		log.Printf("[WEBHOOK] Razorpay payment.failed event (handler pending)")

	case "refund.created":
		// Refund was processed
		// Update transaction status
		// TODO: Implement refund created handler
		log.Printf("[WEBHOOK] Razorpay refund.created event (handler pending)")
	}

	return responses.Success(c, fiber.Map{
		"message": "Webhook received",
	})
} // WebhookStripe handles Stripe webhook events
// POST /api/webhooks/stripe
func (tc *TransactionController) WebhookStripe(c *fiber.Ctx) error {
	// Verify webhook signature
	signature := c.Get("Stripe-Signature")
	if signature == "" {
		return responses.Unauthorized(c, "Missing webhook signature")
	}

	// Get raw body for signature verification
	body := c.Body()

	// Verify signature using Stripe's method
	if !tc.verifyStripeSignature(body, signature) {
		return responses.Unauthorized(c, "Invalid webhook signature")
	}

	var event map[string]interface{}
	if err := c.BodyParser(&event); err != nil {
		return responses.BadRequest(c, "Invalid webhook payload")
	}

	// Process event based on type
	eventType, ok := event["type"].(string)
	if !ok {
		return responses.BadRequest(c, "Missing event type")
	}

	// Handle different event types
	switch eventType {
	case "payment_intent.succeeded":
		// Payment was successful
		// Auto-confirm transaction and move to escrow
		// TODO: Implement payment succeeded handler

	case "payment_intent.payment_failed":
		// Payment failed
		// Update transaction status to failed
		// TODO: Implement payment failed handler

	case "charge.refunded":
		// Refund was processed
		// Update transaction status
		// TODO: Implement refund handler
	}

	return responses.Success(c, fiber.Map{
		"message": "Webhook received",
	})
}

// verifyRazorpaySignature verifies the Razorpay webhook signature
func (tc *TransactionController) verifyRazorpaySignature(body []byte, signature string) bool {
	if tc.config.RazorpayWebhookSecret == "" {
		return false // Reject if secret not configured
	}

	// Create HMAC-SHA256 hash
	mac := hmac.New(sha256.New, []byte(tc.config.RazorpayWebhookSecret))
	mac.Write(body)
	expectedSignature := hex.EncodeToString(mac.Sum(nil))

	// Compare signatures (constant-time comparison to prevent timing attacks)
	return hmac.Equal([]byte(signature), []byte(expectedSignature))
}

// verifyStripeSignature verifies the Stripe webhook signature
func (tc *TransactionController) verifyStripeSignature(body []byte, signatureHeader string) bool {
	if tc.config.StripeWebhookSecret == "" {
		return false // Reject if secret not configured
	}

	// Parse Stripe signature header (format: t=timestamp,v1=signature)
	// For simplicity, we'll extract the v1 signature
	// In production, use stripe-go SDK for proper verification

	// Simple implementation - extract v1 signature
	var timestamp, v1Signature string
	parts := strings.Split(signatureHeader, ",")
	for _, part := range parts {
		if len(part) > 2 {
			if part[:2] == "t=" {
				timestamp = part[2:]
			} else if len(part) > 3 && part[:3] == "v1=" {
				v1Signature = part[3:]
			}
		}
	}

	if timestamp == "" || v1Signature == "" {
		return false
	}

	// Construct signed payload: timestamp.body
	signedPayload := timestamp + "." + string(body)

	// Create HMAC-SHA256 hash
	mac := hmac.New(sha256.New, []byte(tc.config.StripeWebhookSecret))
	mac.Write([]byte(signedPayload))
	expectedSignature := hex.EncodeToString(mac.Sum(nil))

	// Compare signatures (constant-time comparison)
	return hmac.Equal([]byte(v1Signature), []byte(expectedSignature))
}
