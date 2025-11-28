// Package service provides base service patterns and transaction management.
// CONSTITUTION: Security First (NON-NEGOTIABLE) - All services MUST enforce tenant isolation.
// CONSTITUTION: Error Handling (MANDATORY) - Wrap errors with context using fmt.Errorf.
package service

import (
	"log/slog"
	"os"

	"github.com/keshablive/quester/internal/framework/cache"
	"gorm.io/gorm"
)

// BaseService provides common dependencies for all services.
// Embed this struct in your service to get consistent logging, caching, and transaction support.
//
// CONSTITUTION: Security First - Services embedding BaseService MUST pass tenant context.
//
// Example:
//
//	type MyService struct {
//	    service.BaseService
//	    myRepo interfaces.MyRepository
//	}
//
//	func NewMyService(db *gorm.DB, logger *slog.Logger, cache *cache.PooledRedisClient) *MyService {
//	    return &MyService{
//	        BaseService: service.NewBaseService(db, logger, cache, nil),
//	        myRepo:      repo.NewMyRepository(db),
//	    }
//	}
type BaseService struct {
	db     *gorm.DB
	logger *slog.Logger
	cache  *cache.PooledRedisClient
	txMgr  *TransactionManager
}

// NewBaseService creates a new BaseService with the provided dependencies.
// If logger is nil, a default logger writing to stdout will be created.
// If txMgr is nil, a new TransactionManager will be created if db is provided.
func NewBaseService(db *gorm.DB, logger *slog.Logger, redisCache *cache.PooledRedisClient, txMgr *TransactionManager) BaseService {
	if logger == nil {
		logger = slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
			Level: slog.LevelInfo,
		}))
	}

	// Create transaction manager if not provided but DB is available
	if txMgr == nil && db != nil {
		txMgr = NewTransactionManager(db)
	}

	return BaseService{
		db:     db,
		logger: logger,
		cache:  redisCache,
		txMgr:  txMgr,
	}
}

// GetDB returns the database connection.
// Returns nil if no database was configured.
func (b *BaseService) GetDB() *gorm.DB {
	return b.db
}

// GetLogger returns the service logger.
// Always returns a valid logger - defaults to stdout if none was provided.
func (b *BaseService) GetLogger() *slog.Logger {
	if b.logger == nil {
		// Return a fallback logger - this shouldn't happen if NewBaseService was used
		return slog.New(slog.NewJSONHandler(os.Stdout, nil))
	}
	return b.logger
}

// GetCache returns the Redis cache client.
// Returns nil if no cache was configured.
func (b *BaseService) GetCache() *cache.PooledRedisClient {
	return b.cache
}

// HasCache returns true if a cache client is configured.
func (b *BaseService) HasCache() bool {
	return b.cache != nil
}

// GetTxManager returns the transaction manager.
// Returns nil if no transaction manager was configured.
func (b *BaseService) GetTxManager() *TransactionManager {
	return b.txMgr
}

// HasTxManager returns true if a transaction manager is configured.
func (b *BaseService) HasTxManager() bool {
	return b.txMgr != nil
}

// LogInfo logs an info-level message with structured fields.
// Convenience method for GetLogger().Info().
func (b *BaseService) LogInfo(msg string, args ...any) {
	b.GetLogger().Info(msg, args...)
}

// LogError logs an error-level message with structured fields.
// Convenience method for GetLogger().Error().
func (b *BaseService) LogError(msg string, args ...any) {
	b.GetLogger().Error(msg, args...)
}

// LogWarn logs a warning-level message with structured fields.
// Convenience method for GetLogger().Warn().
func (b *BaseService) LogWarn(msg string, args ...any) {
	b.GetLogger().Warn(msg, args...)
}

// LogDebug logs a debug-level message with structured fields.
// Convenience method for GetLogger().Debug().
func (b *BaseService) LogDebug(msg string, args ...any) {
	b.GetLogger().Debug(msg, args...)
}

// WithLogger creates a child logger with additional context fields.
// Returns a new logger that includes the provided attributes.
//
// Example:
//
//	reqLogger := b.WithLogger("request_id", requestID, "user_id", userID)
//	reqLogger.Info("processing request")
func (b *BaseService) WithLogger(args ...any) *slog.Logger {
	return b.GetLogger().With(args...)
}
