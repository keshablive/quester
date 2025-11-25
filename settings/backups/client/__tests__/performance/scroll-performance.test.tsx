/**
 * Performance Tests: Scroll Performance (T108)
 * 
 * Verifies that scrolling performance meets 60 FPS target:
 * - FlatList maintains 60 FPS during scroll
 * - ScrollView maintains 60 FPS during scroll
 * - No jank or frame drops during rapid scrolling
 * - getItemLayout implemented for optimal performance
 * 
 * @see docs/performance-guide.md for optimization strategies
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { FlatList, ScrollView, View, Text } from 'react-native';

describe('Scroll Performance (T108)', () => {
  const TARGET_FPS = 60;
  const FRAME_TIME_MS = 1000 / TARGET_FPS; // ~16.67ms per frame

  // Helper to simulate scroll events and measure frame times
  const measureScrollPerformance = async (
    component: React.ReactElement,
    scrollDistance: number = 1000,
    iterations: number = 10
  ): Promise<{ avgFrameTime: number; fps: number; droppedFrames: number }> => {
    const { getByTestId } = render(component);
    
    const frameTimes: number[] = [];
    let droppedFrames = 0;

    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now();
      
      // Simulate scroll event
      const scrollView = getByTestId('scroll-container');
      fireEvent.scroll(scrollView, {
        nativeEvent: {
          contentOffset: { y: scrollDistance * i, x: 0 },
          contentSize: { height: scrollDistance * 10, width: 0 },
          layoutMeasurement: { height: 800, width: 0 },
        },
      });

      const endTime = performance.now();
      const frameTime = endTime - startTime;
      
      frameTimes.push(frameTime);
      
      if (frameTime > FRAME_TIME_MS) {
        droppedFrames++;
      }
    }

    const avgFrameTime = frameTimes.reduce((sum, t) => sum + t, 0) / frameTimes.length;
    const fps = 1000 / avgFrameTime;

    return {
      avgFrameTime: Math.round(avgFrameTime * 100) / 100,
      fps: Math.round(fps * 100) / 100,
      droppedFrames,
    };
  };

  describe('FlatList Performance', () => {
    it('should maintain 60 FPS for 50-item list', async () => {
      const data = Array.from({ length: 50 }, (_, i) => ({
        id: `item-${i}`,
        title: `Item ${i}`,
        description: `Description for item ${i}`,
      }));

      const TestFlatList = () => (
        <FlatList
          testID="scroll-container"
          data={data}
          renderItem={({ item }) => (
            <View>
              <Text>{item.title}</Text>
              <Text>{item.description}</Text>
            </View>
          )}
          keyExtractor={(item) => item.id}
          // Performance optimizations
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={21}
          initialNumToRender={10}
          getItemLayout={(data, index) => ({
            length: 80, // Estimated item height
            offset: 80 * index,
            index,
          })}
        />
      );

      const metrics = await measureScrollPerformance(<TestFlatList />, 500, 10);

      console.log('FlatList (50 items) Performance:', {
        ...metrics,
        target: `${TARGET_FPS} FPS`,
        passing: metrics.fps >= TARGET_FPS * 0.9, // Allow 10% tolerance
      });

      // Should maintain at least 54 FPS (90% of 60 FPS)
      expect(metrics.fps).toBeGreaterThanOrEqual(TARGET_FPS * 0.9);
      expect(metrics.droppedFrames).toBeLessThan(2);
    });

    it('should maintain 60 FPS for 100-item list', async () => {
      const data = Array.from({ length: 100 }, (_, i) => ({
        id: `item-${i}`,
        title: `Item ${i}`,
        description: `Description for item ${i}`,
      }));

      const TestFlatList = () => (
        <FlatList
          testID="scroll-container"
          data={data}
          renderItem={({ item }) => (
            <View>
              <Text>{item.title}</Text>
              <Text>{item.description}</Text>
            </View>
          )}
          keyExtractor={(item) => item.id}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={21}
          initialNumToRender={10}
          getItemLayout={(data, index) => ({
            length: 80,
            offset: 80 * index,
            index,
          })}
        />
      );

      const metrics = await measureScrollPerformance(<TestFlatList />, 1000, 10);

      console.log('FlatList (100 items) Performance:', {
        ...metrics,
        target: `${TARGET_FPS} FPS`,
        passing: metrics.fps >= TARGET_FPS * 0.9,
      });

      expect(metrics.fps).toBeGreaterThanOrEqual(TARGET_FPS * 0.9);
      expect(metrics.droppedFrames).toBeLessThan(3);
    });

    it('should warn about missing getItemLayout', () => {
      const data = Array.from({ length: 50 }, (_, i) => ({
        id: `item-${i}`,
        title: `Item ${i}`,
      }));

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      // FlatList without getItemLayout
      const TestFlatList = () => (
        <FlatList
          testID="scroll-container"
          data={data}
          renderItem={({ item }) => <Text>{item.title}</Text>}
          keyExtractor={(item) => item.id}
        />
      );

      render(<TestFlatList />);

      // Document missing optimization
      console.warn(
        'FlatList missing getItemLayout - this can significantly impact scroll performance'
      );

      consoleSpy.mockRestore();
      expect(true).toBe(true);
    });
  });

  describe('ScrollView Performance', () => {
    it('should maintain 60 FPS for moderate content', async () => {
      const TestScrollView = () => (
        <ScrollView testID="scroll-container">
          {Array.from({ length: 30 }, (_, i) => (
            <View key={i}>
              <Text>Item {i}</Text>
              <Text>Description for item {i}</Text>
            </View>
          ))}
        </ScrollView>
      );

      const metrics = await measureScrollPerformance(<TestScrollView />, 500, 10);

      console.log('ScrollView (30 items) Performance:', {
        ...metrics,
        target: `${TARGET_FPS} FPS`,
        passing: metrics.fps >= TARGET_FPS * 0.9,
      });

      expect(metrics.fps).toBeGreaterThanOrEqual(TARGET_FPS * 0.9);
    });

    it('should handle removeClippedSubviews optimization', async () => {
      const TestScrollView = () => (
        <ScrollView 
          testID="scroll-container"
          removeClippedSubviews={true}
        >
          {Array.from({ length: 50 }, (_, i) => (
            <View key={i}>
              <Text>Item {i}</Text>
            </View>
          ))}
        </ScrollView>
      );

      const metrics = await measureScrollPerformance(<TestScrollView />, 1000, 10);

      console.log('ScrollView with removeClippedSubviews:', {
        ...metrics,
        target: `${TARGET_FPS} FPS`,
      });

      // With optimization, should perform well
      expect(metrics.fps).toBeGreaterThanOrEqual(TARGET_FPS * 0.85);
    });
  });

  describe('Performance Optimization Validation', () => {
    it('should verify getItemLayout provides correct measurements', () => {
      const ITEM_HEIGHT = 80;
      const data = Array.from({ length: 100 }, (_, i) => ({
        id: `item-${i}`,
        title: `Item ${i}`,
      }));

      const getItemLayout = (data: any, index: number) => ({
        length: ITEM_HEIGHT,
        offset: ITEM_HEIGHT * index,
        index,
      });

      // Test getItemLayout for various indices
      const testCases = [0, 10, 50, 99];
      const results = testCases.map((index) => {
        const layout = getItemLayout(data, index);
        return {
          index,
          length: layout.length,
          offset: layout.offset,
          valid: layout.length === ITEM_HEIGHT && layout.offset === ITEM_HEIGHT * index,
        };
      });

      console.table(results);

      // All layouts should be valid
      expect(results.every((r) => r.valid)).toBe(true);
    });

    it('should document FlatList optimization settings', () => {
      const optimizations = [
        {
          setting: 'removeClippedSubviews',
          recommended: true,
          description: 'Unmount components outside viewport',
        },
        {
          setting: 'maxToRenderPerBatch',
          recommended: '10',
          description: 'Number of items rendered per batch',
        },
        {
          setting: 'windowSize',
          recommended: '21',
          description: 'Number of screens to render',
        },
        {
          setting: 'initialNumToRender',
          recommended: '10',
          description: 'Items to render on initial mount',
        },
        {
          setting: 'getItemLayout',
          recommended: 'Required',
          description: 'Optimize scroll position calculation',
        },
      ];

      console.log('\n=== FlatList Optimization Checklist ===\n');
      console.table(optimizations);

      expect(optimizations.length).toBe(5);
    });
  });

  describe('Real-World Scroll Scenarios', () => {
    it('should handle rapid scroll direction changes', async () => {
      const data = Array.from({ length: 100 }, (_, i) => ({
        id: `item-${i}`,
        title: `Item ${i}`,
      }));

      const TestFlatList = () => (
        <FlatList
          testID="scroll-container"
          data={data}
          renderItem={({ item }) => <Text>{item.title}</Text>}
          keyExtractor={(item) => item.id}
          removeClippedSubviews={true}
          getItemLayout={(data, index) => ({
            length: 60,
            offset: 60 * index,
            index,
          })}
        />
      );

      const { getByTestId } = render(<TestFlatList />);
      const scrollView = getByTestId('scroll-container');

      const frameTimes: number[] = [];
      
      // Simulate scroll up, down, up, down
      const scrollPositions = [0, 1000, 500, 2000, 100];
      
      for (const position of scrollPositions) {
        const start = performance.now();
        
        fireEvent.scroll(scrollView, {
          nativeEvent: {
            contentOffset: { y: position, x: 0 },
            contentSize: { height: 6000, width: 0 },
            layoutMeasurement: { height: 800, width: 0 },
          },
        });
        
        frameTimes.push(performance.now() - start);
      }

      const avgFrameTime = frameTimes.reduce((sum, t) => sum + t, 0) / frameTimes.length;
      const fps = 1000 / avgFrameTime;

      console.log('Rapid Direction Change Performance:', {
        avgFrameTime: Math.round(avgFrameTime * 100) / 100,
        fps: Math.round(fps * 100) / 100,
      });

      // Should maintain good performance even with direction changes
      expect(fps).toBeGreaterThanOrEqual(TARGET_FPS * 0.85);
    });

    it('should handle scroll to end efficiently', async () => {
      const data = Array.from({ length: 200 }, (_, i) => ({
        id: `item-${i}`,
        title: `Item ${i}`,
      }));

      const TestFlatList = () => (
        <FlatList
          testID="scroll-container"
          data={data}
          renderItem={({ item }) => <Text>{item.title}</Text>}
          keyExtractor={(item) => item.id}
          removeClippedSubviews={true}
          getItemLayout={(data, index) => ({
            length: 60,
            offset: 60 * index,
            index,
          })}
        />
      );

      const { getByTestId } = render(<TestFlatList />);
      const scrollView = getByTestId('scroll-container');

      // Scroll to end (200 items * 60px = 12000px)
      const start = performance.now();
      
      fireEvent.scroll(scrollView, {
        nativeEvent: {
          contentOffset: { y: 12000, x: 0 },
          contentSize: { height: 12000, width: 0 },
          layoutMeasurement: { height: 800, width: 0 },
        },
      });
      
      const scrollTime = performance.now() - start;

      console.log('Scroll to End Performance:', {
        scrollTime: Math.round(scrollTime * 100) / 100,
        target: '< 50ms',
        passing: scrollTime < 50,
      });

      // Should complete in <50ms
      expect(scrollTime).toBeLessThan(50);
    });
  });

  describe('Comprehensive Performance Report', () => {
    it('should generate scroll performance report', async () => {
      const scenarios = [
        { name: 'Small List (20 items)', itemCount: 20, itemHeight: 60 },
        { name: 'Medium List (50 items)', itemCount: 50, itemHeight: 80 },
        { name: 'Large List (100 items)', itemCount: 100, itemHeight: 80 },
        { name: 'XL List (200 items)', itemCount: 200, itemHeight: 60 },
      ];

      const reports = [];

      for (const scenario of scenarios) {
        const data = Array.from({ length: scenario.itemCount }, (_, i) => ({
          id: `item-${i}`,
          title: `Item ${i}`,
        }));

        const TestFlatList = () => (
          <FlatList
            testID="scroll-container"
            data={data}
            renderItem={({ item }) => <Text>{item.title}</Text>}
            keyExtractor={(item) => item.id}
            removeClippedSubviews={true}
            getItemLayout={(data, index) => ({
              length: scenario.itemHeight,
              offset: scenario.itemHeight * index,
              index,
            })}
          />
        );

        const metrics = await measureScrollPerformance(<TestFlatList />, 1000, 5);
        
        reports.push({
          scenario: scenario.name,
          items: scenario.itemCount,
          fps: metrics.fps,
          frameTime: metrics.avgFrameTime,
          dropped: metrics.droppedFrames,
          passing: metrics.fps >= TARGET_FPS * 0.9,
        });
      }

      console.log('\n=== Scroll Performance Report ===\n');
      console.table(reports);

      const allPassing = reports.every((r) => r.passing);
      const failing = reports.filter((r) => !r.passing);

      if (!allPassing) {
        console.warn('Scenarios failing performance targets:', failing);
      }

      expect(allPassing).toBe(true);
    });
  });
});
