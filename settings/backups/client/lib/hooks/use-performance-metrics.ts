/**
 * Performance Metrics Hook
 * 
 * Tracks component render times, screen load times, and performance metrics.
 * Integrates with performanceMonitor service.
 * 
 * Implements FR-025, FR-027
 * 
 * @module use-performance-metrics
 */

import { useEffect, useRef, useCallback } from 'react';
import { performanceMonitor } from '@/lib/services/performance-monitor';

export interface UsePerformanceMetricsOptions {
  /** Component name for tracking */
  componentName: string;
  /** Screen name for aggregation */
  screenName: string;
  /** Enable tracking (default: true) */
  enabled?: boolean;
  /** Track on every render (default: false, only tracks mount) */
  trackEveryRender?: boolean;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

export interface PerformanceMetricsResult {
  /** Start a performance measurement */
  startMeasure: (label: string) => void;
  /** End a performance measurement */
  endMeasure: (label: string) => void;
  /** Record a custom metric */
  recordMetric: (name: string, value: number) => void;
  /** Get metrics for current screen */
  getScreenMetrics: () => {
    avgRenderTime: number;
    avgFrameDrops: number;
    totalRenders: number;
  };
}

/**
 * Hook to track component performance metrics
 * 
 * Automatically measures component mount and render times.
 * Provides utilities for custom performance measurements.
 * 
 * @example Basic usage
 * ```tsx
 * export default function MyComponent() {
 *   usePerformanceMetrics({
 *     componentName: 'MyComponent',
 *     screenName: 'HomeScreen',
 *   });
 *   
 *   return <View>...</View>;
 * }
 * ```
 * 
 * @example With custom measurements
 * ```tsx
 * export default function DataFetchingComponent() {
 *   const { startMeasure, endMeasure } = usePerformanceMetrics({
 *     componentName: 'DataFetchingComponent',
 *     screenName: 'DashboardScreen',
 *   });
 *   
 *   useEffect(() => {
 *     startMeasure('data-fetch');
 *     fetchData().finally(() => endMeasure('data-fetch'));
 *   }, []);
 *   
 *   return <View>...</View>;
 * }
 * ```
 */
export function usePerformanceMetrics(
  options: UsePerformanceMetricsOptions
): PerformanceMetricsResult {
  const {
    componentName,
    screenName,
    enabled = true,
    trackEveryRender = false,
    metadata,
  } = options;

  const mountTimeRef = useRef(Date.now());
  const renderCountRef = useRef(0);
  const measurementsRef = useRef<Map<string, number>>(new Map());

  // Track mount time on first render
  useEffect(() => {
    if (!enabled) return;

    const mountDuration = Date.now() - mountTimeRef.current;
    
    performanceMonitor.recordComponentRender(
      componentName,
      screenName,
      mountDuration,
      0, // Frame drops not tracked on mount
      {
        type: 'mount',
        renderCount: renderCountRef.current,
        ...metadata,
      }
    );
  }, []); // Only run on mount

  // Track render time on every render if enabled
  useEffect(() => {
    if (!enabled || !trackEveryRender) return;

    renderCountRef.current += 1;
    const renderDuration = Date.now() - mountTimeRef.current;

    performanceMonitor.recordComponentRender(
      componentName,
      screenName,
      renderDuration,
      0,
      {
        type: 'render',
        renderCount: renderCountRef.current,
        ...metadata,
      }
    );
  });

  // Start a custom measurement
  const startMeasure = useCallback((label: string): void => {
    if (!enabled) return;
    measurementsRef.current.set(label, Date.now());
  }, [enabled]);

  // End a custom measurement
  const endMeasure = useCallback((label: string): void => {
    if (!enabled) return;
    
    const startTime = measurementsRef.current.get(label);
    if (startTime === undefined) {
      console.warn(`[usePerformanceMetrics] No start time found for measurement: ${label}`);
      return;
    }

    const duration = Date.now() - startTime;
    measurementsRef.current.delete(label);

    performanceMonitor.recordComponentRender(
      componentName,
      screenName,
      duration,
      0,
      {
        type: 'custom',
        label,
        ...metadata,
      }
    );
  }, [enabled, componentName, screenName, metadata]);

  // Record a custom metric value
  const recordMetric = useCallback((name: string, value: number): void => {
    if (!enabled) return;

    performanceMonitor.recordComponentRender(
      componentName,
      screenName,
      value,
      0,
      {
        type: 'metric',
        metricName: name,
        ...metadata,
      }
    );
  }, [enabled, componentName, screenName, metadata]);

  // Get aggregated metrics for the screen
  const getScreenMetrics = useCallback(() => {
    return performanceMonitor.getScreenMetrics(screenName);
  }, [screenName]);

  return {
    startMeasure,
    endMeasure,
    recordMetric,
    getScreenMetrics,
  };
}

/**
 * Hook to track screen-level performance
 * 
 * Measures screen mount, render, and interaction readiness times.
 * 
 * @example
 * ```tsx
 * export default function HomeScreen() {
 *   useScreenPerformanceMetrics('HomeScreen');
 *   
 *   return <View>...</View>;
 * }
 * ```
 */
export function useScreenPerformanceMetrics(screenName: string): void {
  const mountTimeRef = useRef(Date.now());
  const [isReady, setIsReady] = React.useState(false);

  useEffect(() => {
    if (isReady) return;

    const renderTime = Date.now() - mountTimeRef.current;
    
    performanceMonitor.recordScreenPerformance(
      screenName,
      mountTimeRef.current,
      renderTime
    );

    setIsReady(true);
  }, [isReady, screenName]);
}

// React import for useState
import React from 'react';
