// Package metrics provides GORM callbacks for database metrics
package metrics

import (
	"time"

	"gorm.io/gorm"
)

// GormMetricsPlugin is a GORM plugin that records database query metrics
type GormMetricsPlugin struct{}

// Name returns the plugin name
func (p *GormMetricsPlugin) Name() string {
	return "gorm:metrics"
}

// Initialize registers callbacks for query metrics
func (p *GormMetricsPlugin) Initialize(db *gorm.DB) error {
	// Register callbacks for all operations
	registerCallbacks(db)
	return nil
}

// registerCallbacks registers metrics callbacks for CRUD operations
func registerCallbacks(db *gorm.DB) {
	// Create operation
	_ = db.Callback().Create().After("gorm:create").Register("metrics:create", func(db *gorm.DB) {
		recordQuery(db, "CREATE")
	})

	// Query operation
	_ = db.Callback().Query().After("gorm:query").Register("metrics:query", func(db *gorm.DB) {
		recordQuery(db, "SELECT")
	})

	// Update operation
	_ = db.Callback().Update().After("gorm:update").Register("metrics:update", func(db *gorm.DB) {
		recordQuery(db, "UPDATE")
	})

	// Delete operation
	_ = db.Callback().Delete().After("gorm:delete").Register("metrics:delete", func(db *gorm.DB) {
		recordQuery(db, "DELETE")
	})

	// Raw operation
	_ = db.Callback().Raw().After("gorm:raw").Register("metrics:raw", func(db *gorm.DB) {
		recordQuery(db, "RAW")
	})

	// Row operation
	_ = db.Callback().Row().After("gorm:row").Register("metrics:row", func(db *gorm.DB) {
		recordQuery(db, "ROW")
	})
}

// recordQuery records database query metrics
func recordQuery(db *gorm.DB, operation string) {
	// Get query start time from context (if set by Before callback)
	startTime, ok := db.InstanceGet("metrics:start_time")
	if !ok {
		// If no start time, use minimal duration
		RecordDBQuery(operation, getTableName(db), 0, db.Error)
		return
	}

	// Calculate duration
	duration := time.Since(startTime.(time.Time))

	// Record metrics
	RecordDBQuery(operation, getTableName(db), duration, db.Error)
}

// getTableName extracts the table name from the GORM statement
func getTableName(db *gorm.DB) string {
	if db.Statement == nil {
		return "unknown"
	}

	if db.Statement.Table != "" {
		return db.Statement.Table
	}

	if db.Statement.Schema != nil {
		return db.Statement.Schema.Table
	}

	return "unknown"
}

// RegisterBeforeCallbacks registers Before callbacks to track start time
func RegisterBeforeCallbacks(db *gorm.DB) {
	// Register Before callbacks to set start time
	_ = db.Callback().Create().Before("gorm:create").Register("metrics:before_create", beforeCallback)
	_ = db.Callback().Query().Before("gorm:query").Register("metrics:before_query", beforeCallback)
	_ = db.Callback().Update().Before("gorm:update").Register("metrics:before_update", beforeCallback)
	_ = db.Callback().Delete().Before("gorm:delete").Register("metrics:before_delete", beforeCallback)
	_ = db.Callback().Raw().Before("gorm:raw").Register("metrics:before_raw", beforeCallback)
	_ = db.Callback().Row().Before("gorm:row").Register("metrics:before_row", beforeCallback)
}

// beforeCallback sets the query start time
func beforeCallback(db *gorm.DB) {
	db.InstanceSet("metrics:start_time", time.Now())
}

// InstallGormMetrics installs both Before and After callbacks for metrics
func InstallGormMetrics(db *gorm.DB) error {
	// Register Before callbacks to track start time
	RegisterBeforeCallbacks(db)

	// Register the plugin (After callbacks)
	plugin := &GormMetricsPlugin{}
	return db.Use(plugin)
}
