package utils

import (
	"context"
	"fmt"

	"gorm.io/gorm"
)

// TransactionFunc is a function that executes within a transaction
type TransactionFunc func(tx *gorm.DB) error

// ExecuteInTransaction wraps database operations in a transaction with proper error handling
// This utility ensures consistent transaction handling across all services:
// - Automatically commits on success
// - Automatically rolls back on error
// - Wraps errors with context
func ExecuteInTransaction(ctx context.Context, db *gorm.DB, fn TransactionFunc) error {
	return db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := fn(tx); err != nil {
			return err
		}
		return nil
	})
}

// ExecuteInTransactionWithResult wraps database operations in a transaction and returns a result
// Use this when you need to return a value from the transaction
func ExecuteInTransactionWithResult[T any](ctx context.Context, db *gorm.DB, fn func(tx *gorm.DB) (T, error)) (T, error) {
	var result T
	err := db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var err error
		result, err = fn(tx)
		return err
	})
	return result, err
}

// WrapTransactionError wraps a transaction error with additional context
func WrapTransactionError(err error, operation string) error {
	if err == nil {
		return nil
	}
	return fmt.Errorf("transaction failed during %s: %w", operation, err)
}

// BatchOperation represents a single operation in a batch transaction
type BatchOperation struct {
	Name      string
	Operation func(tx *gorm.DB) error
}

// ExecuteBatchInTransaction executes multiple operations in a single transaction
// All operations must succeed or the entire transaction is rolled back
func ExecuteBatchInTransaction(ctx context.Context, db *gorm.DB, operations []BatchOperation) error {
	return db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		for _, op := range operations {
			if err := op.Operation(tx); err != nil {
				return fmt.Errorf("batch operation '%s' failed: %w", op.Name, err)
			}
		}
		return nil
	})
}
