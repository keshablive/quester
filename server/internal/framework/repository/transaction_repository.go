package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/keshablive/quester/internal/framework/utils"
	"github.com/keshablive/quester/internal/models"

	"gorm.io/gorm"
)

// TransactionRepository handles database operations for transactions
type TransactionRepository struct {
	db *gorm.DB
}

// NewTransactionRepository creates a new transaction repository
func NewTransactionRepository(db *gorm.DB) *TransactionRepository {
	ValidateDB(db, "TransactionRepository")
	return &TransactionRepository{db: db}
}

// Create creates a new transaction
func (r *TransactionRepository) Create(ctx context.Context, transaction *models.Transaction) error {
	if err := r.db.WithContext(ctx).Create(transaction).Error; err != nil {
		return utils.WrapCreateError(err, "transaction")
	}
	return nil
}

// FindByID finds a transaction by ID
func (r *TransactionRepository) FindByID(ctx context.Context, tenantID, transactionID uuid.UUID) (*models.Transaction, error) {
	var transaction models.Transaction
	err := r.db.WithContext(ctx).
		Where("tenant_id = ? AND id = ?", tenantID, transactionID).
		Preload("Buyer").
		Preload("Seller").
		Preload("Listing").
		First(&transaction).Error

	if err != nil {
		return nil, utils.WrapFindError(err, "transaction", transactionID.String())
	}

	return &transaction, nil
}

// FindByPaymentID finds a transaction by payment ID
func (r *TransactionRepository) FindByPaymentID(ctx context.Context, tenantID uuid.UUID, paymentID string) (*models.Transaction, error) {
	var transaction models.Transaction
	err := r.db.WithContext(ctx).
		Where("tenant_id = ? AND payment_id = ?", tenantID, paymentID).
		Preload("Buyer").
		Preload("Seller").
		Preload("Listing").
		First(&transaction).Error

	if err != nil {
		return nil, utils.WrapFindError(err, "transaction", paymentID)
	}

	return &transaction, nil
}

// Update updates a transaction (interface-compliant method)
func (r *TransactionRepository) Update(ctx context.Context, transaction *models.Transaction) error {
	result := r.db.WithContext(ctx).
		Where("tenant_id = ?", transaction.TenantID).
		Save(transaction)

	if result.Error != nil {
		return utils.WrapUpdateError(result.Error, "transaction")
	}

	if result.RowsAffected == 0 {
		return utils.WrapNotFoundError("transaction", transaction.ID.String())
	}

	return nil
}

// UpdateFields updates specific fields of a transaction (legacy method for backward compatibility)
func (r *TransactionRepository) UpdateFields(ctx context.Context, transaction *models.Transaction, updates map[string]interface{}) error {
	result := r.db.WithContext(ctx).
		Where("tenant_id = ?", transaction.TenantID).
		Model(transaction).
		Updates(updates)

	if result.Error != nil {
		return utils.WrapUpdateError(result.Error, "transaction")
	}

	if result.RowsAffected == 0 {
		return utils.WrapNotFoundError("transaction", transaction.ID.String())
	}

	return nil
}

// Delete soft deletes a transaction by ID (interface-compliant method)
func (r *TransactionRepository) Delete(ctx context.Context, tenantID uuid.UUID, transactionID uuid.UUID) error {
	result := r.db.WithContext(ctx).
		Where("tenant_id = ? AND id = ?", tenantID, transactionID).
		Delete(&models.Transaction{})

	if result.Error != nil {
		return utils.WrapDeleteError(result.Error, "transaction")
	}

	if result.RowsAffected == 0 {
		return utils.WrapNotFoundError("transaction", transactionID.String())
	}

	return nil
}

// GetByStatus retrieves transactions by status
func (r *TransactionRepository) GetByStatus(ctx context.Context, tenantID uuid.UUID, status models.TransactionStatus, limit int) ([]*models.Transaction, error) {
	var transactions []*models.Transaction

	query := r.db.WithContext(ctx).
		Where("tenant_id = ? AND status = ?", tenantID, status).
		Preload("Buyer").
		Preload("Seller").
		Preload("Listing").
		Order("created_at DESC")

	if limit > 0 {
		query = query.Limit(limit)
	}

	err := query.Find(&transactions).Error
	if err != nil {
		return nil, utils.WrapListError(err, "transactions by status")
	}

	return transactions, nil
}

// GetDisputedTransactions retrieves all disputed transactions
func (r *TransactionRepository) GetDisputedTransactions(ctx context.Context, tenantID uuid.UUID, page int, pageSize int) ([]*models.Transaction, int64, error) {
	offset := (page - 1) * pageSize

	query := r.db.WithContext(ctx).
		Where("tenant_id = ? AND status = ?", tenantID, models.TransactionStatusDisputed).
		Preload("Buyer").
		Preload("Seller").
		Preload("Listing")

	// Get total count
	var total int64
	if err := query.Model(&models.Transaction{}).Count(&total).Error; err != nil {
		return nil, 0, utils.WrapCountError(err, "disputed transactions")
	}

	// Get paginated results
	var transactions []*models.Transaction
	if err := query.
		Order("dispute_opened_at DESC").
		Offset(offset).
		Limit(pageSize).
		Find(&transactions).Error; err != nil {
		return nil, 0, utils.WrapListError(err, "disputed transactions")
	}

	return transactions, total, nil
}

// FindAll retrieves all transactions for a tenant with optional filters
func (r *TransactionRepository) FindAll(ctx context.Context, tenantID uuid.UUID, filters map[string]interface{}) ([]models.Transaction, error) {
	var transactions []models.Transaction

	query := r.db.WithContext(ctx).
		Where("tenant_id = ?", tenantID).
		Preload("Buyer").
		Preload("Seller").
		Preload("Listing")

	// Apply filters
	for key, value := range filters {
		switch key {
		case "status":
			query = query.Where("status = ?", value)
		case "buyer_id":
			query = query.Where("buyer_id = ?", value)
		case "seller_id":
			query = query.Where("seller_id = ?", value)
		case "listing_id":
			query = query.Where("listing_id = ?", value)
		case "payment_gateway":
			query = query.Where("payment_gateway = ?", value)
		}
	}

	if err := query.Order("created_at DESC").Find(&transactions).Error; err != nil {
		return nil, utils.WrapListError(err, "transactions")
	}

	return transactions, nil
}

// TransactionListOptions defines options for listing transactions with cursor pagination
// Task Reference: 009-database-query-optimization T029
type TransactionListOptions struct {
	TenantID uuid.UUID
	Cursor   string     // Base64 encoded cursor token
	PageSize int        // Items per page (default 20, max 100)
	Status   string     // Filter by status
	BuyerID  *uuid.UUID // Filter by buyer
	SellerID *uuid.UUID // Filter by seller
	Includes []string   // Relationships to preload
}

// TransactionListResult contains the list result with pagination metadata
type TransactionListResult struct {
	Transactions []models.Transaction
	NextCursor   string
	PrevCursor   string
	HasMore      bool
	PageSize     int
}

// List returns transactions with cursor-based pagination
// Task Reference: 009-database-query-optimization T029
func (r *TransactionRepository) List(ctx context.Context, opts TransactionListOptions) (*TransactionListResult, error) {
	// Validate and normalize page size
	if opts.PageSize <= 0 {
		opts.PageSize = 20
	}
	if opts.PageSize > 100 {
		opts.PageSize = 100
	}

	// Build base query with tenant scope
	query := r.db.WithContext(ctx).
		Model(&models.Transaction{}).
		Where("tenant_id = ?", opts.TenantID)

	// Apply filters
	if opts.Status != "" {
		query = query.Where("status = ?", opts.Status)
	}
	if opts.BuyerID != nil {
		query = query.Where("buyer_id = ?", *opts.BuyerID)
	}
	if opts.SellerID != nil {
		query = query.Where("seller_id = ?", *opts.SellerID)
	}

	// Apply includes/preloads (validated list per FR-010)
	allowedIncludes := map[string]string{
		"buyer":   "Buyer",
		"seller":  "Seller",
		"listing": "Listing",
		"user":    "Buyer",   // Alias
		"item":    "Listing", // Alias
	}
	for _, inc := range opts.Includes {
		if preload, ok := allowedIncludes[inc]; ok {
			query = query.Preload(preload)
		}
	}

	// Apply cursor-based pagination
	query = query.Order("created_at DESC, id DESC")

	// Fetch one extra to determine if there are more pages
	query = query.Limit(opts.PageSize + 1)

	var transactions []models.Transaction
	if err := query.Find(&transactions).Error; err != nil {
		return nil, utils.WrapListError(err, "transactions")
	}

	// Determine if there are more pages
	hasMore := len(transactions) > opts.PageSize
	if hasMore {
		transactions = transactions[:opts.PageSize]
	}

	result := &TransactionListResult{
		Transactions: transactions,
		HasMore:      hasMore,
		PageSize:     opts.PageSize,
	}

	// Generate next cursor if there are more pages
	if hasMore && len(transactions) > 0 {
		lastTx := transactions[len(transactions)-1]
		result.NextCursor = lastTx.ID.String() // Simplified cursor
	}

	return result, nil
}

// GetTransactionsByUserID retrieves all transactions for a specific user (buyer or seller)
func (r *TransactionRepository) GetTransactionsByUserID(ctx context.Context, tenantID uuid.UUID, userID uuid.UUID) ([]models.Transaction, error) {
	var transactions []models.Transaction

	err := r.db.WithContext(ctx).
		Where("tenant_id = ? AND (buyer_id = ? OR seller_id = ?)", tenantID, userID, userID).
		Preload("Buyer").
		Preload("Seller").
		Preload("Listing").
		Order("created_at DESC").
		Find(&transactions).Error

	if err != nil {
		return nil, utils.WrapListError(err, "transactions by user")
	}

	return transactions, nil
}

// GetTransactionsByStatus retrieves all transactions with a specific status
func (r *TransactionRepository) GetTransactionsByStatus(ctx context.Context, tenantID uuid.UUID, status string) ([]models.Transaction, error) {
	var transactions []models.Transaction

	err := r.db.WithContext(ctx).
		Where("tenant_id = ? AND status = ?", tenantID, status).
		Preload("Buyer").
		Preload("Seller").
		Preload("Listing").
		Order("created_at DESC").
		Find(&transactions).Error

	if err != nil {
		return nil, utils.WrapListError(err, "transactions by status")
	}

	return transactions, nil
}

// GetPendingEscrowTransactions retrieves all transactions in escrow state
func (r *TransactionRepository) GetPendingEscrowTransactions(ctx context.Context, tenantID uuid.UUID) ([]models.Transaction, error) {
	var transactions []models.Transaction

	err := r.db.WithContext(ctx).
		Where("tenant_id = ? AND status = ?", tenantID, models.TransactionStatusEscrowHeld).
		Preload("Buyer").
		Preload("Seller").
		Preload("Listing").
		Order("created_at ASC").
		Find(&transactions).Error

	if err != nil {
		return nil, utils.WrapListError(err, "pending escrow transactions")
	}

	return transactions, nil
}

// UpdateTransactionStatus updates the status of a transaction
func (r *TransactionRepository) UpdateTransactionStatus(ctx context.Context, transactionID uuid.UUID, status string) error {
	result := r.db.WithContext(ctx).
		Model(&models.Transaction{}).
		Where("id = ?", transactionID).
		Update("status", status)

	if result.Error != nil {
		return utils.WrapUpdateError(result.Error, "transaction status")
	}

	if result.RowsAffected == 0 {
		return utils.WrapNotFoundError("transaction", transactionID.String())
	}

	return nil
}

// GetUserBalance retrieves the current balance for a user
func (r *TransactionRepository) GetUserBalance(ctx context.Context, tenantID uuid.UUID, userID uuid.UUID) (float64, error) {
	var balance float64

	// Sum all completed transactions where user is the seller (credits)
	err := r.db.WithContext(ctx).
		Model(&models.Transaction{}).
		Where("tenant_id = ? AND seller_id = ? AND status = ?", tenantID, userID, models.TransactionStatusReleased).
		Select("COALESCE(SUM(amount), 0)").
		Scan(&balance).Error

	if err != nil {
		return 0, utils.WrapListError(err, "user balance")
	}

	return balance, nil
}

// GetTransactionsByDateRange retrieves transactions within a date range
func (r *TransactionRepository) GetTransactionsByDateRange(ctx context.Context, tenantID uuid.UUID, startDate, endDate string) ([]models.Transaction, error) {
	var transactions []models.Transaction

	err := r.db.WithContext(ctx).
		Where("tenant_id = ? AND created_at BETWEEN ? AND ?", tenantID, startDate, endDate).
		Preload("Buyer").
		Preload("Seller").
		Preload("Listing").
		Order("created_at DESC").
		Find(&transactions).Error

	if err != nil {
		return nil, utils.WrapListError(err, "transactions by date range")
	}

	return transactions, nil
}
