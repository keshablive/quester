// Lightweight metrics helper using Prometheus
package metrics

import (
	"log"

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
