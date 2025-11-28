// T525: Bandwidth Estimation Service
package services

import (
	"sync"
	"time"
)

// BandwidthEstimator tracks download statistics and estimates available bandwidth
type BandwidthEstimator struct {
	samples []BandwidthSample
	mu      sync.RWMutex
	maxAge  time.Duration // Maximum age of samples to keep
}

// BandwidthSample represents a single download measurement
type BandwidthSample struct {
	Timestamp       time.Time
	BytesDownloaded int64
	DownloadTime    time.Duration
	SegmentURL      string
	Resolution      string
}

// BandwidthEstimate contains the estimated bandwidth information
type BandwidthEstimate struct {
	EstimatedBps       int64     // Estimated bandwidth in bits per second
	AverageBps         int64     // Average bandwidth over all samples
	MinBps             int64     // Minimum observed bandwidth
	MaxBps             int64     // Maximum observed bandwidth
	SampleCount        int       // Number of samples used
	Confidence         float64   // Confidence score (0.0-1.0)
	RecommendedQuality string    // Recommended quality level
	LastUpdated        time.Time // When estimate was last updated
}

// NewBandwidthEstimator creates a new bandwidth estimator
func NewBandwidthEstimator(maxAge time.Duration) *BandwidthEstimator {
	if maxAge == 0 {
		maxAge = 30 * time.Second // Default: keep last 30 seconds of samples
	}

	return &BandwidthEstimator{
		samples: make([]BandwidthSample, 0, 20),
		maxAge:  maxAge,
	}
}

// RecordDownload records a segment download for bandwidth calculation
func (be *BandwidthEstimator) RecordDownload(bytesDownloaded int64, downloadTime time.Duration, segmentURL, resolution string) {
	be.mu.Lock()
	defer be.mu.Unlock()

	// Add new sample
	sample := BandwidthSample{
		Timestamp:       time.Now(),
		BytesDownloaded: bytesDownloaded,
		DownloadTime:    downloadTime,
		SegmentURL:      segmentURL,
		Resolution:      resolution,
	}

	be.samples = append(be.samples, sample)

	// Clean up old samples
	be.cleanupOldSamples()
}

// cleanupOldSamples removes samples older than maxAge (internal, must hold lock)
func (be *BandwidthEstimator) cleanupOldSamples() {
	cutoff := time.Now().Add(-be.maxAge)
	validSamples := make([]BandwidthSample, 0, len(be.samples))

	for _, sample := range be.samples {
		if sample.Timestamp.After(cutoff) {
			validSamples = append(validSamples, sample)
		}
	}

	be.samples = validSamples
}

// GetEstimate calculates the current bandwidth estimate
func (be *BandwidthEstimator) GetEstimate() BandwidthEstimate {
	be.mu.RLock()
	defer be.mu.RUnlock()

	estimate := BandwidthEstimate{
		LastUpdated: time.Now(),
	}

	if len(be.samples) == 0 {
		// No samples yet - return conservative estimate
		estimate.EstimatedBps = 1_000_000 // 1 Mbps default
		estimate.Confidence = 0.0
		estimate.RecommendedQuality = "360p"
		return estimate
	}

	// Calculate statistics from samples
	var totalBps int64
	var minBps int64 = 1_000_000_000 // 1 Gbps initial max
	var maxBps int64

	for _, sample := range be.samples {
		if sample.DownloadTime == 0 {
			continue // Skip invalid samples
		}

		// Calculate bits per second for this sample
		bps := (sample.BytesDownloaded * 8 * int64(time.Second)) / int64(sample.DownloadTime)

		totalBps += bps

		if bps < minBps {
			minBps = bps
		}
		if bps > maxBps {
			maxBps = bps
		}
	}

	sampleCount := len(be.samples)
	estimate.SampleCount = sampleCount
	estimate.AverageBps = totalBps / int64(sampleCount)
	estimate.MinBps = minBps
	estimate.MaxBps = maxBps

	// T525: Use weighted average with recent samples weighted more heavily
	estimate.EstimatedBps = be.calculateWeightedAverage()

	// Calculate confidence based on sample count and variance
	estimate.Confidence = be.calculateConfidence()

	// Recommend quality based on estimated bandwidth
	estimate.RecommendedQuality = be.recommendQuality(estimate.EstimatedBps)

	return estimate
}

// calculateWeightedAverage weights recent samples more heavily
func (be *BandwidthEstimator) calculateWeightedAverage() int64 {
	if len(be.samples) == 0 {
		return 1_000_000 // 1 Mbps default
	}

	var weightedSum float64
	var weightSum float64

	now := time.Now()

	for i, sample := range be.samples {
		if sample.DownloadTime == 0 {
			continue
		}

		// Calculate bandwidth for this sample
		bps := float64((sample.BytesDownloaded * 8 * int64(time.Second)) / int64(sample.DownloadTime))

		// Weight recent samples more heavily:
		// - Age weight: newer samples get higher weight (exponential decay)
		// - Position weight: more recent in array gets higher weight
		ageSeconds := now.Sub(sample.Timestamp).Seconds()
		ageWeight := 1.0 / (1.0 + ageSeconds/10.0) // Decay over 10 seconds

		positionWeight := float64(i+1) / float64(len(be.samples)) // Linear increase

		weight := (ageWeight + positionWeight) / 2.0

		weightedSum += bps * weight
		weightSum += weight
	}

	if weightSum == 0 {
		return 1_000_000
	}

	return int64(weightedSum / weightSum)
}

// calculateConfidence returns a confidence score (0.0-1.0) based on sample quality
func (be *BandwidthEstimator) calculateConfidence() float64 {
	sampleCount := len(be.samples)

	if sampleCount == 0 {
		return 0.0
	}

	// Base confidence on sample count (more samples = higher confidence)
	sampleConfidence := float64(sampleCount) / 10.0 // Max confidence at 10+ samples
	if sampleConfidence > 1.0 {
		sampleConfidence = 1.0
	}

	// Reduce confidence if variance is high
	if sampleCount > 1 {
		var bpsList []int64
		for _, sample := range be.samples {
			if sample.DownloadTime == 0 {
				continue
			}
			bps := (sample.BytesDownloaded * 8 * int64(time.Second)) / int64(sample.DownloadTime)
			bpsList = append(bpsList, bps)
		}

		// Calculate variance
		variance := calculateVariance(bpsList)
		mean := calculateMean(bpsList)

		if mean > 0 {
			// Coefficient of variation (CV) = stddev / mean
			cv := variance / float64(mean)

			// High CV (>0.5) reduces confidence
			if cv > 0.5 {
				variancePenalty := cv - 0.5
				sampleConfidence *= (1.0 - variancePenalty)
				if sampleConfidence < 0.0 {
					sampleConfidence = 0.0
				}
			}
		}
	}

	return sampleConfidence
}

// recommendQuality suggests a quality level based on estimated bandwidth
// T525: Quality selection with safety margin (use 80% of estimated bandwidth)
func (be *BandwidthEstimator) recommendQuality(estimatedBps int64) string {
	// Apply safety margin - only use 80% of estimated bandwidth
	safetyMargin := 0.8
	safeBps := int64(float64(estimatedBps) * safetyMargin)

	// Quality thresholds (including audio bitrate overhead)
	// 1080p: 4500k video + 192k audio = ~4.7 Mbps
	// 720p:  2800k video + 128k audio = ~2.9 Mbps
	// 480p:  1400k video + 128k audio = ~1.5 Mbps
	// 360p:  800k video + 96k audio   = ~0.9 Mbps

	if safeBps >= 4_700_000 {
		return "1080p"
	} else if safeBps >= 2_900_000 {
		return "720p"
	} else if safeBps >= 1_500_000 {
		return "480p"
	} else {
		return "360p"
	}
}

// GetRecommendedQuality returns the recommended quality level
func (be *BandwidthEstimator) GetRecommendedQuality() string {
	estimate := be.GetEstimate()
	return estimate.RecommendedQuality
}

// Reset clears all samples
func (be *BandwidthEstimator) Reset() {
	be.mu.Lock()
	defer be.mu.Unlock()

	be.samples = make([]BandwidthSample, 0, 20)
}

// GetSampleCount returns the number of active samples
func (be *BandwidthEstimator) GetSampleCount() int {
	be.mu.RLock()
	defer be.mu.RUnlock()

	return len(be.samples)
}

// Helper functions for statistics

func calculateMean(values []int64) int64 {
	if len(values) == 0 {
		return 0
	}

	var sum int64
	for _, v := range values {
		sum += v
	}

	return sum / int64(len(values))
}

func calculateVariance(values []int64) float64 {
	if len(values) < 2 {
		return 0.0
	}

	mean := calculateMean(values)
	var sumSquares float64

	for _, v := range values {
		diff := float64(v - mean)
		sumSquares += diff * diff
	}

	return sumSquares / float64(len(values))
}
