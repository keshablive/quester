package interfaces

import (
	"context"
	"database/sql"

	"gorm.io/gorm"
)

// DatabaseClient defines the interface for database operations
// Abstracts GORM operations to enable transaction management and testing
type DatabaseClient interface {
	// WithContext returns a new database instance with the given context
	WithContext(ctx context.Context) DatabaseClient

	// Begin starts a new transaction
	Begin() DatabaseClient

	// Commit commits the current transaction
	Commit() error

	// Rollback rolls back the current transaction
	Rollback() error

	// Transaction executes a function within a transaction
	// If the function returns an error, the transaction is rolled back
	// Otherwise, the transaction is committed
	Transaction(fc func(tx DatabaseClient) error) error

	// Raw executes a raw SQL query
	Raw(sql string, values ...interface{}) DatabaseClient

	// Exec executes a raw SQL command
	Exec(sql string, values ...interface{}) DatabaseClient

	// Create inserts a new record into the database
	Create(value interface{}) error

	// Save updates all fields of a record
	Save(value interface{}) error

	// Update updates specified fields of a record
	Update(column string, value interface{}) error

	// Updates updates multiple fields of a record
	Updates(values interface{}) error

	// Delete soft-deletes a record (if model has DeletedAt field)
	Delete(value interface{}, conds ...interface{}) error

	// First finds the first record matching given conditions
	First(dest interface{}, conds ...interface{}) error

	// Find finds records matching given conditions
	Find(dest interface{}, conds ...interface{}) error

	// Where adds a WHERE clause to the query
	Where(query interface{}, args ...interface{}) DatabaseClient

	// Or adds an OR clause to the query
	Or(query interface{}, args ...interface{}) DatabaseClient

	// Not adds a NOT clause to the query
	Not(query interface{}, args ...interface{}) DatabaseClient

	// Order adds an ORDER BY clause to the query
	Order(value interface{}) DatabaseClient

	// Limit adds a LIMIT clause to the query
	Limit(limit int) DatabaseClient

	// Offset adds an OFFSET clause to the query
	Offset(offset int) DatabaseClient

	// Group adds a GROUP BY clause to the query
	Group(name string) DatabaseClient

	// Having adds a HAVING clause to the query
	Having(query interface{}, args ...interface{}) DatabaseClient

	// Joins adds a JOIN clause to the query
	Joins(query string, args ...interface{}) DatabaseClient

	// Preload preloads associations with given conditions
	Preload(query string, args ...interface{}) DatabaseClient

	// Count returns the count of records matching the query
	Count(count *int64) error

	// Scan scans results into a custom struct
	Scan(dest interface{}) error

	// Pluck queries a single column and scans into a slice
	Pluck(column string, dest interface{}) error

	// Error returns the last error that occurred
	Error() error

	// RowsAffected returns the number of rows affected by the last operation
	RowsAffected() int64

	// DB returns the underlying *sql.DB instance
	DB() (*sql.DB, error)

	// UnderlyingDB returns the underlying *gorm.DB instance
	// This is a temporary method to support gradual migration
	UnderlyingDB() *gorm.DB
}

// GormDatabaseAdapter adapts *gorm.DB to implement DatabaseClient interface
// This enables gradual migration from direct GORM usage to interface-based usage
type GormDatabaseAdapter struct {
	db *gorm.DB
}

// NewGormDatabaseAdapter creates a new adapter for *gorm.DB
func NewGormDatabaseAdapter(db *gorm.DB) DatabaseClient {
	return &GormDatabaseAdapter{db: db}
}

// Implementation of DatabaseClient interface for GormDatabaseAdapter
// Each method delegates to the underlying *gorm.DB instance

func (a *GormDatabaseAdapter) WithContext(ctx context.Context) DatabaseClient {
	return &GormDatabaseAdapter{db: a.db.WithContext(ctx)}
}

func (a *GormDatabaseAdapter) Begin() DatabaseClient {
	return &GormDatabaseAdapter{db: a.db.Begin()}
}

func (a *GormDatabaseAdapter) Commit() error {
	return a.db.Commit().Error
}

func (a *GormDatabaseAdapter) Rollback() error {
	return a.db.Rollback().Error
}

func (a *GormDatabaseAdapter) Transaction(fc func(tx DatabaseClient) error) error {
	return a.db.Transaction(func(tx *gorm.DB) error {
		return fc(&GormDatabaseAdapter{db: tx})
	})
}

func (a *GormDatabaseAdapter) Raw(sql string, values ...interface{}) DatabaseClient {
	return &GormDatabaseAdapter{db: a.db.Raw(sql, values...)}
}

func (a *GormDatabaseAdapter) Exec(sql string, values ...interface{}) DatabaseClient {
	return &GormDatabaseAdapter{db: a.db.Exec(sql, values...)}
}

func (a *GormDatabaseAdapter) Create(value interface{}) error {
	return a.db.Create(value).Error
}

func (a *GormDatabaseAdapter) Save(value interface{}) error {
	return a.db.Save(value).Error
}

func (a *GormDatabaseAdapter) Update(column string, value interface{}) error {
	return a.db.Update(column, value).Error
}

func (a *GormDatabaseAdapter) Updates(values interface{}) error {
	return a.db.Updates(values).Error
}

func (a *GormDatabaseAdapter) Delete(value interface{}, conds ...interface{}) error {
	return a.db.Delete(value, conds...).Error
}

func (a *GormDatabaseAdapter) First(dest interface{}, conds ...interface{}) error {
	return a.db.First(dest, conds...).Error
}

func (a *GormDatabaseAdapter) Find(dest interface{}, conds ...interface{}) error {
	return a.db.Find(dest, conds...).Error
}

func (a *GormDatabaseAdapter) Where(query interface{}, args ...interface{}) DatabaseClient {
	return &GormDatabaseAdapter{db: a.db.Where(query, args...)}
}

func (a *GormDatabaseAdapter) Or(query interface{}, args ...interface{}) DatabaseClient {
	return &GormDatabaseAdapter{db: a.db.Or(query, args...)}
}

func (a *GormDatabaseAdapter) Not(query interface{}, args ...interface{}) DatabaseClient {
	return &GormDatabaseAdapter{db: a.db.Not(query, args...)}
}

func (a *GormDatabaseAdapter) Order(value interface{}) DatabaseClient {
	return &GormDatabaseAdapter{db: a.db.Order(value)}
}

func (a *GormDatabaseAdapter) Limit(limit int) DatabaseClient {
	return &GormDatabaseAdapter{db: a.db.Limit(limit)}
}

func (a *GormDatabaseAdapter) Offset(offset int) DatabaseClient {
	return &GormDatabaseAdapter{db: a.db.Offset(offset)}
}

func (a *GormDatabaseAdapter) Group(name string) DatabaseClient {
	return &GormDatabaseAdapter{db: a.db.Group(name)}
}

func (a *GormDatabaseAdapter) Having(query interface{}, args ...interface{}) DatabaseClient {
	return &GormDatabaseAdapter{db: a.db.Having(query, args...)}
}

func (a *GormDatabaseAdapter) Joins(query string, args ...interface{}) DatabaseClient {
	return &GormDatabaseAdapter{db: a.db.Joins(query, args...)}
}

func (a *GormDatabaseAdapter) Preload(query string, args ...interface{}) DatabaseClient {
	return &GormDatabaseAdapter{db: a.db.Preload(query, args...)}
}

func (a *GormDatabaseAdapter) Count(count *int64) error {
	return a.db.Count(count).Error
}

func (a *GormDatabaseAdapter) Scan(dest interface{}) error {
	return a.db.Scan(dest).Error
}

func (a *GormDatabaseAdapter) Pluck(column string, dest interface{}) error {
	return a.db.Pluck(column, dest).Error
}

func (a *GormDatabaseAdapter) Error() error {
	return a.db.Error
}

func (a *GormDatabaseAdapter) RowsAffected() int64 {
	return a.db.RowsAffected
}

func (a *GormDatabaseAdapter) DB() (*sql.DB, error) {
	return a.db.DB()
}

func (a *GormDatabaseAdapter) UnderlyingDB() *gorm.DB {
	return a.db
}
