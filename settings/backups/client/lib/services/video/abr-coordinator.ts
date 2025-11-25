/**
 * Adaptive Bitrate (ABR) Coordinator
 * Manages quality switching based on bandwidth and buffer levels
 */

import { BandwidthMonitor, NetworkQuality } from '../bandwidth-monitor';
import { QualitySwitcher, SwitchingAlgorithm } from '../quality-switcher';
import { BufferManager, BufferState } from '../buffer-manager';
import type { QualityLevel } from './types';

export interface ABRConfig {
  algorithm: SwitchingAlgorithm;
  targetBufferLevel: number;
  minBufferLevel: number;
  panicThreshold: number;
  switchUpThreshold: number;
  switchDownThreshold: number;
  minSwitchInterval: number;
}

export interface ABRComponents {
  bandwidthMonitor: BandwidthMonitor;
  qualitySwitcher: QualitySwitcher;
  bufferManager: BufferManager;
}

export class ABRCoordinator {
  private bandwidthMonitor: BandwidthMonitor;
  private qualitySwitcher: QualitySwitcher;
  private bufferManager: BufferManager;

  constructor(
    config: ABRConfig,
    private qualityLevels: QualityLevel[]
  ) {
    // Initialize bandwidth monitor
    this.bandwidthMonitor = new BandwidthMonitor({
      measurementInterval: 5000,
      smoothingFactor: 0.7,
      sampleSize: 10,
    });
    
    // Initialize quality switcher
    this.qualitySwitcher = new QualitySwitcher({
      algorithm: config.algorithm,
      targetBufferLevel: config.targetBufferLevel,
      minBufferLevel: config.minBufferLevel,
      panicThreshold: config.panicThreshold,
      switchUpThreshold: config.switchUpThreshold,
      switchDownThreshold: config.switchDownThreshold,
      minSwitchInterval: config.minSwitchInterval,
    });
    
    // Initialize buffer manager
    this.bufferManager = new BufferManager({
      targetBufferLevel: config.targetBufferLevel,
      minBufferLevel: config.minBufferLevel,
      criticalBufferLevel: config.panicThreshold,
      prebufferDuration: 10,
    });
  }

  start(): void {
    this.bandwidthMonitor.start();
  }

  stop(): void {
    this.bandwidthMonitor.stop();
  }

  /**
   * Evaluate if quality switch is needed based on current conditions
   */
  evaluateSwitch(currentQuality: QualityLevel): {
    shouldSwitch: boolean;
    targetQuality: QualityLevel | null;
    reason: string;
  } {
    const networkQuality = this.bandwidthMonitor.getNetworkQuality();
    const bandwidth = this.bandwidthMonitor.getSmoothedBandwidth();
    const latency = this.bandwidthMonitor.getAverageLatency();
    const bufferLevel = this.bufferManager.getCurrentBufferLevel();
    
    // Get switch decision from quality switcher
    const decision = this.qualitySwitcher.getSwitchDecision(
      currentQuality.label.toLowerCase(),
      { bandwidth, latency, quality: networkQuality },
      {
        currentLevel: bufferLevel,
        targetLevel: this.bufferManager['config'].targetBufferLevel,
        downloadRate: 0,
        playbackRate: 0,
      }
    );
    
    if (!decision.shouldSwitch) {
      return { shouldSwitch: false, targetQuality: null, reason: '' };
    }
    
    // Find matching quality level
    const targetQuality = this.qualityLevels.find(
      q => q.label.toLowerCase() === decision.targetQuality.toLowerCase()
    );
    
    if (!targetQuality) {
      return { shouldSwitch: false, targetQuality: null, reason: '' };
    }
    
    return {
      shouldSwitch: true,
      targetQuality,
      reason: decision.reason,
    };
  }

  /**
   * Force downgrade for critical buffer situations
   */
  handleCriticalBuffer(currentQuality: QualityLevel): QualityLevel | null {
    const lowerQualityStr = this.qualitySwitcher.getNextLowerQuality(
      currentQuality.label.toLowerCase()
    );
    
    if (!lowerQualityStr) return null;
    
    return this.qualityLevels.find(
      q => q.label.toLowerCase() === lowerQualityStr.toLowerCase()
    ) || null;
  }

  getComponents(): ABRComponents {
    return {
      bandwidthMonitor: this.bandwidthMonitor,
      qualitySwitcher: this.qualitySwitcher,
      bufferManager: this.bufferManager,
    };
  }

  destroy(): void {
    this.bandwidthMonitor.stop();
    this.bandwidthMonitor.removeAllListeners();
    this.bufferManager.destroy();
  }
}
