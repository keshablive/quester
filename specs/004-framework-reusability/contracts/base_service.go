// Package service provides base service contracts.
// This is the CONTRACT file - actual implementation will be in server/internal/framework/service/
package contracts

import (
	"context"
	"log/slog"

	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
)

// BaseService provides common dependencies for all services.
// Services embed this struct to avoid repetitive constructor code.
//
// CONSTITUTION: Consistency (MANDATORY) - All services SHOULD embed BaseService
// for consistent dependency injection and access patterns.
//
// Example:
//
//	type BadgeService struct {
//	    service.BaseService  // Embed base
//	    badgeRepo *repositories.BadgeRepository
//	}
//
//	func NewBadgeService(base service.BaseService, repo *repositories.BadgeRepository) *BadgeService {
//	    return &BadgeService{
//	        BaseService: base,
//	        badgeRepo:   repo,
//	    }
//	}
type BaseService struct {
	// DB is the GORM database connection (required)
	DB *gorm.DB

	// Logger is the structured logger instance (defaults to slog.Default() if nil)
	Logger *slog.Logger

	// Cache is the Redis cache client (optional, may be nil)
	Cache *redis.Client

	// TxManager is the transaction manager for database operations (optional)
	TxManager *TransactionManager
}

// NewBaseService creates a new BaseService with the given dependencies.
func NewBaseService(db *gorm.DB, logger *slog.Logger, cache *redis.Client, txManager *TransactionManager) BaseService {
	if logger == nil {
		logger = slog.Default()
	}
	return BaseService{
		DB:        db,
		Logger:    logger,
		Cache:     cache,
		TxManager: txManager,
	}
}

// GetLogger returns the logger, defaulting to slog.Default() if nil.
func (s *BaseService) GetLogger() *slog.Logger {
	if s.Logger == nil {
		return slog.Default()
	}
	return s.Logger
}

// HasCache returns true if a cache client is configured.
func (s *BaseService) HasCache() bool {
	return s.Cache != nil
}

// TransactionManager provides transaction management with savepoint support.
// Supports nested transactions via PostgreSQL savepoints.
//
// CONSTITUTION: Error Handling (MANDATORY) - Transactions MUST be properly
// committed on success and rolled back on error.
//
// Usage:
//
//	err := txManager.RunInTransaction(ctx, func(tx *gorm.DB) error {
//	    if err := repo1.WithTransaction(tx).Create(ctx, entity1); err != nil {
//	        return err
//	    }
//	    if err := repo2.WithTransaction(tx).Create(ctx, entity2); err != nil {
//	        return err
//	    }
//	    return nil
//	})
type TransactionManager struct {
	db *gorm.DB
}

// NewTransactionManager creates a new TransactionManager.
func NewTransactionManager(db *gorm.DB) *TransactionManager {
	return &TransactionManager{db: db}
}

// TransactionFunc is the function signature for transaction callbacks.
type TransactionFunc func(tx *gorm.DB) error

// TransactionManagerInterface defines the contract for transaction management.
type TransactionManagerInterface interface {
	// RunInTransaction executes fn within a database transaction.
	// Automatically commits on success, rolls back on error.
	//
	// Example:
	//   err := txManager.RunInTransaction(ctx, func(tx *gorm.DB) error {
	//       // Use tx for all operations
	//       return repo.WithTransaction(tx).Create(ctx, entity)
	//   })
	RunInTransaction(ctx context.Context, fn TransactionFunc) error

	// RunWithSavepoint executes fn within a named savepoint.
	// Use for nested transactions that need partial rollback capability.
	// If fn returns error, only rolls back to savepoint, not entire transaction.
	//
	// Example:
	//   err := txManager.RunInTransaction(ctx, func(tx *gorm.DB) error {
	//       // First operation
	//       if err := repo1.WithTransaction(tx).Create(ctx, e1); err != nil {
	//           return err
	//       }
	//       // Second operation with savepoint (can fail independently)
	//       _ = txManager.RunWithSavepoint(ctx, tx, "optional_step", func(tx *gorm.DB) error {
	//           return repo2.WithTransaction(tx).Create(ctx, e2)
	//       })
	//       // Continue even if savepoint failed
	//       return nil
	//   })
	RunWithSavepoint(ctx context.Context, tx *gorm.DB, name string, fn TransactionFunc) error
}

// Service-level errors (defined in actual implementation)
// var (
//     ErrNotFound          = errors.New("resource not found")
//     ErrConflict          = errors.New("resource conflict")
//     ErrForbidden         = errors.New("access forbidden")
//     ErrTransactionFailed = errors.New("transaction failed")
// )
