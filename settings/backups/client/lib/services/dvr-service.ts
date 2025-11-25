// T537-T540: DVR (Digital Video Recording) Service Implementation
import EventEmitter from 'eventemitter3';

export interface DVRSegment {
  id: string;
  url: string;
  duration: number;        // seconds
  timestamp: number;       // Unix timestamp when recorded
  quality: string;         // '360p', '480p', '720p', '1080p'
  size: number;           // bytes
  sequenceNumber: number;
}

export interface DVRWindow {
  startTime: number;      // Unix timestamp of oldest segment
  endTime: number;        // Unix timestamp of newest segment
  duration: number;       // Total duration in seconds
  segmentCount: number;
  totalSize: number;      // Total bytes
}

export interface SeekResult {
  segmentId: string;
  offset: number;         // Offset within segment (seconds)
  timestamp: number;      // Absolute timestamp
}

export enum DVREvent {
  SEGMENT_ADDED = 'segmentAdded',
  SEGMENT_REMOVED = 'segmentRemoved',
  WINDOW_UPDATED = 'windowUpdated',
  SEEK_COMPLETE = 'seekComplete',
  CLEANUP_COMPLETE = 'cleanupComplete',
}

export interface DVRConfig {
  windowDuration: number;     // Maximum window duration (seconds)
  segmentDuration: number;    // Typical segment duration (seconds)
  maxSegments: number;        // Maximum segments to keep
  maxStorageSize: number;     // Maximum storage (bytes)
  cleanupInterval: number;    // Cleanup check interval (ms)
  enableAutoCleanup: boolean; // Auto cleanup old segments
}

const DEFAULT_CONFIG: DVRConfig = {
  windowDuration: 2 * 60 * 60,  // 2 hours
  segmentDuration: 6,             // 6 seconds per segment
  maxSegments: 1200,              // 2 hours / 6 seconds = 1200 segments
  maxStorageSize: 2 * 1024 * 1024 * 1024, // 2 GB
  cleanupInterval: 60000,         // 1 minute
  enableAutoCleanup: true,
};

export class DVRService extends EventEmitter {
  private config: DVRConfig;
  private segments: Map<string, DVRSegment> = new Map();
  private segmentsByTime: DVRSegment[] = []; // Sorted by timestamp
  private cleanupTimer: ReturnType<typeof setTimeout> | null = null;
  private totalSize: number = 0;

  constructor(config: Partial<DVRConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.validateConfig();

    if (this.config.enableAutoCleanup) {
      this.startAutoCleanup();
    }
  }

  /**
   * Validate configuration
   */
  private validateConfig(): void {
    if (this.config.windowDuration <= 0) {
      throw new Error('Window duration must be positive');
    }
    if (this.config.segmentDuration <= 0) {
      throw new Error('Segment duration must be positive');
    }
    if (this.config.maxSegments <= 0) {
      throw new Error('Max segments must be positive');
    }
    if (this.config.maxStorageSize <= 0) {
      throw new Error('Max storage size must be positive');
    }
  }

  /**
   * Add segment to DVR buffer
   */
  addSegment(segment: DVRSegment): void {
    // Check if segment already exists
    if (this.segments.has(segment.id)) {
      return; // Duplicate, skip
    }

    // Add to map and sorted array
    this.segments.set(segment.id, segment);
    this.insertSegmentSorted(segment);
    this.totalSize += segment.size;

    // Emit event
    this.emit(DVREvent.SEGMENT_ADDED, { segment });

    // Check if cleanup needed
    this.checkCleanupNeeded();
  }

  /**
   * Insert segment in sorted order by timestamp
   */
  private insertSegmentSorted(segment: DVRSegment): void {
    const index = this.segmentsByTime.findIndex(s => s.timestamp > segment.timestamp);
    if (index === -1) {
      this.segmentsByTime.push(segment);
    } else {
      this.segmentsByTime.splice(index, 0, segment);
    }
  }

  /**
   * Remove segment from DVR buffer
   */
  removeSegment(segmentId: string): boolean {
    const segment = this.segments.get(segmentId);
    if (!segment) {
      return false;
    }

    // Remove from map and array
    this.segments.delete(segmentId);
    const index = this.segmentsByTime.findIndex(s => s.id === segmentId);
    if (index !== -1) {
      this.segmentsByTime.splice(index, 1);
    }
    this.totalSize -= segment.size;

    // Emit event
    this.emit(DVREvent.SEGMENT_REMOVED, { segmentId, segment });

    return true;
  }

  /**
   * Get segment by ID
   */
  getSegment(segmentId: string): DVRSegment | undefined {
    return this.segments.get(segmentId);
  }

  /**
   * Get all segments in time order
   */
  getSegments(): DVRSegment[] {
    return [...this.segmentsByTime];
  }

  /**
   * Get segments for specific quality
   */
  getSegmentsByQuality(quality: string): DVRSegment[] {
    return this.segmentsByTime.filter(s => s.quality === quality);
  }

  /**
   * Get DVR window information
   */
  getWindow(): DVRWindow {
    if (this.segmentsByTime.length === 0) {
      return {
        startTime: 0,
        endTime: 0,
        duration: 0,
        segmentCount: 0,
        totalSize: 0,
      };
    }

    const first = this.segmentsByTime[0];
    const last = this.segmentsByTime[this.segmentsByTime.length - 1];

    return {
      startTime: first.timestamp,
      endTime: last.timestamp + last.duration,
      duration: (last.timestamp + last.duration - first.timestamp),
      segmentCount: this.segmentsByTime.length,
      totalSize: this.totalSize,
    };
  }

  /**
   * Seek to specific timestamp
   */
  seek(timestamp: number): SeekResult | null {
    if (this.segmentsByTime.length === 0) {
      return null;
    }

    const window = this.getWindow();
    
    // Check if timestamp is within window
    if (timestamp < window.startTime || timestamp > window.endTime) {
      return null; // Out of range
    }

    // Find segment containing timestamp
    for (const segment of this.segmentsByTime) {
      const segmentStart = segment.timestamp;
      const segmentEnd = segment.timestamp + segment.duration;

      if (timestamp >= segmentStart && timestamp < segmentEnd) {
        const result: SeekResult = {
          segmentId: segment.id,
          offset: timestamp - segmentStart,
          timestamp,
        };

        this.emit(DVREvent.SEEK_COMPLETE, result);
        return result;
      }
    }

    return null;
  }

  /**
   * Seek relative to current position
   */
  seekRelative(seconds: number): SeekResult | null {
    const window = this.getWindow();
    const currentTime = window.endTime; // Assume live edge
    return this.seek(currentTime + seconds);
  }

  /**
   * Get segment at relative position (0-1, where 1 is live edge)
   */
  seekToPosition(position: number): SeekResult | null {
    if (position < 0 || position > 1) {
      throw new Error('Position must be between 0 and 1');
    }

    const window = this.getWindow();
    const timestamp = window.startTime + (window.duration * position);
    return this.seek(timestamp);
  }

  /**
   * Check if cleanup is needed
   */
  private checkCleanupNeeded(): void {
    const window = this.getWindow();

    // Check duration limit
    if (window.duration > this.config.windowDuration) {
      this.cleanupByDuration();
    }

    // Check segment count limit
    if (this.segmentsByTime.length > this.config.maxSegments) {
      this.cleanupByCount();
    }

    // Check storage size limit
    if (this.totalSize > this.config.maxStorageSize) {
      this.cleanupBySize();
    }
  }

  /**
   * Cleanup old segments by duration
   */
  private cleanupByDuration(): void {
    const now = Date.now() / 1000; // Current time in seconds
    const cutoffTime = now - this.config.windowDuration;

    let removed = 0;
    while (this.segmentsByTime.length > 0) {
      const oldest = this.segmentsByTime[0];
      if (oldest.timestamp < cutoffTime) {
        this.removeSegment(oldest.id);
        removed++;
      } else {
        break;
      }
    }

    if (removed > 0) {
      this.emit(DVREvent.CLEANUP_COMPLETE, { 
        reason: 'duration', 
        removed,
        window: this.getWindow(),
      });
    }
  }

  /**
   * Cleanup excess segments by count
   */
  private cleanupByCount(): void {
    const excess = this.segmentsByTime.length - this.config.maxSegments;
    if (excess <= 0) return;

    let removed = 0;
    for (let i = 0; i < excess; i++) {
      if (this.segmentsByTime.length > 0) {
        const oldest = this.segmentsByTime[0];
        this.removeSegment(oldest.id);
        removed++;
      }
    }

    if (removed > 0) {
      this.emit(DVREvent.CLEANUP_COMPLETE, { 
        reason: 'count', 
        removed,
        window: this.getWindow(),
      });
    }
  }

  /**
   * Cleanup segments to reduce storage size
   */
  private cleanupBySize(): void {
    let removed = 0;
    while (this.totalSize > this.config.maxStorageSize && this.segmentsByTime.length > 0) {
      const oldest = this.segmentsByTime[0];
      this.removeSegment(oldest.id);
      removed++;
    }

    if (removed > 0) {
      this.emit(DVREvent.CLEANUP_COMPLETE, { 
        reason: 'size', 
        removed,
        window: this.getWindow(),
      });
    }
  }

  /**
   * Manual cleanup of old segments
   */
  cleanup(): void {
    this.checkCleanupNeeded();
  }

  /**
   * Start automatic cleanup timer
   */
  private startAutoCleanup(): void {
    if (this.cleanupTimer !== null) {
      return; // Already started
    }

    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  /**
   * Stop automatic cleanup
   */
  stopAutoCleanup(): void {
    if (this.cleanupTimer !== null) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * Clear all segments
   */
  clear(): void {
    const count = this.segments.size;
    this.segments.clear();
    this.segmentsByTime = [];
    this.totalSize = 0;

    this.emit(DVREvent.CLEANUP_COMPLETE, { 
      reason: 'manual', 
      removed: count,
      window: this.getWindow(),
    });
  }

  /**
   * Get statistics
   */
  getStatistics() {
    const window = this.getWindow();
    const qualityBreakdown = new Map<string, number>();

    for (const segment of this.segmentsByTime) {
      qualityBreakdown.set(
        segment.quality,
        (qualityBreakdown.get(segment.quality) || 0) + 1
      );
    }

    return {
      window,
      totalSegments: this.segments.size,
      totalSize: this.totalSize,
      averageSegmentSize: this.segments.size > 0 ? this.totalSize / this.segments.size : 0,
      qualityBreakdown: Object.fromEntries(qualityBreakdown),
      utilizationPercent: {
        duration: (window.duration / this.config.windowDuration) * 100,
        count: (this.segments.size / this.config.maxSegments) * 100,
        storage: (this.totalSize / this.config.maxStorageSize) * 100,
      },
    };
  }

  /**
   * Check if timestamp is seekable
   */
  isSeekable(timestamp: number): boolean {
    const window = this.getWindow();
    return timestamp >= window.startTime && timestamp <= window.endTime;
  }

  /**
   * Get available seek range
   */
  getSeekableRange(): { start: number; end: number; duration: number } {
    const window = this.getWindow();
    return {
      start: window.startTime,
      end: window.endTime,
      duration: window.duration,
    };
  }

  /**
   * Export DVR state (for persistence)
   */
  exportState(): string {
    const state = {
      segments: Array.from(this.segments.values()),
      config: this.config,
      totalSize: this.totalSize,
    };
    return JSON.stringify(state);
  }

  /**
   * Import DVR state (from persistence)
   */
  importState(stateJson: string): void {
    try {
      const state = JSON.parse(stateJson);
      
      // Clear current state
      this.clear();

      // Restore segments
      for (const segment of state.segments) {
        this.addSegment(segment);
      }

      // Update config if provided
      if (state.config) {
        this.config = { ...this.config, ...state.config };
      }
    } catch (error) {
      throw new Error(`Failed to import DVR state: ${error}`);
    }
  }

  /**
   * Destroy service and cleanup resources
   */
  destroy(): void {
    this.stopAutoCleanup();
    this.clear();
    this.removeAllListeners();
  }

  /**
   * Get configuration
   */
  getConfig(): DVRConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<DVRConfig>): void {
    const oldAutoCleanup = this.config.enableAutoCleanup;
    this.config = { ...this.config, ...config };
    this.validateConfig();

    // Handle auto cleanup toggle
    if (config.enableAutoCleanup !== undefined) {
      if (config.enableAutoCleanup && !oldAutoCleanup) {
        this.startAutoCleanup();
      } else if (!config.enableAutoCleanup && oldAutoCleanup) {
        this.stopAutoCleanup();
      }
    }

    // Check if cleanup needed with new limits
    this.checkCleanupNeeded();
  }
}
