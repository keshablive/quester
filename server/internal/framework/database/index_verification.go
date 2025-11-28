// Package database provides index verification utilities for query optimization.
// Task Reference: 009-database-query-optimization T020
package database

import (
	"fmt"
	"log"
	"strings"

	"gorm.io/gorm"
)

// IndexInfo represents information about a database index
type IndexInfo struct {
	TableName  string `json:"table_name"`
	IndexName  string `json:"index_name"`
	IndexDef   string `json:"index_def"`
	IsUnique   bool   `json:"is_unique"`
	IsPrimary  bool   `json:"is_primary"`
	ColumnName string `json:"column_name"`
}

// IndexUsageStats represents index usage statistics
type IndexUsageStats struct {
	RelName      string `json:"rel_name"`      // Table name
	IndexRelName string `json:"indexrelname"`  // Index name
	IdxScan      int64  `json:"idx_scan"`      // Number of index scans
	IdxTupRead   int64  `json:"idx_tup_read"`  // Tuples read via index
	IdxTupFetch  int64  `json:"idx_tup_fetch"` // Tuples fetched via index
}

// QueryExplainResult represents EXPLAIN ANALYZE output
type QueryExplainResult struct {
	QueryPlan string `json:"query_plan"`
}

// VerifyIndex checks if an index exists and is being used
// Returns true if index exists, false otherwise
func VerifyIndex(db *gorm.DB, indexName string) (bool, error) {
	var count int64
	err := db.Raw(`
		SELECT COUNT(*) 
		FROM pg_indexes 
		WHERE indexname = ?
	`, indexName).Scan(&count).Error

	if err != nil {
		return false, fmt.Errorf("failed to verify index %s: %w", indexName, err)
	}

	return count > 0, nil
}

// ListIndexes returns all indexes for a given table
func ListIndexes(db *gorm.DB, tableName string) ([]IndexInfo, error) {
	var indexes []IndexInfo

	err := db.Raw(`
		SELECT 
			t.relname as table_name,
			i.relname as index_name,
			pg_get_indexdef(i.oid) as index_def,
			ix.indisunique as is_unique,
			ix.indisprimary as is_primary,
			a.attname as column_name
		FROM pg_class t
		JOIN pg_index ix ON t.oid = ix.indrelid
		JOIN pg_class i ON i.oid = ix.indexrelid
		JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
		WHERE t.relname = ?
		ORDER BY i.relname, a.attnum
	`, tableName).Scan(&indexes).Error

	if err != nil {
		return nil, fmt.Errorf("failed to list indexes for table %s: %w", tableName, err)
	}

	return indexes, nil
}

// GetIndexUsageStats returns usage statistics for indexes
func GetIndexUsageStats(db *gorm.DB, tableName string) ([]IndexUsageStats, error) {
	var stats []IndexUsageStats

	err := db.Raw(`
		SELECT 
			relname,
			indexrelname,
			idx_scan,
			idx_tup_read,
			idx_tup_fetch
		FROM pg_stat_user_indexes
		WHERE relname = ?
		ORDER BY idx_scan DESC
	`, tableName).Scan(&stats).Error

	if err != nil {
		return nil, fmt.Errorf("failed to get index usage stats for table %s: %w", tableName, err)
	}

	return stats, nil
}

// ExplainQuery runs EXPLAIN ANALYZE on a query and returns the plan
func ExplainQuery(db *gorm.DB, query string, args ...interface{}) ([]QueryExplainResult, error) {
	// Ensure query doesn't already have EXPLAIN
	if strings.HasPrefix(strings.ToUpper(strings.TrimSpace(query)), "EXPLAIN") {
		return nil, fmt.Errorf("query already contains EXPLAIN")
	}

	explainSQL := fmt.Sprintf("EXPLAIN ANALYZE %s", query)

	var results []QueryExplainResult
	err := db.Raw(explainSQL, args...).Scan(&results).Error
	if err != nil {
		return nil, fmt.Errorf("failed to run EXPLAIN ANALYZE: %w", err)
	}

	return results, nil
}

// CheckIndexScan verifies that a query uses an index scan (not sequential scan)
// Returns true if index scan is used, along with the query plan
func CheckIndexScan(db *gorm.DB, query string, args ...interface{}) (bool, string, error) {
	results, err := ExplainQuery(db, query, args...)
	if err != nil {
		return false, "", err
	}

	var fullPlan strings.Builder
	usesIndexScan := false

	for _, r := range results {
		fullPlan.WriteString(r.QueryPlan)
		fullPlan.WriteString("\n")

		// Check for Index Scan patterns
		if strings.Contains(r.QueryPlan, "Index Scan") ||
			strings.Contains(r.QueryPlan, "Index Only Scan") ||
			strings.Contains(r.QueryPlan, "Bitmap Index Scan") {
			usesIndexScan = true
		}
	}

	return usesIndexScan, fullPlan.String(), nil
}

// LogIndexVerification logs verification results for all optimization indexes
// Useful for debugging and monitoring index usage
func LogIndexVerification(db *gorm.DB) {
	indexes := []string{
		"idx_courses_tenant_status_category",
		"idx_courses_tenant_published_created",
		"idx_courses_tenant_instructor",
		"idx_transactions_tenant_user_status",
		"idx_transactions_tenant_status_created",
		"idx_transactions_tenant_seller",
		"idx_quests_tenant_status_difficulty",
		"idx_quests_tenant_status",
		"idx_users_tenant_status_tier",
	}

	log.Println("[INDEX_VERIFICATION] Checking query optimization indexes...")

	for _, indexName := range indexes {
		exists, err := VerifyIndex(db, indexName)
		if err != nil {
			log.Printf("[INDEX_VERIFICATION] %s: ERROR - %v", indexName, err)
			continue
		}

		if exists {
			log.Printf("[INDEX_VERIFICATION] %s: ✅ EXISTS", indexName)
		} else {
			log.Printf("[INDEX_VERIFICATION] %s: ❌ MISSING", indexName)
		}
	}

	log.Println("[INDEX_VERIFICATION] Check complete")
}

// GetIndexRecommendations analyzes unused indexes and recommends actions
func GetIndexRecommendations(db *gorm.DB) ([]string, error) {
	var recommendations []string

	// Find unused indexes (0 scans since last stats reset)
	var unusedIndexes []struct {
		IndexName string `gorm:"column:indexrelname"`
		TableName string `gorm:"column:relname"`
		IdxScan   int64  `gorm:"column:idx_scan"`
	}

	err := db.Raw(`
		SELECT 
			indexrelname,
			relname,
			idx_scan
		FROM pg_stat_user_indexes
		WHERE idx_scan = 0
		AND indexrelname NOT LIKE 'pg_%'
		AND indexrelname NOT LIKE '%_pkey'
	`).Scan(&unusedIndexes).Error

	if err != nil {
		return nil, fmt.Errorf("failed to get unused indexes: %w", err)
	}

	for _, idx := range unusedIndexes {
		recommendations = append(recommendations,
			fmt.Sprintf("UNUSED: Index '%s' on table '%s' has 0 scans - consider dropping",
				idx.IndexName, idx.TableName))
	}

	// Find tables with sequential scans that might benefit from indexes
	var seqScanTables []struct {
		RelName    string `gorm:"column:relname"`
		SeqScan    int64  `gorm:"column:seq_scan"`
		SeqTupRead int64  `gorm:"column:seq_tup_read"`
	}

	err = db.Raw(`
		SELECT 
			relname,
			seq_scan,
			seq_tup_read
		FROM pg_stat_user_tables
		WHERE seq_scan > 100
		AND seq_tup_read > 10000
		ORDER BY seq_tup_read DESC
		LIMIT 10
	`).Scan(&seqScanTables).Error

	if err != nil {
		return recommendations, nil // Return partial results
	}

	for _, tbl := range seqScanTables {
		recommendations = append(recommendations,
			fmt.Sprintf("HIGH_SEQ_SCAN: Table '%s' has %d seq scans reading %d tuples - consider adding indexes",
				tbl.RelName, tbl.SeqScan, tbl.SeqTupRead))
	}

	return recommendations, nil
}
