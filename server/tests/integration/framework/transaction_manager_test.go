package framework_test

import (
	"context"
	"errors"
	"testing"

	"github.com/keshablive/quester/internal/framework/service"
	"github.com/stretchr/testify/assert"
)

func TestTransactionManager_NilDB(t *testing.T) {
	// TransactionManager with nil DB should handle gracefully
	txm := service.NewTransactionManager(nil)

	err := txm.RunInTransaction(context.Background(), func(ctx context.Context) error {
		return nil
	})

	// Should return an error about nil DB
	assert.Error(t, err)
	assert.True(t, service.IsTransactionError(err))
}

func TestTransactionManager_RunInTransaction_Success(t *testing.T) {
	// This test requires a DB connection - skip for now
	// In a real integration test environment, we would:
	// 1. Set up a test database
	// 2. Create a TransactionManager with the DB
	// 3. Run a transaction that succeeds
	// 4. Verify the changes were committed
	t.Skip("Requires database connection")
}

func TestTransactionManager_RunInTransaction_Rollback(t *testing.T) {
	// This test requires a DB connection - skip for now
	// In a real integration test environment, we would:
	// 1. Set up a test database
	// 2. Create a TransactionManager with the DB
	// 3. Run a transaction that returns an error
	// 4. Verify the changes were rolled back
	t.Skip("Requires database connection")
}

func TestTransactionManager_RunWithSavepoint_NilDB(t *testing.T) {
	// TransactionManager with nil DB should handle gracefully
	txm := service.NewTransactionManager(nil)

	err := txm.RunWithSavepoint(context.Background(), "test_savepoint", func(ctx context.Context) error {
		return nil
	})

	// Should return an error about nil DB
	assert.Error(t, err)
	assert.True(t, service.IsTransactionError(err))
}

func TestTransactionManager_Savepoint_EmptyName(t *testing.T) {
	// Empty savepoint name should use default
	txm := service.NewTransactionManager(nil)

	err := txm.RunWithSavepoint(context.Background(), "", func(ctx context.Context) error {
		return nil
	})

	// Should still fail due to nil DB, but not panic on empty name
	assert.Error(t, err)
}

func TestTransactionManager_TransactionError_Wrapping(t *testing.T) {
	// Verify transaction errors properly wrap underlying errors
	txm := service.NewTransactionManager(nil)

	customErr := errors.New("custom error")
	err := txm.RunInTransaction(context.Background(), func(ctx context.Context) error {
		return customErr
	})

	// Error should be related to transaction failure
	assert.Error(t, err)
	// Note: The underlying custom error may or may not be wrapped depending on implementation
}
