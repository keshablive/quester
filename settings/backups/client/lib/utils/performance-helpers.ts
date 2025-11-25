/**
 * Performance Helper Utilities
 * Feature 003, T024: Utilities for performance monitoring
 * 
 * Provides helper functions for measuring render times, tracking FPS,
 * and monitoring bundle size.
 * 
 * Usage:
 * ```typescript
 * import { measureRenderTime, trackFPS, monitorBundleSize } from '@/lib/utils/performance-helpers';
 * 
 * // Measure render time
 * const stopTimer = measureRenderTime('MyComponent');
 * // ... component renders ...
 * stopTimer(); // Logs render time
 * 
 * // Track FPS
 * const stopFPS = trackFPS((fps) => console.log('FPS:', fps));
 * // ... later ...
 * stopFPS();
 * ```
 */

import { InteractionManager } from 'react-native';

interface PerformanceEntry {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
}

interface FPSMetrics {
  current: number;
  average: number;
  min: number;
  max: number;
  samples: number;
}

/**
 * Performance metrics storage
 */
const performanceMetrics = new Map<string, PerformanceEntry[]>();
let fpsTrackingInterval: ReturnType<typeof setInterval> | null = null;
const fpsCallbacks = new Set<(metrics: FPSMetrics) => void>();

/**
 * Measure render time for a component or operation
 * 
 * @param name - Name of the component or operation
 * @returns Function to call when measurement should end
 * 
 * @example
 * const stopTimer = measureRenderTime('MyComponent');
 * // Component renders...
 * stopTimer(); // Logs: "MyComponent rendered in 45ms"
 */
export function measureRenderTime(name: string): () => void {
  const startTime = performance.now();
  
  return () => {
    const endTime = performance.now();
    const duration = endTime - startTime;

    // Store metric
    const entries = performanceMetrics.get(name) || [];
    entries.push({
      name,
      startTime,
      endTime,
      duration,
    });
    performanceMetrics.set(name, entries);

    // Log if slow (>100ms)
    if (duration > 100) {
      console.warn(`[Performance] ${name} took ${duration.toFixed(2)}ms (threshold: 100ms)`);
    } else {
      console.log(`[Performance] ${name} rendered in ${duration.toFixed(2)}ms`);
    }

    return duration;
  };
}

/**
 * Get performance metrics for a specific name
 */
export function getPerformanceMetrics(name: string): {
  count: number;
  average: number;
  min: number;
  max: number;
  total: number;
} {
  const entries = performanceMetrics.get(name) || [];
  
  if (entries.length === 0) {
    return { count: 0, average: 0, min: 0, max: 0, total: 0 };
  }

  const durations = entries.map(e => e.duration!).filter(d => d !== undefined);
  const total = durations.reduce((sum, d) => sum + d, 0);
  const average = total / durations.length;
  const min = Math.min(...durations);
  const max = Math.max(...durations);

  return {
    count: durations.length,
    average: Math.round(average * 100) / 100,
    min: Math.round(min * 100) / 100,
    max: Math.round(max * 100) / 100,
    total: Math.round(total * 100) / 100,
  };
}

/**
 * Clear performance metrics for a specific name or all
 */
export function clearPerformanceMetrics(name?: string): void {
  if (name) {
    performanceMetrics.delete(name);
  } else {
    performanceMetrics.clear();
  }
}

/**
 * Track FPS (Frames Per Second)
 * 
 * @param callback - Called with FPS metrics every second
 * @returns Function to stop tracking
 * 
 * @example
 * const stopTracking = trackFPS((metrics) => {
 *   console.log(`FPS: ${metrics.current}, Avg: ${metrics.average}`);
 * });
 * 
 * // Later...
 * stopTracking();
 */
export function trackFPS(callback: (metrics: FPSMetrics) => void): () => void {
  fpsCallbacks.add(callback);

  // Start tracking if not already started
  if (!fpsTrackingInterval) {
    startFPSTracking();
  }

  // Return cleanup function
  return () => {
    fpsCallbacks.delete(callback);
    
    // Stop tracking if no more callbacks
    if (fpsCallbacks.size === 0 && fpsTrackingInterval) {
      clearInterval(fpsTrackingInterval);
      fpsTrackingInterval = null;
    }
  };
}

/**
 * Start FPS tracking
 */
function startFPSTracking(): void {
  let lastTimestamp = performance.now();
  let frameCount = 0;
  const fpsSamples: number[] = [];
  let sampleCount = 0;

  const measureFrame = () => {
    frameCount++;
    requestAnimationFrame(measureFrame);
  };

  requestAnimationFrame(measureFrame);

  fpsTrackingInterval = setInterval(() => {
    const currentTimestamp = performance.now();
    const elapsed = (currentTimestamp - lastTimestamp) / 1000; // seconds
    const currentFPS = frameCount / elapsed;

    // Store sample
    fpsSamples.push(currentFPS);
    if (fpsSamples.length > 60) {
      fpsSamples.shift(); // Keep last 60 samples (1 minute at 1 sample/second)
    }
    sampleCount++;

    // Calculate metrics
    const average = fpsSamples.reduce((sum, fps) => sum + fps, 0) / fpsSamples.length;
    const min = Math.min(...fpsSamples);
    const max = Math.max(...fpsSamples);

    const metrics: FPSMetrics = {
      current: Math.round(currentFPS),
      average: Math.round(average),
      min: Math.round(min),
      max: Math.round(max),
      samples: sampleCount,
    };

    // Notify callbacks
    fpsCallbacks.forEach((cb) => {
      try {
        cb(metrics);
      } catch (error) {
        console.error('[Performance] Error in FPS callback:', error);
      }
    });

    // Warn if FPS is low
    if (currentFPS < 30) {
      console.warn(`[Performance] Low FPS detected: ${Math.round(currentFPS)} FPS`);
    }

    // Reset for next interval
    frameCount = 0;
    lastTimestamp = currentTimestamp;
  }, 1000);
}

/**
 * Monitor bundle size (approximation based on loaded modules)
 * Note: This is a rough estimate and may not be 100% accurate
 */
export async function monitorBundleSize(): Promise<{
  estimatedSize: number; // in bytes
  moduleCount: number;
  recommendation: string;
}> {
  // In React Native, we can't directly measure bundle size at runtime
  // This is a placeholder that would need platform-specific implementation
  // or build-time analysis

  const moduleCount = Object.keys(require.cache || {}).length;
  const estimatedSize = moduleCount * 1024; // Rough estimate: 1KB per module

  let recommendation = 'Bundle size is within acceptable range.';
  if (estimatedSize > 5 * 1024 * 1024) {
    // > 5MB
    recommendation = 'Consider code splitting and lazy loading to reduce bundle size.';
  } else if (estimatedSize > 3 * 1024 * 1024) {
    // > 3MB
    recommendation = 'Monitor bundle growth. Consider removing unused dependencies.';
  }

  return {
    estimatedSize,
    moduleCount,
    recommendation,
  };
}

/**
 * Wait for interactions to complete before executing a callback
 * Useful for deferring non-critical work until after animations
 */
export function runAfterInteractions<T>(
  callback: () => T | Promise<T>
): Promise<T> {
  return new Promise((resolve, reject) => {
    InteractionManager.runAfterInteractions(async () => {
      try {
        const result = await callback();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  });
}

/**
 * Measure time to interactive (TTI)
 * Approximation based on when main thread is idle
 */
export function measureTTI(componentName: string): () => void {
  const startTime = performance.now();
  let reported = false;

  const checkTTI = () => {
    if (reported) return;

    InteractionManager.runAfterInteractions(() => {
      if (!reported) {
        const tti = performance.now() - startTime;
        console.log(`[Performance] ${componentName} TTI: ${tti.toFixed(2)}ms`);
        reported = true;
      }
    });
  };

  // Check TTI after a short delay to ensure component is mounted
  setTimeout(checkTTI, 100);

  return () => {
    if (!reported) {
      const tti = performance.now() - startTime;
      console.log(`[Performance] ${componentName} TTI (forced): ${tti.toFixed(2)}ms`);
      reported = true;
    }
  };
}

/**
 * Debounce function for performance optimization
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function for performance optimization
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false;

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

/**
 * Get memory usage (if available)
 */
export function getMemoryUsage(): {
  jsHeapSizeLimit?: number;
  totalJSHeapSize?: number;
  usedJSHeapSize?: number;
} {
  // @ts-ignore - performance.memory is non-standard but available in some environments
  if (typeof performance !== 'undefined' && performance.memory) {
    // @ts-ignore
    return {
      // @ts-ignore
      jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
      // @ts-ignore
      totalJSHeapSize: performance.memory.totalJSHeapSize,
      // @ts-ignore
      usedJSHeapSize: performance.memory.usedJSHeapSize,
    };
  }

  return {};
}

/**
 * Log performance summary for all tracked components
 */
export function logPerformanceSummary(): void {
  console.log('\n=== Performance Summary ===');
  
  if (performanceMetrics.size === 0) {
    console.log('No performance metrics recorded');
    return;
  }

  performanceMetrics.forEach((_, name) => {
    const metrics = getPerformanceMetrics(name);
    console.log(`\n${name}:`);
    console.log(`  Count: ${metrics.count}`);
    console.log(`  Average: ${metrics.average}ms`);
    console.log(`  Min: ${metrics.min}ms`);
    console.log(`  Max: ${metrics.max}ms`);
  });

  console.log('\n========================\n');
}
