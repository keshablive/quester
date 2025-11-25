// T534-T536: BufferManager Service Implementation
import EventEmitter from 'eventemitter3';

export enum BufferState {
  HEALTHY = 'healthy',
  LOW = 'low',
  CRITICAL = 'critical',
  EXCESS = 'excess',
}

export enum BufferEvent {
  STATE_CHANGE = 'stateChange',
  STALL_WARNING = 'stallWarning',
  BUFFER_FULL = 'bufferFull',
  PREBUFFER_COMPLETE = 'prebufferComplete',
  PREBUFFER_PROGRESS = 'prebufferProgress',
}

export interface SegmentDownload {
  timestamp: number;
  bytesDownloaded: number;
  duration: number; // milliseconds
}

export interface SegmentPlayback {
  timestamp: number;
  bytesConsumed: number;
  duration: number; // seconds
}

export interface StallEvent {
  timestamp: number;
  duration: number; // milliseconds
  bufferLevel: number;
}

export interface BufferHealth {
  state: BufferState;
  level: number;
  downloadRate: number;
  playbackRate: number;
  fillRate: number;
  timeToEmpty: number;
  timeToFull: number;
  stallCount: number;
  averageStallDuration: number;
}

export interface BufferManagerConfig {
  targetBufferLevel: number;     // seconds
  minBufferLevel: number;         // seconds
  criticalBufferLevel: number;   // seconds
  maxBufferLevel: number;         // seconds
  prebufferDuration: number;      // seconds
  segmentDuration: number;        // seconds
  measurementWindow: number;      // milliseconds
}

const DEFAULT_CONFIG: BufferManagerConfig = {
  targetBufferLevel: 30,
  minBufferLevel: 5,
  criticalBufferLevel: 2,
  maxBufferLevel: 60,
  prebufferDuration: 10,
  segmentDuration: 6,
  measurementWindow: 30000, // 30 seconds
};

export class BufferManager extends EventEmitter {
  private config: BufferManagerConfig;
  private currentBufferLevel: number = 0;
  private currentState: BufferState = BufferState.CRITICAL;
  
  private downloadHistory: SegmentDownload[] = [];
  private playbackHistory: SegmentPlayback[] = [];
  private stallHistory: StallEvent[] = [];
  
  private isPrebuffering: boolean = false;
  private prebufferTargetLevel: number = 0;
  
  private currentStallStart: number | null = null;
  private monitoringInterval: ReturnType<typeof setTimeout> | null = null;

  constructor(config: Partial<BufferManagerConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.validateConfig();
  }

  /**
   * Validate configuration
   */
  private validateConfig(): void {
    if (this.config.criticalBufferLevel >= this.config.minBufferLevel) {
      throw new Error('Critical buffer level must be less than min buffer level');
    }
    if (this.config.minBufferLevel >= this.config.targetBufferLevel) {
      throw new Error('Min buffer level must be less than target buffer level');
    }
    if (this.config.targetBufferLevel >= this.config.maxBufferLevel) {
      throw new Error('Target buffer level must be less than max buffer level');
    }
  }

  /**
   * Get current buffer level
   */
  getCurrentBufferLevel(): number {
    return this.currentBufferLevel;
  }

  /**
   * Update current buffer level
   */
  updateBufferLevel(level: number): void {
    const previousLevel = this.currentBufferLevel;
    const previousState = this.currentState;

    this.currentBufferLevel = level;
    this.currentState = this.classifyBufferState(level);

    // Check for stall start/end
    if (level === 0 && previousLevel > 0) {
      this.currentStallStart = Date.now();
    } else if (level > 0 && previousLevel === 0 && this.currentStallStart !== null) {
      const stallDuration = Date.now() - this.currentStallStart;
      this.recordStall(stallDuration, level);
      this.currentStallStart = null;
    }

    // Emit state change event
    if (this.currentState !== previousState) {
      this.emit(BufferEvent.STATE_CHANGE, {
        from: previousState,
        to: this.currentState,
        level,
      });

      // Emit specific warnings
      if (this.currentState === BufferState.CRITICAL) {
        this.emit(BufferEvent.STALL_WARNING, { level });
      } else if (this.currentState === BufferState.EXCESS) {
        this.emit(BufferEvent.BUFFER_FULL, { level });
      }
    }

    // Update prebuffering progress
    if (this.isPrebuffering) {
      const progress = level / this.prebufferTargetLevel;
      this.emit(BufferEvent.PREBUFFER_PROGRESS, { progress, level });

      if (level >= this.prebufferTargetLevel) {
        this.isPrebuffering = false;
        this.emit(BufferEvent.PREBUFFER_COMPLETE, { level });
      }
    }
  }

  /**
   * Classify buffer state
   */
  private classifyBufferState(level: number): BufferState {
    if (level < this.config.criticalBufferLevel) {
      return BufferState.CRITICAL;
    }
    if (level < this.config.minBufferLevel) {
      return BufferState.LOW;
    }
    if (level > this.config.maxBufferLevel) {
      return BufferState.EXCESS;
    }
    return BufferState.HEALTHY;
  }

  /**
   * Get current buffer state
   */
  getBufferState(): BufferState {
    return this.currentState;
  }

  /**
   * Record segment download
   */
  recordSegmentDownload(bytesDownloaded: number, duration: number): void {
    const now = Date.now();
    this.downloadHistory.push({
      timestamp: now,
      bytesDownloaded,
      duration,
    });

    // Clean old history
    this.cleanHistory(this.downloadHistory);
  }

  /**
   * Record segment playback
   */
  recordSegmentPlayback(bytesConsumed: number, duration: number): void {
    const now = Date.now();
    this.playbackHistory.push({
      timestamp: now,
      bytesConsumed,
      duration,
    });

    // Clean old history
    this.cleanHistory(this.playbackHistory);
  }

  /**
   * Clean old history entries
   */
  private cleanHistory<T extends { timestamp: number }>(history: T[]): void {
    const cutoff = Date.now() - this.config.measurementWindow;
    const index = history.findIndex(entry => entry.timestamp > cutoff);
    if (index > 0) {
      history.splice(0, index);
    }
  }

  /**
   * Calculate download rate (Mbps)
   */
  getDownloadRate(): number {
    if (this.downloadHistory.length === 0) return 0;

    const totalBytes = this.downloadHistory.reduce(
      (sum, entry) => sum + entry.bytesDownloaded,
      0
    );
    const totalDuration = this.downloadHistory.reduce(
      (sum, entry) => sum + entry.duration,
      0
    );

    if (totalDuration === 0) return 0;

    // Convert bytes/ms to Mbps
    return (totalBytes * 8) / (totalDuration * 1000);
  }

  /**
   * Calculate playback rate (Mbps)
   */
  getPlaybackRate(): number {
    if (this.playbackHistory.length === 0) return 0;

    const totalBytes = this.playbackHistory.reduce(
      (sum, entry) => sum + entry.bytesConsumed,
      0
    );
    const totalDuration = this.playbackHistory.reduce(
      (sum, entry) => sum + entry.duration,
      0
    );

    if (totalDuration === 0) return 0;

    // Convert bytes/s to Mbps
    return (totalBytes * 8) / (totalDuration * 1000000);
  }

  /**
   * Calculate buffer fill rate (Mbps)
   */
  getBufferFillRate(): number {
    return this.getDownloadRate() - this.getPlaybackRate();
  }

  /**
   * Estimate time until buffer is empty (seconds)
   */
  estimateTimeToEmpty(): number {
    const playbackRate = this.getPlaybackRate();
    if (playbackRate === 0) return Infinity;

    const fillRate = this.getBufferFillRate();
    if (fillRate >= 0) return Infinity; // Buffer growing

    // Calculate based on current level and drain rate
    const drainRate = Math.abs(fillRate);
    return this.currentBufferLevel / (drainRate / playbackRate);
  }

  /**
   * Estimate time until buffer is full (seconds)
   */
  estimateTimeToFull(): number {
    const fillRate = this.getBufferFillRate();
    if (fillRate <= 0) return Infinity; // Buffer draining

    const playbackRate = this.getPlaybackRate();
    if (playbackRate === 0) return Infinity;

    const spaceRemaining = this.config.maxBufferLevel - this.currentBufferLevel;
    return spaceRemaining / (fillRate / playbackRate);
  }

  /**
   * Should request more segments
   */
  shouldRequestMoreSegments(): boolean {
    // Don't request if buffer is full
    if (this.currentState === BufferState.EXCESS) {
      return false;
    }

    // Always request if critical
    if (this.currentState === BufferState.CRITICAL) {
      return true;
    }

    // Request if below target and filling slowly
    if (this.currentBufferLevel < this.config.targetBufferLevel) {
      const fillRate = this.getBufferFillRate();
      return fillRate < 1.0; // Less than 1 Mbps net fill rate
    }

    return false;
  }

  /**
   * Get optimal segment count to request
   */
  getOptimalSegmentCount(): number {
    const bufferDeficit = this.config.targetBufferLevel - this.currentBufferLevel;
    
    if (bufferDeficit <= 0) {
      return 1; // Just maintain
    }

    // Calculate based on segment duration
    const segmentsNeeded = Math.ceil(bufferDeficit / this.config.segmentDuration);

    // Prioritize on critical
    if (this.currentState === BufferState.CRITICAL) {
      return Math.max(segmentsNeeded, 3);
    }

    return Math.min(segmentsNeeded, 5); // Cap at 5 segments
  }

  /**
   * Start prebuffering
   */
  async prebuffer(): Promise<void> {
    this.isPrebuffering = true;
    this.prebufferTargetLevel = this.config.prebufferDuration;

    return new Promise((resolve) => {
      const checkComplete = () => {
        if (this.currentBufferLevel >= this.prebufferTargetLevel) {
          this.isPrebuffering = false;
          resolve();
        }
      };

      this.on(BufferEvent.PREBUFFER_COMPLETE, () => {
        resolve();
      });

      // Start checking
      checkComplete();
    });
  }

  /**
   * Get prebuffering progress (0-1)
   */
  getPrebufferProgress(): number {
    if (!this.isPrebuffering) return 1;
    return this.currentBufferLevel / this.prebufferTargetLevel;
  }

  /**
   * Check if currently stalled
   */
  isStalled(): boolean {
    return this.currentStallStart !== null;
  }

  /**
   * Get current stall duration (ms)
   */
  getCurrentStallDuration(): number {
    if (this.currentStallStart === null) return 0;
    return Date.now() - this.currentStallStart;
  }

  /**
   * Record stall event
   */
  private recordStall(duration: number, recoveryLevel: number): void {
    this.stallHistory.push({
      timestamp: Date.now(),
      duration,
      bufferLevel: recoveryLevel,
    });

    // Keep only recent stalls
    const cutoff = Date.now() - this.config.measurementWindow * 2;
    this.stallHistory = this.stallHistory.filter(s => s.timestamp > cutoff);
  }

  /**
   * Get stall history
   */
  getStallHistory(): StallEvent[] {
    return [...this.stallHistory];
  }

  /**
   * Get comprehensive buffer metrics
   */
  getMetrics(): BufferHealth {
    const downloadRate = this.getDownloadRate();
    const playbackRate = this.getPlaybackRate();
    const fillRate = this.getBufferFillRate();

    let averageStallDuration = 0;
    if (this.stallHistory.length > 0) {
      const totalStallDuration = this.stallHistory.reduce(
        (sum, stall) => sum + stall.duration,
        0
      );
      averageStallDuration = totalStallDuration / this.stallHistory.length;
    }

    return {
      state: this.currentState,
      level: this.currentBufferLevel,
      downloadRate,
      playbackRate,
      fillRate,
      timeToEmpty: this.estimateTimeToEmpty(),
      timeToFull: this.estimateTimeToFull(),
      stallCount: this.stallHistory.length,
      averageStallDuration,
    };
  }

  /**
   * Start monitoring (for integration with video player)
   */
  startMonitoring(updateInterval: number = 1000): void {
    if (this.monitoringInterval !== null) {
      return; // Already monitoring
    }

    this.monitoringInterval = setInterval(() => {
      // This would typically query the video element's buffered ranges
      // For now, this is a placeholder for integration
    }, updateInterval);
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval !== null) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stopMonitoring();
    this.removeAllListeners();
    this.downloadHistory = [];
    this.playbackHistory = [];
    this.stallHistory = [];
  }

  /**
   * Get configuration
   */
  getConfig(): BufferManagerConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<BufferManagerConfig>): void {
    this.config = { ...this.config, ...config };
    this.validateConfig();
  }
}
