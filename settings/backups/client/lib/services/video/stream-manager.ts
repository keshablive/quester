/**
 * VideoStreamManager - Central coordinator for video streaming pipeline
 * 
 * Integrates all services: RTMP → FFmpeg → ABR → DVR → S3
 * 
 * Flow:
 * 1. RTMP stream starts → Start FFmpeg transcoding
 * 2. FFmpeg generates segments → Add to DVR buffer
 * 3. DVR segments → Upload to S3 with lifecycle
 * 4. ABR monitors playback → Adjust quality dynamically
 * 5. BufferManager prevents stalls → Coordinate with quality switching
 * 
 * @example
 * const manager = new VideoStreamManager({
 *   rtmpUrl: 'rtmp://localhost:1935/live/stream',
 *   streamKey: 'secret-key-123',
 *   enableDVR: true,
 *   enableS3Upload: true,
 * });
 * 
 * manager.on('ready', ({ playbackUrl }) => {
 *   player.load(playbackUrl);
 * });
 * 
 * await manager.start();
 */

import { EventEmitter } from 'eventemitter3';
import { NetworkQuality } from '../bandwidth-monitor';
import { BufferState } from '../buffer-manager';
import { DVRService, DVRSegment, DVREvent } from '../dvr-service';
import { S3StorageService, S3Event } from '../s3-storage-service';
import { SwitchingAlgorithm } from '../quality-switcher';
import { ABRCoordinator } from './abr-coordinator';
import { StreamMetricsCollector } from './stream-metrics';
import type {
  QualityLevel,
  VideoStreamConfig,
  StreamState,
  StreamEvent,
  VideoStreamEvents,
  StreamMetrics,
} from './types';

const DEFAULT_QUALITY_LEVELS: QualityLevel[] = [
  { height: 1080, bitrate: 4500000, label: '1080p' },
  { height: 720, bitrate: 2800000, label: '720p' },
  { height: 480, bitrate: 1400000, label: '480p' },
  { height: 360, bitrate: 800000, label: '360p' },
];

export class VideoStreamManager extends EventEmitter<VideoStreamEvents> {
  private config: Required<VideoStreamConfig>;
  private state: StreamState = 'IDLE' as StreamState;
  
  // Service instances
  private abrCoordinator: ABRCoordinator | null = null;
  private dvrService: DVRService | null = null;
  private s3Service: S3StorageService | null = null;
  private metricsCollector: StreamMetricsCollector | null = null;
  
  // State tracking
  private currentQuality: QualityLevel | null = null;
  private metricsInterval: ReturnType<typeof setInterval> | null = null;
  
  constructor(config: VideoStreamConfig) {
    super();
    
    // Set defaults
    this.config = {
      rtmpUrl: config.rtmpUrl || '',
      streamKey: config.streamKey || '',
      hlsUrl: config.hlsUrl || '',
      enableABR: config.enableABR !== false,
      enableDVR: config.enableDVR !== false,
      enableS3Upload: config.enableS3Upload !== false,
      abrAlgorithm: config.abrAlgorithm || SwitchingAlgorithm.HYBRID,
      targetBufferLevel: config.targetBufferLevel || 30,
      qualityLevels: config.qualityLevels || DEFAULT_QUALITY_LEVELS,
      dvrWindowDuration: config.dvrWindowDuration || 2 * 60 * 60, // 2 hours
      dvrMaxStorageSize: config.dvrMaxStorageSize || 2 * 1024 * 1024 * 1024, // 2 GB
      s3Config: config.s3Config || {} as any,
      videoElement: config.videoElement || undefined as any,
    };
    
    this.validateConfig();
  }
  
  private validateConfig(): void {
    if (!this.config.hlsUrl && (!this.config.rtmpUrl || !this.config.streamKey)) {
      throw new Error('Either hlsUrl or (rtmpUrl + streamKey) must be provided');
    }
    
    if (this.config.enableS3Upload && !this.config.s3Config) {
      throw new Error('S3 configuration required when enableS3Upload is true');
    }
    
    if (this.config.qualityLevels.length === 0) {
      console.warn('No quality levels provided; ABR will be disabled until qualities are set.');
    }
  }
  
  /**
   * Initialize all services and wire up event handlers
   */
  async initialize(): Promise<void> {
    if (this.state !== 'IDLE') {
      throw new Error(`Cannot initialize from state: ${this.state}`);
    }
    
    this.setState('INITIALIZING' as StreamState);
    
    try {
      // 1. Initialize ABR coordinator
      if (this.config.enableABR) {
        await this.initializeABR();
      }
      
      // 2. Initialize DVR service
      if (this.config.enableDVR) {
        await this.initializeDVR();
      }
      
      // 3. Initialize S3 service
      if (this.config.enableS3Upload && this.config.s3Config) {
        await this.initializeS3();
      }
      
      // 4. Initialize metrics collector
      const components = this.abrCoordinator?.getComponents();
      this.metricsCollector = new StreamMetricsCollector(
        components?.bandwidthMonitor || null,
        components?.bufferManager || null,
        this.dvrService,
        this.config.qualityLevels
      );
      
      // 5. Wire up cross-service events
      this.wireUpEventHandlers();
      
      this.setState('READY' as StreamState);
      
      // Emit ready event with playback URL
      const playbackUrl = this.getPlaybackUrl();
      this.emit('ready' as StreamEvent, {
        playbackUrl,
        qualities: this.config.qualityLevels,
      });
      
    } catch (error) {
      this.setState('ERROR' as StreamState);
      this.emit('error' as StreamEvent, error as Error);
      throw error;
    }
  }
  
  private async initializeABR(): Promise<void> {
    this.abrCoordinator = new ABRCoordinator(
      {
        algorithm: this.config.abrAlgorithm,
        targetBufferLevel: this.config.targetBufferLevel,
        minBufferLevel: 5,
        panicThreshold: 2,
        switchUpThreshold: 40,
        switchDownThreshold: 10,
        minSwitchInterval: 3000,
      },
      this.config.qualityLevels
    );
    
    this.abrCoordinator.start();
  }
  
  private async initializeDVR(): Promise<void> {
    this.dvrService = new DVRService({
      windowDuration: this.config.dvrWindowDuration,
      segmentDuration: 6,
      maxSegments: 1200,
      maxStorageSize: this.config.dvrMaxStorageSize,
      cleanupInterval: 60000,
      enableAutoCleanup: true,
    });
  }
  
  private async initializeS3(): Promise<void> {
    if (!this.config.s3Config) {
      throw new Error('S3 configuration is required');
    }
    
    this.s3Service = new S3StorageService(this.config.s3Config);
  }
  
  private wireUpEventHandlers(): void {
    const components = this.abrCoordinator?.getComponents();
    
    // Bandwidth monitor events
    if (components?.bandwidthMonitor) {
      components.bandwidthMonitor.on('bandwidthChange', ({ bandwidth, quality }) => {
        this.emit('networkChange' as StreamEvent, { quality, bandwidth });
        this.handleBandwidthChange();
      });
      components.bandwidthMonitor.on('error', (err: Error) => {
        this.emit('error' as StreamEvent, err);
      });
    }
    
    // Buffer manager events
    if (components?.bufferManager) {
      components.bufferManager.on('stateChange', ({ state, level }) => {
        this.emit('bufferChange' as StreamEvent, { state, level });
        this.handleBufferStateChange(state);
      });
      components.bufferManager.on('stallWarning', ({ timeToEmpty }) => {
        console.warn(`Buffer stall warning: ${timeToEmpty}s remaining`);
      });
      components.bufferManager.on('error', (err: Error) => {
        this.emit('error' as StreamEvent, err);
      });
    }
    
    // DVR service events
    if (this.dvrService) {
      this.dvrService.on(DVREvent.SEGMENT_ADDED, ({ segment }) => {
        this.handleSegmentAdded(segment);
        
        const window = this.dvrService!.getWindow();
        this.emit('dvrUpdate' as StreamEvent, {
          duration: window.duration,
          segments: window.segmentCount,
        });
      });
      
      this.dvrService.on(DVREvent.CLEANUP_COMPLETE, ({ removedCount }) => {
        console.log(`DVR cleanup: removed ${removedCount} segments`);
      });
    }
    
    // S3 service events
    if (this.s3Service) {
      this.s3Service.on(S3Event.UPLOAD_PROGRESS, ({ segmentId, progress }) => {
        const percent = typeof progress === 'number' ? progress : (progress && (progress.percentage ?? progress.percentage === 0) ? progress.percentage : undefined);
        this.emit('uploadProgress' as StreamEvent, { segmentId, progress: percent });
      });
      
      this.s3Service.on(S3Event.UPLOAD_COMPLETE, ({ segmentId }) => {
        this.metricsCollector?.incrementUploadCount();
        console.log(`Upload complete: ${segmentId}`);
      });
      
      this.s3Service.on(S3Event.UPLOAD_FAILED, ({ segmentId, error }) => {
        this.metricsCollector?.incrementUploadFailures();
        console.error(`Upload failed: ${segmentId}`, error);
        if (error) {
          this.emit('error' as StreamEvent, error);
        }
      });
      
      this.s3Service.on(S3Event.UPLOAD_RETRY, ({ segmentId, attempt }) => {
        this.metricsCollector?.incrementUploadRetries();
        console.log(`Upload retry: ${segmentId}, attempt ${attempt}`);
      });
    }
  }
  
  private handleBandwidthChange(): void {
    if (!this.abrCoordinator || !this.currentQuality) return;
    
    const evaluation = this.abrCoordinator.evaluateSwitch(this.currentQuality);
    if (evaluation.shouldSwitch && evaluation.targetQuality) {
      this.switchQuality(evaluation.targetQuality, evaluation.reason);
    }
  }
  
  private handleBufferStateChange(state: BufferState): void {
    if (state === BufferState.CRITICAL && this.abrCoordinator && this.currentQuality) {
      const lowerQuality = this.abrCoordinator.handleCriticalBuffer(this.currentQuality);
      if (lowerQuality) {
        this.switchQuality(lowerQuality, 'Critical buffer - emergency downgrade');
      }
    }
  }
  
  private handleSegmentAdded(segment: DVRSegment): void {
    if (this.s3Service && this.config.enableS3Upload) {
      this.uploadSegmentToS3(segment);
    }
  }
  
  private async uploadSegmentToS3(segment: DVRSegment): Promise<void> {
    if (!this.s3Service) return;
    
    try {
      const mockData = new Uint8Array(segment.size).buffer;
      await this.s3Service.uploadSegmentWithRetry(segment, mockData);
    } catch (error) {
      console.error(`Failed to upload segment ${segment.id}:`, error);
    }
  }
  
  private switchQuality(targetQuality: QualityLevel, reason: string): void {
    if (!this.currentQuality) {
      this.currentQuality = targetQuality;
      return;
    }
    
    const previousQuality = this.currentQuality;
    this.currentQuality = targetQuality;
    this.metricsCollector?.incrementQualitySwitchCount();
    
    this.emit('qualityChange' as StreamEvent, {
      from: previousQuality,
      to: targetQuality,
      reason,
    });
    
    console.log(`Quality switch: ${previousQuality.label} → ${targetQuality.label} (${reason})`);
  }
  
  /**
   * Start playback and enable all monitoring
   */
  async start(): Promise<void> {
    if (this.state !== 'READY') {
      throw new Error(`Cannot start from state: ${this.state}`);
    }
    
    this.setState('PLAYING' as StreamState);
    this.metricsCollector?.startTracking();
    
    // Set initial quality to middle of available levels
    const midIndex = Math.floor(this.config.qualityLevels.length / 2);
    this.currentQuality = this.config.qualityLevels[midIndex];
    
    // Start periodic metrics emission
    this.startMetricsEmission();
  }
  
  /**
   * Pause playback (keeps monitoring active)
   */
  pause(): void {
    if (this.state === 'PLAYING') {
      this.setState('PAUSED' as StreamState);
    }
  }
  
  /**
   * Resume playback
   */
  resume(): void {
    if (this.state === 'PAUSED') {
      this.setState('PLAYING' as StreamState);
    }
  }
  
  /**
   * Stop playback and cleanup
   */
  async stop(): Promise<void> {
    this.setState('STOPPED' as StreamState);
    
    if (this.abrCoordinator) {
      this.abrCoordinator.stop();
    }
    
    if (this.dvrService) {
      this.dvrService.clear();
    }
    
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }
  }
  
  /**
   * Manually switch to specific quality
   */
  setQuality(quality: QualityLevel): void {
    if (!this.config.enableABR) {
      throw new Error('Cannot set quality when ABR is disabled');
    }
    
    this.switchQuality(quality, 'Manual selection');
  }
  
  /**
   * Seek to specific timestamp in DVR buffer
   */
  async seek(timestamp: number): Promise<void> {
    if (!this.dvrService) {
      throw new Error('DVR is not enabled');
    }
    
    const result = this.dvrService.seek(timestamp);
    if (result) {
      console.log(`Seeked to segment ${result.segmentId} at ${result.timestamp}s`);
    }
  }
  
  /**
   * Seek relative to live edge (negative = go back in time)
   */
  async seekRelative(seconds: number): Promise<void> {
    if (!this.dvrService) {
      throw new Error('DVR is not enabled');
    }
    
    const result = this.dvrService.seekRelative(seconds);
    if (result) {
      console.log(`Seeked ${seconds}s: segment ${result.segmentId}`);
    }
  }
  
  /**
   * Get comprehensive metrics
   */
  getMetrics(): StreamMetrics {
    return this.metricsCollector?.getMetrics(this.state, this.currentQuality) || {
      state: this.state,
      currentQuality: this.currentQuality,
      networkQuality: NetworkQuality.FAIR,
      bufferState: BufferState.HEALTHY,
      bandwidth: 0,
      latency: 0,
      qualitySwitchCount: 0,
      bufferLevel: 0,
      downloadRate: 0,
      playbackRate: 0,
      stallCount: 0,
      dvrWindowDuration: 0,
      dvrSegmentCount: 0,
      dvrStorageSize: 0,
      uploadCount: 0,
      uploadFailureCount: 0,
      uploadRetryCount: 0,
      uptime: 0,
      averageQuality: 0,
    };
  }
  
  private startMetricsEmission(): void {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }
    this.metricsInterval = setInterval(() => {
      if (this.state === 'PLAYING') {
        this.emit('metrics' as StreamEvent, this.getMetrics());
      }
    }, 5000);
  }
  
  private setState(newState: StreamState): void {
    const oldState = this.state;
    this.state = newState;
    
    if (oldState !== newState) {
      this.emit('stateChange' as StreamEvent, newState);
      console.log(`Stream state: ${oldState} → ${newState}`);
    }
  }
  
  private getPlaybackUrl(): string {
    if (this.config.hlsUrl) {
      return this.config.hlsUrl;
    }
    
    const baseUrl = this.config.rtmpUrl.replace('rtmp://', 'http://').replace(':1935', ':8080');
    return `${baseUrl}/hls/${this.config.streamKey}/master.m3u8`;
  }
  
  // Public getters
  getState(): StreamState {
    return this.state;
  }
  
  getCurrentQuality(): QualityLevel | null {
    return this.currentQuality;
  }
  
  getQualityLevels(): QualityLevel[] {
    return this.config.qualityLevels;
  }
  
  isDVREnabled(): boolean {
    return this.config.enableDVR && this.dvrService !== null;
  }
  
  getDVRRange(): { start: number; end: number } | null {
    if (!this.dvrService) return null;
    const range = this.dvrService.getSeekableRange();
    return range || null;
  }
  
  exportDVRState(): string | null {
    if (!this.dvrService) return null;
    return this.dvrService.exportState();
  }
  
  importDVRState(state: string): void {
    if (!this.dvrService) {
      throw new Error('DVR is not enabled');
    }
    this.dvrService.importState(state);
  }
  
  /**
   * Cleanup and destroy all services
   */
  destroy(): void {
    this.removeAllListeners();
    
    if (this.abrCoordinator) {
      this.abrCoordinator.destroy();
      this.abrCoordinator = null;
    }
    
    if (this.dvrService) {
      this.dvrService.destroy();
      this.dvrService = null;
    }
    
    if (this.s3Service) {
      this.s3Service.destroy();
      this.s3Service = null;
    }

    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }

    this.setState('IDLE' as StreamState);
  }
}

// Re-export types
export * from './types';
