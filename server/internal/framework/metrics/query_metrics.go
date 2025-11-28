// Package metrics provides Prometheus metrics for database query monitoring.
// Task Reference: 009-database-query-optimization T007
package metrics

import (
	"context"
	"fmt"
	"log"
	"strings"
	"time"

	"gorm.io/gorm"
)

// QueryContext holds context for query monitoring and metrics
// Per data-model.md QueryMetrics structure
type QueryContext struct {
	StartTime     time.Time         // Query start timestamp
	Operation     string            // SELECT, INSERT, UPDATE, DELETE
	Table         string            // Primary table name
	TenantID      string            // Tenant ID for multi-tenant tracking
	RowsAffected  int64             // Number of rows affected/returned
	DurationMS    float64           // Query duration in milliseconds
	IsSlowQuery   bool              // True if duration > threshold
	ExplainResult string            // EXPLAIN ANALYZE output (for slow queries)
	Error         error             // Query error if any
	Labels        map[string]string // Additional labels for metrics
}

// QueryMetricsConfig holds configuration for query monitoring
type QueryMetricsConfig struct {
	SlowQueryThresholdMS int    // Threshold in milliseconds (default: 100)
	EnableExplainAnalyze bool   // Run EXPLAIN ANALYZE for slow queries
	EnableLogging        bool   // Log slow queries to stdout
	LogLevel             string // "debug", "info", "warn", "error"
}

// DefaultQueryMetricsConfig returns sensible defaults per spec
func DefaultQueryMetricsConfig() *QueryMetricsConfig {
	return &QueryMetricsConfig{
		SlowQueryThresholdMS: 100, // FR-006: 100ms default
		EnableExplainAnalyze: true,
		EnableLogging:        true,
		LogLevel:             "warn",
	}
}

// queryMetricsPlugin implements GORM plugin interface for query monitoring
type queryMetricsPlugin struct {
	config *QueryMetricsConfig
}

// NewQueryMetricsPlugin creates a new GORM plugin for query metrics
func NewQueryMetricsPlugin(config *QueryMetricsConfig) gorm.Plugin {
	if config == nil {
		config = DefaultQueryMetricsConfig()
	}
	return &queryMetricsPlugin{config: config}
}

// Name returns the plugin name
func (p *queryMetricsPlugin) Name() string {
	return "query_metrics_plugin"
}

// Initialize registers callbacks with GORM
// Task Reference: 009-database-query-optimization T010
func (p *queryMetricsPlugin) Initialize(db *gorm.DB) error {
	// Register before callbacks to capture start time
	if err := db.Callback().Query().Before("gorm:query").Register("query_metrics:before_query", p.beforeQuery); err != nil {
		return fmt.Errorf("failed to register before_query callback: %w", err)
	}
	if err := db.Callback().Create().Before("gorm:create").Register("query_metrics:before_create", p.beforeQuery); err != nil {
		return fmt.Errorf("failed to register before_create callback: %w", err)
	}
	if err := db.Callback().Update().Before("gorm:update").Register("query_metrics:before_update", p.beforeQuery); err != nil {
		return fmt.Errorf("failed to register before_update callback: %w", err)
	}
	if err := db.Callback().Delete().Before("gorm:delete").Register("query_metrics:before_delete", p.beforeQuery); err != nil {
		return fmt.Errorf("failed to register before_delete callback: %w", err)
	}

	// Register after callbacks to record metrics
	if err := db.Callback().Query().After("gorm:query").Register("query_metrics:after_query", p.afterQuery("SELECT")); err != nil {
		return fmt.Errorf("failed to register after_query callback: %w", err)
	}
	if err := db.Callback().Create().After("gorm:create").Register("query_metrics:after_create", p.afterQuery("INSERT")); err != nil {
		return fmt.Errorf("failed to register after_create callback: %w", err)
	}
	if err := db.Callback().Update().After("gorm:update").Register("query_metrics:after_update", p.afterQuery("UPDATE")); err != nil {
		return fmt.Errorf("failed to register after_update callback: %w", err)
	}
	if err := db.Callback().Delete().After("gorm:delete").Register("query_metrics:after_delete", p.afterQuery("DELETE")); err != nil {
		return fmt.Errorf("failed to register after_delete callback: %w", err)
	}

	log.Printf("query_metrics: plugin initialized with slow_query_threshold=%dms", p.config.SlowQueryThresholdMS)
	return nil
}

// queryStartTimeKey is the context key for storing query start time
type queryStartTimeKey struct{}

// beforeQuery captures the start time before a query executes
func (p *queryMetricsPlugin) beforeQuery(db *gorm.DB) {
	if db.Statement.Context == nil {
		db.Statement.Context = context.Background()
	}
	db.Statement.Context = context.WithValue(db.Statement.Context, queryStartTimeKey{}, time.Now())
}

// afterQuery creates a callback that records metrics after query execution
// Task Reference: 009-database-query-optimization T008
func (p *queryMetricsPlugin) afterQuery(operation string) func(*gorm.DB) {
	return func(db *gorm.DB) {
		// Get start time from context
		startTime, ok := db.Statement.Context.Value(queryStartTimeKey{}).(time.Time)
		if !ok {
			return // No start time recorded, skip metrics
		}

		// Calculate duration
		duration := time.Since(startTime)
		durationSeconds := duration.Seconds()
		durationMS := duration.Milliseconds()

		// Extract table name
		table := extractTableName(db.Statement)

		// Record duration metric
		RecordQueryDuration(operation, table, durationSeconds)

		// Record rows affected
		rowsAffected := db.RowsAffected
		if rowsAffected >= 0 {
			RecordQueryRowsAffected(operation, table, float64(rowsAffected))
		}

		// Check for slow query
		if int(durationMS) >= p.config.SlowQueryThresholdMS {
			RecordSlowQuery(operation, table)
			p.handleSlowQuery(db, operation, table, durationMS)
		}
	}
}

// handleSlowQuery logs slow queries and optionally runs EXPLAIN ANALYZE
// Task Reference: 009-database-query-optimization T009
func (p *queryMetricsPlugin) handleSlowQuery(db *gorm.DB, operation, table string, durationMS int64) {
	if !p.config.EnableLogging {
		return
	}

	// Build the SQL string for logging
	sql := db.Statement.SQL.String()
	vars := db.Statement.Vars

	// Log the slow query
	log.Printf("[SLOW_QUERY] operation=%s table=%s duration=%dms sql=%s vars=%v",
		operation, table, durationMS, truncateSQL(sql, 500), vars)

	// Run EXPLAIN ANALYZE for SELECT queries (expensive, use carefully)
	if p.config.EnableExplainAnalyze && operation == "SELECT" && sql != "" {
		p.runExplainAnalyze(db, sql, vars, table, durationMS)
	}
}

// runExplainAnalyze runs EXPLAIN ANALYZE on a slow query and logs the result
func (p *queryMetricsPlugin) runExplainAnalyze(db *gorm.DB, sql string, vars []interface{}, table string, durationMS int64) {
	// Don't run EXPLAIN on EXPLAIN queries or non-SELECT
	if strings.HasPrefix(strings.ToUpper(strings.TrimSpace(sql)), "EXPLAIN") {
		return
	}

	// Create a new session to avoid affecting the original query
	explainSQL := fmt.Sprintf("EXPLAIN ANALYZE %s", sql)

	var explainResults []map[string]interface{}
	err := db.Session(&gorm.Session{DryRun: false}).
		Raw(explainSQL, vars...).
		Scan(&explainResults).Error

	if err != nil {
		log.Printf("[SLOW_QUERY_EXPLAIN] table=%s error=%v", table, err)
		return
	}

	// Format and log the explain output
	var explainOutput strings.Builder
	for _, row := range explainResults {
		if plan, ok := row["QUERY PLAN"]; ok {
			explainOutput.WriteString(fmt.Sprintf("%v\n", plan))
		}
	}

	if explainOutput.Len() > 0 {
		log.Printf("[SLOW_QUERY_EXPLAIN] table=%s duration=%dms plan:\n%s",
			table, durationMS, explainOutput.String())
	}
}

// extractTableName extracts the table name from a GORM statement
func extractTableName(stmt *gorm.Statement) string {
	if stmt.Table != "" {
		return stmt.Table
	}
	if stmt.Schema != nil {
		return stmt.Schema.Table
	}
	return "unknown"
}

// truncateSQL truncates a SQL string to max length for logging
func truncateSQL(sql string, maxLen int) string {
	// Clean up whitespace
	sql = strings.Join(strings.Fields(sql), " ")

	if len(sql) <= maxLen {
		return sql
	}
	return sql[:maxLen] + "..."
}

// UpdateConfig allows runtime configuration updates
func (p *queryMetricsPlugin) UpdateConfig(config *QueryMetricsConfig) {
	if config != nil {
		p.config = config
	}
}

// InstallQueryMetricsPlugin installs the query metrics plugin on a GORM DB instance
func InstallQueryMetricsPlugin(db *gorm.DB, slowQueryThresholdMS int) error {
	config := &QueryMetricsConfig{
		SlowQueryThresholdMS: slowQueryThresholdMS,
		EnableExplainAnalyze: true,
		EnableLogging:        true,
		LogLevel:             "warn",
	}

	plugin := NewQueryMetricsPlugin(config)
	return db.Use(plugin)
}
