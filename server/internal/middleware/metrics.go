package middleware

import (
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

var (
	// HTTP request metrics
	httpRequestsTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "quester_http_requests_total",
			Help: "Total number of HTTP requests",
		},
		[]string{"method", "path", "status", "tenant_id"},
	)

	httpRequestDuration = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "quester_http_request_duration_seconds",
			Help:    "HTTP request latency in seconds",
			Buckets: []float64{0.01, 0.05, 0.1, 0.2, 0.3, 0.5, 1.0, 2.0, 5.0},
		},
		[]string{"method", "path", "tenant_id"},
	)

	// Tenant-specific metrics
	tenantActiveRequests = promauto.NewGaugeVec(
		prometheus.GaugeOpts{
			Name: "quester_tenant_active_requests",
			Help: "Number of active requests per tenant",
		},
		[]string{"tenant_id"},
	)

	// Error rate metrics
	httpErrorsTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "quester_http_errors_total",
			Help: "Total number of HTTP errors (4xx, 5xx)",
		},
		[]string{"method", "path", "status", "tenant_id"},
	)

	// Cache metrics
	cacheHitsTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "quester_cache_hits_total",
			Help: "Total number of cache hits",
		},
		[]string{"cache_key_prefix"},
	)

	cacheMissesTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "quester_cache_misses_total",
			Help: "Total number of cache misses",
		},
		[]string{"cache_key_prefix"},
	)
)

// PrometheusMetrics collects HTTP metrics for Prometheus
// CONSTITUTION: Performance First - Prometheus monitoring required
func PrometheusMetrics() fiber.Handler {
	return func(c *fiber.Ctx) error {
		start := time.Now()

		// Get tenant_id for metrics (may be empty for public endpoints)
		tenantID := GetTenantID(c)
		if tenantID == "" {
			tenantID = "public"
		}

		// Track active requests per tenant
		tenantActiveRequests.WithLabelValues(tenantID).Inc()
		defer tenantActiveRequests.WithLabelValues(tenantID).Dec()

		// Process request
		err := c.Next()

		// Calculate duration
		duration := time.Since(start).Seconds()

		// Record metrics
		method := c.Method()
		path := c.Path()
		status := strconv.Itoa(c.Response().StatusCode())

		httpRequestsTotal.WithLabelValues(method, path, status, tenantID).Inc()
		httpRequestDuration.WithLabelValues(method, path, tenantID).Observe(duration)

		// Track errors
		statusCode := c.Response().StatusCode()
		if statusCode >= 400 {
			httpErrorsTotal.WithLabelValues(method, path, status, tenantID).Inc()
		}

		return err
	}
}

// RecordCacheHit records a cache hit for monitoring
func RecordCacheHit(keyPrefix string) {
	cacheHitsTotal.WithLabelValues(keyPrefix).Inc()
}

// RecordCacheMiss records a cache miss for monitoring
func RecordCacheMiss(keyPrefix string) {
	cacheMissesTotal.WithLabelValues(keyPrefix).Inc()
}

// Custom metrics for business logic
var (
	// Gamification metrics
	XPAwardedTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "quester_xp_awarded_total",
			Help: "Total XP awarded to users",
		},
		[]string{"tenant_id", "reason"},
	)

	QuestsCompletedTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "quester_quests_completed_total",
			Help: "Total number of quests completed",
		},
		[]string{"tenant_id", "quest_type"},
	)

	// Video streaming metrics
	VideoStreamStartsTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "quester_video_stream_starts_total",
			Help: "Total number of video streams started",
		},
		[]string{"tenant_id", "stream_type"},
	)

	VideoStreamDuration = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "quester_video_stream_duration_seconds",
			Help:    "Video stream duration in seconds",
			Buckets: []float64{60, 300, 600, 1800, 3600, 7200},
		},
		[]string{"tenant_id"},
	)

	// Marketplace metrics
	TransactionsTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "quester_transactions_total",
			Help: "Total marketplace transactions",
		},
		[]string{"tenant_id", "transaction_type", "status"},
	)

	TransactionAmount = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "quester_transaction_amount",
			Help:    "Transaction amounts in USD cents",
			Buckets: []float64{100, 500, 1000, 2000, 5000, 10000, 50000},
		},
		[]string{"tenant_id", "transaction_type"},
	)
)
