// Package services defines service layer interfaces for the Quester platform.
package services

import (
	"context"

	"github.com/google/uuid"
)

// PaymentServiceInterface defines the contract for payment operations.
// Implementations handle transaction processing, refunds, and payment history.
type PaymentServiceInterface interface {
	// ProcessPayment initiates a payment transaction.
	// Returns transaction record on success.
	ProcessPayment(ctx context.Context, tenantID uuid.UUID, input *PaymentInput) (*Transaction, error)

	// GetTransaction retrieves a transaction by ID.
	// Returns transaction on success, error if not found.
	GetTransaction(ctx context.Context, tenantID, transactionID uuid.UUID) (*Transaction, error)

	// GetUserTransactions retrieves transaction history for a user.
	// Returns paginated transaction list.
	GetUserTransactions(ctx context.Context, tenantID, userID uuid.UUID, filters *TransactionFilters) (*TransactionListResponse, error)

	// RefundTransaction processes a refund for a transaction.
	// Returns refund record on success.
	RefundTransaction(ctx context.Context, tenantID, transactionID uuid.UUID, reason string) (*Transaction, error)

	// GetPaymentMethods retrieves available payment methods for a user.
	GetPaymentMethods(ctx context.Context, tenantID, userID uuid.UUID) ([]*PaymentMethod, error)
}

// PaymentInput contains data for initiating a payment.
type PaymentInput struct {
	UserID          uuid.UUID `json:"user_id" validate:"required"`
	Amount          int64     `json:"amount" validate:"required,gt=0"`
	Currency        string    `json:"currency" validate:"required"`
	PaymentMethodID string    `json:"payment_method_id" validate:"required"`
	Description     string    `json:"description"`
	Metadata        map[string]string `json:"metadata"`
}

// Transaction represents a payment transaction record.
type Transaction struct {
	ID              uuid.UUID `json:"id"`
	TenantID        uuid.UUID `json:"tenant_id"`
	UserID          uuid.UUID `json:"user_id"`
	Amount          int64     `json:"amount"`
	Currency        string    `json:"currency"`
	Status          string    `json:"status"`
	PaymentMethodID string    `json:"payment_method_id"`
	Description     string    `json:"description"`
	CreatedAt       string    `json:"created_at"`
}

// TransactionFilters contains filtering options for transaction queries.
type TransactionFilters struct {
	Status    string `json:"status"`
	StartDate string `json:"start_date"`
	EndDate   string `json:"end_date"`
	Page      int    `json:"page"`
	Limit     int    `json:"limit"`
}

// TransactionListResponse contains paginated transaction results.
type TransactionListResponse struct {
	Transactions []*Transaction `json:"transactions"`
	TotalCount   int64          `json:"total_count"`
	Page         int            `json:"page"`
	Limit        int            `json:"limit"`
}

// PaymentMethod represents a saved payment method.
type PaymentMethod struct {
	ID       string `json:"id"`
	Type     string `json:"type"`
	Last4    string `json:"last4"`
	Brand    string `json:"brand"`
	ExpMonth int    `json:"exp_month"`
	ExpYear  int    `json:"exp_year"`
	Default  bool   `json:"is_default"`
}
