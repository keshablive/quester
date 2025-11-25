/**
 * Type definitions for video streaming services
 */

import { NetworkQuality } from '../bandwidth-monitor';
import { BufferState } from '../buffer-manager';
import { SwitchingAlgorithm } from '../quality-switcher';
import { S3Config } from '../s3-storage-service';

export interface QualityLevel {
  height: number;
  bitrate: number;
  label: string;
}

export interface VideoStreamConfig {
  // Stream source
  rtmpUrl?: string;
  streamKey?: string;
  hlsUrl?: string; // Direct HLS URL if not using RTMP
  
  // Feature flags
  enableABR?: boolean;
  enableDVR?: boolean;
  enableS3Upload?: boolean;
  
  // ABR configuration
  abrAlgorithm?: SwitchingAlgorithm;
  targetBufferLevel?: number;
  qualityLevels?: QualityLevel[];
  
  // DVR configuration
  dvrWindowDuration?: number; // seconds
  dvrMaxStorageSize?: number; // bytes
  
  // S3 configuration
  s3Config?: S3Config;
  
  // Video player element (optional, for BufferManager integration)
  videoElement?: HTMLVideoElement;
}

export enum StreamState {
  IDLE = 'IDLE',
  INITIALIZING = 'INITIALIZING',
  READY = 'READY',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  BUFFERING = 'BUFFERING',
  ERROR = 'ERROR',
  STOPPED = 'STOPPED',
}

export enum StreamEvent {
  STATE_CHANGE = 'stateChange',
  READY = 'ready',
  QUALITY_CHANGE = 'qualityChange',
  BUFFER_CHANGE = 'bufferChange',
  NETWORK_CHANGE = 'networkChange',
  DVR_UPDATE = 'dvrUpdate',
  UPLOAD_PROGRESS = 'uploadProgress',
  ERROR = 'error',
  METRICS = 'metrics',
}

export interface StreamMetrics {
  // Current state
  state: StreamState;
  currentQuality: QualityLevel | null;
  networkQuality: NetworkQuality;
  bufferState: BufferState;
  
  // ABR metrics
  bandwidth: number;
  latency: number;
  qualitySwitchCount: number;
  
  // Buffer metrics
  bufferLevel: number;
  downloadRate: number;
  playbackRate: number;
  stallCount: number;
  
  // DVR metrics
  dvrWindowDuration: number;
  dvrSegmentCount: number;
  dvrStorageSize: number;
  
  // S3 metrics
  uploadCount: number;
  uploadFailureCount: number;
  uploadRetryCount: number;
  
  // Playback metrics
  uptime: number;
  averageQuality: number;
}

export interface VideoStreamEvents {
  [StreamEvent.STATE_CHANGE]: (state: StreamState) => void;
  [StreamEvent.READY]: (data: { playbackUrl: string; qualities: QualityLevel[] }) => void;
  [StreamEvent.QUALITY_CHANGE]: (data: { from: QualityLevel; to: QualityLevel; reason: string }) => void;
  [StreamEvent.BUFFER_CHANGE]: (data: { state: BufferState; level: number }) => void;
  [StreamEvent.NETWORK_CHANGE]: (data: { quality: NetworkQuality; bandwidth: number }) => void;
  [StreamEvent.DVR_UPDATE]: (data: { duration: number; segments: number }) => void;
  [StreamEvent.UPLOAD_PROGRESS]: (data: { segmentId: string; progress: number }) => void;
  [StreamEvent.ERROR]: (error: Error) => void;
  [StreamEvent.METRICS]: (metrics: StreamMetrics) => void;
}
