// T525: Bandwidth Estimation Tests
package services

import (
	"testing"
	"time"
)

func TestBandwidthEstimatorBasics(t *testing.T) {
	t.Run("Creates estimator with default settings", func(t *testing.T) {
		estimator := NewBandwidthEstimator(0)

		if estimator == nil {
			t.Fatal("Expected non-nil estimator")
		}

		if estimator.maxAge != 30*time.Second {
			t.Errorf("Expected default maxAge of 30s, got %v", estimator.maxAge)
		}

		if len(estimator.samples) != 0 {
			t.Errorf("Expected no initial samples, got %d", len(estimator.samples))
		}
	})

	t.Run("Creates estimator with custom maxAge", func(t *testing.T) {
		customAge := 60 * time.Second
		estimator := NewBandwidthEstimator(customAge)

		if estimator.maxAge != customAge {
			t.Errorf("Expected maxAge of %v, got %v", customAge, estimator.maxAge)
		}
	})

	t.Run("Returns default estimate with no samples", func(t *testing.T) {
		estimator := NewBandwidthEstimator(0)
		estimate := estimator.GetEstimate()

		if estimate.EstimatedBps != 1_000_000 {
			t.Errorf("Expected default 1 Mbps estimate, got %d", estimate.EstimatedBps)
		}

		if estimate.Confidence != 0.0 {
			t.Errorf("Expected 0 confidence with no samples, got %f", estimate.Confidence)
		}

		if estimate.RecommendedQuality != "360p" {
			t.Errorf("Expected 360p recommendation by default, got %s", estimate.RecommendedQuality)
		}
	})
}

func TestBandwidthRecording(t *testing.T) {
	t.Run("Records single download sample", func(t *testing.T) {
		estimator := NewBandwidthEstimator(0)

		// Simulate downloading 1 MB in 1 second = 8 Mbps
		bytesDownloaded := int64(1_000_000)
		downloadTime := 1 * time.Second

		estimator.RecordDownload(bytesDownloaded, downloadTime, "segment_001.ts", "720p")

		if estimator.GetSampleCount() != 1 {
			t.Errorf("Expected 1 sample, got %d", estimator.GetSampleCount())
		}

		estimate := estimator.GetEstimate()
		expectedBps := int64(8_000_000) // 1 MB * 8 bits = 8 Mbps

		if estimate.AverageBps != expectedBps {
			t.Errorf("Expected average %d bps, got %d", expectedBps, estimate.AverageBps)
		}
	})

	t.Run("Records multiple download samples", func(t *testing.T) {
		estimator := NewBandwidthEstimator(0)

		samples := []struct {
			bytes    int64
			duration time.Duration
		}{
			{1_000_000, 1 * time.Second},      // 8 Mbps
			{500_000, 500 * time.Millisecond}, // 8 Mbps
			{2_000_000, 2 * time.Second},      // 8 Mbps
		}

		for i, sample := range samples {
			estimator.RecordDownload(sample.bytes, sample.duration, "", "720p")
			time.Sleep(10 * time.Millisecond) // Small delay to ensure different timestamps
			_ = i
		}

		if estimator.GetSampleCount() != 3 {
			t.Errorf("Expected 3 samples, got %d", estimator.GetSampleCount())
		}

		estimate := estimator.GetEstimate()

		if estimate.SampleCount != 3 {
			t.Errorf("Expected 3 samples in estimate, got %d", estimate.SampleCount)
		}

		if estimate.Confidence < 0.0 || estimate.Confidence > 1.0 {
			t.Errorf("Confidence should be between 0 and 1, got %f", estimate.Confidence)
		}
	})

	t.Run("Cleans up old samples", func(t *testing.T) {
		maxAge := 100 * time.Millisecond
		estimator := NewBandwidthEstimator(maxAge)

		// Add old sample
		estimator.RecordDownload(1_000_000, 1*time.Second, "old.ts", "720p")

		// Wait for sample to age
		time.Sleep(150 * time.Millisecond)

		// Add new sample (triggers cleanup)
		estimator.RecordDownload(1_000_000, 1*time.Second, "new.ts", "720p")

		// Should only have 1 sample (the new one)
		if estimator.GetSampleCount() != 1 {
			t.Errorf("Expected 1 sample after cleanup, got %d", estimator.GetSampleCount())
		}
	})
}

func TestBandwidthEstimation(t *testing.T) {
	t.Run("Estimates bandwidth accurately", func(t *testing.T) {
		estimator := NewBandwidthEstimator(0)

		// Simulate 5 Mbps connection (625 KB/s)
		for i := 0; i < 5; i++ {
			estimator.RecordDownload(625_000, 1*time.Second, "", "720p")
			time.Sleep(10 * time.Millisecond)
		}

		estimate := estimator.GetEstimate()
		expectedBps := int64(5_000_000) // 5 Mbps

		// Allow 10% variance
		if estimate.EstimatedBps < expectedBps*9/10 || estimate.EstimatedBps > expectedBps*11/10 {
			t.Errorf("Expected ~%d bps, got %d", expectedBps, estimate.EstimatedBps)
		}
	})

	t.Run("Weights recent samples more heavily", func(t *testing.T) {
		estimator := NewBandwidthEstimator(0)

		// Start with slow connection
		for i := 0; i < 3; i++ {
			estimator.RecordDownload(250_000, 1*time.Second, "", "360p") // 2 Mbps
			time.Sleep(10 * time.Millisecond)
		}

		// Switch to fast connection
		for i := 0; i < 3; i++ {
			estimator.RecordDownload(1_250_000, 1*time.Second, "", "1080p") // 10 Mbps
			time.Sleep(10 * time.Millisecond)
		}

		estimate := estimator.GetEstimate()

		// Average would be 6 Mbps, but weighted should be closer to recent 10 Mbps
		// We expect it to be above the simple average (6 Mbps)
		if estimate.EstimatedBps < 6_000_000 {
			t.Errorf("Expected weighted estimate > 6 Mbps (simple average), got %d bps", estimate.EstimatedBps)
		}

		// Should not be the full 10 Mbps since old samples still have some weight
		if estimate.EstimatedBps > 9_500_000 {
			t.Errorf("Expected weighted estimate < 9.5 Mbps, got %d bps", estimate.EstimatedBps)
		}
	})

	t.Run("Tracks min/max bandwidth", func(t *testing.T) {
		estimator := NewBandwidthEstimator(0)

		samples := []struct {
			bytes       int64
			duration    time.Duration
			expectedBps int64
		}{
			{250_000, 1 * time.Second, 2_000_000},    // 2 Mbps (min)
			{625_000, 1 * time.Second, 5_000_000},    // 5 Mbps
			{1_250_000, 1 * time.Second, 10_000_000}, // 10 Mbps (max)
		}

		for _, sample := range samples {
			estimator.RecordDownload(sample.bytes, sample.duration, "", "720p")
			time.Sleep(10 * time.Millisecond)
		}

		estimate := estimator.GetEstimate()

		if estimate.MinBps != 2_000_000 {
			t.Errorf("Expected min 2 Mbps, got %d", estimate.MinBps)
		}

		if estimate.MaxBps != 10_000_000 {
			t.Errorf("Expected max 10 Mbps, got %d", estimate.MaxBps)
		}
	})
}

func TestConfidenceCalculation(t *testing.T) {
	t.Run("Confidence increases with sample count", func(t *testing.T) {
		estimator := NewBandwidthEstimator(0)

		// Add samples one by one and check confidence
		confidences := []float64{}

		for i := 0; i < 10; i++ {
			estimator.RecordDownload(625_000, 1*time.Second, "", "720p") // Stable 5 Mbps
			time.Sleep(10 * time.Millisecond)

			estimate := estimator.GetEstimate()
			confidences = append(confidences, estimate.Confidence)
		}

		// Confidence should generally increase
		for i := 1; i < len(confidences); i++ {
			if confidences[i] < confidences[i-1] {
				// Allow small decreases due to variance calculation
				if confidences[i-1]-confidences[i] > 0.1 {
					t.Errorf("Confidence decreased significantly at sample %d: %f -> %f",
						i, confidences[i-1], confidences[i])
				}
			}
		}

		// Final confidence should be high (close to 1.0) with stable samples
		if confidences[len(confidences)-1] < 0.7 {
			t.Errorf("Expected high confidence with 10 stable samples, got %f",
				confidences[len(confidences)-1])
		}
	})

	t.Run("Confidence decreases with high variance", func(t *testing.T) {
		estimatorStable := NewBandwidthEstimator(0)
		estimatorUnstable := NewBandwidthEstimator(0)

		// Stable connection
		for i := 0; i < 10; i++ {
			estimatorStable.RecordDownload(625_000, 1*time.Second, "", "720p") // 5 Mbps
			time.Sleep(10 * time.Millisecond)
		}

		// Unstable connection (varying 1-10 Mbps)
		byteSizes := []int64{125_000, 1_250_000, 250_000, 1_000_000, 375_000,
			875_000, 500_000, 750_000, 625_000, 1_125_000}
		for _, bytes := range byteSizes {
			estimatorUnstable.RecordDownload(bytes, 1*time.Second, "", "720p")
			time.Sleep(10 * time.Millisecond)
		}

		stableConfidence := estimatorStable.GetEstimate().Confidence
		unstableConfidence := estimatorUnstable.GetEstimate().Confidence

		if unstableConfidence >= stableConfidence {
			t.Errorf("Expected lower confidence for unstable connection. Stable: %f, Unstable: %f",
				stableConfidence, unstableConfidence)
		}
	})
}

func TestQualityRecommendation(t *testing.T) {
	tests := []struct {
		name            string
		bytesPerSecond  int64
		expectedQuality string
		description     string
	}{
		{
			name:            "Recommends 1080p for high bandwidth",
			bytesPerSecond:  750_000, // 6 Mbps * 0.8 = 4.8 Mbps (enough for 1080p)
			expectedQuality: "1080p",
			description:     "6 Mbps with 80% margin > 4.7 Mbps required for 1080p",
		},
		{
			name:            "Recommends 720p for medium-high bandwidth",
			bytesPerSecond:  500_000, // 4 Mbps * 0.8 = 3.2 Mbps (enough for 720p)
			expectedQuality: "720p",
			description:     "4 Mbps with 80% margin > 2.9 Mbps required for 720p",
		},
		{
			name:            "Recommends 480p for medium bandwidth",
			bytesPerSecond:  250_000, // 2 Mbps * 0.8 = 1.6 Mbps (enough for 480p)
			expectedQuality: "480p",
			description:     "2 Mbps with 80% margin > 1.5 Mbps required for 480p",
		},
		{
			name:            "Recommends 360p for low bandwidth",
			bytesPerSecond:  125_000, // 1 Mbps
			expectedQuality: "360p",
			description:     "1 Mbps - fallback to 360p",
		},
		{
			name:            "Recommends 360p for very low bandwidth",
			bytesPerSecond:  50_000, // 400 Kbps
			expectedQuality: "360p",
			description:     "400 Kbps - minimum quality",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			estimator := NewBandwidthEstimator(0)

			// Add consistent samples at target bandwidth
			for i := 0; i < 5; i++ {
				estimator.RecordDownload(tt.bytesPerSecond, 1*time.Second, "", "test")
				time.Sleep(10 * time.Millisecond)
			}

			estimate := estimator.GetEstimate()

			if estimate.RecommendedQuality != tt.expectedQuality {
				t.Errorf("%s: Expected %s, got %s (bandwidth: %d bps, %s)",
					tt.name, tt.expectedQuality, estimate.RecommendedQuality,
					estimate.EstimatedBps, tt.description)
			}
		})
	}
}

func TestBandwidthEstimatorReset(t *testing.T) {
	t.Run("Reset clears all samples", func(t *testing.T) {
		estimator := NewBandwidthEstimator(0)

		// Add samples
		for i := 0; i < 5; i++ {
			estimator.RecordDownload(625_000, 1*time.Second, "", "720p")
		}

		if estimator.GetSampleCount() != 5 {
			t.Errorf("Expected 5 samples before reset, got %d", estimator.GetSampleCount())
		}

		// Reset
		estimator.Reset()

		if estimator.GetSampleCount() != 0 {
			t.Errorf("Expected 0 samples after reset, got %d", estimator.GetSampleCount())
		}

		// Should return default estimate after reset
		estimate := estimator.GetEstimate()
		if estimate.EstimatedBps != 1_000_000 {
			t.Errorf("Expected default estimate after reset, got %d", estimate.EstimatedBps)
		}
	})
}

func TestEdgeCases(t *testing.T) {
	t.Run("Handles zero download time gracefully", func(t *testing.T) {
		estimator := NewBandwidthEstimator(0)

		// This shouldn't crash
		estimator.RecordDownload(1_000_000, 0, "", "720p")

		estimate := estimator.GetEstimate()

		// Should still work with valid estimate
		if estimate.EstimatedBps <= 0 {
			t.Errorf("Expected positive estimate even with zero duration sample")
		}
	})

	t.Run("Handles very small downloads", func(t *testing.T) {
		estimator := NewBandwidthEstimator(0)

		// Small downloads (e.g., initialization segments)
		estimator.RecordDownload(1000, 10*time.Millisecond, "", "360p")

		estimate := estimator.GetEstimate()

		if estimate.EstimatedBps <= 0 {
			t.Errorf("Expected positive estimate for small download")
		}
	})

	t.Run("Handles very large downloads", func(t *testing.T) {
		estimator := NewBandwidthEstimator(0)

		// Large download (e.g., 10 MB segment)
		estimator.RecordDownload(10_000_000, 1*time.Second, "", "1080p")

		estimate := estimator.GetEstimate()

		expectedBps := int64(80_000_000) // 80 Mbps

		// Should handle large numbers correctly
		if estimate.EstimatedBps < expectedBps*9/10 || estimate.EstimatedBps > expectedBps*11/10 {
			t.Errorf("Expected ~%d bps for large download, got %d", expectedBps, estimate.EstimatedBps)
		}
	})
}
