/**
 * @deprecated Use './video/stream-manager' instead
 * 
 * This file maintains backward compatibility.
 * The VideoStreamManager has been split into modular components:
 * - types.ts: Type definitions
 * - stream-manager.ts: Main manager class
 * - abr-coordinator.ts: ABR logic
 * - stream-metrics.ts: Metrics collection
 * 
 * Import from './video' for the new structure.
 */

// Re-export everything from the new modular structure
export {
  VideoStreamManager,
  ABRCoordinator,
  StreamMetricsCollector,
} from './video';

// Export enums as values (not types)
export { StreamEvent, StreamState } from './video';

// Export types
export type {
  QualityLevel,
  VideoStreamConfig,
  StreamMetrics,
  VideoStreamEvents,
} from './video';

// Also keep the old class export for maximum compatibility
import { VideoStreamManager as VSM } from './video';
export default VSM;

// Legacy imports (kept for backward compatibility)
export { NetworkQuality } from './bandwidth-monitor';
export { SwitchingAlgorithm } from './quality-switcher';
export { BufferState } from './buffer-manager';
export { DVREvent } from './dvr-service';
export { S3Event } from './s3-storage-service';
