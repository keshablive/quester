package services_test

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/keshablive/quester/internal/mocks"
	"github.com/keshablive/quester/internal/models"
	"github.com/keshablive/quester/internal/services"
	"github.com/stretchr/testify/assert"
)

func TestTransactionService_Create(t *testing.T) {
	// Setup
	mockRepo := new(mocks.TransactionRepository)
	_ = services.NewTransactionService(mockRepo, nil, nil, nil, nil, nil)

	ctx := context.Background()
	tenantID := uuid.New()
	transaction := &models.Transaction{
		TenantID: tenantID,
		BuyerID:  uuid.New(),
		SellerID: uuid.New(),
		Amount:   100.0,
		Status:   models.TransactionStatusInitiated,
	}

	// Mock expectations
	mockRepo.On("Create", ctx, transaction).Return(nil)

	// Execute
	err := mockRepo.Create(ctx, transaction)

	// Assert
	assert.NoError(t, err)
	mockRepo.AssertExpectations(t)
}

func TestTransactionService_FindByID(t *testing.T) {
	// Setup
	mockRepo := new(mocks.TransactionRepository)
	_ = services.NewTransactionService(mockRepo, nil, nil, nil, nil, nil)

	ctx := context.Background()
	tenantID := uuid.New()
	transactionID := uuid.New()
	expectedTransaction := &models.Transaction{
		ID:       transactionID,
		TenantID: tenantID,
		Amount:   100.0,
	}

	// Mock expectations
	mockRepo.On("FindByID", ctx, tenantID, transactionID).Return(expectedTransaction, nil)

	// Execute
	result, err := mockRepo.FindByID(ctx, tenantID, transactionID)

	// Assert
	assert.NoError(t, err)
	assert.Equal(t, transactionID, result.ID)
	assert.Equal(t, tenantID, result.TenantID)
	mockRepo.AssertExpectations(t)
}

func TestTransactionService_FindAll(t *testing.T) {
	// Setup
	mockRepo := new(mocks.TransactionRepository)
	_ = services.NewTransactionService(mockRepo, nil, nil, nil, nil, nil)

	ctx := context.Background()
	tenantID := uuid.New()
	filters := map[string]interface{}{
		"status": models.TransactionStatusPending,
	}
	expectedTransactions := []models.Transaction{
		{ID: uuid.New(), TenantID: tenantID, Status: models.TransactionStatusPending},
		{ID: uuid.New(), TenantID: tenantID, Status: models.TransactionStatusPending},
	}

	// Mock expectations
	mockRepo.On("FindAll", ctx, tenantID, filters).Return(expectedTransactions, nil)

	// Execute
	result, err := mockRepo.FindAll(ctx, tenantID, filters)

	// Assert
	assert.NoError(t, err)
	assert.Len(t, result, 2)
	mockRepo.AssertExpectations(t)
}

func TestTransactionService_Update(t *testing.T) {
	// Setup
	mockRepo := new(mocks.TransactionRepository)
	_ = services.NewTransactionService(mockRepo, nil, nil, nil, nil, nil)

	ctx := context.Background()
	transaction := &models.Transaction{
		ID:       uuid.New(),
		TenantID: uuid.New(),
		Status:   models.TransactionStatusReleased,
		Amount:   150.0,
	}

	// Mock expectations
	mockRepo.On("Update", ctx, transaction).Return(nil)

	// Execute
	err := mockRepo.Update(ctx, transaction)

	// Assert
	assert.NoError(t, err)
	mockRepo.AssertExpectations(t)
}

func TestTransactionService_Delete(t *testing.T) {
	// Setup
	mockRepo := new(mocks.TransactionRepository)
	_ = services.NewTransactionService(mockRepo, nil, nil, nil, nil, nil)

	ctx := context.Background()
	tenantID := uuid.New()
	transactionID := uuid.New()

	// Mock expectations
	mockRepo.On("Delete", ctx, tenantID, transactionID).Return(nil)

	// Execute
	err := mockRepo.Delete(ctx, tenantID, transactionID)

	// Assert
	assert.NoError(t, err)
	mockRepo.AssertExpectations(t)
}

func TestTransactionService_GetTransactionsByStatus(t *testing.T) {
	// Setup
	mockRepo := new(mocks.TransactionRepository)
	_ = services.NewTransactionService(mockRepo, nil, nil, nil, nil, nil)

	ctx := context.Background()
	tenantID := uuid.New()
	status := string(models.TransactionStatusEscrowHeld)
	expectedTransactions := []models.Transaction{
		{ID: uuid.New(), TenantID: tenantID, Status: models.TransactionStatusEscrowHeld},
	}

	// Mock expectations
	mockRepo.On("GetTransactionsByStatus", ctx, tenantID, status).Return(expectedTransactions, nil)

	// Execute
	result, err := mockRepo.GetTransactionsByStatus(ctx, tenantID, status)

	// Assert
	assert.NoError(t, err)
	assert.Len(t, result, 1)
	assert.Equal(t, models.TransactionStatusEscrowHeld, result[0].Status)
	mockRepo.AssertExpectations(t)
}

func TestTransactionService_GetPendingEscrowTransactions(t *testing.T) {
	// Setup
	mockRepo := new(mocks.TransactionRepository)
	_ = services.NewTransactionService(mockRepo, nil, nil, nil, nil, nil)

	ctx := context.Background()
	tenantID := uuid.New()
	expectedTransactions := []models.Transaction{
		{ID: uuid.New(), TenantID: tenantID, Status: models.TransactionStatusEscrowHeld},
		{ID: uuid.New(), TenantID: tenantID, Status: models.TransactionStatusEscrowHeld},
	}

	// Mock expectations
	mockRepo.On("GetPendingEscrowTransactions", ctx, tenantID).Return(expectedTransactions, nil)

	// Execute
	result, err := mockRepo.GetPendingEscrowTransactions(ctx, tenantID)

	// Assert
	assert.NoError(t, err)
	assert.Len(t, result, 2)
	for _, tx := range result {
		assert.Equal(t, models.TransactionStatusEscrowHeld, tx.Status)
	}
	mockRepo.AssertExpectations(t)
}

func TestTransactionService_GetTransactionsByUserID(t *testing.T) {
	// Setup
	mockRepo := new(mocks.TransactionRepository)
	_ = services.NewTransactionService(mockRepo, nil, nil, nil, nil, nil)

	ctx := context.Background()
	tenantID := uuid.New()
	userID := uuid.New()
	expectedTransactions := []models.Transaction{
		{ID: uuid.New(), TenantID: tenantID, BuyerID: userID},
		{ID: uuid.New(), TenantID: tenantID, SellerID: userID},
	}

	// Mock expectations
	mockRepo.On("GetTransactionsByUserID", ctx, tenantID, userID).Return(expectedTransactions, nil)

	// Execute
	result, err := mockRepo.GetTransactionsByUserID(ctx, tenantID, userID)

	// Assert
	assert.NoError(t, err)
	assert.Len(t, result, 2)
	mockRepo.AssertExpectations(t)
}

func TestTransactionService_UpdateTransactionStatus(t *testing.T) {
	// Setup
	mockRepo := new(mocks.TransactionRepository)
	_ = services.NewTransactionService(mockRepo, nil, nil, nil, nil, nil)

	ctx := context.Background()
	transactionID := uuid.New()
	status := string(models.TransactionStatusReleased)

	// Mock expectations
	mockRepo.On("UpdateTransactionStatus", ctx, transactionID, status).Return(nil)

	// Execute
	err := mockRepo.UpdateTransactionStatus(ctx, transactionID, status)

	// Assert
	assert.NoError(t, err)
	mockRepo.AssertExpectations(t)
}

func TestTransactionService_GetTransactionsByDateRange(t *testing.T) {
	// Setup
	mockRepo := new(mocks.TransactionRepository)
	_ = services.NewTransactionService(mockRepo, nil, nil, nil, nil, nil)

	ctx := context.Background()
	tenantID := uuid.New()
	startDate := "2025-01-01"
	endDate := "2025-01-31"
	expectedTransactions := []models.Transaction{
		{ID: uuid.New(), TenantID: tenantID},
		{ID: uuid.New(), TenantID: tenantID},
	}

	// Mock expectations
	mockRepo.On("GetTransactionsByDateRange", ctx, tenantID, startDate, endDate).Return(expectedTransactions, nil)

	// Execute
	result, err := mockRepo.GetTransactionsByDateRange(ctx, tenantID, startDate, endDate)

	// Assert
	assert.NoError(t, err)
	assert.Len(t, result, 2)
	mockRepo.AssertExpectations(t)
}

func TestTransactionService_GetUserBalance(t *testing.T) {
	// Setup
	mockRepo := new(mocks.TransactionRepository)
	_ = services.NewTransactionService(mockRepo, nil, nil, nil, nil, nil)

	ctx := context.Background()
	tenantID := uuid.New()
	userID := uuid.New()
	expectedBalance := 1500.0

	// Mock expectations
	mockRepo.On("GetUserBalance", ctx, tenantID, userID).Return(expectedBalance, nil)

	// Execute
	result, err := mockRepo.GetUserBalance(ctx, tenantID, userID)

	// Assert
	assert.NoError(t, err)
	assert.Equal(t, expectedBalance, result)
	mockRepo.AssertExpectations(t)
}
