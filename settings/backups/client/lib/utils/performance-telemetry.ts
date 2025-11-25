/**
 * Performance Telemetry Integration
 * 
 * Sends performance metrics to backend monitoring system (Prometheus/Grafana).
 * Tracks SC-008 (render times), SC-009 (scroll FPS), SC-010 (input latency).
 * 
 * @module performance-telemetry
 * @see usePerformanceMonitor hook for metric collection
 */

import { Platform } from 'react-native';
import Constants from 'expo-constants';

// ============================================================================
// Types
// ============================================================================

export interface PerformanceMetrics {
  /** Metric name (e.g., 'screen_render_time', 'scroll_fps', 'input_latency') */
  metric: string;
  
  /** Metric value (e.g., 800 for 800ms render time, 60 for 60 FPS) */
  value: number;
  
  /** Metric unit (e.g., 'ms', 'fps', 'bytes') */
  unit: 'ms' | 'fps' | 'bytes' | 'count' | 'percentage';
  
  /** Screen or component name where metric was captured */
  screen?: string;
  
  /** Additional context tags */
  tags?: Record<string, string | number | boolean>;
  
  /** Timestamp when metric was captured (ISO 8601) */
  timestamp?: string;
}

export interface TelemetryConfig {
  /** Enable/disable telemetry (default: production only) */
  enabled: boolean;
  
  /** Backend endpoint URL */
  endpoint: string;
  
  /** Batch size before sending (default: 10) */
  batchSize: number;
  
  /** Max time to wait before sending batch in ms (default: 30000 = 30s) */
  flushInterval: number;
  
  /** Sample rate (0-1, default: 1 = 100%) */
  sampleRate: number;
}

export interface RenderTimeMetric {
  screenName: string;
  renderTime: number;
  componentCount?: number;
}

export interface ScrollPerformanceMetric {
  screenName: string;
  averageFps: number;
  frameDropPercentage: number;
  scrollDuration: number;
}

export interface InputLatencyMetric {
  action: string;
  latency: number;
  screenName?: string;
}

// ============================================================================
// Configuration
// ============================================================================

const DEFAULT_CONFIG: TelemetryConfig = {
  // Only enable in production by default
  enabled: !__DEV__ && Constants.appOwnership === 'expo',
  
  // Backend endpoint (should be configured via environment variable)
  endpoint: process.env.EXPO_PUBLIC_TELEMETRY_ENDPOINT || 'https://api.quester.com/v1/telemetry',
  
  // Batch 10 metrics before sending
  batchSize: 10,
  
  // Send batch every 30 seconds even if not full
  flushInterval: 30000,
  
  // Sample 100% of metrics (reduce in production if volume is high)
  sampleRate: 1.0,
};

let config: TelemetryConfig = { ...DEFAULT_CONFIG };
let metricsBatch: PerformanceMetrics[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

// ============================================================================
// Configuration Management
// ============================================================================

/**
 * Configure telemetry settings.
 * Call this at app startup to override defaults.
 * 
 * @example
 * configureTelemetry({
 *   enabled: true,
 *   endpoint: 'https://metrics.example.com/v1/telemetry',
 *   sampleRate: 0.1, // Sample 10% of metrics
 * });
 */
export function configureTelemetry(partialConfig: Partial<TelemetryConfig>): void {
  config = { ...config, ...partialConfig };
  
  if (__DEV__) {
    console.log('[Telemetry] Configuration updated:', config);
  }
}

/**
 * Get current telemetry configuration.
 */
export function getTelemetryConfig(): Readonly<TelemetryConfig> {
  return { ...config };
}

/**
 * Enable or disable telemetry at runtime.
 */
export function setTelemetryEnabled(enabled: boolean): void {
  config.enabled = enabled;
  
  if (!enabled && flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  
  if (__DEV__) {
    console.log(`[Telemetry] ${enabled ? 'Enabled' : 'Disabled'}`);
  }
}

// ============================================================================
// Core Telemetry Functions
// ============================================================================

/**
 * Send a single performance metric to the backend.
 * Automatically batches metrics for efficiency.
 * 
 * @example
 * sendPerformanceMetric({
 *   metric: 'screen_render_time',
 *   value: 823,
 *   unit: 'ms',
 *   screen: 'QuestDetail',
 * });
 */
export function sendPerformanceMetric(metric: PerformanceMetrics): void {
  // Skip if telemetry disabled
  if (!config.enabled) {
    return;
  }
  
  // Apply sampling
  if (Math.random() > config.sampleRate) {
    return;
  }
  
  // Add timestamp if not provided
  const enrichedMetric: PerformanceMetrics = {
    ...metric,
    timestamp: metric.timestamp || new Date().toISOString(),
    tags: {
      ...metric.tags,
      platform: Platform.OS,
      version: Constants.expoConfig?.version || 'unknown',
    },
  };
  
  // Add to batch
  metricsBatch.push(enrichedMetric);
  
  if (__DEV__) {
    console.log('[Telemetry] Metric added to batch:', enrichedMetric);
  }
  
  // Flush if batch is full
  if (metricsBatch.length >= config.batchSize) {
    flushMetrics();
  } else {
    // Schedule flush if not already scheduled
    scheduleFlush();
  }
}

/**
 * Send a batch of performance metrics.
 * More efficient than sending individual metrics.
 * 
 * @example
 * sendPerformanceMetricsBatch([
 *   { metric: 'screen_render_time', value: 823, unit: 'ms', screen: 'QuestDetail' },
 *   { metric: 'scroll_fps', value: 60, unit: 'fps', screen: 'Feed' },
 * ]);
 */
export function sendPerformanceMetricsBatch(metrics: PerformanceMetrics[]): void {
  if (!config.enabled || metrics.length === 0) {
    return;
  }
  
  metrics.forEach(sendPerformanceMetric);
}

/**
 * Immediately flush all pending metrics to backend.
 * Useful before app backgrounding or user logout.
 * 
 * @example
 * // In App.tsx useEffect cleanup
 * return () => {
 *   flushMetrics();
 * };
 */
export async function flushMetrics(): Promise<void> {
  if (metricsBatch.length === 0) {
    return;
  }
  
  // Clear flush timer
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  
  // Take current batch and reset
  const batch = [...metricsBatch];
  metricsBatch = [];
  
  try {
    const response = await fetch(config.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        metrics: batch,
        timestamp: new Date().toISOString(),
      }),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    if (__DEV__) {
      console.log(`[Telemetry] Flushed ${batch.length} metrics successfully`);
    }
  } catch (error) {
    // Log error but don't crash app
    console.error('[Telemetry] Failed to send metrics:', error);
    
    // In production, could retry or store locally
    if (__DEV__) {
      console.log('[Telemetry] Failed batch:', batch);
    }
  }
}

/**
 * Schedule a flush after the configured interval.
 * @private
 */
function scheduleFlush(): void {
  if (flushTimer) {
    return; // Already scheduled
  }
  
  flushTimer = setTimeout(() => {
    flushMetrics();
  }, config.flushInterval);
}

// ============================================================================
// Convenience Functions for Success Criteria
// ============================================================================

/**
 * Track SC-008: Screen render time (P95 target: <1000ms).
 * 
 * @example
 * trackRenderTime({
 *   screenName: 'QuestDetail',
 *   renderTime: 823,
 *   componentCount: 47,
 * });
 */
export function trackRenderTime(data: RenderTimeMetric): void {
  sendPerformanceMetric({
    metric: 'screen_render_time',
    value: data.renderTime,
    unit: 'ms',
    screen: data.screenName,
    tags: {
      ...(data.componentCount !== undefined && { componentCount: data.componentCount }),
      successCriteria: 'SC-008',
    },
  });
}

/**
 * Track SC-009: Scroll performance (target: 60 FPS).
 * 
 * @example
 * trackScrollPerformance({
 *   screenName: 'Feed',
 *   averageFps: 60,
 *   frameDropPercentage: 2.3,
 *   scrollDuration: 5000,
 * });
 */
export function trackScrollPerformance(data: ScrollPerformanceMetric): void {
  sendPerformanceMetricsBatch([
    {
      metric: 'scroll_fps',
      value: data.averageFps,
      unit: 'fps',
      screen: data.screenName,
      tags: {
        successCriteria: 'SC-009',
        scrollDuration: data.scrollDuration,
      },
    },
    {
      metric: 'scroll_frame_drops',
      value: data.frameDropPercentage,
      unit: 'percentage',
      screen: data.screenName,
      tags: {
        successCriteria: 'SC-009',
      },
    },
  ]);
}

/**
 * Track SC-010: Input latency (target: <16ms).
 * 
 * @example
 * trackInputLatency({
 *   action: 'button_press',
 *   latency: 12,
 *   screenName: 'QuestDetail',
 * });
 */
export function trackInputLatency(data: InputLatencyMetric): void {
  sendPerformanceMetric({
    metric: 'input_latency',
    value: data.latency,
    unit: 'ms',
    screen: data.screenName,
    tags: {
      action: data.action,
      successCriteria: 'SC-010',
    },
  });
}

/**
 * Track memory usage.
 * 
 * @example
 * trackMemoryUsage({
 *   used: 108 * 1024 * 1024, // 108 MB
 *   available: 400 * 1024 * 1024, // 400 MB
 * });
 */
export function trackMemoryUsage(data: { used: number; available: number; screen?: string }): void {
  sendPerformanceMetricsBatch([
    {
      metric: 'memory_used',
      value: data.used,
      unit: 'bytes',
      screen: data.screen,
    },
    {
      metric: 'memory_available',
      value: data.available,
      unit: 'bytes',
      screen: data.screen,
    },
  ]);
}

/**
 * Track bundle size (for monitoring tree-shaking effectiveness).
 * 
 * @example
 * trackBundleSize({
 *   total: 2.5 * 1024 * 1024, // 2.5 MB
 *   javascript: 1.8 * 1024 * 1024, // 1.8 MB
 * });
 */
export function trackBundleSize(data: { total: number; javascript: number; screen?: string }): void {
  sendPerformanceMetricsBatch([
    {
      metric: 'bundle_size_total',
      value: data.total,
      unit: 'bytes',
      screen: data.screen,
    },
    {
      metric: 'bundle_size_javascript',
      value: data.javascript,
      unit: 'bytes',
      screen: data.screen,
    },
  ]);
}

// ============================================================================
// Exports
// ============================================================================

export default {
  configureTelemetry,
  getTelemetryConfig,
  setTelemetryEnabled,
  sendPerformanceMetric,
  sendPerformanceMetricsBatch,
  flushMetrics,
  trackRenderTime,
  trackScrollPerformance,
  trackInputLatency,
  trackMemoryUsage,
  trackBundleSize,
};
