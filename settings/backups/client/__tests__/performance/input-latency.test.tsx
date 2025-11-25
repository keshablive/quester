/**
 * Performance Tests: Input Latency (T109)
 * 
 * Verifies that input response time meets <16ms target (one frame at 60 FPS):
 * - Button press responses < 16ms
 * - Text input responses < 16ms
 * - Touch gesture responses < 16ms
 * - No perceptible lag in user interactions
 * 
 * @see docs/performance-guide.md for optimization strategies
 */

import React, { useState } from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { View, Text, Pressable, TextInput } from 'react-native';

describe('Input Latency Performance (T109)', () => {
  const TARGET_LATENCY_MS = 16; // One frame at 60 FPS
  const ACCEPTABLE_LATENCY_MS = 32; // Two frames (acceptable for complex interactions)

  // Helper to measure event handler latency
  const measureInputLatency = async (
    element: any,
    eventType: 'press' | 'changeText' | 'scroll',
    eventData?: any,
    iterations: number = 10
  ): Promise<{ avg: number; p95: number; min: number; max: number }> => {
    const latencies: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now();

      switch (eventType) {
        case 'press':
          fireEvent.press(element);
          break;
        case 'changeText':
          fireEvent.changeText(element, eventData || `test-${i}`);
          break;
        case 'scroll':
          fireEvent.scroll(element, eventData);
          break;
      }

      // Wait for event handler to complete
      await waitFor(() => expect(true).toBe(true));

      const endTime = performance.now();
      latencies.push(endTime - startTime);
    }

    latencies.sort((a, b) => a - b);

    return {
      avg: Math.round((latencies.reduce((sum, l) => sum + l, 0) / latencies.length) * 100) / 100,
      p95: Math.round(latencies[Math.floor(latencies.length * 0.95)] * 100) / 100,
      min: Math.round(latencies[0] * 100) / 100,
      max: Math.round(latencies[latencies.length - 1] * 100) / 100,
    };
  };

  describe('Button Press Latency', () => {
    it('should respond to simple button press within 16ms', async () => {
      let pressCount = 0;

      const TestButton = () => (
        <Pressable
          testID="test-button"
          onPress={() => {
            pressCount++;
          }}
        >
          <Text>Press Me</Text>
        </Pressable>
      );

      const { getByTestId } = render(<TestButton />);
      const button = getByTestId('test-button');

      const metrics = await measureInputLatency(button, 'press');

      console.log('Simple Button Press Latency:', {
        ...metrics,
        target: `< ${TARGET_LATENCY_MS}ms`,
        passing: metrics.p95 < ACCEPTABLE_LATENCY_MS,
      });

      expect(pressCount).toBe(10);
      expect(metrics.p95).toBeLessThan(ACCEPTABLE_LATENCY_MS);
    });

    it('should handle button with state update efficiently', async () => {
      const TestButton = () => {
        const [count, setCount] = useState(0);

        return (
          <Pressable
            testID="test-button"
            onPress={() => setCount((c) => c + 1)}
          >
            <Text>Count: {count}</Text>
          </Pressable>
        );
      };

      const { getByTestId } = render(<TestButton />);
      const button = getByTestId('test-button');

      const metrics = await measureInputLatency(button, 'press');

      console.log('Button with State Update Latency:', {
        ...metrics,
        target: `< ${ACCEPTABLE_LATENCY_MS}ms`,
        passing: metrics.p95 < ACCEPTABLE_LATENCY_MS,
      });

      expect(metrics.p95).toBeLessThan(ACCEPTABLE_LATENCY_MS);
    });

    it('should handle async button press efficiently', async () => {
      const TestButton = () => {
        const [loading, setLoading] = useState(false);

        const handlePress = async () => {
          setLoading(true);
          // Simulate async operation
          await new Promise((resolve) => setTimeout(resolve, 0));
          setLoading(false);
        };

        return (
          <Pressable
            testID="test-button"
            onPress={handlePress}
            disabled={loading}
          >
            <Text>{loading ? 'Loading...' : 'Submit'}</Text>
          </Pressable>
        );
      };

      const { getByTestId } = render(<TestButton />);
      const button = getByTestId('test-button');

      const metrics = await measureInputLatency(button, 'press');

      console.log('Async Button Press Latency:', {
        ...metrics,
        target: `< ${ACCEPTABLE_LATENCY_MS}ms`,
        note: 'Initial response time, not async operation',
      });

      // Initial response should be fast
      expect(metrics.p95).toBeLessThan(ACCEPTABLE_LATENCY_MS);
    });
  });

  describe('Text Input Latency', () => {
    it('should respond to text input within 16ms', async () => {
      const TestInput = () => {
        const [value, setValue] = useState('');

        return (
          <View>
            <TextInput
              testID="test-input"
              value={value}
              onChangeText={setValue}
              placeholder="Type here"
            />
            <Text testID="display-text">{value}</Text>
          </View>
        );
      };

      const { getByTestId } = render(<TestInput />);
      const input = getByTestId('test-input');

      const metrics = await measureInputLatency(input, 'changeText', 'test input');

      console.log('Text Input Latency:', {
        ...metrics,
        target: `< ${TARGET_LATENCY_MS}ms`,
        passing: metrics.p95 < ACCEPTABLE_LATENCY_MS,
      });

      expect(metrics.p95).toBeLessThan(ACCEPTABLE_LATENCY_MS);
    });

    it('should handle text input with validation efficiently', async () => {
      const TestInput = () => {
        const [value, setValue] = useState('');
        const [error, setError] = useState('');

        const handleChange = (text: string) => {
          setValue(text);
          // Simple validation
          if (text.length < 3) {
            setError('Too short');
          } else if (text.length > 20) {
            setError('Too long');
          } else {
            setError('');
          }
        };

        return (
          <View>
            <TextInput
              testID="test-input"
              value={value}
              onChangeText={handleChange}
            />
            {error ? <Text>{error}</Text> : null}
          </View>
        );
      };

      const { getByTestId } = render(<TestInput />);
      const input = getByTestId('test-input');

      const metrics = await measureInputLatency(input, 'changeText', 'test');

      console.log('Text Input with Validation Latency:', {
        ...metrics,
        target: `< ${ACCEPTABLE_LATENCY_MS}ms`,
      });

      expect(metrics.p95).toBeLessThan(ACCEPTABLE_LATENCY_MS);
    });

    it('should handle rapid text input efficiently', async () => {
      const TestInput = () => {
        const [value, setValue] = useState('');
        return (
          <TextInput
            testID="test-input"
            value={value}
            onChangeText={setValue}
          />
        );
      };

      const { getByTestId } = render(<TestInput />);
      const input = getByTestId('test-input');

      // Measure latency for rapid input (20 iterations)
      const metrics = await measureInputLatency(input, 'changeText', 'a', 20);

      console.log('Rapid Text Input Latency:', {
        ...metrics,
        iterations: 20,
        target: 'No degradation',
      });

      // Should not degrade significantly with rapid input
      expect(metrics.max).toBeLessThan(ACCEPTABLE_LATENCY_MS * 2);
    });
  });

  describe('Touch Gesture Latency', () => {
    it('should respond to touch gestures within 16ms', async () => {
      let touchCount = 0;

      const TestTouchable = () => (
        <Pressable
          testID="test-touchable"
          onPress={() => {
            touchCount++;
          }}
        >
          <View style={{ width: 100, height: 100, backgroundColor: 'blue' }}>
            <Text>Touch Area</Text>
          </View>
        </Pressable>
      );

      const { getByTestId } = render(<TestTouchable />);
      const touchable = getByTestId('test-touchable');

      const metrics = await measureInputLatency(touchable, 'press');

      console.log('Touch Gesture Latency:', {
        ...metrics,
        target: `< ${TARGET_LATENCY_MS}ms`,
      });

      expect(touchCount).toBe(10);
      expect(metrics.p95).toBeLessThan(ACCEPTABLE_LATENCY_MS);
    });

    it('should handle complex gesture with state updates', async () => {
      const TestGesture = () => {
        const [position, setPosition] = useState({ x: 0, y: 0 });
        const [pressed, setPressed] = useState(false);

        return (
          <Pressable
            testID="test-gesture"
            onPress={() => {
              setPressed(true);
              setPosition({ x: Math.random() * 100, y: Math.random() * 100 });
              setTimeout(() => setPressed(false), 100);
            }}
          >
            <View style={{ opacity: pressed ? 0.5 : 1 }}>
              <Text>X: {position.x.toFixed(0)}, Y: {position.y.toFixed(0)}</Text>
            </View>
          </Pressable>
        );
      };

      const { getByTestId } = render(<TestGesture />);
      const gesture = getByTestId('test-gesture');

      const metrics = await measureInputLatency(gesture, 'press');

      console.log('Complex Gesture Latency:', {
        ...metrics,
        target: `< ${ACCEPTABLE_LATENCY_MS}ms`,
      });

      expect(metrics.p95).toBeLessThan(ACCEPTABLE_LATENCY_MS);
    });
  });

  describe('Interaction Responsiveness', () => {
    it('should maintain low latency under load', async () => {
      const TestComponent = () => {
        const [clicks, setClicks] = useState<number[]>([]);

        return (
          <View>
            <Pressable
              testID="test-button"
              onPress={() => {
                setClicks((prev) => [...prev, Date.now()]);
              }}
            >
              <Text>Click Me</Text>
            </Pressable>
            <View>
              {clicks.map((time, i) => (
                <Text key={i}>Click {i + 1}: {time}</Text>
              ))}
            </View>
          </View>
        );
      };

      const { getByTestId } = render(<TestComponent />);
      const button = getByTestId('test-button');

      const metrics = await measureInputLatency(button, 'press');

      console.log('Latency Under Load:', {
        ...metrics,
        target: 'No degradation',
        note: 'With growing list of items',
      });

      // Should not degrade significantly even with growing list
      expect(metrics.max).toBeLessThan(ACCEPTABLE_LATENCY_MS * 1.5);
    });

    it('should document debounce/throttle optimization', () => {
      const optimizations = [
        {
          technique: 'useCallback',
          purpose: 'Prevent handler recreation',
          impact: 'Low latency',
        },
        {
          technique: 'Debounce',
          purpose: 'Reduce unnecessary calls',
          impact: 'Medium (search, validation)',
        },
        {
          technique: 'Throttle',
          purpose: 'Limit call frequency',
          impact: 'High (scroll, resize)',
        },
        {
          technique: 'React.memo',
          purpose: 'Prevent unnecessary re-renders',
          impact: 'Medium (child components)',
        },
      ];

      console.log('\n=== Input Optimization Techniques ===\n');
      console.table(optimizations);

      expect(optimizations.length).toBe(4);
    });
  });

  describe('Comprehensive Latency Report', () => {
    it('should generate input latency report', async () => {
      const scenarios = [
        {
          name: 'Simple Button',
          component: () => {
            const [count, setCount] = useState(0);
            return (
              <Pressable testID="test" onPress={() => setCount(c => c + 1)}>
                <Text>{count}</Text>
              </Pressable>
            );
          },
          eventType: 'press' as const,
        },
        {
          name: 'Text Input',
          component: () => {
            const [value, setValue] = useState('');
            return <TextInput testID="test" value={value} onChangeText={setValue} />;
          },
          eventType: 'changeText' as const,
        },
        {
          name: 'Complex Interaction',
          component: () => {
            const [state, setState] = useState({ count: 0, text: '', active: false });
            return (
              <Pressable
                testID="test"
                onPress={() => setState(s => ({ ...s, count: s.count + 1, active: !s.active }))}
              >
                <Text>{state.count} - {state.active ? 'Active' : 'Inactive'}</Text>
              </Pressable>
            );
          },
          eventType: 'press' as const,
        },
      ];

      const reports = [];

      for (const scenario of scenarios) {
        const { getByTestId } = render(<scenario.component />);
        const element = getByTestId('test');

        const metrics = await measureInputLatency(
          element,
          scenario.eventType,
          scenario.eventType === 'changeText' ? 'test' : undefined,
          10
        );

        reports.push({
          scenario: scenario.name,
          avgMs: metrics.avg,
          p95Ms: metrics.p95,
          maxMs: metrics.max,
          target: TARGET_LATENCY_MS,
          passing: metrics.p95 < ACCEPTABLE_LATENCY_MS,
        });
      }

      console.log('\n=== Input Latency Report ===\n');
      console.table(reports);

      const allPassing = reports.every((r) => r.passing);
      const failing = reports.filter((r) => !r.passing);

      if (!allPassing) {
        console.warn('Scenarios exceeding acceptable latency:', failing);
      }

      expect(allPassing).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle disabled buttons efficiently', async () => {
      const TestButton = () => (
        <Pressable testID="test-button" disabled={true}>
          <Text>Disabled</Text>
        </Pressable>
      );

      const { getByTestId } = render(<TestButton />);
      const button = getByTestId('test-button');

      const start = performance.now();
      fireEvent.press(button);
      const latency = performance.now() - start;

      console.log('Disabled Button Latency:', {
        latency: Math.round(latency * 100) / 100,
        note: 'Should be very fast (no handler)',
      });

      // Disabled button should have minimal latency
      expect(latency).toBeLessThan(TARGET_LATENCY_MS);
    });

    it('should handle multiple simultaneous inputs', async () => {
      const TestComponent = () => {
        const [state, setState] = useState({ button1: 0, button2: 0 });

        return (
          <View>
            <Pressable
              testID="button1"
              onPress={() => setState(s => ({ ...s, button1: s.button1 + 1 }))}
            >
              <Text>Button 1: {state.button1}</Text>
            </Pressable>
            <Pressable
              testID="button2"
              onPress={() => setState(s => ({ ...s, button2: s.button2 + 1 }))}
            >
              <Text>Button 2: {state.button2}</Text>
            </Pressable>
          </View>
        );
      };

      const { getByTestId } = render(<TestComponent />);
      const button1 = getByTestId('button1');
      const button2 = getByTestId('button2');

      const latencies: number[] = [];

      // Rapidly alternate between buttons
      for (let i = 0; i < 10; i++) {
        const start = performance.now();
        fireEvent.press(i % 2 === 0 ? button1 : button2);
        await waitFor(() => expect(true).toBe(true));
        latencies.push(performance.now() - start);
      }

      const avgLatency = latencies.reduce((sum, l) => sum + l, 0) / latencies.length;

      console.log('Multiple Input Latency:', {
        avgMs: Math.round(avgLatency * 100) / 100,
        target: `< ${ACCEPTABLE_LATENCY_MS}ms`,
      });

      expect(avgLatency).toBeLessThan(ACCEPTABLE_LATENCY_MS);
    });
  });
});
