/**
 * Video Streaming Services
 * 
 * Modular video streaming components:
 * - VideoStreamManager: Main orchestrator
 * - ABRCoordinator: Adaptive bitrate controller
 * - StreamMetricsCollector: Metrics collection
 * - Types: Shared type definitions
 */

export { VideoStreamManager } from './stream-manager';
export { ABRCoordinator } from './abr-coordinator';
export { StreamMetricsCollector } from './stream-metrics';

// Export enums as values (not types)
export { StreamEvent, StreamState } from './types';

// Export types
export type {
  QualityLevel,
  VideoStreamConfig,
  StreamMetrics,
  VideoStreamEvents,
} from './types';
