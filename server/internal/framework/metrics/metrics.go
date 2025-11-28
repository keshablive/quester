// Lightweight metrics helper using Prometheus
package metrics

import (
	"log"

	"github.com/keshablive/quester/internal/framework/database/pool"
	"github.com/prometheus/client_golang/prometheus"
)

var (
	tenantViolationCounter = prometheus.NewCounter(
		prometheus.CounterOpts{
			Name: "tenant_violation_attempts_total",
			Help: "Total number of cross-tenant access attempts blocked by tenant isolation middleware.",
		},
	)

	// Token cleanup metrics (T083)
	tokenCleanupLastRunTimestamp = prometheus.NewGauge(
		prometheus.GaugeOpts{
			Name: "token_cleanup_last_run_timestamp_seconds",
			Help: "Timestamp of the last successful token cleanup run (Unix seconds).",
		},
	)

	tokenCleanupDeletedTotal = prometheus.NewCounter(
		prometheus.CounterOpts{
			Name: "token_cleanup_deleted_total",
			Help: "Total number of expired refresh tokens deleted by cleanup job.",
		},
	)

	tokenCleanupErrorsTotal = prometheus.NewCounter(
		prometheus.CounterOpts{
			Name: "token_cleanup_errors_total",
			Help: "Total number of errors encountered during token cleanup.",
		},
	)

	// Cache metrics (007-api-performance-caching T005)
	cacheHitsTotal = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "quester_cache_hits_total",
			Help: "Total number of cache hits by entity type.",
		},
		[]string{"entity"},
	)

	cacheMissesTotal = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "quester_cache_misses_total",
			Help: "Total number of cache misses by entity type.",
		},
		[]string{"entity"},
	)

	cacheErrorsTotal = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "quester_cache_errors_total",
			Help: "Total number of cache errors by entity type and error type.",
		},
		[]string{"entity", "error_type"},
	)

	cacheOperationDuration = prometheus.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "quester_cache_operation_duration_seconds",
			Help:    "Duration of cache operations in seconds.",
			Buckets: []float64{0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0},
		},
		[]string{"operation", "entity"},
	)

	// Compression metrics (007-api-performance-caching T010)
	compressionBytesSavedTotal = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "quester_compression_bytes_saved_total",
			Help: "Total bytes saved by response compression.",
		},
		[]string{"algorithm"},
	)

	// ETag metrics (008-api-response-optimization T045)
	etagHitsTotal = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "quester_etag_hits_total",
			Help: "Total number of ETag hits (304 Not Modified responses).",
		},
		[]string{"endpoint"},
	)

	etagMissesTotal = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "quester_etag_misses_total",
			Help: "Total number of ETag misses (full response returned).",
		},
		[]string{"endpoint"},
	)

	etagGenerationsTotal = prometheus.NewCounter(
		prometheus.CounterOpts{
			Name: "quester_etag_generations_total",
			Help: "Total number of ETags generated.",
		},
	)

	// Field filtering metrics (008-api-response-optimization T046)
	fieldFilteringRequestsTotal = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "quester_field_filtering_requests_total",
			Help: "Total number of requests with field filtering applied.",
		},
		[]string{"endpoint"},
	)

	fieldFilteringFieldsRequested = prometheus.NewHistogram(
		prometheus.HistogramOpts{
			Name:    "quester_field_filtering_fields_requested",
			Help:    "Number of fields requested in sparse fieldset queries.",
			Buckets: []float64{1, 2, 3, 5, 10, 15, 20, 30, 50},
		},
	)

	fieldFilteringBytesReduced = prometheus.NewCounter(
		prometheus.CounterOpts{
			Name: "quester_field_filtering_bytes_reduced_total",
			Help: "Total bytes reduced by field filtering.",
		},
	)

	// Database query metrics (009-database-query-optimization T005/T006)
	queryDurationHistogram = prometheus.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "quester_db_query_duration_seconds",
			Help:    "Duration of database queries in seconds by operation and table.",
			Buckets: []float64{0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0},
		},
		[]string{"operation", "table"},
	)

	slowQueryCounter = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "quester_db_slow_queries_total",
			Help: "Total number of slow database queries by table and operation.",
		},
		[]string{"operation", "table"},
	)

	queryRowsAffected = prometheus.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "quester_db_rows_affected",
			Help:    "Number of rows affected/returned by database operations.",
			Buckets: []float64{0, 1, 10, 50, 100, 500, 1000, 5000, 10000},
		},
		[]string{"operation", "table"},
	)

	replicaRoutingTotal = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "quester_db_replica_routing_total",
			Help: "Total number of queries routed to replicas by replica index.",
		},
		[]string{"replica"},
	)

	// Replica lag metric (009-database-query-optimization T050)
	replicaLagSeconds = prometheus.NewGaugeVec(
		prometheus.GaugeOpts{
			Name: "quester_db_replica_lag_seconds",
			Help: "Replication lag in seconds for each replica.",
		},
		[]string{"replica"},
	)

	// Replica health status (009-database-query-optimization T050)
	replicaHealthStatus = prometheus.NewGaugeVec(
		prometheus.GaugeOpts{
			Name: "quester_db_replica_health",
			Help: "Health status of replicas (1=healthy, 0=unhealthy).",
		},
		[]string{"replica"},
	)
)

// Init registers metrics. Call once at application startup if metrics are enabled.
func Init() {
	if err := prometheus.Register(tenantViolationCounter); err != nil {
		// If already registered, ignore
		log.Printf("metrics: failed to register tenantViolationCounter: %v", err)
	}
	if err := prometheus.Register(tokenCleanupLastRunTimestamp); err != nil {
		log.Printf("metrics: failed to register tokenCleanupLastRunTimestamp: %v", err)
	}
	if err := prometheus.Register(tokenCleanupDeletedTotal); err != nil {
		log.Printf("metrics: failed to register tokenCleanupDeletedTotal: %v", err)
	}
	if err := prometheus.Register(tokenCleanupErrorsTotal); err != nil {
		log.Printf("metrics: failed to register tokenCleanupErrorsTotal: %v", err)
	}
	// Register cache metrics (007-api-performance-caching T005)
	if err := prometheus.Register(cacheHitsTotal); err != nil {
		log.Printf("metrics: failed to register cacheHitsTotal: %v", err)
	}
	if err := prometheus.Register(cacheMissesTotal); err != nil {
		log.Printf("metrics: failed to register cacheMissesTotal: %v", err)
	}
	if err := prometheus.Register(cacheErrorsTotal); err != nil {
		log.Printf("metrics: failed to register cacheErrorsTotal: %v", err)
	}
	if err := prometheus.Register(cacheOperationDuration); err != nil {
		log.Printf("metrics: failed to register cacheOperationDuration: %v", err)
	}
	if err := prometheus.Register(compressionBytesSavedTotal); err != nil {
		log.Printf("metrics: failed to register compressionBytesSavedTotal: %v", err)
	}
	// Register ETag metrics (008-api-response-optimization T045)
	if err := prometheus.Register(etagHitsTotal); err != nil {
		log.Printf("metrics: failed to register etagHitsTotal: %v", err)
	}
	if err := prometheus.Register(etagMissesTotal); err != nil {
		log.Printf("metrics: failed to register etagMissesTotal: %v", err)
	}
	if err := prometheus.Register(etagGenerationsTotal); err != nil {
		log.Printf("metrics: failed to register etagGenerationsTotal: %v", err)
	}
	// Register field filtering metrics (008-api-response-optimization T046)
	if err := prometheus.Register(fieldFilteringRequestsTotal); err != nil {
		log.Printf("metrics: failed to register fieldFilteringRequestsTotal: %v", err)
	}
	if err := prometheus.Register(fieldFilteringFieldsRequested); err != nil {
		log.Printf("metrics: failed to register fieldFilteringFieldsRequested: %v", err)
	}
	if err := prometheus.Register(fieldFilteringBytesReduced); err != nil {
		log.Printf("metrics: failed to register fieldFilteringBytesReduced: %v", err)
	}
	// Register database query metrics (009-database-query-optimization T006)
	if err := prometheus.Register(queryDurationHistogram); err != nil {
		log.Printf("metrics: failed to register queryDurationHistogram: %v", err)
	}
	if err := prometheus.Register(slowQueryCounter); err != nil {
		log.Printf("metrics: failed to register slowQueryCounter: %v", err)
	}
	if err := prometheus.Register(queryRowsAffected); err != nil {
		log.Printf("metrics: failed to register queryRowsAffected: %v", err)
	}
	if err := prometheus.Register(replicaRoutingTotal); err != nil {
		log.Printf("metrics: failed to register replicaRoutingTotal: %v", err)
	}
	// Register replica lag metrics (009-database-query-optimization T050)
	if err := prometheus.Register(replicaLagSeconds); err != nil {
		log.Printf("metrics: failed to register replicaLagSeconds: %v", err)
	}
	if err := prometheus.Register(replicaHealthStatus); err != nil {
		log.Printf("metrics: failed to register replicaHealthStatus: %v", err)
	}
	// Register pool metrics (010-connection-pool-tuning T015)
	// Pool metrics use promauto for auto-registration, but we call RegisterMetrics
	// for explicit initialization and logging
	if err := pool.RegisterMetrics(); err != nil {
		log.Printf("metrics: failed to register pool metrics: %v", err)
	}
}

// IncTenantViolation increments the tenant violation counter
func IncTenantViolation() {
	tenantViolationCounter.Inc()
}

// SetTokenCleanupLastRun updates the last run timestamp (T083)
func SetTokenCleanupLastRun(timestamp float64) {
	tokenCleanupLastRunTimestamp.Set(timestamp)
}

// AddTokenCleanupDeleted adds to the total deleted token count
func AddTokenCleanupDeleted(count float64) {
	tokenCleanupDeletedTotal.Add(count)
}

// IncTokenCleanupErrors increments the error counter
func IncTokenCleanupErrors() {
	tokenCleanupErrorsTotal.Inc()
}

// Cache metrics helper functions (007-api-performance-caching T005, T031)

// RecordCacheHit increments the cache hit counter for an entity type
func RecordCacheHit(entity string) {
	cacheHitsTotal.WithLabelValues(entity).Inc()
}

// RecordCacheMiss increments the cache miss counter for an entity type
func RecordCacheMiss(entity string) {
	cacheMissesTotal.WithLabelValues(entity).Inc()
}

// RecordCacheError increments the cache error counter for an entity type and error type
func RecordCacheError(entity, errorType string) {
	cacheErrorsTotal.WithLabelValues(entity, errorType).Inc()
}

// RecordCacheLatency records the duration of a cache operation
func RecordCacheLatency(operation, entity string, durationSeconds float64) {
	cacheOperationDuration.WithLabelValues(operation, entity).Observe(durationSeconds)
}

// RecordCompressionSaved records bytes saved by compression
func RecordCompressionSaved(algorithm string, bytesSaved float64) {
	compressionBytesSavedTotal.WithLabelValues(algorithm).Add(bytesSaved)
}

// ETag metrics helper functions (008-api-response-optimization T045)

// RecordETagHit increments the ETag hit counter for an endpoint (304 response)
func RecordETagHit(endpoint string) {
	etagHitsTotal.WithLabelValues(endpoint).Inc()
}

// RecordETagMiss increments the ETag miss counter for an endpoint (full response)
func RecordETagMiss(endpoint string) {
	etagMissesTotal.WithLabelValues(endpoint).Inc()
}

// RecordETagGeneration increments the total ETag generation counter
func RecordETagGeneration() {
	etagGenerationsTotal.Inc()
}

// Field filtering metrics helper functions (008-api-response-optimization T046)

// RecordFieldFilteringRequest records a request that used field filtering
func RecordFieldFilteringRequest(endpoint string) {
	fieldFilteringRequestsTotal.WithLabelValues(endpoint).Inc()
}

// RecordFieldFilteringFieldsCount records the number of fields requested
func RecordFieldFilteringFieldsCount(count float64) {
	fieldFilteringFieldsRequested.Observe(count)
}

// RecordFieldFilteringBytesReduced records bytes saved by field filtering
func RecordFieldFilteringBytesReduced(bytesReduced float64) {
	fieldFilteringBytesReduced.Add(bytesReduced)
}

// Database query metrics helper functions (009-database-query-optimization T007)

// RecordQueryDuration records the duration of a database query
func RecordQueryDuration(operation, table string, durationSeconds float64) {
	queryDurationHistogram.WithLabelValues(operation, table).Observe(durationSeconds)
}

// RecordSlowQuery increments the slow query counter
func RecordSlowQuery(operation, table string) {
	slowQueryCounter.WithLabelValues(operation, table).Inc()
}

// RecordQueryRowsAffected records the number of rows affected/returned
func RecordQueryRowsAffected(operation, table string, rowCount float64) {
	queryRowsAffected.WithLabelValues(operation, table).Observe(rowCount)
}

// RecordReplicaRouting records a query routed to a replica
func RecordReplicaRouting(replicaIndex string) {
	replicaRoutingTotal.WithLabelValues(replicaIndex).Inc()
}

// SetReplicaLag sets the replication lag for a replica (009-database-query-optimization T050)
func SetReplicaLag(replicaIndex string, lagSeconds float64) {
	replicaLagSeconds.WithLabelValues(replicaIndex).Set(lagSeconds)
}

// SetReplicaHealth sets the health status for a replica (009-database-query-optimization T050)
func SetReplicaHealth(replicaIndex string, healthy bool) {
	var status float64
	if healthy {
		status = 1
	}
	replicaHealthStatus.WithLabelValues(replicaIndex).Set(status)
}
