package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

// TransactionStatus represents the status of a transaction in the escrow flow
type TransactionStatus string

const (
	TransactionStatusInitiated  TransactionStatus = "initiated"   // Payment initiated
	TransactionStatusPending    TransactionStatus = "pending"     // Awaiting payment confirmation
	TransactionStatusEscrowHeld TransactionStatus = "escrow_held" // Funds held in escrow
	TransactionStatusDelivered  TransactionStatus = "delivered"   // Seller confirmed delivery
	TransactionStatusReleased   TransactionStatus = "released"    // Funds released to seller
	TransactionStatusDisputed   TransactionStatus = "disputed"    // Buyer opened dispute
	TransactionStatusRefunded   TransactionStatus = "refunded"    // Funds refunded to buyer
	TransactionStatusCancelled  TransactionStatus = "cancelled"   // Transaction cancelled
	TransactionStatusFailed     TransactionStatus = "failed"      // Payment failed
)

// PaymentGateway represents the payment gateway used
type PaymentGateway string

const (
	PaymentGatewayRazorpay PaymentGateway = "razorpay"
	PaymentGatewayStripe   PaymentGateway = "stripe"
	PaymentGatewayPayPal   PaymentGateway = "paypal"
	PaymentGatewayCrypto   PaymentGateway = "crypto"
	PaymentGatewayUPI      PaymentGateway = "upi"
)

// DisputeStatus represents the status of a dispute
type DisputeStatus string

const (
	DisputeStatusOpen           DisputeStatus = "open"
	DisputeStatusUnderReview    DisputeStatus = "under_review"
	DisputeStatusResolvedBuyer  DisputeStatus = "resolved_buyer"  // Buyer wins
	DisputeStatusResolvedSeller DisputeStatus = "resolved_seller" // Seller wins
	DisputeStatusClosed         DisputeStatus = "closed"
)

// Transaction represents a purchase transaction with escrow protection
type Transaction struct {
	ID       uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	TenantID uuid.UUID `gorm:"type:uuid;not null;index:idx_transactions_tenant" json:"tenant_id"`

	// Parties (C2: UUID Migration - changed from uint to uuid.UUID)
	BuyerID  uuid.UUID `gorm:"type:uuid;not null;index:idx_transactions_buyer" json:"buyer_id"`
	Buyer    *User     `gorm:"foreignKey:BuyerID" json:"buyer,omitempty"`
	SellerID uuid.UUID `gorm:"type:uuid;not null;index:idx_transactions_seller" json:"seller_id"`
	Seller   *User     `gorm:"foreignKey:SellerID" json:"seller,omitempty"`

	// Listing reference
	ListingID uuid.UUID           `gorm:"type:uuid;not null;index:idx_transactions_listing" json:"listing_id"`
	Listing   *MarketplaceListing `gorm:"foreignKey:ListingID" json:"listing,omitempty"`

	// Transaction details
	Status           TransactionStatus `gorm:"type:varchar(20);not null;default:'initiated';index:idx_transactions_status" json:"status"`
	Amount           float64           `gorm:"type:decimal(10,2);not null" json:"amount"`
	Currency         string            `gorm:"type:varchar(3);not null;default:'INR'" json:"currency"`
	CommissionAmount float64           `gorm:"type:decimal(10,2);not null" json:"commission_amount"`
	SellerPayout     float64           `gorm:"type:decimal(10,2);not null" json:"seller_payout"`

	// Payment gateway
	PaymentGateway PaymentGateway `gorm:"type:varchar(20);not null" json:"payment_gateway"`
	PaymentID      string         `gorm:"type:varchar(255);index:idx_transactions_payment_id" json:"payment_id"` // Gateway payment ID
	PaymentDetails datatypes.JSON `gorm:"type:jsonb" json:"payment_details"`                                     // Additional payment metadata

	// Escrow tracking
	EscrowHeldAt        *time.Time `json:"escrow_held_at,omitempty"`
	DeliveryConfirmedAt *time.Time `json:"delivery_confirmed_at,omitempty"`
	FundsReleasedAt     *time.Time `json:"funds_released_at,omitempty"`
	AutoReleaseDate     *time.Time `gorm:"index:idx_transactions_auto_release" json:"auto_release_date,omitempty"` // 7 days after escrow_held

	// Payout tracking
	PayoutID          string     `gorm:"type:varchar(255)" json:"payout_id,omitempty"`      // Gateway payout/transfer ID
	PayoutStatus      string     `gorm:"type:varchar(20)" json:"payout_status,omitempty"`   // pending, completed, failed
	PayoutAmount      float64    `gorm:"type:decimal(10,2)" json:"payout_amount,omitempty"` // Amount paid out to seller
	PayoutInitiatedAt *time.Time `json:"payout_initiated_at,omitempty"`
	PayoutCompletedAt *time.Time `json:"payout_completed_at,omitempty"`

	// Dispute tracking
	DisputeOpenedAt   *time.Time     `json:"dispute_opened_at,omitempty"`
	DisputeReason     string         `gorm:"type:text" json:"dispute_reason,omitempty"`
	DisputeStatus     *DisputeStatus `gorm:"type:varchar(20)" json:"dispute_status,omitempty"`
	DisputeResolvedAt *time.Time     `json:"dispute_resolved_at,omitempty"`
	DisputeResolution string         `gorm:"type:text" json:"dispute_resolution,omitempty"`
	DisputeResolvedBy *uuid.UUID     `gorm:"type:uuid" json:"dispute_resolved_by,omitempty"` // Admin user ID

	// Metadata
	Notes    string         `gorm:"type:text" json:"notes,omitempty"`
	Metadata datatypes.JSON `gorm:"type:jsonb" json:"metadata"`

	// Timestamps
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"deleted_at,omitempty"`
}

// TableName overrides the table name
func (Transaction) TableName() string {
	return "transactions"
}

// BeforeCreate hook to calculate commission and payout
func (t *Transaction) BeforeCreate(tx *gorm.DB) error {
	// Calculate commission and seller payout if not already set
	if t.CommissionAmount == 0 && t.Listing != nil {
		t.CommissionAmount = t.Listing.CalculateCommission()
		t.SellerPayout = t.Listing.CalculateSellerPayout()
	}

	// Set default currency if not provided
	if t.Currency == "" {
		t.Currency = "INR"
	}

	return nil
}

// TransitionToEscrow transitions the transaction to escrow_held status
func (t *Transaction) TransitionToEscrow(tx *gorm.DB) error {
	if t.Status != TransactionStatusPending {
		return gorm.ErrInvalidTransaction
	}

	now := time.Now()
	autoReleaseDate := now.Add(7 * 24 * time.Hour) // 7 days from now

	t.Status = TransactionStatusEscrowHeld
	t.EscrowHeldAt = &now
	t.AutoReleaseDate = &autoReleaseDate

	return tx.Save(t).Error
}

// ConfirmDelivery confirms delivery and transitions to delivered status
func (t *Transaction) ConfirmDelivery(tx *gorm.DB) error {
	if t.Status != TransactionStatusEscrowHeld {
		return gorm.ErrInvalidTransaction
	}

	now := time.Now()
	autoReleaseDate := now.Add(7 * 24 * time.Hour) // 7 days from delivery confirmation

	t.Status = TransactionStatusDelivered
	t.DeliveryConfirmedAt = &now
	t.AutoReleaseDate = &autoReleaseDate

	return tx.Save(t).Error
}

// ReleaseFunds releases funds to seller and transitions to released status
func (t *Transaction) ReleaseFunds(tx *gorm.DB) error {
	if t.Status != TransactionStatusDelivered {
		return gorm.ErrInvalidTransaction
	}

	now := time.Now()
	t.Status = TransactionStatusReleased
	t.FundsReleasedAt = &now

	return tx.Save(t).Error
}

// OpenDispute opens a dispute and freezes the transaction
func (t *Transaction) OpenDispute(tx *gorm.DB, reason string) error {
	if t.Status != TransactionStatusEscrowHeld && t.Status != TransactionStatusDelivered {
		return gorm.ErrInvalidTransaction
	}

	// Check if dispute window is still open (14 days from purchase)
	disputeDeadline := t.CreatedAt.Add(14 * 24 * time.Hour)
	if time.Now().After(disputeDeadline) {
		return gorm.ErrInvalidData // Dispute window closed
	}

	now := time.Now()
	disputeStatus := DisputeStatusOpen

	t.Status = TransactionStatusDisputed
	t.DisputeOpenedAt = &now
	t.DisputeReason = reason
	t.DisputeStatus = &disputeStatus

	return tx.Save(t).Error
}

// ResolveDispute resolves a dispute in favor of buyer or seller
func (t *Transaction) ResolveDispute(tx *gorm.DB, inFavorOfBuyer bool, resolution string, resolvedBy uuid.UUID) error {
	if t.Status != TransactionStatusDisputed {
		return gorm.ErrInvalidTransaction
	}

	now := time.Now()

	if inFavorOfBuyer {
		// Refund to buyer
		disputeStatus := DisputeStatusResolvedBuyer
		t.Status = TransactionStatusRefunded
		t.DisputeStatus = &disputeStatus
	} else {
		// Release to seller
		disputeStatus := DisputeStatusResolvedSeller
		t.Status = TransactionStatusReleased
		t.FundsReleasedAt = &now
		t.DisputeStatus = &disputeStatus
	}

	t.DisputeResolvedAt = &now
	t.DisputeResolution = resolution
	t.DisputeResolvedBy = &resolvedBy

	return tx.Save(t).Error
}

// Cancel cancels the transaction (only if not yet in escrow)
func (t *Transaction) Cancel(tx *gorm.DB) error {
	if t.Status != TransactionStatusInitiated && t.Status != TransactionStatusPending {
		return gorm.ErrInvalidTransaction
	}

	t.Status = TransactionStatusCancelled

	return tx.Save(t).Error
}

// CanOpenDispute checks if a dispute can be opened
func (t *Transaction) CanOpenDispute() bool {
	// Can only dispute if in escrow_held or delivered status
	if t.Status != TransactionStatusEscrowHeld && t.Status != TransactionStatusDelivered {
		return false
	}

	// Check if within 14-day dispute window
	disputeDeadline := t.CreatedAt.Add(14 * 24 * time.Hour)
	return time.Now().Before(disputeDeadline)
}

// ShouldAutoRelease checks if the transaction should be auto-released
func (t *Transaction) ShouldAutoRelease() bool {
	if t.Status != TransactionStatusDelivered {
		return false
	}

	if t.AutoReleaseDate == nil {
		return false
	}

	return time.Now().After(*t.AutoReleaseDate)
}
