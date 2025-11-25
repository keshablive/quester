/**
 * Tests for usePerformanceMonitor hook (T121A)
 *
 * Provides performance monitoring capabilities:
 * - Track render times
 * - Monitor FPS (frames per second)
 * - Track memory usage
 * - Performance marks and measures
 * - Integration with performance telemetry
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { ReactNode } from 'react';
import { AccessibilityProvider } from '@/lib/hooks/use-accessibility';

// Import hook to test (will fail until implemented)
import {
  usePerformanceMonitor,
  useRenderTime,
  useFPSMonitor,
  useMemoryMonitor,
} from '@/lib/hooks/use-performance-monitor';

/**
 * Wrapper for hooks that need providers
 */
function wrapper({ children }: { children: ReactNode }) {
  return <AccessibilityProvider>{children}</AccessibilityProvider>;
}

describe('usePerformanceMonitor Hook Tests (T121A)', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock performance API
    global.performance = {
      ...global.performance,
      now: jest.fn(() => Date.now()),
      mark: jest.fn(),
      measure: jest.fn(),
      clearMarks: jest.fn(),
      clearMeasures: jest.fn(),
      getEntriesByName: jest.fn(() => []),
      getEntriesByType: jest.fn(() => []),
    } as any;
  });

  describe('useRenderTime', () => {
    it('should measure component render time', async () => {
      const { result } = renderHook(() => useRenderTime('TestComponent'), { wrapper });

      expect(result.current.renderTime).toBeGreaterThanOrEqual(0);
      expect(result.current.componentName).toBe('TestComponent');
    });

    it('should track render count', async () => {
      const { result, rerender } = renderHook(() => useRenderTime('TestComponent'), { wrapper });

      expect(result.current.renderCount).toBe(1);

      rerender();
      expect(result.current.renderCount).toBe(2);

      rerender();
      expect(result.current.renderCount).toBe(3);
    });

    it('should calculate average render time over multiple renders', async () => {
      const { result, rerender } = renderHook(() => useRenderTime('TestComponent'), { wrapper });

      // Trigger multiple renders
      for (let i = 0; i < 10; i++) {
        rerender();
      }

      expect(result.current.averageRenderTime).toBeGreaterThan(0);
      expect(result.current.renderCount).toBe(11); // Initial + 10 rerenders
    });

    it('should track slowest render time', async () => {
      const { result, rerender } = renderHook(() => useRenderTime('TestComponent'), { wrapper });

      const initialSlowest = result.current.slowestRenderTime;

      // Trigger multiple renders
      for (let i = 0; i < 5; i++) {
        rerender();
      }

      expect(result.current.slowestRenderTime).toBeGreaterThanOrEqual(initialSlowest);
    });

    it('should warn on slow renders (>16ms)', async () => {
      const consoleWarn = jest.spyOn(console, 'warn').mockImplementation();

      // Mock slow render
      (performance.now as jest.Mock).mockReturnValueOnce(0).mockReturnValueOnce(20); // 20ms render

      const { result } = renderHook(() => useRenderTime('TestComponent', { warnThreshold: 16 }), {
        wrapper,
      });

      await waitFor(() => {
        expect(consoleWarn).toHaveBeenCalledWith(expect.stringContaining('Slow render detected'));
      });

      consoleWarn.mockRestore();
    });

    it('should use performance marks for profiling', async () => {
      const { result } = renderHook(() => useRenderTime('TestComponent', { useMarks: true }), {
        wrapper,
      });

      expect(performance.mark).toHaveBeenCalledWith('TestComponent-render-start');
      expect(performance.mark).toHaveBeenCalledWith('TestComponent-render-end');
      expect(performance.measure).toHaveBeenCalled();
    });
  });

  describe('useFPSMonitor', () => {
    it('should initialize with 60 FPS', () => {
      const { result } = renderHook(() => useFPSMonitor(), { wrapper });

      expect(result.current.currentFPS).toBe(60);
      expect(result.current.isDropped).toBe(false);
    });

    it('should track FPS over time', async () => {
      const { result } = renderHook(() => useFPSMonitor(), { wrapper });

      act(() => {
        result.current.recordFrame();
        result.current.recordFrame();
        result.current.recordFrame();
      });

      expect(result.current.frameCount).toBeGreaterThan(0);
    });

    it('should detect frame drops', async () => {
      const { result } = renderHook(() => useFPSMonitor({ threshold: 60 }), { wrapper });

      // Simulate slow frames
      act(() => {
        // Mock low FPS
        (result.current as any).setFPS(45);
      });

      await waitFor(() => {
        expect(result.current.isDropped).toBe(true);
      });
    });

    it('should calculate average FPS', async () => {
      const { result } = renderHook(() => useFPSMonitor(), { wrapper });

      // Record multiple frames
      act(() => {
        for (let i = 0; i < 60; i++) {
          result.current.recordFrame();
        }
      });

      expect(result.current.averageFPS).toBeGreaterThan(0);
      expect(result.current.averageFPS).toBeLessThanOrEqual(60);
    });

    it('should track frame drops over time', async () => {
      const { result } = renderHook(() => useFPSMonitor({ threshold: 60 }), { wrapper });

      const initialDrops = result.current.frameDropCount;

      // Simulate frame drops
      act(() => {
        result.current.recordFrame();
        (result.current as any).setFPS(45); // Drop below threshold
        result.current.recordFrame();
        (result.current as any).setFPS(55); // Still below
        result.current.recordFrame();
      });

      await waitFor(() => {
        expect(result.current.frameDropCount).toBeGreaterThan(initialDrops);
      });
    });

    it('should reset FPS counter', async () => {
      const { result } = renderHook(() => useFPSMonitor(), { wrapper });

      act(() => {
        result.current.recordFrame();
        result.current.recordFrame();
        result.current.recordFrame();
      });

      expect(result.current.frameCount).toBeGreaterThan(0);

      act(() => {
        result.current.reset();
      });

      expect(result.current.frameCount).toBe(0);
      expect(result.current.currentFPS).toBe(60);
    });
  });

  describe('useMemoryMonitor', () => {
    it('should track memory usage', () => {
      const { result } = renderHook(() => useMemoryMonitor(), { wrapper });

      expect(result.current.usedMemory).toBeGreaterThanOrEqual(0);
      expect(result.current.totalMemory).toBeGreaterThan(0);
    });

    it('should calculate memory percentage', () => {
      const { result } = renderHook(() => useMemoryMonitor(), { wrapper });

      expect(result.current.memoryPercentage).toBeGreaterThanOrEqual(0);
      expect(result.current.memoryPercentage).toBeLessThanOrEqual(100);
    });

    it('should detect memory pressure', async () => {
      const { result } = renderHook(() => useMemoryMonitor({ threshold: 80 }), { wrapper });

      // Mock high memory usage
      act(() => {
        (result.current as any).setMemoryPercentage(85);
      });

      await waitFor(() => {
        expect(result.current.isHighMemory).toBe(true);
      });
    });

    it('should track peak memory usage', async () => {
      const { result } = renderHook(() => useMemoryMonitor(), { wrapper });

      const initialPeak = result.current.peakMemory;

      // Simulate memory increase
      act(() => {
        (result.current as any).updateMemory(initialPeak + 10);
      });

      await waitFor(() => {
        expect(result.current.peakMemory).toBeGreaterThan(initialPeak);
      });
    });

    it('should warn on memory leaks', async () => {
      const consoleWarn = jest.spyOn(console, 'warn').mockImplementation();

      const { result, rerender } = renderHook(() => useMemoryMonitor({ warnOnLeak: true }), {
        wrapper,
      });

      // Simulate steady memory increase (potential leak)
      for (let i = 0; i < 10; i++) {
        act(() => {
          (result.current as any).updateMemory(50 + i * 5);
        });
        rerender();
      }

      await waitFor(() => {
        expect(consoleWarn).toHaveBeenCalledWith(expect.stringContaining('Memory leak'));
      });

      consoleWarn.mockRestore();
    });
  });

  describe('usePerformanceMonitor (Combined)', () => {
    it('should provide all performance metrics', () => {
      const { result } = renderHook(() => usePerformanceMonitor('TestScreen'), { wrapper });

      expect(result.current.renderTime).toBeDefined();
      expect(result.current.fps).toBeDefined();
      expect(result.current.memory).toBeDefined();
    });

    it('should track screen performance over time', async () => {
      const { result, rerender } = renderHook(() => usePerformanceMonitor('TestScreen'), {
        wrapper,
      });

      // Trigger multiple renders
      for (let i = 0; i < 5; i++) {
        rerender();
      }

      expect(result.current.renderTime.renderCount).toBe(6); // Initial + 5 rerenders
    });

    it('should generate performance report', () => {
      const { result } = renderHook(() => usePerformanceMonitor('TestScreen'), { wrapper });

      const report = result.current.getReport();

      expect(report).toHaveProperty('screenName', 'TestScreen');
      expect(report).toHaveProperty('renderTime');
      expect(report).toHaveProperty('fps');
      expect(report).toHaveProperty('memory');
      expect(report).toHaveProperty('timestamp');
    });

    it('should send telemetry data', async () => {
      const mockSendTelemetry = jest.fn();

      const { result } = renderHook(
        () =>
          usePerformanceMonitor('TestScreen', {
            telemetry: true,
            onTelemetry: mockSendTelemetry,
          }),
        { wrapper }
      );

      // Trigger telemetry
      act(() => {
        result.current.sendTelemetry();
      });

      await waitFor(() => {
        expect(mockSendTelemetry).toHaveBeenCalled();
      });
    });

    it('should detect performance regressions', async () => {
      const { result, rerender } = renderHook(() => usePerformanceMonitor('TestScreen'), {
        wrapper,
      });

      // Establish baseline
      for (let i = 0; i < 10; i++) {
        rerender();
      }

      const baseline = result.current.renderTime.averageRenderTime;

      // Mock slow render (regression)
      (performance.now as jest.Mock).mockReturnValueOnce(0).mockReturnValueOnce(baseline * 2);

      rerender();

      await waitFor(() => {
        expect(result.current.hasRegression).toBe(true);
      });
    });

    it('should export performance data', () => {
      const { result } = renderHook(() => usePerformanceMonitor('TestScreen'), { wrapper });

      const exportData = result.current.export();

      expect(exportData).toHaveProperty('screenName');
      expect(exportData).toHaveProperty('metrics');
      expect(exportData).toHaveProperty('timestamp');
      expect(typeof exportData).toBe('object');
    });

    it('should respect performance monitoring flag', () => {
      // When monitoring is disabled, should not collect metrics
      const { result } = renderHook(() => usePerformanceMonitor('TestScreen', { enabled: false }), {
        wrapper,
      });

      expect(result.current.isMonitoring).toBe(false);
      expect(result.current.renderTime.renderCount).toBe(0);
    });
  });

  describe('Performance Marks & Measures', () => {
    it('should create performance marks', () => {
      const { result } = renderHook(() => usePerformanceMonitor('TestScreen'), { wrapper });

      act(() => {
        result.current.mark('custom-event');
      });

      expect(performance.mark).toHaveBeenCalledWith('TestScreen-custom-event');
    });

    it('should measure performance between marks', () => {
      const { result } = renderHook(() => usePerformanceMonitor('TestScreen'), { wrapper });

      act(() => {
        result.current.mark('start');
        result.current.mark('end');
        result.current.measure('operation', 'start', 'end');
      });

      expect(performance.measure).toHaveBeenCalledWith(
        'TestScreen-operation',
        'TestScreen-start',
        'TestScreen-end'
      );
    });

    it('should clear performance marks', () => {
      const { result } = renderHook(() => usePerformanceMonitor('TestScreen'), { wrapper });

      act(() => {
        result.current.mark('test');
        result.current.clearMarks();
      });

      expect(performance.clearMarks).toHaveBeenCalled();
    });

    it('should get performance entries', () => {
      const mockEntries = [
        { name: 'TestScreen-render', duration: 15 },
        { name: 'TestScreen-api-call', duration: 200 },
      ];

      (performance.getEntriesByName as jest.Mock).mockReturnValue(mockEntries);

      const { result } = renderHook(() => usePerformanceMonitor('TestScreen'), { wrapper });

      const entries = result.current.getEntries();

      expect(entries).toHaveLength(2);
      expect(entries[0]).toHaveProperty('duration', 15);
    });
  });
});
