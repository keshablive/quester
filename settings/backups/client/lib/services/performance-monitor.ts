/**
 * Performance Monitoring Utility
 * 
 * Tracks component render times, frame drops, and screen-level performance metrics.
 * Integrates with analytics for production monitoring.
 * 
 * @module performance-monitor
 */

import * as React from 'react';
import { InteractionManager } from 'react-native';

export interface PerformanceMetrics {
  componentName: string;
  screenName: string;
  renderTime: number;
  frameDrops: number;
  timestamp: number;
  additionalData?: Record<string, unknown>;
}

export interface ScreenPerformance {
  screenName: string;
  mountTime: number;
  renderTime: number;
  interactionTime: number;
  timestamp: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private screenMetrics: ScreenPerformance[] = [];
  private enabled: boolean = __DEV__;
  private verboseLogging: boolean = false;

  /**
   * Enable or disable performance monitoring
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Enable or disable verbose logging (developer mode)
   */
  setVerboseLogging(verbose: boolean): void {
    this.verboseLogging = verbose;
    if (verbose) {
      console.log('[PerformanceMonitor] Verbose logging enabled');
    }
  }

  /**
   * Record a component render time
   */
  recordComponentRender(
    componentName: string,
    screenName: string,
    renderTime: number,
    frameDrops: number = 0,
    additionalData?: Record<string, unknown>
  ): void {
    if (!this.enabled) return;

    const metric: PerformanceMetrics = {
      componentName,
      screenName,
      renderTime,
      frameDrops,
      timestamp: Date.now(),
      additionalData,
    };

    this.metrics.push(metric);

    if (this.verboseLogging) {
      console.log(`[PerformanceMonitor] ${componentName} on ${screenName}:`, {
        renderTime: `${renderTime.toFixed(2)}ms`,
        frameDrops,
        additionalData,
      });
    }

    // Alert on performance issues (>1s render or >5 frame drops)
    if (renderTime > 1000 || frameDrops > 5) {
      console.warn(
        `[PerformanceMonitor] Performance issue detected in ${componentName}:`,
        { renderTime: `${renderTime.toFixed(2)}ms`, frameDrops }
      );
    }

    // Keep only last 100 metrics to prevent memory issues
    if (this.metrics.length > 100) {
      this.metrics.shift();
    }
  }

  /**
   * Record screen-level performance metrics
   */
  recordScreenPerformance(
    screenName: string,
    mountTime: number,
    renderTime: number
  ): void {
    if (!this.enabled) return;

    // Measure time until interactions are complete
    const startTime = Date.now();
    InteractionManager.runAfterInteractions(() => {
      const interactionTime = Date.now() - startTime;

      const metric: ScreenPerformance = {
        screenName,
        mountTime,
        renderTime,
        interactionTime,
        timestamp: Date.now(),
      };

      this.screenMetrics.push(metric);

      if (this.verboseLogging) {
        console.log(`[PerformanceMonitor] Screen ${screenName} loaded:`, {
          mountTime: `${mountTime.toFixed(2)}ms`,
          renderTime: `${renderTime.toFixed(2)}ms`,
          interactionTime: `${interactionTime.toFixed(2)}ms`,
          totalTime: `${(mountTime + renderTime + interactionTime).toFixed(2)}ms`,
        });
      }

      // Alert if screen takes >1s to render (SC-006)
      if (renderTime > 1000) {
        console.warn(
          `[PerformanceMonitor] Screen ${screenName} exceeded 1s render target:`,
          { renderTime: `${renderTime.toFixed(2)}ms` }
        );
      }

      // Keep only last 50 screen metrics
      if (this.screenMetrics.length > 50) {
        this.screenMetrics.shift();
      }
    });
  }

  /**
   * Get aggregated metrics for a specific screen
   */
  getScreenMetrics(screenName: string): {
    avgRenderTime: number;
    avgFrameDrops: number;
    totalRenders: number;
  } {
    const screenMetrics = this.metrics.filter(
      (m) => m.screenName === screenName
    );

    if (screenMetrics.length === 0) {
      return { avgRenderTime: 0, avgFrameDrops: 0, totalRenders: 0 };
    }

    const avgRenderTime =
      screenMetrics.reduce((sum, m) => sum + m.renderTime, 0) /
      screenMetrics.length;
    const avgFrameDrops =
      screenMetrics.reduce((sum, m) => sum + m.frameDrops, 0) /
      screenMetrics.length;

    return {
      avgRenderTime,
      avgFrameDrops,
      totalRenders: screenMetrics.length,
    };
  }

  /**
   * Get all metrics for reporting to analytics
   */
  getAllMetrics(): {
    componentMetrics: PerformanceMetrics[];
    screenMetrics: ScreenPerformance[];
  } {
    return {
      componentMetrics: [...this.metrics],
      screenMetrics: [...this.screenMetrics],
    };
  }

  /**
   * Clear all stored metrics
   */
  clearMetrics(): void {
    this.metrics = [];
    this.screenMetrics = [];
    if (this.verboseLogging) {
      console.log('[PerformanceMonitor] Metrics cleared');
    }
  }

  /**
   * Export metrics as JSON for debugging
   */
  exportMetrics(): string {
    return JSON.stringify(this.getAllMetrics(), null, 2);
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

/**
 * HOC to measure component render time
 * 
 * @example
 * ```tsx
 * export default withPerformanceMonitoring(MyComponent, 'MyComponent', 'HomeScreen');
 * ```
 */
export function withPerformanceMonitoring<P extends object>(
  Component: React.ComponentType<P>,
  componentName: string,
  screenName: string
): React.ComponentType<P> {
  const WrappedComponent: React.ComponentType<P> = (props: P) => {
    const startTime = React.useRef(Date.now());
    const [_frameDrops, _setFrameDrops] = React.useState(0);

    React.useEffect(() => {
      const renderTime = Date.now() - startTime.current;
      performanceMonitor.recordComponentRender(
        componentName,
        screenName,
        renderTime,
        _frameDrops
      );
    }, [_frameDrops]);

    return React.createElement(Component, props);
  };

  return WrappedComponent;
}

/**
 * Hook to measure screen performance
 * 
 * @example
 * ```tsx
 * export default function HomeScreen() {
 *   useScreenPerformance('HomeScreen');
 *   // ... rest of component
 * }
 * ```
 */
export function useScreenPerformance(screenName: string): void {
  const mountTime = React.useRef(Date.now());
  const [rendered, setRendered] = React.useState(false);

  React.useEffect(() => {
    if (!rendered) {
      const renderTime = Date.now() - mountTime.current;
      performanceMonitor.recordScreenPerformance(
        screenName,
        mountTime.current,
        renderTime
      );
      setRendered(true);
    }
  }, [rendered, screenName]);
}
