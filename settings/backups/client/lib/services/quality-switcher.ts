// T531-T533: QualitySwitcher Service Implementation
import { NetworkQuality } from './bandwidth-monitor';

export enum SwitchingAlgorithm {
  BBB = 'bbb',                // Buffer-Based Bandwidth
  THROUGHPUT = 'throughput',  // Throughput-Based
  HYBRID = 'hybrid',          // Combined approach
}

export interface NetworkMetrics {
  bandwidth: number;
  latency: number;
  quality: NetworkQuality;
}

export interface BufferMetrics {
  currentLevel: number;     // Current buffer level (seconds)
  targetLevel: number;      // Target buffer level (seconds)
  downloadRate: number;     // Download rate (Mbps)
  playbackRate: number;     // Playback rate (Mbps)
}

export interface SwitchDecision {
  shouldSwitch: boolean;
  targetQuality: string;
  reason: string;
  confidence: number;
}

export interface QualitySwitcherConfig {
  algorithm: SwitchingAlgorithm;
  targetBufferLevel: number;    // seconds
  minBufferLevel: number;       // seconds
  panicThreshold: number;       // seconds
  switchUpThreshold: number;    // seconds
  switchDownThreshold: number;  // seconds
  minSwitchInterval?: number;   // milliseconds (default: 3000)
}

const DEFAULT_CONFIG: QualitySwitcherConfig = {
  algorithm: SwitchingAlgorithm.BBB,
  targetBufferLevel: 30,
  minBufferLevel: 5,
  panicThreshold: 2,
  switchUpThreshold: 40,
  switchDownThreshold: 10,
  minSwitchInterval: 3000,
};

export class QualitySwitcher {
  private config: QualitySwitcherConfig;
  private availableQualities: string[] = ['360p', '480p', '720p', '1080p'];
  private lastSwitchTime: number = 0;

  // Bandwidth requirements for each quality (Mbps)
  private readonly QUALITY_REQUIREMENTS = {
    '360p': 0.8,
    '480p': 1.4,
    '720p': 2.8,
    '1080p': 4.5,
  };

  constructor(config: Partial<QualitySwitcherConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.validateConfig();
  }

  /**
   * Validate configuration values
   */
  private validateConfig(): void {
    if (this.config.targetBufferLevel <= 0) {
      throw new Error('Target buffer level must be greater than 0');
    }
    if (this.config.panicThreshold >= this.config.minBufferLevel) {
      throw new Error('Panic threshold must be less than min buffer level');
    }
    if (this.config.switchDownThreshold >= this.config.switchUpThreshold) {
      throw new Error('Switch down threshold must be less than switch up threshold');
    }
  }

  /**
   * Select quality using Buffer-Based Bandwidth (BBB) algorithm
   */
  selectQuality(
    currentQuality: string,
    network: NetworkMetrics,
    buffer: BufferMetrics
  ): string {
    // Check minimum switch interval
    const now = Date.now();
    if (now - this.lastSwitchTime < (this.config.minSwitchInterval || 3000)) {
      return currentQuality; // Too soon to switch again
    }

    switch (this.config.algorithm) {
      case SwitchingAlgorithm.BBB:
        return this.selectQualityBBB(currentQuality, network, buffer);
      case SwitchingAlgorithm.THROUGHPUT:
        return currentQuality; // Requires throughput history
      case SwitchingAlgorithm.HYBRID:
        return currentQuality; // Requires additional context
      default:
        return currentQuality;
    }
  }

  /**
   * Buffer-Based Bandwidth algorithm
   */
  private selectQualityBBB(
    currentQuality: string,
    network: NetworkMetrics,
    buffer: BufferMetrics
  ): string {
    const { currentLevel } = buffer;

    // PANIC: Buffer critically low
    if (currentLevel < this.config.panicThreshold) {
      const newQuality = '360p'; // Lowest quality
      if (newQuality !== currentQuality) {
        this.lastSwitchTime = Date.now();
      }
      return newQuality;
    }

    // SWITCH DOWN: Buffer low
    if (currentLevel < this.config.switchDownThreshold) {
      // Consider download/playback rate ratio for aggressive switching
      const drainRate = buffer.playbackRate > 0 ? buffer.downloadRate / buffer.playbackRate : 1;
      
      // If buffer is draining (download < playback), switch to bandwidth-sustainable quality
      if (drainRate < 0.9) {
        const sustainableQuality = this.selectQualityForBandwidth(network.bandwidth);
        if (sustainableQuality !== currentQuality) {
          this.lastSwitchTime = Date.now();
        }
        return sustainableQuality;
      }
      
      // Otherwise, just go one step down
      const lowerQuality = this.getNextLowerQuality(currentQuality);
      if (lowerQuality !== currentQuality) {
        this.lastSwitchTime = Date.now();
      }
      return lowerQuality;
    }

    // SWITCH UP: Buffer high and bandwidth sufficient
    if (currentLevel >= this.config.switchUpThreshold) {
      const higherQuality = this.getNextHigherQuality(currentQuality);
      
      // Verify bandwidth supports higher quality
      const required = this.QUALITY_REQUIREMENTS[higherQuality as keyof typeof this.QUALITY_REQUIREMENTS];
      if (network.bandwidth >= required * 1.2) { // 20% safety margin
        if (higherQuality !== currentQuality) {
          this.lastSwitchTime = Date.now();
        }
        return higherQuality;
      }
    }

    // MAINTAIN: Buffer healthy
    return currentQuality;
  }

  /**
   * Select quality based on throughput history
   */
  selectQualityByThroughput(throughputHistory: number[]): string {
    if (throughputHistory.length === 0) {
      return '480p'; // Default
    }

    // Calculate average and variance
    const avg = throughputHistory.reduce((a, b) => a + b, 0) / throughputHistory.length;
    const variance = this.calculateVariance(throughputHistory);

    // If variance is high, be conservative
    const conservativeFactor = variance > (avg * 0.20) ? 0.70 : 0.95;
    const effectiveBandwidth = avg * conservativeFactor;

    // Find best quality for bandwidth
    return this.selectQualityForBandwidth(effectiveBandwidth);
  }

  /**
   * Hybrid algorithm combining buffer and throughput
   */
  selectQualityHybrid(
    currentQuality: string,
    network: NetworkMetrics,
    buffer: BufferMetrics,
    throughputHistory: number[]
  ): string {
    // Critical buffer overrides everything
    if (buffer.currentLevel < this.config.panicThreshold) {
      const newQuality = '360p';
      if (newQuality !== currentQuality) {
        this.lastSwitchTime = Date.now();
      }
      return newQuality;
    }

    // Use throughput-based selection
    const throughputQuality = this.selectQualityByThroughput(throughputHistory);

    // Use BBB for buffer consideration
    const bbbQuality = this.selectQualityBBB(currentQuality, network, buffer);

    // If buffer is above target and increasing, favor stepping up
    const bufferAboveTarget = buffer.currentLevel > this.config.targetBufferLevel;
    const bufferIncreasing = buffer.downloadRate > buffer.playbackRate;

    if (bufferAboveTarget && bufferIncreasing) {
      // Calculate average throughput
      const avgThroughput = throughputHistory.length > 0
        ? throughputHistory.reduce((a, b) => a + b, 0) / throughputHistory.length
        : network.bandwidth;

      // Try to step up if average throughput supports it
      const higherQuality = this.getNextHigherQuality(currentQuality);
      const required = this.QUALITY_REQUIREMENTS[higherQuality as keyof typeof this.QUALITY_REQUIREMENTS];
      
      // Use raw average (no conservative factor) for aggressive stepping up
      if (avgThroughput >= required * 0.88) { // Allow 12% undershoot when buffer above target
        const newQuality = higherQuality;
        if (newQuality !== currentQuality) {
          this.lastSwitchTime = Date.now();
        }
        return newQuality;
      }
    }

    // Otherwise, pick more conservative option
    const throughputIndex = this.availableQualities.indexOf(throughputQuality);
    const bbbIndex = this.availableQualities.indexOf(bbbQuality);

    const selectedIndex = Math.min(throughputIndex, bbbIndex);
    const newQuality = this.availableQualities[selectedIndex];

    if (newQuality !== currentQuality) {
      this.lastSwitchTime = Date.now();
    }

    return newQuality;
  }

  /**
   * Get detailed switch decision
   */
  getSwitchDecision(
    currentQuality: string,
    network: NetworkMetrics,
    buffer: BufferMetrics
  ): SwitchDecision {
    const newQuality = this.selectQuality(currentQuality, network, buffer);
    const shouldSwitch = newQuality !== currentQuality;

    let reason = '';
    let confidence = 0.8;

    if (buffer.currentLevel < this.config.panicThreshold) {
      reason = `Critical buffer (${buffer.currentLevel.toFixed(1)}s)`;
      confidence = 1.0;
    } else if (buffer.currentLevel < this.config.switchDownThreshold) {
      reason = `Low buffer (${buffer.currentLevel.toFixed(1)}s)`;
      confidence = 0.9;
    } else if (buffer.currentLevel > this.config.switchUpThreshold) {
      reason = `High buffer (${buffer.currentLevel.toFixed(1)}s), bandwidth sufficient`;
      confidence = 0.7;
    } else {
      reason = `Buffer healthy (${buffer.currentLevel.toFixed(1)}s)`;
      confidence = 0.8;
    }

    return {
      shouldSwitch,
      targetQuality: newQuality,
      reason,
      confidence,
    };
  }

  /**
   * Calculate quality scores for each variant
   */
  calculateQualityScores(
    network: NetworkMetrics,
    buffer: BufferMetrics
  ): Record<string, number> {
    const scores: Record<string, number> = {};

    for (const quality of this.availableQualities) {
      const required = this.QUALITY_REQUIREMENTS[quality as keyof typeof this.QUALITY_REQUIREMENTS];
      
      // Bandwidth score (0-1.2, allow > 1 for excess bandwidth)
      const bandwidthScore = Math.min(1.2, network.bandwidth / (required * 1.1));
      
      // Buffer score (0-1)
      const bufferScore = Math.min(1, buffer.currentLevel / this.config.targetBufferLevel);
      
      // Quality bonus (prefer higher quality when achievable)
      const qualityIndex = this.availableQualities.indexOf(quality);
      const qualityBonus = qualityIndex * 0.1; // 0, 0.1, 0.2, 0.3
      
      // Combined score (weighted)
      scores[quality] = bandwidthScore * 0.6 + bufferScore * 0.4 + qualityBonus;
    }

    return scores;
  }

  /**
   * Get next higher quality
   */
  getNextHigherQuality(currentQuality: string): string {
    const currentIndex = this.availableQualities.indexOf(currentQuality);
    if (currentIndex === -1 || currentIndex === this.availableQualities.length - 1) {
      return currentQuality; // Already at max
    }
    return this.availableQualities[currentIndex + 1];
  }

  /**
   * Get next lower quality
   */
  getNextLowerQuality(currentQuality: string): string {
    const currentIndex = this.availableQualities.indexOf(currentQuality);
    if (currentIndex === -1 || currentIndex === 0) {
      return currentQuality; // Already at min
    }
    return this.availableQualities[currentIndex - 1];
  }

  /**
   * Select quality for given bandwidth
   */
  private selectQualityForBandwidth(bandwidth: number): string {
    // Find highest quality that fits
    for (let i = this.availableQualities.length - 1; i >= 0; i--) {
      const quality = this.availableQualities[i];
      const required = this.QUALITY_REQUIREMENTS[quality as keyof typeof this.QUALITY_REQUIREMENTS];
      
      if (bandwidth >= required) {
        return quality;
      }
    }
    
    return '360p'; // Fallback
  }

  /**
   * Calculate variance of array
   */
  private calculateVariance(values: number[]): number {
    if (values.length < 2) return 0;

    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    return squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  }

  /**
   * Get available qualities
   */
  getAvailableQualities(): string[] {
    return [...this.availableQualities];
  }

  /**
   * Set available qualities for stream
   */
  setAvailableQualities(qualities: string[]): void {
    this.availableQualities = qualities.sort((a, b) => {
      const aReq = this.QUALITY_REQUIREMENTS[a as keyof typeof this.QUALITY_REQUIREMENTS] || 0;
      const bReq = this.QUALITY_REQUIREMENTS[b as keyof typeof this.QUALITY_REQUIREMENTS] || 0;
      return aReq - bReq;
    });
  }

  /**
   * Set algorithm
   */
  setAlgorithm(algorithm: SwitchingAlgorithm): void {
    this.config.algorithm = algorithm;
  }

  /**
   * Get current algorithm
   */
  getAlgorithm(): SwitchingAlgorithm {
    return this.config.algorithm;
  }

  /**
   * Get configuration
   */
  getConfig(): QualitySwitcherConfig {
    return { ...this.config };
  }
}
