package observability

import (
	"time"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

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

	// Circuit breaker metrics (reference from circuit_breaker.go)
	// These are created in circuit_breaker.go but listed here for reference
}

// NewStreamingMetrics creates and registers all streaming-related Prometheus metrics
func NewStreamingMetrics() *StreamingMetrics {
	return &StreamingMetrics{
		// Stream latency: RTMP ingest to first HLS segment
		StreamLatency: promauto.NewHistogramVec(
			prometheus.HistogramOpts{
				Name:    "stream_latency_seconds",
				Help:    "Histogram of stream latency from RTMP ingest to first HLS segment available",
				Buckets: []float64{0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 5.0, 10.0},
			},
			[]string{"stream_id", "quality", "tenant_id"},
		),

		// Current stream bitrate
		StreamBitrate: promauto.NewGaugeVec(
			prometheus.GaugeOpts{
				Name: "stream_bitrate_kbps",
				Help: "Current stream bitrate in kilobits per second",
			},
			[]string{"stream_id", "quality", "tenant_id"},
		),

		// Stream errors
		StreamErrors: promauto.NewCounterVec(
			prometheus.CounterOpts{
				Name: "stream_errors_total",
				Help: "Total number of stream errors by type",
			},
			[]string{"stream_id", "error_type", "tenant_id"},
		),

		// Active streams gauge
		ActiveStreams: promauto.NewGaugeVec(
			prometheus.GaugeOpts{
				Name: "active_streams",
				Help: "Number of currently active streams",
			},
			[]string{"tenant_id", "quality"},
		),

		// Segment generation time
		SegmentGeneration: promauto.NewHistogramVec(
			prometheus.HistogramOpts{
				Name:    "stream_segment_generation_seconds",
				Help:    "Time taken to generate each HLS segment",
				Buckets: []float64{0.1, 0.5, 1.0, 2.0, 5.0, 10.0},
			},
			[]string{"stream_id", "segment_number", "quality"},
		),

		// Current viewer count
		ViewerCount: promauto.NewGaugeVec(
			prometheus.GaugeOpts{
				Name: "stream_viewers",
				Help: "Current number of viewers for each stream",
			},
			[]string{"stream_id", "tenant_id"},
		),

		// Peak viewer count
		PeakViewers: promauto.NewGaugeVec(
			prometheus.GaugeOpts{
				Name: "stream_peak_viewers",
				Help: "Peak number of concurrent viewers for each stream",
			},
			[]string{"stream_id", "tenant_id"},
		),

		// DVR segments stored
		DVRSegments: promauto.NewGaugeVec(
			prometheus.GaugeOpts{
				Name: "dvr_segments_stored",
				Help: "Number of DVR segments currently stored",
			},
			[]string{"stream_id", "quality"},
		),

		// DVR window duration
		DVRWindow: promauto.NewGaugeVec(
			prometheus.GaugeOpts{
				Name: "dvr_window_seconds",
				Help: "Current DVR window duration in seconds",
			},
			[]string{"stream_id"},
		),

		// Transcoding duration
		TranscodingDuration: promauto.NewHistogramVec(
			prometheus.HistogramOpts{
				Name:    "transcoding_duration_seconds",
				Help:    "Time taken to transcode stream segments",
				Buckets: []float64{0.5, 1.0, 2.0, 5.0, 10.0, 30.0},
			},
			[]string{"stream_id", "input_quality", "output_quality"},
		),

		// Transcoding errors
		TranscodingErrors: promauto.NewCounterVec(
			prometheus.CounterOpts{
				Name: "transcoding_errors_total",
				Help: "Total number of transcoding errors",
			},
			[]string{"stream_id", "error_type"},
		),
	}
}

// RecordStreamLatency records stream startup latency
func (sm *StreamingMetrics) RecordStreamLatency(streamID, quality, tenantID string, latency time.Duration) {
	sm.StreamLatency.WithLabelValues(streamID, quality, tenantID).Observe(latency.Seconds())
}

// SetStreamBitrate sets current bitrate for a stream
func (sm *StreamingMetrics) SetStreamBitrate(streamID, quality, tenantID string, bitrateKbps float64) {
	sm.StreamBitrate.WithLabelValues(streamID, quality, tenantID).Set(bitrateKbps)
}

// RecordStreamError increments error counter
func (sm *StreamingMetrics) RecordStreamError(streamID, errorType, tenantID string) {
	sm.StreamErrors.WithLabelValues(streamID, errorType, tenantID).Inc()
}

// IncrementActiveStreams increments active stream count
func (sm *StreamingMetrics) IncrementActiveStreams(tenantID, quality string) {
	sm.ActiveStreams.WithLabelValues(tenantID, quality).Inc()
}

// DecrementActiveStreams decrements active stream count
func (sm *StreamingMetrics) DecrementActiveStreams(tenantID, quality string) {
	sm.ActiveStreams.WithLabelValues(tenantID, quality).Dec()
}

// RecordSegmentGeneration records time to generate a segment
func (sm *StreamingMetrics) RecordSegmentGeneration(streamID, segmentNum, quality string, duration time.Duration) {
	sm.SegmentGeneration.WithLabelValues(streamID, segmentNum, quality).Observe(duration.Seconds())
}

// SetViewerCount sets current viewer count
func (sm *StreamingMetrics) SetViewerCount(streamID, tenantID string, count int) {
	sm.ViewerCount.WithLabelValues(streamID, tenantID).Set(float64(count))
}

// SetPeakViewers sets peak viewer count
func (sm *StreamingMetrics) SetPeakViewers(streamID, tenantID string, count int) {
	sm.PeakViewers.WithLabelValues(streamID, tenantID).Set(float64(count))
}

// SetDVRSegments sets DVR segment count
func (sm *StreamingMetrics) SetDVRSegments(streamID, quality string, count int) {
	sm.DVRSegments.WithLabelValues(streamID, quality).Set(float64(count))
}

// SetDVRWindow sets DVR window duration
func (sm *StreamingMetrics) SetDVRWindow(streamID string, windowSeconds int) {
	sm.DVRWindow.WithLabelValues(streamID).Set(float64(windowSeconds))
}

// RecordTranscodingDuration records transcoding time
func (sm *StreamingMetrics) RecordTranscodingDuration(streamID, inputQuality, outputQuality string, duration time.Duration) {
	sm.TranscodingDuration.WithLabelValues(streamID, inputQuality, outputQuality).Observe(duration.Seconds())
}

// RecordTranscodingError records transcoding error
func (sm *StreamingMetrics) RecordTranscodingError(streamID, errorType string) {
	sm.TranscodingErrors.WithLabelValues(streamID, errorType).Inc()
}

// Global metrics instance
var Metrics *StreamingMetrics

// InitMetrics initializes the global metrics instance
func InitMetrics() {
	if Metrics == nil {
		Metrics = NewStreamingMetrics()
	}
}

// GetMetrics returns the global metrics instance (initializes if needed)
func GetMetrics() *StreamingMetrics {
	if Metrics == nil {
		InitMetrics()
	}
	return Metrics
}

// LatencyObserver is a helper to track operation latency
type LatencyObserver struct {
	startTime time.Time
	labels    map[string]string
}

// StartLatencyObserver starts tracking latency
func StartLatencyObserver(labels map[string]string) *LatencyObserver {
	return &LatencyObserver{
		startTime: time.Now(),
		labels:    labels,
	}
}

// Observe records the latency since start
func (lo *LatencyObserver) Observe() time.Duration {
	return time.Since(lo.startTime)
}

// ObserveAndRecord records latency and returns duration
func (lo *LatencyObserver) ObserveAndRecord(streamID, quality, tenantID string) time.Duration {
	latency := time.Since(lo.startTime)
	GetMetrics().RecordStreamLatency(streamID, quality, tenantID, latency)
	return latency
}

// StreamMetricsCollector provides helper methods for stream lifecycle metrics
type StreamMetricsCollector struct {
	metrics   *StreamingMetrics
	streamID  string
	quality   string
	tenantID  string
	startTime time.Time
}

// NewStreamMetricsCollector creates a new collector for a stream
func NewStreamMetricsCollector(streamID, quality, tenantID string) *StreamMetricsCollector {
	return &StreamMetricsCollector{
		metrics:   GetMetrics(),
		streamID:  streamID,
		quality:   quality,
		tenantID:  tenantID,
		startTime: time.Now(),
	}
}

// OnStreamStart called when stream starts
func (smc *StreamMetricsCollector) OnStreamStart() {
	smc.startTime = time.Now()
	smc.metrics.IncrementActiveStreams(smc.tenantID, smc.quality)
}

// OnFirstSegment called when first segment is available
func (smc *StreamMetricsCollector) OnFirstSegment() {
	latency := time.Since(smc.startTime)
	smc.metrics.RecordStreamLatency(smc.streamID, smc.quality, smc.tenantID, latency)
}

// OnStreamEnd called when stream ends
func (smc *StreamMetricsCollector) OnStreamEnd() {
	smc.metrics.DecrementActiveStreams(smc.tenantID, smc.quality)
}

// OnError called when stream error occurs
func (smc *StreamMetricsCollector) OnError(errorType string) {
	smc.metrics.RecordStreamError(smc.streamID, errorType, smc.tenantID)
}

// UpdateBitrate updates stream bitrate
func (smc *StreamMetricsCollector) UpdateBitrate(bitrateKbps float64) {
	smc.metrics.SetStreamBitrate(smc.streamID, smc.quality, smc.tenantID, bitrateKbps)
}

// UpdateViewerCount updates viewer count
func (smc *StreamMetricsCollector) UpdateViewerCount(count int) {
	smc.metrics.SetViewerCount(smc.streamID, smc.tenantID, count)
}

// UpdatePeakViewers updates peak viewer count
func (smc *StreamMetricsCollector) UpdatePeakViewers(count int) {
	smc.metrics.SetPeakViewers(smc.streamID, smc.tenantID, count)
}
