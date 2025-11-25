/**
 * Stream metrics collector and calculator
 */

import { BandwidthMonitor, NetworkQuality } from '../bandwidth-monitor';
import { BufferManager, BufferState } from '../buffer-manager';
import { DVRService } from '../dvr-service';
import type { QualityLevel, StreamState, StreamMetrics } from './types';

export interface UploadStats {
  count: number;
  failures: number;
  retries: number;
}

export class StreamMetricsCollector {
  private startTime: number | null = null;
  private qualitySwitchCount = 0;
  private uploadStats: UploadStats = {
    count: 0,
    failures: 0,
    retries: 0,
  };

  constructor(
    private bandwidthMonitor: BandwidthMonitor | null,
    private bufferManager: BufferManager | null,
    private dvrService: DVRService | null,
    private qualityLevels: QualityLevel[]
  ) {}

  startTracking(): void {
    this.startTime = Date.now();
  }

  incrementQualitySwitchCount(): void {
    this.qualitySwitchCount++;
  }

  incrementUploadCount(): void {
    this.uploadStats.count++;
  }

  incrementUploadFailures(): void {
    this.uploadStats.failures++;
  }

  incrementUploadRetries(): void {
    this.uploadStats.retries++;
  }

  getUploadStats(): UploadStats {
    return { ...this.uploadStats };
  }

  getMetrics(state: StreamState, currentQuality: QualityLevel | null): StreamMetrics {
    const networkQuality = this.bandwidthMonitor?.getNetworkQuality();
    const bandwidth = this.bandwidthMonitor?.getSmoothedBandwidth() || 0;
    const latency = this.bandwidthMonitor?.getAverageLatency() || 0;
    const dvrWindow = this.dvrService?.getWindow();
    const bufferLevel = this.bufferManager?.getCurrentBufferLevel() || 0;
    
    const uptime = this.startTime ? (Date.now() - this.startTime) / 1000 : 0;
    
    return {
      state,
      currentQuality,
      networkQuality: networkQuality || NetworkQuality.FAIR,
      bufferState: BufferState.HEALTHY, // Simplified - would need buffer state from manager
      
      bandwidth: bandwidth * 1000000, // Convert Mbps to bps
      latency,
      qualitySwitchCount: this.qualitySwitchCount,
      
      bufferLevel,
      downloadRate: 0, // Not tracked in current implementation
      playbackRate: 0, // Not tracked in current implementation
      stallCount: 0, // Not tracked in current implementation
      
      dvrWindowDuration: dvrWindow?.duration || 0,
      dvrSegmentCount: dvrWindow?.segmentCount || 0,
      dvrStorageSize: dvrWindow?.totalSize || 0,
      
      uploadCount: this.uploadStats.count,
      uploadFailureCount: this.uploadStats.failures,
      uploadRetryCount: this.uploadStats.retries,
      
      uptime,
      averageQuality: this.calculateAverageQuality(currentQuality),
    };
  }

  private calculateAverageQuality(currentQuality: QualityLevel | null): number {
    if (!currentQuality) return 0;
    
    const qualityIndex = this.qualityLevels.findIndex(
      (q) => q.height === currentQuality.height
    );
    
    // Return normalized value (0-1)
    return qualityIndex / (this.qualityLevels.length - 1);
  }

  reset(): void {
    this.startTime = null;
    this.qualitySwitchCount = 0;
    this.uploadStats = {
      count: 0,
      failures: 0,
      retries: 0,
    };
  }
}
