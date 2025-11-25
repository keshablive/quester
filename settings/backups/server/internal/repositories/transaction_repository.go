package repositories

import (
	"context"

	"github.com/google/uuid"
	"github.com/yourusername/quester/internal/models"

	"gorm.io/gorm"
)

// TransactionRepository handles database operations for transactions
type TransactionRepository struct {
	db *gorm.DB
}

// NewTransactionRepository creates a new transaction repository
func NewTransactionRepository(db *gorm.DB) *TransactionRepository {
	return &TransactionRepository{db: db}
}

// Create creates a new transaction
func (r *TransactionRepository) Create(ctx context.Context, transaction *models.Transaction) error {
	return r.db.WithContext(ctx).Create(transaction).Error
}

// FindByID finds a transaction by ID
func (r *TransactionRepository) FindByID(ctx context.Context, tenantID uuid.UUID, transactionID uuid.UUID) (*models.Transaction, error) {
	var transaction models.Transaction
	err := r.db.WithContext(ctx).
		Where("id = ? AND tenant_id = ?", transactionID, tenantID).
		Preload("Buyer").
		Preload("Seller").
		Preload("Listing").
		First(&transaction).Error

	return &transaction, err
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

	return &transaction, err
}

// Update updates a transaction
func (r *TransactionRepository) Update(ctx context.Context, transaction *models.Transaction, updates map[string]interface{}) error {
	return r.db.WithContext(ctx).Model(transaction).Updates(updates).Error
}

// Delete soft deletes a transaction
func (r *TransactionRepository) Delete(ctx context.Context, transaction *models.Transaction) error {
	return r.db.WithContext(ctx).Delete(transaction).Error
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

	return transactions, err
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
		return nil, 0, err
	}

	// Get paginated results
	var transactions []*models.Transaction
	if err := query.
		Order("dispute_opened_at DESC").
		Offset(offset).
		Limit(pageSize).
		Find(&transactions).Error; err != nil {
		return nil, 0, err
	}

	return transactions, total, nil
}
