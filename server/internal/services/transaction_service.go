package services

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/keshablive/quester/internal/framework/interfaces"
	"github.com/keshablive/quester/internal/framework/payment"
	"github.com/keshablive/quester/internal/models"
	"github.com/keshablive/quester/internal/repositories"

	"gorm.io/gorm"
)

// TransactionService handles transaction and escrow business logic
type TransactionService struct {
	db                  *gorm.DB // Retained for Phase 5 - escrow state transitions via model methods
	transactionRepo     interfaces.TransactionRepository
	marketplaceRepo     *repositories.MarketplaceListingRepository
	userRepo            *repositories.UserRepository
	paymentManager      *payment.PaymentManager
	notificationService *NotificationService
}

// NewTransactionService creates a new transaction service
// Note: db parameter retained for Phase 5 escrow operations - will be removed when TransactionManager pattern implemented
func NewTransactionService(
	transactionRepo interfaces.TransactionRepository,
	db *gorm.DB,
	marketplaceRepo *repositories.MarketplaceListingRepository,
	userRepo *repositories.UserRepository,
	paymentManager *payment.PaymentManager,
	notificationService *NotificationService,
) *TransactionService {
	return &TransactionService{
		db:                  db,
		transactionRepo:     transactionRepo,
		marketplaceRepo:     marketplaceRepo,
		userRepo:            userRepo,
		paymentManager:      paymentManager,
		notificationService: notificationService,
	}
}

// InitiateTransaction initiates a new transaction
func (s *TransactionService) InitiateTransaction(ctx context.Context, tenantID uuid.UUID, buyerID uuid.UUID, listingID uuid.UUID, paymentGateway models.PaymentGateway) (*models.Transaction, interface{}, error) {
	// Fetch listing
	listing, err := s.marketplaceRepo.FindByID(ctx, tenantID, listingID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil, fmt.Errorf("listing not found")
		}
		return nil, nil, fmt.Errorf("failed to fetch listing")
	}

	// Check if listing is available
	if !listing.IsAvailable() {
		return nil, nil, fmt.Errorf("listing is not available for purchase")
	}

	// Prevent self-purchase
	if listing.SellerID == buyerID {
		return nil, nil, fmt.Errorf("you cannot purchase your own listing")
	}

	// Calculate amounts
	commissionAmount := listing.CalculateCommission()
	sellerPayout := listing.CalculateSellerPayout()

	// Create transaction
	transaction := &models.Transaction{
		TenantID:         tenantID,
		BuyerID:          buyerID,
		SellerID:         listing.SellerID,
		ListingID:        listing.ID,
		Status:           models.TransactionStatusInitiated,
		Amount:           listing.Price,
		Currency:         listing.Currency,
		CommissionAmount: commissionAmount,
		SellerPayout:     sellerPayout,
		PaymentGateway:   paymentGateway,
	}

	// Create transaction in database
	if err := s.transactionRepo.Create(ctx, transaction); err != nil {
		return nil, nil, fmt.Errorf("failed to create transaction")
	}

	// Create payment order with selected gateway
	var paymentOrder interface{}
	var paymentErr error

	switch paymentGateway {
	case models.PaymentGatewayRazorpay:
		if !s.paymentManager.HasRazorpay() {
			return nil, nil, fmt.Errorf("razorpay is not configured")
		}

		receipt := fmt.Sprintf("TXN-%d-%d", tenantID, transaction.ID)
		notes := map[string]interface{}{
			"transaction_id": transaction.ID,
			"listing_id":     listing.ID,
			"buyer_id":       buyerID,
			"seller_id":      listing.SellerID,
		}

		paymentOrder, paymentErr = s.paymentManager.GetRazorpay().CreateOrder(
			ctx,
			transaction.Amount,
			transaction.Currency,
			receipt,
			notes,
		)

	case models.PaymentGatewayStripe:
		if !s.paymentManager.HasStripe() {
			return nil, nil, fmt.Errorf("stripe is not configured")
		}

		// Parse buyer UUID
		buyerUUID := uuid.MustParse(fmt.Sprintf("%016x-0000-0000-0000-000000000000", buyerID))

		// Get buyer email
		buyer, err := s.userRepo.FindByID(ctx, buyerUUID)
		if err != nil {
			return nil, nil, fmt.Errorf("failed to fetch buyer")
		}

		metadata := map[string]string{
			"transaction_id": fmt.Sprintf("%d", transaction.ID),
			"listing_id":     fmt.Sprintf("%d", listing.ID),
			"buyer_id":       fmt.Sprintf("%d", buyerID),
			"seller_id":      fmt.Sprintf("%d", listing.SellerID),
		}

		paymentOrder, paymentErr = s.paymentManager.GetStripe().CreatePaymentIntent(
			ctx,
			transaction.Amount,
			transaction.Currency,
			buyer.Email,
			metadata,
		)

	default:
		return nil, nil, fmt.Errorf("unsupported payment gateway: %s", paymentGateway)
	}

	if paymentErr != nil {
		// Update transaction status to failed
		transaction.Status = models.TransactionStatusFailed
		s.transactionRepo.Update(ctx, transaction)

		return nil, nil, fmt.Errorf("failed to create payment order: %v", paymentErr)
	}

	// Update transaction with payment ID
	var paymentID string
	switch paymentGateway {
	case models.PaymentGatewayRazorpay:
		razorpayOrder := paymentOrder.(*payment.RazorpayOrder)
		paymentID = razorpayOrder.ID
	case models.PaymentGatewayStripe:
		stripeIntent := paymentOrder.(*payment.StripePaymentIntent)
		paymentID = stripeIntent.ID
	}

	transaction.PaymentID = paymentID
	transaction.Status = models.TransactionStatusPending

	if err := s.transactionRepo.Update(ctx, transaction); err != nil {
		return nil, nil, fmt.Errorf("failed to update transaction")
	}

	return transaction, paymentOrder, nil
}

// ConfirmPayment confirms payment and moves transaction to escrow
func (s *TransactionService) ConfirmPayment(ctx context.Context, tenantID uuid.UUID, transactionID uuid.UUID, paymentID string) (*models.Transaction, error) {
	// Fetch transaction
	transaction, err := s.transactionRepo.FindByID(ctx, tenantID, transactionID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("transaction not found")
		}
		return nil, fmt.Errorf("failed to fetch transaction")
	}

	// Verify transaction is in pending status
	if transaction.Status != models.TransactionStatusPending {
		return nil, fmt.Errorf("transaction is in %s status, cannot confirm", transaction.Status)
	}

	// Verify payment ID matches
	if transaction.PaymentID != paymentID {
		return nil, fmt.Errorf("payment ID mismatch")
	}

	// Capture payment based on gateway
	switch transaction.PaymentGateway {
	case models.PaymentGatewayRazorpay:
		if !s.paymentManager.HasRazorpay() {
			return nil, fmt.Errorf("razorpay is not configured")
		}

		_, err = s.paymentManager.GetRazorpay().CapturePayment(
			ctx,
			paymentID,
			transaction.Amount,
			transaction.Currency,
		)

	case models.PaymentGatewayStripe:
		if !s.paymentManager.HasStripe() {
			return nil, fmt.Errorf("stripe is not configured")
		}

		_, err = s.paymentManager.GetStripe().CapturePayment(ctx, paymentID)
	}

	if err != nil {
		transaction.Status = models.TransactionStatusFailed
		s.transactionRepo.Update(ctx, transaction)

		return nil, fmt.Errorf("failed to capture payment: %v", err)
	}

	// Transition to escrow_held
	if err := transaction.TransitionToEscrow(s.db.WithContext(ctx)); err != nil {
		return nil, fmt.Errorf("failed to transition to escrow")
	}

	// Decrement listing quantity (for physical goods)
	listing, err := s.marketplaceRepo.FindByID(ctx, tenantID, transaction.ListingID)
	if err == nil && listing.Quantity != nil {
		if err := listing.DecrementQuantity(s.db.WithContext(ctx)); err != nil {
			// Log error but don't fail transaction
			fmt.Printf("Warning: failed to decrement listing quantity: %v\n", err)
		}
	}

	// Send notifications
	go s.sendEscrowNotifications(context.Background(), transaction)

	return transaction, nil
}

// ConfirmDelivery confirms delivery and starts 7-day release timer
func (s *TransactionService) ConfirmDelivery(ctx context.Context, tenantID uuid.UUID, transactionID uuid.UUID, sellerID uuid.UUID) (*models.Transaction, error) {
	// Fetch transaction
	transaction, err := s.transactionRepo.FindByID(ctx, tenantID, transactionID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("transaction not found")
		}
		return nil, fmt.Errorf("failed to fetch transaction")
	}

	// Verify seller ownership
	if transaction.SellerID != sellerID {
		return nil, fmt.Errorf("only the seller can confirm delivery")
	}

	// Confirm delivery
	if err := transaction.ConfirmDelivery(s.db.WithContext(ctx)); err != nil {
		if errors.Is(err, gorm.ErrInvalidTransaction) {
			return nil, fmt.Errorf("cannot confirm delivery for transaction in %s status", transaction.Status)
		}
		return nil, fmt.Errorf("failed to confirm delivery")
	}

	// Send notifications
	go s.sendDeliveryNotifications(context.Background(), transaction)

	return transaction, nil
}

// ReleaseFunds releases funds to the seller (manual by buyer)
func (s *TransactionService) ReleaseFunds(ctx context.Context, tenantID uuid.UUID, transactionID uuid.UUID, buyerID uuid.UUID) (*models.Transaction, error) {
	// Fetch transaction
	transaction, err := s.transactionRepo.FindByID(ctx, tenantID, transactionID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("transaction not found")
		}
		return nil, fmt.Errorf("failed to fetch transaction")
	}

	// Verify buyer ownership
	if transaction.BuyerID != buyerID {
		return nil, fmt.Errorf("only the buyer can release funds")
	}

	// Release funds
	if err := s.releaseFundsToSeller(ctx, transaction); err != nil {
		return nil, err
	}

	return transaction, nil
}

// OpenDispute opens a dispute for a transaction
func (s *TransactionService) OpenDispute(ctx context.Context, tenantID uuid.UUID, transactionID uuid.UUID, buyerID uuid.UUID, reason string) (*models.Transaction, error) {
	// Fetch transaction
	transaction, err := s.transactionRepo.FindByID(ctx, tenantID, transactionID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("transaction not found")
		}
		return nil, fmt.Errorf("failed to fetch transaction")
	}

	// Verify buyer ownership
	if transaction.BuyerID != buyerID {
		return nil, fmt.Errorf("only the buyer can open a dispute")
	}

	// Check if can open dispute
	if !transaction.CanOpenDispute() {
		return nil, fmt.Errorf("dispute window has closed or transaction is not in valid status")
	}

	// Open dispute
	if err := transaction.OpenDispute(s.db.WithContext(ctx), reason); err != nil {
		if errors.Is(err, gorm.ErrInvalidData) {
			return nil, fmt.Errorf("dispute window has closed (14 days from purchase)")
		}
		return nil, fmt.Errorf("failed to open dispute")
	}

	// Send notifications
	go s.sendDisputeNotifications(context.Background(), transaction)

	return transaction, nil
}

// ResolveDispute resolves a dispute (admin only)
func (s *TransactionService) ResolveDispute(ctx context.Context, tenantID uuid.UUID, transactionID uuid.UUID, adminID uuid.UUID, inFavorOfBuyer bool, resolution string) (*models.Transaction, error) {
	// Fetch transaction
	transaction, err := s.transactionRepo.FindByID(ctx, tenantID, transactionID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("transaction not found")
		}
		return nil, fmt.Errorf("failed to fetch transaction")
	}

	// Resolve dispute
	if err := transaction.ResolveDispute(s.db.WithContext(ctx), inFavorOfBuyer, resolution, adminID); err != nil {
		if errors.Is(err, gorm.ErrInvalidTransaction) {
			return nil, fmt.Errorf("transaction is not in disputed status")
		}
		return nil, fmt.Errorf("failed to resolve dispute")
	}

	// Process refund or payout
	if inFavorOfBuyer {
		// Refund to buyer
		if err := s.refundToBuyer(ctx, transaction); err != nil {
			return nil, err
		}
	} else {
		// Release to seller
		if err := s.releaseFundsToSeller(ctx, transaction); err != nil {
			return nil, err
		}
	}

	// Send notifications
	go s.sendDisputeResolutionNotifications(context.Background(), transaction, inFavorOfBuyer)

	return transaction, nil
}

// GetTransaction retrieves a transaction by ID
func (s *TransactionService) GetTransaction(ctx context.Context, tenantID uuid.UUID, transactionID uuid.UUID) (*models.Transaction, error) {
	transaction, err := s.transactionRepo.FindByID(ctx, tenantID, transactionID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("transaction not found")
		}
		return nil, fmt.Errorf("failed to fetch transaction")
	}

	return transaction, nil
}

// GetUserTransactions retrieves transactions for a user (as buyer or seller)
func (s *TransactionService) GetUserTransactions(ctx context.Context, tenantID uuid.UUID, userID uuid.UUID, role string, page int, pageSize int) ([]*models.Transaction, int64, error) {
	// Set default pagination
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	offset := (page - 1) * pageSize

	query := s.db.WithContext(ctx).
		Where("tenant_id = ?", tenantID).
		Preload("Buyer").
		Preload("Seller").
		Preload("Listing")

	// Filter by role
	if role == "buyer" {
		query = query.Where("buyer_id = ?", userID)
	} else if role == "seller" {
		query = query.Where("seller_id = ?", userID)
	} else {
		query = query.Where("buyer_id = ? OR seller_id = ?", userID, userID)
	}

	// Get total count
	var total int64
	if err := query.Model(&models.Transaction{}).Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("failed to count transactions")
	}

	// Get paginated transactions
	var transactions []*models.Transaction
	if err := query.
		Order("created_at DESC").
		Offset(offset).
		Limit(pageSize).
		Find(&transactions).Error; err != nil {
		return nil, 0, fmt.Errorf("failed to fetch transactions")
	}

	return transactions, total, nil
}

// ProcessAutoRelease processes auto-release for transactions (cron job)
func (s *TransactionService) ProcessAutoRelease(ctx context.Context) (int, error) {
	// Find transactions eligible for auto-release
	var transactions []*models.Transaction

	if err := s.db.WithContext(ctx).
		Where("status = ? AND auto_release_date <= ?", models.TransactionStatusDelivered, time.Now()).
		Find(&transactions).Error; err != nil {
		return 0, fmt.Errorf("failed to find transactions for auto-release: %w", err)
	}

	count := 0
	for _, transaction := range transactions {
		if err := s.releaseFundsToSeller(ctx, transaction); err != nil {
			// Log error but continue processing
			fmt.Printf("Error auto-releasing transaction %d: %v\n", transaction.ID, err)
			continue
		}
		count++
	}

	return count, nil
}

// releaseFundsToSeller releases funds to seller
func (s *TransactionService) releaseFundsToSeller(ctx context.Context, transaction *models.Transaction) error {
	// Release funds
	if err := transaction.ReleaseFunds(s.db.WithContext(ctx)); err != nil {
		if errors.Is(err, gorm.ErrInvalidTransaction) {
			return fmt.Errorf("cannot release funds for transaction in %s status", transaction.Status)
		}
		return fmt.Errorf("failed to release funds")
	}

	// Initiate payout to seller via payment gateway
	if err := s.InitiatePayout(ctx, transaction); err != nil {
		// Log error but don't fail the release
		// Transaction is already marked as released in DB
		// Manual intervention may be required for payout
		return fmt.Errorf("warning: payout initiation failed: %w", err)
	}

	// Send notifications
	go s.sendReleaseNotifications(context.Background(), transaction)

	return nil
}

// InitiatePayout initiates payout to seller via payment gateway
func (s *TransactionService) InitiatePayout(ctx context.Context, transaction *models.Transaction) error {
	if transaction == nil {
		return errors.New("transaction is required")
	}

	if transaction.Status != models.TransactionStatusReleased {
		return fmt.Errorf("cannot initiate payout for transaction in %s status", transaction.Status)
	}

	// Fetch seller details
	seller, err := s.userRepo.FindByID(ctx, transaction.SellerID)
	if err != nil {
		return fmt.Errorf("failed to fetch seller: %w", err)
	}

	// Check if seller has payment account configured
	if seller.PaymentAccountID == "" {
		return errors.New("seller has no payment account configured")
	}

	// Calculate payout amount (after platform fee)
	listing, err := s.marketplaceRepo.FindByID(ctx, transaction.TenantID, transaction.ListingID)
	if err != nil {
		return fmt.Errorf("failed to fetch listing: %w", err)
	}

	payoutAmount := listing.CalculateSellerPayout()

	// Initiate transfer based on payment gateway
	switch transaction.PaymentGateway {
	case models.PaymentGatewayRazorpay:
		return s.initiateRazorpayPayout(ctx, transaction, seller.PaymentAccountID, payoutAmount)
	case models.PaymentGatewayStripe:
		return s.initiateStripePayout(ctx, transaction, seller.PaymentAccountID, payoutAmount)
	default:
		return fmt.Errorf("unsupported payment gateway: %s", transaction.PaymentGateway)
	}
}

// initiateRazorpayPayout initiates payout via Razorpay
func (s *TransactionService) initiateRazorpayPayout(ctx context.Context, transaction *models.Transaction, accountID string, amount float64) error {
	if !s.paymentManager.HasRazorpay() {
		return errors.New("Razorpay not configured")
	}

	transfers := []map[string]interface{}{
		{
			"account":  accountID,
			"amount":   int64(amount * 100), // Convert to paise
			"currency": "INR",
			"notes": map[string]string{
				"transaction_id": transaction.ID.String(),
				"listing_id":     transaction.ListingID.String(),
				"tenant_id":      transaction.TenantID.String(),
			},
		},
	}

	transfer, err := s.paymentManager.GetRazorpay().CreateTransfer(ctx, transaction.PaymentID, transfers)
	if err != nil {
		return fmt.Errorf("failed to create Razorpay transfer: %w", err)
	}

	// Update transaction with payout details
	now := time.Now()
	// Update transaction object
	transaction.PayoutID = transfer.ID
	transaction.PayoutStatus = "pending"
	transaction.PayoutAmount = amount
	transaction.PayoutInitiatedAt = &now

	if err := s.transactionRepo.Update(ctx, transaction); err != nil {
		return fmt.Errorf("failed to update transaction with payout details: %w", err)
	}

	return nil
}

// initiateStripePayout initiates payout via Stripe
func (s *TransactionService) initiateStripePayout(ctx context.Context, transaction *models.Transaction, accountID string, amount float64) error {
	if !s.paymentManager.HasStripe() {
		return errors.New("Stripe not configured")
	}

	metadata := map[string]string{
		"transaction_id": transaction.ID.String(),
		"listing_id":     transaction.ListingID.String(),
		"tenant_id":      transaction.TenantID.String(),
	}

	transfer, err := s.paymentManager.GetStripe().CreateTransfer(ctx, amount, "inr", accountID, metadata)
	if err != nil {
		return fmt.Errorf("failed to create Stripe transfer: %w", err)
	}

	// Update transaction with payout details
	now := time.Now()
	// Update transaction object
	transaction.PayoutID = transfer.ID
	transaction.PayoutStatus = transfer.Status
	transaction.PayoutAmount = amount
	transaction.PayoutInitiatedAt = &now

	if err := s.transactionRepo.Update(ctx, transaction); err != nil {
		return fmt.Errorf("failed to update transaction with payout details: %w", err)
	}

	return nil
}

// refundToBuyer refunds payment to buyer
func (s *TransactionService) refundToBuyer(ctx context.Context, transaction *models.Transaction) error {
	// Process refund based on gateway
	switch transaction.PaymentGateway {
	case models.PaymentGatewayRazorpay:
		if !s.paymentManager.HasRazorpay() {
			return fmt.Errorf("razorpay is not configured")
		}

		_, err := s.paymentManager.GetRazorpay().RefundPayment(
			ctx,
			transaction.PaymentID,
			nil, // Full refund
			map[string]interface{}{
				"reason": "Dispute resolved in buyer's favor",
			},
		)
		if err != nil {
			return fmt.Errorf("failed to process refund: %v", err)
		}

	case models.PaymentGatewayStripe:
		if !s.paymentManager.HasStripe() {
			return fmt.Errorf("stripe is not configured")
		}

		_, err := s.paymentManager.GetStripe().RefundPayment(
			ctx,
			transaction.PaymentID,
			nil, // Full refund
			"Dispute resolved in buyer's favor",
		)
		if err != nil {
			return fmt.Errorf("failed to process refund: %v", err)
		}
	}

	return nil
}

// Notification helpers
func (s *TransactionService) sendEscrowNotifications(ctx context.Context, transaction *models.Transaction) {
	tenantID := fmt.Sprintf("%d", transaction.TenantID)
	buyerID := fmt.Sprintf("%d", transaction.BuyerID)
	sellerID := fmt.Sprintf("%d", transaction.SellerID)
	transactionID := fmt.Sprintf("%d", transaction.ID)

	// Send to buyer - payment confirmed
	s.notificationService.CreateNotification(
		ctx,
		tenantID,
		buyerID,
		models.NotificationTypePayment,
		"Payment Confirmed",
		fmt.Sprintf("Your payment of $%.2f has been confirmed and moved to escrow.", transaction.Amount),
		fmt.Sprintf("/transactions/%s", transactionID),
		"/icons/payment-success.png",
		models.NotificationPriorityHigh,
		[]string{models.NotificationChannelInApp, models.NotificationChannelPush},
		map[string]any{
			"transaction_id": transactionID,
			"amount":         transaction.Amount,
			"status":         string(transaction.Status),
		},
	)

	// Send to seller - new sale notification
	s.notificationService.CreateNotification(
		ctx,
		tenantID,
		sellerID,
		models.NotificationTypePayment,
		"New Sale",
		fmt.Sprintf("You have a new sale! Payment of $%.2f is in escrow.", transaction.Amount),
		fmt.Sprintf("/transactions/%s", transactionID),
		"/icons/sale.png",
		models.NotificationPriorityHigh,
		[]string{models.NotificationChannelInApp, models.NotificationChannelPush, models.NotificationChannelEmail},
		map[string]any{
			"transaction_id": transactionID,
			"amount":         transaction.Amount,
			"status":         string(transaction.Status),
		},
	)
}

func (s *TransactionService) sendDeliveryNotifications(ctx context.Context, transaction *models.Transaction) {
	tenantID := fmt.Sprintf("%d", transaction.TenantID)
	buyerID := fmt.Sprintf("%d", transaction.BuyerID)
	transactionID := fmt.Sprintf("%d", transaction.ID)

	// Send to buyer - delivery confirmed
	s.notificationService.CreateNotification(
		ctx,
		tenantID,
		buyerID,
		models.NotificationTypePayment,
		"Delivery Confirmed",
		"Your order has been marked as delivered. Funds will be released to the seller.",
		fmt.Sprintf("/transactions/%s", transactionID),
		"/icons/delivery.png",
		models.NotificationPriorityNormal,
		[]string{models.NotificationChannelInApp, models.NotificationChannelPush},
		map[string]any{
			"transaction_id": transactionID,
			"status":         string(transaction.Status),
		},
	)
}

func (s *TransactionService) sendDisputeNotifications(ctx context.Context, transaction *models.Transaction) {
	tenantID := fmt.Sprintf("%d", transaction.TenantID)
	sellerID := fmt.Sprintf("%d", transaction.SellerID)
	buyerID := fmt.Sprintf("%d", transaction.BuyerID)
	transactionID := fmt.Sprintf("%d", transaction.ID)

	// Send to seller - dispute opened
	s.notificationService.CreateNotification(
		ctx,
		tenantID,
		sellerID,
		models.NotificationTypePayment,
		"Dispute Opened",
		"The buyer has opened a dispute for this transaction. Please provide your response.",
		fmt.Sprintf("/transactions/%s/dispute", transactionID),
		"/icons/dispute.png",
		models.NotificationPriorityHigh,
		[]string{models.NotificationChannelInApp, models.NotificationChannelPush, models.NotificationChannelEmail},
		map[string]any{
			"transaction_id": transactionID,
			"amount":         transaction.Amount,
			"status":         string(transaction.Status),
		},
	)

	// Send to buyer - dispute confirmation
	s.notificationService.CreateNotification(
		ctx,
		tenantID,
		buyerID,
		models.NotificationTypePayment,
		"Dispute Submitted",
		"Your dispute has been submitted and is under review.",
		fmt.Sprintf("/transactions/%s/dispute", transactionID),
		"/icons/dispute.png",
		models.NotificationPriorityNormal,
		[]string{models.NotificationChannelInApp, models.NotificationChannelPush},
		map[string]any{
			"transaction_id": transactionID,
			"status":         string(transaction.Status),
		},
	)
}

func (s *TransactionService) sendDisputeResolutionNotifications(ctx context.Context, transaction *models.Transaction, inFavorOfBuyer bool) {
	tenantID := fmt.Sprintf("%d", transaction.TenantID)
	buyerID := fmt.Sprintf("%d", transaction.BuyerID)
	sellerID := fmt.Sprintf("%d", transaction.SellerID)
	transactionID := fmt.Sprintf("%d", transaction.ID)

	if inFavorOfBuyer {
		// Buyer wins - send refund notification
		s.notificationService.CreateNotification(
			ctx,
			tenantID,
			buyerID,
			models.NotificationTypePayment,
			"Dispute Resolved - Refund Issued",
			fmt.Sprintf("The dispute was resolved in your favor. A refund of $%.2f has been issued.", transaction.Amount),
			fmt.Sprintf("/transactions/%s", transactionID),
			"/icons/refund.png",
			models.NotificationPriorityHigh,
			[]string{models.NotificationChannelInApp, models.NotificationChannelPush, models.NotificationChannelEmail},
			map[string]any{
				"transaction_id": transactionID,
				"amount":         transaction.Amount,
				"resolution":     "buyer_favor",
			},
		)

		// Notify seller of loss
		s.notificationService.CreateNotification(
			ctx,
			tenantID,
			sellerID,
			models.NotificationTypePayment,
			"Dispute Resolved",
			"The dispute was resolved in favor of the buyer. Funds have been refunded.",
			fmt.Sprintf("/transactions/%s", transactionID),
			"/icons/dispute.png",
			models.NotificationPriorityHigh,
			[]string{models.NotificationChannelInApp, models.NotificationChannelEmail},
			map[string]any{
				"transaction_id": transactionID,
				"resolution":     "buyer_favor",
			},
		)
	} else {
		// Seller wins - funds released
		s.notificationService.CreateNotification(
			ctx,
			tenantID,
			sellerID,
			models.NotificationTypePayment,
			"Dispute Resolved - Funds Released",
			fmt.Sprintf("The dispute was resolved in your favor. Funds of $%.2f have been released.", transaction.Amount),
			fmt.Sprintf("/transactions/%s", transactionID),
			"/icons/payment-success.png",
			models.NotificationPriorityHigh,
			[]string{models.NotificationChannelInApp, models.NotificationChannelPush, models.NotificationChannelEmail},
			map[string]any{
				"transaction_id": transactionID,
				"amount":         transaction.Amount,
				"resolution":     "seller_favor",
			},
		)

		// Notify buyer of loss
		s.notificationService.CreateNotification(
			ctx,
			tenantID,
			buyerID,
			models.NotificationTypePayment,
			"Dispute Resolved",
			"The dispute was resolved in favor of the seller.",
			fmt.Sprintf("/transactions/%s", transactionID),
			"/icons/dispute.png",
			models.NotificationPriorityNormal,
			[]string{models.NotificationChannelInApp},
			map[string]any{
				"transaction_id": transactionID,
				"resolution":     "seller_favor",
			},
		)
	}
}

func (s *TransactionService) sendReleaseNotifications(ctx context.Context, transaction *models.Transaction) {
	tenantID := fmt.Sprintf("%d", transaction.TenantID)
	sellerID := fmt.Sprintf("%d", transaction.SellerID)
	transactionID := fmt.Sprintf("%d", transaction.ID)

	// Send to seller - funds released notification
	s.notificationService.CreateNotification(
		ctx,
		tenantID,
		sellerID,
		models.NotificationTypePayment,
		"Funds Released",
		fmt.Sprintf("Funds of $%.2f have been released from escrow to your account.", transaction.Amount),
		fmt.Sprintf("/transactions/%s", transactionID),
		"/icons/money.png",
		models.NotificationPriorityHigh,
		[]string{models.NotificationChannelInApp, models.NotificationChannelPush, models.NotificationChannelEmail},
		map[string]any{
			"transaction_id": transactionID,
			"amount":         transaction.Amount,
			"status":         string(transaction.Status),
		},
	)
}
