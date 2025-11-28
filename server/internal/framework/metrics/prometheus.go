// Package metrics provides Prometheus metrics collection and export
package metrics

import (
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

var (
	// HTTP Metrics
	httpRequestsTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "http_requests_total",
			Help: "Total number of HTTP requests",
		},
		[]string{"method", "endpoint", "status"},
	)

	httpRequestDuration = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "http_request_duration_seconds",
			Help:    "HTTP request latency in seconds",
			Buckets: prometheus.DefBuckets,
		},
		[]string{"method", "endpoint", "status"},
	)

	httpRequestSize = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "http_request_size_bytes",
			Help:    "HTTP request size in bytes",
			Buckets: []float64{100, 1000, 10000, 100000, 1000000},
		},
		[]string{"method", "endpoint"},
	)

	httpResponseSize = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "http_response_size_bytes",
			Help:    "HTTP response size in bytes",
			Buckets: []float64{100, 1000, 10000, 100000, 1000000},
		},
		[]string{"method", "endpoint", "status"},
	)

	// Database Metrics
	dbQueryDuration = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "db_query_duration_seconds",
			Help:    "Database query latency in seconds",
			Buckets: []float64{0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1.0, 5.0},
		},
		[]string{"operation", "table"},
	)

	dbQueriesTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "db_queries_total",
			Help: "Total number of database queries",
		},
		[]string{"operation", "table", "status"},
	)

	dbConnectionsActive = promauto.NewGauge(
		prometheus.GaugeOpts{
			Name: "db_connections_active",
			Help: "Number of active database connections",
		},
	)

	dbConnectionsIdle = promauto.NewGauge(
		prometheus.GaugeOpts{
			Name: "db_connections_idle",
			Help: "Number of idle database connections",
		},
	)

	// Redis Metrics
	redisCommandDuration = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "redis_command_duration_seconds",
			Help:    "Redis command latency in seconds",
			Buckets: []float64{0.0001, 0.0005, 0.001, 0.005, 0.01, 0.05, 0.1},
		},
		[]string{"command"},
	)

	redisCommandsTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "redis_commands_total",
			Help: "Total number of Redis commands",
		},
		[]string{"command", "status"},
	)

	// WebSocket Metrics
	websocketConnectionsActive = promauto.NewGauge(
		prometheus.GaugeOpts{
			Name: "websocket_connections_active",
			Help: "Number of active WebSocket connections",
		},
	)

	websocketMessagesTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "websocket_messages_total",
			Help: "Total number of WebSocket messages",
		},
		[]string{"direction", "type"},
	)

	websocketMessageDuration = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "websocket_message_duration_seconds",
			Help:    "WebSocket message processing latency in seconds",
			Buckets: prometheus.DefBuckets,
		},
		[]string{"type"},
	)

	// Authentication Metrics
	authAttemptsTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "auth_attempts_total",
			Help: "Total number of authentication attempts",
		},
		[]string{"method", "status"},
	)

	authTokensActive = promauto.NewGauge(
		prometheus.GaugeOpts{
			Name: "auth_tokens_active",
			Help: "Number of active authentication tokens",
		},
	)

	auth2FAEnabled = promauto.NewGauge(
		prometheus.GaugeOpts{
			Name: "auth_2fa_enabled_users",
			Help: "Number of users with 2FA enabled",
		},
	)

	// User Activity Metrics
	usersActive = promauto.NewGaugeVec(
		prometheus.GaugeOpts{
			Name: "users_active",
			Help: "Number of active users",
		},
		[]string{"period"}, // dau, wau, mau
	)

	usersTotal = promauto.NewGauge(
		prometheus.GaugeOpts{
			Name: "users_total",
			Help: "Total number of registered users",
		},
	)

	userSignupsTotal = promauto.NewCounter(
		prometheus.CounterOpts{
			Name: "user_signups_total",
			Help: "Total number of user signups",
		},
	)

	// Course Metrics
	coursesTotal = promauto.NewGauge(
		prometheus.GaugeOpts{
			Name: "courses_total",
			Help: "Total number of courses",
		},
	)

	courseEnrollmentsTotal = promauto.NewCounter(
		prometheus.CounterOpts{
			Name: "course_enrollments_total",
			Help: "Total number of course enrollments",
		},
	)

	courseCompletionsTotal = promauto.NewCounter(
		prometheus.CounterOpts{
			Name: "course_completions_total",
			Help: "Total number of course completions",
		},
	)

	courseProgressGauge = promauto.NewHistogram(
		prometheus.HistogramOpts{
			Name:    "course_progress_percentage",
			Help:    "Distribution of course progress percentages",
			Buckets: []float64{0, 10, 25, 50, 75, 90, 100},
		},
	)

	// Video Streaming Metrics
	videosTotal = promauto.NewGauge(
		prometheus.GaugeOpts{
			Name: "videos_total",
			Help: "Total number of videos",
		},
	)

	videoViewsTotal = promauto.NewCounter(
		prometheus.CounterOpts{
			Name: "video_views_total",
			Help: "Total number of video views",
		},
	)

	videoStreamingDuration = promauto.NewHistogram(
		prometheus.HistogramOpts{
			Name:    "video_streaming_duration_seconds",
			Help:    "Video streaming session duration in seconds",
			Buckets: []float64{30, 60, 300, 600, 1800, 3600, 7200},
		},
	)

	videoTranscodingDuration = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "video_transcoding_duration_seconds",
			Help:    "Video transcoding duration in seconds",
			Buckets: []float64{10, 30, 60, 120, 300, 600, 1800},
		},
		[]string{"quality"},
	)

	// Marketplace Metrics
	productsTotal = promauto.NewGauge(
		prometheus.GaugeOpts{
			Name: "products_total",
			Help: "Total number of marketplace products",
		},
	)

	ordersTotal = promauto.NewCounter(
		prometheus.CounterOpts{
			Name: "orders_total",
			Help: "Total number of orders",
		},
	)

	orderValue = promauto.NewHistogram(
		prometheus.HistogramOpts{
			Name:    "order_value_usd",
			Help:    "Order value in USD",
			Buckets: []float64{10, 50, 100, 500, 1000, 5000, 10000},
		},
	)

	revenueTotal = promauto.NewCounter(
		prometheus.CounterOpts{
			Name: "revenue_total_usd",
			Help: "Total revenue in USD",
		},
	)

	// Property Metrics
	propertiesTotal = promauto.NewGaugeVec(
		prometheus.GaugeOpts{
			Name: "properties_total",
			Help: "Total number of property listings",
		},
		[]string{"type"}, // sale, rent
	)

	propertyViewsTotal = promauto.NewCounter(
		prometheus.CounterOpts{
			Name: "property_views_total",
			Help: "Total number of property views",
		},
	)

	// Social Metrics
	interactionsTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "interactions_total",
			Help: "Total number of social interactions",
		},
		[]string{"type"}, // comment, like, share, rating
	)

	commentsTotal = promauto.NewCounter(
		prometheus.CounterOpts{
			Name: "comments_total",
			Help: "Total number of comments",
		},
	)

	commentsNested = promauto.NewHistogram(
		prometheus.HistogramOpts{
			Name:    "comments_nesting_depth",
			Help:    "Comment nesting depth distribution",
			Buckets: []float64{0, 1, 2, 3, 4, 5, 10},
		},
	)

	// AI Moderation Metrics
	moderationRequestsTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "moderation_requests_total",
			Help: "Total number of moderation requests",
		},
		[]string{"result"}, // approved, flagged, rejected
	)

	moderationDuration = promauto.NewHistogram(
		prometheus.HistogramOpts{
			Name:    "moderation_duration_seconds",
			Help:    "AI moderation processing duration in seconds",
			Buckets: []float64{0.1, 0.5, 1.0, 2.0, 5.0, 10.0},
		},
	)

	moderationConfidence = promauto.NewHistogram(
		prometheus.HistogramOpts{
			Name:    "moderation_confidence_score",
			Help:    "AI moderation confidence score distribution",
			Buckets: []float64{0.1, 0.3, 0.5, 0.7, 0.8, 0.9, 0.95, 0.99},
		},
	)

	moderationQueueSize = promauto.NewGauge(
		prometheus.GaugeOpts{
			Name: "moderation_queue_size",
			Help: "Number of items in moderation queue",
		},
	)

	// Badge & Gamification Metrics
	badgesTotal = promauto.NewGauge(
		prometheus.GaugeOpts{
			Name: "badges_total",
			Help: "Total number of badges available",
		},
	)

	badgesAwardedTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "badges_awarded_total",
			Help: "Total number of badges awarded",
		},
		[]string{"tier"}, // bronze, silver, gold, platinum
	)

	userPointsGauge = promauto.NewHistogram(
		prometheus.HistogramOpts{
			Name:    "user_points_distribution",
			Help:    "User points distribution",
			Buckets: []float64{0, 100, 500, 1000, 5000, 10000, 50000},
		},
	)

	// Learning Gamification Metrics (T107)
	learningXPAwardsTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "learning_xp_awards_total",
			Help: "Total number of learning XP awards",
		},
		[]string{"action_type"}, // lesson_completion, course_completion, streak_bonus, challenge, achievement
	)

	learningXPAmountTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "learning_xp_amount_total",
			Help: "Total amount of learning XP awarded",
		},
		[]string{"action_type"},
	)

	learningStreakUpdatesTotal = promauto.NewCounter(
		prometheus.CounterOpts{
			Name: "learning_streak_updates_total",
			Help: "Total number of learning streak updates",
		},
	)

	learningStreakMilestonesTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "learning_streak_milestones_total",
			Help: "Total number of learning streak milestones reached",
		},
		[]string{"milestone_days"}, // 7, 14, 30, 60, 90, 180, 365
	)

	learningChallengeCompletionsTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "learning_challenge_completions_total",
			Help: "Total number of learning challenges completed",
		},
		[]string{"difficulty"}, // easy, medium, hard
	)

	learningLevelUpsTotal = promauto.NewCounter(
		prometheus.CounterOpts{
			Name: "learning_level_ups_total",
			Help: "Total number of learning level-ups",
		},
	)

	learningAchievementsUnlockedTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "learning_achievements_unlocked_total",
			Help: "Total number of learning achievements unlocked",
		},
		[]string{"category"}, // lessons, courses, streaks, challenges
	)

	learningLeaderboardUpdatesTotal = promauto.NewCounter(
		prometheus.CounterOpts{
			Name: "learning_leaderboard_updates_total",
			Help: "Total number of learning leaderboard updates",
		},
	)

	// Search Metrics
	searchQueriesTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "search_queries_total",
			Help: "Total number of search queries",
		},
		[]string{"type"}, // fulltext, autocomplete
	)

	searchDuration = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "search_duration_seconds",
			Help:    "Search query duration in seconds",
			Buckets: []float64{0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1.0},
		},
		[]string{"type"},
	)

	searchResultsCount = promauto.NewHistogram(
		prometheus.HistogramOpts{
			Name:    "search_results_count",
			Help:    "Number of search results returned",
			Buckets: []float64{0, 1, 5, 10, 20, 50, 100},
		},
	)

	// Rate Limiting Metrics
	rateLimitHitsTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "rate_limit_hits_total",
			Help: "Total number of rate limit hits",
		},
		[]string{"endpoint", "blocked"},
	)

	// Error Metrics
	errorsTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "errors_total",
			Help: "Total number of errors",
		},
		[]string{"type", "severity"},
	)
)

// RecordHTTPRequest records HTTP request metrics
func RecordHTTPRequest(method, endpoint string, status int, duration time.Duration, requestSize, responseSize int) {
	statusStr := strconv.Itoa(status)

	httpRequestsTotal.WithLabelValues(method, endpoint, statusStr).Inc()
	httpRequestDuration.WithLabelValues(method, endpoint, statusStr).Observe(duration.Seconds())
	httpRequestSize.WithLabelValues(method, endpoint).Observe(float64(requestSize))
	httpResponseSize.WithLabelValues(method, endpoint, statusStr).Observe(float64(responseSize))
}

// RecordDBQuery records database query metrics
func RecordDBQuery(operation, table string, duration time.Duration, err error) {
	status := "success"
	if err != nil {
		status = "error"
	}

	dbQueriesTotal.WithLabelValues(operation, table, status).Inc()
	dbQueryDuration.WithLabelValues(operation, table).Observe(duration.Seconds())
}

// UpdateDBConnectionStats updates database connection pool metrics
func UpdateDBConnectionStats(active, idle int) {
	dbConnectionsActive.Set(float64(active))
	dbConnectionsIdle.Set(float64(idle))
}

// RecordRedisCommand records Redis command metrics
func RecordRedisCommand(command string, duration time.Duration, err error) {
	status := "success"
	if err != nil {
		status = "error"
	}

	redisCommandsTotal.WithLabelValues(command, status).Inc()
	redisCommandDuration.WithLabelValues(command).Observe(duration.Seconds())
}

// UpdateWebSocketConnections updates active WebSocket connection count
func UpdateWebSocketConnections(count int) {
	websocketConnectionsActive.Set(float64(count))
}

// RecordWebSocketMessage records WebSocket message metrics
func RecordWebSocketMessage(direction, msgType string, duration time.Duration) {
	websocketMessagesTotal.WithLabelValues(direction, msgType).Inc()
	if duration > 0 {
		websocketMessageDuration.WithLabelValues(msgType).Observe(duration.Seconds())
	}
}

// RecordAuthAttempt records authentication attempt metrics
func RecordAuthAttempt(method string, success bool) {
	status := "success"
	if !success {
		status = "failure"
	}
	authAttemptsTotal.WithLabelValues(method, status).Inc()
}

// UpdateAuthStats updates authentication-related gauges
func UpdateAuthStats(activeTokens, users2FA int) {
	authTokensActive.Set(float64(activeTokens))
	auth2FAEnabled.Set(float64(users2FA))
}

// UpdateUserStats updates user activity metrics
func UpdateUserStats(total, dau, wau, mau int) {
	usersTotal.Set(float64(total))
	usersActive.WithLabelValues("dau").Set(float64(dau))
	usersActive.WithLabelValues("wau").Set(float64(wau))
	usersActive.WithLabelValues("mau").Set(float64(mau))
}

// RecordUserSignup records a new user signup
func RecordUserSignup() {
	userSignupsTotal.Inc()
}

// UpdateCourseStats updates course-related metrics
func UpdateCourseStats(total int) {
	coursesTotal.Set(float64(total))
}

// RecordCourseEnrollment records a course enrollment
func RecordCourseEnrollment() {
	courseEnrollmentsTotal.Inc()
}

// RecordCourseCompletion records a course completion
func RecordCourseCompletion() {
	courseCompletionsTotal.Inc()
}

// RecordCourseProgress records course progress percentage
func RecordCourseProgress(percentage float64) {
	courseProgressGauge.Observe(percentage)
}

// UpdateVideoStats updates video-related metrics
func UpdateVideoStats(total int) {
	videosTotal.Set(float64(total))
}

// RecordVideoView records a video view
func RecordVideoView() {
	videoViewsTotal.Inc()
}

// RecordVideoStreamingDuration records video streaming session duration
func RecordVideoStreamingDuration(duration time.Duration) {
	videoStreamingDuration.Observe(duration.Seconds())
}

// RecordVideoTranscoding records video transcoding metrics
func RecordVideoTranscoding(quality string, duration time.Duration) {
	videoTranscodingDuration.WithLabelValues(quality).Observe(duration.Seconds())
}

// UpdateMarketplaceStats updates marketplace metrics
func UpdateMarketplaceStats(totalProducts int) {
	productsTotal.Set(float64(totalProducts))
}

// RecordOrder records an order and its value
func RecordOrder(valueUSD float64) {
	ordersTotal.Inc()
	orderValue.Observe(valueUSD)
	revenueTotal.Add(valueUSD)
}

// UpdatePropertyStats updates property listing metrics
func UpdatePropertyStats(totalSale, totalRent int) {
	propertiesTotal.WithLabelValues("sale").Set(float64(totalSale))
	propertiesTotal.WithLabelValues("rent").Set(float64(totalRent))
}

// RecordPropertyView records a property view
func RecordPropertyView() {
	propertyViewsTotal.Inc()
}

// RecordInteraction records a social interaction
func RecordInteraction(interactionType string) {
	interactionsTotal.WithLabelValues(interactionType).Inc()

	if interactionType == "comment" {
		commentsTotal.Inc()
	}
}

// RecordCommentNesting records comment nesting depth
func RecordCommentNesting(depth int) {
	commentsNested.Observe(float64(depth))
}

// RecordModeration records AI moderation metrics
func RecordModeration(result string, duration time.Duration, confidence float64) {
	moderationRequestsTotal.WithLabelValues(result).Inc()
	moderationDuration.Observe(duration.Seconds())
	moderationConfidence.Observe(confidence)
}

// UpdateModerationQueue updates moderation queue size
func UpdateModerationQueue(size int) {
	moderationQueueSize.Set(float64(size))
}

// UpdateBadgeStats updates badge-related metrics
func UpdateBadgeStats(total int) {
	badgesTotal.Set(float64(total))
}

// RecordBadgeAwarded records a badge award
func RecordBadgeAwarded(tier string) {
	badgesAwardedTotal.WithLabelValues(tier).Inc()
}

// RecordUserPoints records user points distribution
func RecordUserPoints(points int) {
	userPointsGauge.Observe(float64(points))
}

// --- Learning Gamification Recording Functions (T107) ---

// RecordLearningXPAward records a learning XP award event
func RecordLearningXPAward(actionType string, xpAmount int) {
	learningXPAwardsTotal.WithLabelValues(actionType).Inc()
	learningXPAmountTotal.WithLabelValues(actionType).Add(float64(xpAmount))
}

// RecordLearningStreakUpdate records a streak update
func RecordLearningStreakUpdate() {
	learningStreakUpdatesTotal.Inc()
}

// RecordLearningStreakMilestone records a streak milestone achievement
func RecordLearningStreakMilestone(milestoneDays int) {
	learningStreakMilestonesTotal.WithLabelValues(strconv.Itoa(milestoneDays)).Inc()
}

// RecordLearningChallengeCompletion records a challenge completion
func RecordLearningChallengeCompletion(difficulty string) {
	learningChallengeCompletionsTotal.WithLabelValues(difficulty).Inc()
}

// RecordLearningLevelUp records a level-up event
func RecordLearningLevelUp() {
	learningLevelUpsTotal.Inc()
}

// RecordLearningAchievementUnlocked records an achievement unlock
func RecordLearningAchievementUnlocked(category string) {
	learningAchievementsUnlockedTotal.WithLabelValues(category).Inc()
}

// RecordLearningLeaderboardUpdate records a leaderboard update
func RecordLearningLeaderboardUpdate() {
	learningLeaderboardUpdatesTotal.Inc()
}

// RecordSearch records search query metrics
func RecordSearch(searchType string, duration time.Duration, resultsCount int) {
	searchQueriesTotal.WithLabelValues(searchType).Inc()
	searchDuration.WithLabelValues(searchType).Observe(duration.Seconds())
	searchResultsCount.Observe(float64(resultsCount))
}

// RecordRateLimit records rate limiting events
func RecordRateLimit(endpoint string, blocked bool) {
	blockedStr := "false"
	if blocked {
		blockedStr = "true"
	}
	rateLimitHitsTotal.WithLabelValues(endpoint, blockedStr).Inc()
}

// RecordError records an error occurrence
func RecordError(errorType, severity string) {
	errorsTotal.WithLabelValues(errorType, severity).Inc()
}

// PrometheusMiddleware is a Fiber middleware for recording HTTP metrics
func PrometheusMiddleware() fiber.Handler {
	return func(c *fiber.Ctx) error {
		start := time.Now()

		// Get request size
		requestSize := len(c.Body())

		// Process request
		err := c.Next()

		// Calculate duration
		duration := time.Since(start)

		// Get response details
		status := c.Response().StatusCode()
		responseSize := len(c.Response().Body())

		// Normalize endpoint (remove IDs)
		endpoint := c.Path()
		method := c.Method()

		// Record metrics
		RecordHTTPRequest(method, endpoint, status, duration, requestSize, responseSize)

		return err
	}
}

// StreamingMetrics holds all Prometheus metrics for video streaming
type StreamingMetrics struct {
	// Latency metrics
	StreamLatency *prometheus.HistogramVec
	// Bitrate metrics
	StreamBitrate *prometheus.GaugeVec
	// Error metrics
	StreamErrors *prometheus.CounterVec
	// Active streams
	ActiveStreams *prometheus.GaugeVec
	// Segment generation
	SegmentGeneration *prometheus.HistogramVec
	// Viewer metrics
	ViewerCount *prometheus.GaugeVec
	PeakViewers *prometheus.GaugeVec
	// DVR metrics
	DVRSegments *prometheus.GaugeVec
	DVRWindow   *prometheus.GaugeVec
	// Transcoding metrics
	TranscodingDuration *prometheus.HistogramVec
	TranscodingErrors   *prometheus.CounterVec
}

// NewStreamingMetrics creates and registers all streaming-related Prometheus metrics
func NewStreamingMetrics() *StreamingMetrics {
	return &StreamingMetrics{
		StreamLatency: promauto.NewHistogramVec(
			prometheus.HistogramOpts{
				Name:    "stream_latency_seconds",
				Help:    "Histogram of stream latency from RTMP ingest to first HLS segment available",
				Buckets: []float64{0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 5.0, 10.0},
			},
			[]string{"stream_id", "quality", "tenant_id"},
		),
		StreamBitrate: promauto.NewGaugeVec(
			prometheus.GaugeOpts{
				Name: "stream_bitrate_kbps",
				Help: "Current stream bitrate in kilobits per second",
			},
			[]string{"stream_id", "quality", "tenant_id"},
		),
		StreamErrors: promauto.NewCounterVec(
			prometheus.CounterOpts{
				Name: "stream_errors_total",
				Help: "Total number of stream errors by type",
			},
			[]string{"stream_id", "error_type", "tenant_id"},
		),
		ActiveStreams: promauto.NewGaugeVec(
			prometheus.GaugeOpts{
				Name: "active_streams",
				Help: "Number of currently active streams",
			},
			[]string{"tenant_id", "quality"},
		),
		SegmentGeneration: promauto.NewHistogramVec(
			prometheus.HistogramOpts{
				Name:    "stream_segment_generation_seconds",
				Help:    "Time taken to generate each HLS segment",
				Buckets: []float64{0.1, 0.5, 1.0, 2.0, 5.0, 10.0},
			},
			[]string{"stream_id", "segment_number", "quality"},
		),
		ViewerCount: promauto.NewGaugeVec(
			prometheus.GaugeOpts{
				Name: "stream_viewers",
				Help: "Current number of viewers for each stream",
			},
			[]string{"stream_id", "tenant_id"},
		),
		PeakViewers: promauto.NewGaugeVec(
			prometheus.GaugeOpts{
				Name: "stream_peak_viewers",
				Help: "Peak number of concurrent viewers for each stream",
			},
			[]string{"stream_id", "tenant_id"},
		),
		DVRSegments: promauto.NewGaugeVec(
			prometheus.GaugeOpts{
				Name: "dvr_segments_stored",
				Help: "Number of DVR segments currently stored",
			},
			[]string{"stream_id", "quality"},
		),
		DVRWindow: promauto.NewGaugeVec(
			prometheus.GaugeOpts{
				Name: "dvr_window_seconds",
				Help: "Current DVR window duration in seconds",
			},
			[]string{"stream_id"},
		),
		TranscodingDuration: promauto.NewHistogramVec(
			prometheus.HistogramOpts{
				Name:    "transcoding_duration_seconds",
				Help:    "Time taken to transcode stream segments",
				Buckets: []float64{0.5, 1.0, 2.0, 5.0, 10.0, 30.0},
			},
			[]string{"stream_id", "input_quality", "output_quality"},
		),
		TranscodingErrors: promauto.NewCounterVec(
			prometheus.CounterOpts{
				Name: "transcoding_errors_total",
				Help: "Total number of transcoding errors",
			},
			[]string{"stream_id", "error_type"},
		),
	}
}

// Global streaming metrics instance
var StreamingMetricsInstance *StreamingMetrics

// InitStreamingMetrics initializes the global streaming metrics instance
func InitStreamingMetrics() {
	if StreamingMetricsInstance == nil {
		StreamingMetricsInstance = NewStreamingMetrics()
	}
}

// GetStreamingMetrics returns the global streaming metrics instance
func GetStreamingMetrics() *StreamingMetrics {
	if StreamingMetricsInstance == nil {
		InitStreamingMetrics()
	}
	return StreamingMetricsInstance
}
