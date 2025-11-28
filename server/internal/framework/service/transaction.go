// Package service provides base service patterns and transaction management.
// CONSTITUTION: Data Integrity (CRITICAL) - Transactions MUST be atomic.
package service

import (
	"context"
	"fmt"

	"gorm.io/gorm"
)

// txContextKey is the context key for passing transaction DB within a transaction scope.
type txContextKey struct{}

// TransactionManager provides transaction and savepoint management for services.
// Use this for operations that span multiple repositories or require atomicity.
//
// CONSTITUTION: Data Integrity - All multi-entity operations MUST use transactions.
//
// Example:
//
//	err := txMgr.RunInTransaction(ctx, func(txCtx context.Context) error {
//	    if err := repo1.Create(txCtx, entity1); err != nil {
//	        return err // Auto-rollback
//	    }
//	    if err := repo2.Create(txCtx, entity2); err != nil {
//	        return err // Auto-rollback
//	    }
//	    return nil // Auto-commit
//	})
type TransactionManager struct {
	db *gorm.DB
}

// NewTransactionManager creates a new TransactionManager with the given database.
func NewTransactionManager(db *gorm.DB) *TransactionManager {
	return &TransactionManager{db: db}
}

// TransactionFunc is a function that runs within a transaction context.
// Return an error to trigger rollback, return nil to commit.
type TransactionFunc func(ctx context.Context) error

// RunInTransaction executes the given function within a database transaction.
// If the function returns an error, the transaction is rolled back.
// If the function returns nil, the transaction is committed.
//
// The transaction DB is passed via context and can be retrieved using GetTxFromContext.
//
// CONSTITUTION: Error Handling - Transaction failures MUST be wrapped with context.
func (tm *TransactionManager) RunInTransaction(ctx context.Context, fn TransactionFunc) error {
	if tm.db == nil {
		return fmt.Errorf("%w: database connection is nil", ErrTransactionFailed)
	}

	return tm.db.Transaction(func(tx *gorm.DB) error {
		// Store the transaction in context so repositories can access it
		txCtx := context.WithValue(ctx, txContextKey{}, tx)

		if err := fn(txCtx); err != nil {
			// Error will trigger automatic rollback by GORM
			return err
		}
		// Returning nil will trigger automatic commit by GORM
		return nil
	})
}

// RunWithSavepoint executes the given function within a savepoint (nested transaction).
// Use this for partial rollback scenarios within a larger transaction.
//
// If name is empty, a default name "sp_nested" will be used.
//
// CONSTITUTION: Data Integrity - Savepoints allow partial rollback while preserving
// the outer transaction state.
//
// Example:
//
//	err := txMgr.RunInTransaction(ctx, func(txCtx context.Context) error {
//	    // First operation - committed even if savepoint fails
//	    if err := repo1.Create(txCtx, entity1); err != nil {
//	        return err
//	    }
//
//	    // Try optional operation with savepoint
//	    savepointErr := txMgr.RunWithSavepoint(txCtx, "optional_op", func(spCtx context.Context) error {
//	        return repo2.Create(spCtx, entity2) // May fail
//	    })
//
//	    if savepointErr != nil {
//	        // Log but continue - entity1 is still being committed
//	        log.Printf("optional operation failed: %v", savepointErr)
//	    }
//
//	    return nil // Commits entity1
//	})
func (tm *TransactionManager) RunWithSavepoint(ctx context.Context, name string, fn TransactionFunc) error {
	if tm.db == nil {
		return fmt.Errorf("%w: database connection is nil", ErrTransactionFailed)
	}

	// Use default name if empty
	if name == "" {
		name = "sp_nested"
	}

	// Get the transaction from context, or use the main DB
	db := GetTxFromContext(ctx)
	if db == nil {
		db = tm.db
	}

	// Begin savepoint
	sp := db.SavePoint(name)
	if sp.Error != nil {
		return fmt.Errorf("%w: failed to create savepoint %s: %v", ErrSavepointFailed, name, sp.Error)
	}

	// Execute the function
	if err := fn(ctx); err != nil {
		// Rollback to savepoint
		rb := db.RollbackTo(name)
		if rb.Error != nil {
			return fmt.Errorf("%w: failed to rollback savepoint %s: %v (original error: %v)",
				ErrSavepointFailed, name, rb.Error, err)
		}
		return err
	}

	// Release savepoint (implicit on success with most databases)
	// Note: PostgreSQL automatically releases savepoints on commit
	return nil
}

// GetTxFromContext retrieves the transaction DB from context.
// Returns nil if no transaction is active.
// Use this in repositories to participate in the current transaction.
//
// Example:
//
//	func (r *MyRepository) Create(ctx context.Context, entity *Entity) error {
//	    db := service.GetTxFromContext(ctx)
//	    if db == nil {
//	        db = r.db // Fallback to main DB
//	    }
//	    return db.Create(entity).Error
//	}
func GetTxFromContext(ctx context.Context) *gorm.DB {
	if ctx == nil {
		return nil
	}
	if tx, ok := ctx.Value(txContextKey{}).(*gorm.DB); ok {
		return tx
	}
	return nil
}

// GetDBOrTx returns the transaction from context if present, otherwise returns the provided DB.
// This is a convenience function for repositories.
//
// Example:
//
//	func (r *MyRepository) Create(ctx context.Context, entity *Entity) error {
//	    db := service.GetDBOrTx(ctx, r.db)
//	    return db.Create(entity).Error
//	}
func GetDBOrTx(ctx context.Context, db *gorm.DB) *gorm.DB {
	if tx := GetTxFromContext(ctx); tx != nil {
		return tx
	}
	return db
}
