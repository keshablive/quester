// T527-T530: BandwidthMonitor Service Implementation
import EventEmitter from 'eventemitter3';
import NetInfo from '@react-native-community/netinfo';

export enum NetworkQuality {
  EXCELLENT = 'excellent', // >8 Mbps
  GOOD = 'good',          // 3-8 Mbps
  FAIR = 'fair',          // 1-3 Mbps
  POOR = 'poor',          // <1 Mbps
}

export interface Measurement {
  bandwidth: number;  // Mbps
  latency: number;    // ms
  timestamp: number;  // Unix timestamp
}

export interface BandwidthMetrics {
  currentBandwidth: number;
  averageBandwidth: number;
  minBandwidth: number;
  maxBandwidth: number;
  averageLatency: number;
  variance: number;
  quality: NetworkQuality;
  isStable: boolean;
}

export interface BandwidthMonitorConfig {
  measurementInterval: number; // ms
  sampleSize: number;
  smoothingFactor: number; // 0-1, weight for new samples
  testEndpoint?: string;
  testDataSize?: number; // bytes
}

export class BandwidthMonitor extends EventEmitter {
  private config: BandwidthMonitorConfig;
  private measurements: Measurement[] = [];
  private currentBandwidth: number = 0;
  private smoothedBandwidth: number = 0;
  private intervalId: ReturnType<typeof setTimeout> | null = null;
  private lastQuality: NetworkQuality = NetworkQuality.FAIR;
  private isMonitoring: boolean = false;

  // Resolution bandwidth requirements (Mbps)
  private readonly RESOLUTION_REQUIREMENTS = {
    '360p': 0.8,
    '480p': 1.4,
    '720p': 2.8,
    '1080p': 4.5,
  };

  constructor(config: Partial<BandwidthMonitorConfig> = {}) {
    super();
    
    this.config = {
      measurementInterval: config.measurementInterval || 5000,
      sampleSize: config.sampleSize || 10,
      smoothingFactor: config.smoothingFactor || 0.7,
      testEndpoint: config.testEndpoint || 'https://speed.cloudflare.com/__down',
      testDataSize: config.testDataSize || 1024 * 100, // 100 KB
    };

    // Initialize with default fallback
    this.currentBandwidth = 3.0; // Assume decent connection
    this.smoothedBandwidth = 3.0;
  }

  /**
   * Start automatic bandwidth monitoring
   */
  public start(): void {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;
    
    // Initial measurement
    this.performMeasurement();

    // Set up periodic measurements
    this.intervalId = setInterval(() => {
      this.performMeasurement();
    }, this.config.measurementInterval);

    // Listen to network state changes
    NetInfo.addEventListener(state => {
      if (!state.isConnected) {
        this.recordMeasurement({
          bandwidth: 0,
          latency: Infinity,
          timestamp: Date.now(),
        });
      }
    });
  }

  /**
   * Stop automatic monitoring
   */
  public stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isMonitoring = false;
  }

  /**
   * Perform a bandwidth measurement
   */
  private async performMeasurement(): Promise<void> {
    try {
      const [bandwidth, latency] = await Promise.all([
        this.measureDownloadSpeed(),
        this.measureLatency(),
      ]);

      this.recordMeasurement({
        bandwidth,
        latency,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.warn('Bandwidth measurement failed:', error);
      // Keep last known measurement
    }
  }

  /**
   * Measure download speed
   */
  public async measureDownloadSpeed(): Promise<number> {
    try {
      const startTime = Date.now();
      const response = await fetch(this.config.testEndpoint!, {
        method: 'GET',
        cache: 'no-store',
      });

      if (!response.ok) {
        return 0;
      }

      const data = await response.arrayBuffer();
      const endTime = Date.now();

      const durationSeconds = (endTime - startTime) / 1000;
      const bytes = data.byteLength;
      const bits = bytes * 8;
      const mbps = bits / durationSeconds / 1_000_000;

      return Math.max(0, mbps);
    } catch (error) {
      console.warn('Download speed measurement failed:', error);
      return 0;
    }
  }

  /**
   * Calculate throughput from segment download
   */
  public calculateThroughput(bytes: number, milliseconds: number): number {
    const seconds = milliseconds / 1000;
    const bits = bytes * 8;
    const mbps = bits / seconds / 1_000_000;
    return mbps;
  }

  /**
   * Measure latency (RTT)
   */
  public async measureLatency(): Promise<number> {
    try {
      const startTime = Date.now();
      const response = await fetch(this.config.testEndpoint!, {
        method: 'HEAD',
        cache: 'no-store',
      });

      if (!response.ok) {
        return 999;
      }

      const endTime = Date.now();
      return endTime - startTime;
    } catch (error) {
      console.warn('Latency measurement failed:', error);
      return 999;
    }
  }

  /**
   * Record a bandwidth measurement
   */
  public recordMeasurement(measurement: Measurement): void {
    this.measurements.push(measurement);

    // Keep only last N measurements
    if (this.measurements.length > this.config.sampleSize) {
      this.measurements.shift();
    }

    // Update current bandwidth
    this.currentBandwidth = measurement.bandwidth;

    // Update smoothed bandwidth with exponential smoothing
    if (this.smoothedBandwidth === 0) {
      this.smoothedBandwidth = measurement.bandwidth;
    } else {
      this.smoothedBandwidth = 
        this.config.smoothingFactor * this.smoothedBandwidth +
        (1 - this.config.smoothingFactor) * measurement.bandwidth;
    }

    // Check for quality changes
    const newQuality = this.getNetworkQuality();
    if (newQuality !== this.lastQuality) {
      this.emit('qualityChange', {
        from: this.lastQuality,
        to: newQuality,
        bandwidth: this.smoothedBandwidth,
      });
      this.lastQuality = newQuality;
    }

    // Emit bandwidth change event
    this.emit('bandwidthChange', {
      bandwidth: this.smoothedBandwidth,
      quality: newQuality,
    });
  }

  /**
   * Get current bandwidth
   */
  public getCurrentBandwidth(): number {
    return this.currentBandwidth || 3.0; // Fallback to 3 Mbps
  }

  /**
   * Get smoothed bandwidth (exponentially weighted)
   */
  public getSmoothedBandwidth(): number {
    return this.smoothedBandwidth || 3.0;
  }

  /**
   * Get network quality classification
   */
  public getNetworkQuality(): NetworkQuality {
    const bandwidth = this.getSmoothedBandwidth();
    const latency = this.getAverageLatency();

    // Classify based on bandwidth and latency
    if (bandwidth >= 8.0 && latency <= 30) {
      return NetworkQuality.EXCELLENT;
    } else if (bandwidth >= 3.0 && latency <= 80) {
      return NetworkQuality.GOOD;
    } else if (bandwidth >= 1.0 && latency <= 150) {
      return NetworkQuality.FAIR;
    } else {
      return NetworkQuality.POOR;
    }
  }

  /**
   * Get average latency from recent measurements
   */
  public getAverageLatency(): number {
    if (this.measurements.length === 0) {
      return 50; // Default fallback
    }

    const sum = this.measurements.reduce((acc, m) => acc + m.latency, 0);
    return sum / this.measurements.length;
  }

  /**
   * Check if there's a latency spike
   */
  public hasLatencySpike(): boolean {
    if (this.measurements.length < 3) {
      return false;
    }

    const recent = this.measurements.slice(-3);
    const average = this.getAverageLatency();
    
    // Check if any recent measurement is >10x average
    return recent.some(m => m.latency > average * 10);
  }

  /**
   * Calculate bandwidth variance (stability indicator)
   */
  public getBandwidthVariance(): number {
    if (this.measurements.length < 2) {
      return 0;
    }

    const values = this.measurements.map(m => m.bandwidth);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;

    return variance;
  }

  /**
   * Check if connection is stable
   */
  public isConnectionStable(): boolean {
    const variance = this.getBandwidthVariance();
    const mean = this.getSmoothedBandwidth();
    
    // Coefficient of variation < 0.3 indicates stability
    const cv = Math.sqrt(variance) / mean;
    return cv < 0.3;
  }

  /**
   * Get comprehensive metrics
   */
  public getMetrics(): BandwidthMetrics {
    const bandwidths = this.measurements.map(m => m.bandwidth);
    
    return {
      currentBandwidth: this.getCurrentBandwidth(),
      averageBandwidth: this.getSmoothedBandwidth(),
      minBandwidth: bandwidths.length > 0 ? Math.min(...bandwidths) : 0,
      maxBandwidth: bandwidths.length > 0 ? Math.max(...bandwidths) : 0,
      averageLatency: this.getAverageLatency(),
      variance: this.getBandwidthVariance(),
      quality: this.getNetworkQuality(),
      isStable: this.isConnectionStable(),
    };
  }

  /**
   * Get measurement history
   */
  public getMeasurementHistory(): Measurement[] {
    return [...this.measurements];
  }

  /**
   * Clear old measurements
   */
  public clearOldMeasurements(maxAge: number): void {
    const cutoffTime = Date.now() - maxAge;
    this.measurements = this.measurements.filter(m => m.timestamp >= cutoffTime);
  }

  /**
   * Get resolution bandwidth requirements
   */
  public getResolutionBandwidthRequirements(): Record<string, number> {
    return { ...this.RESOLUTION_REQUIREMENTS };
  }

  /**
   * Get recommended quality for current bandwidth
   */
  public getRecommendedQuality(): string {
    const bandwidth = this.getSmoothedBandwidth();
    const safetyMargin = 0.8; // Use 80% of bandwidth to be conservative

    const availableBandwidth = bandwidth * safetyMargin;

    // Find highest quality that fits within available bandwidth
    const qualities = ['1080p', '720p', '480p', '360p'];
    
    for (const quality of qualities) {
      const required = this.RESOLUTION_REQUIREMENTS[quality as keyof typeof this.RESOLUTION_REQUIREMENTS];
      if (availableBandwidth >= required) {
        return quality;
      }
    }

    return '360p'; // Fallback to lowest quality
  }
}
