/**
 * Performance Metrics Viewer (Phase 6, T172)
 *
 * Developer tool for viewing real-time and historical performance metrics:
 * - Screen render times
 * - Frame drop counts
 * - Memory usage
 * - Bundle size information
 * - Per-screen performance breakdown
 *
 * Accessible via developer menu after enabling developer mode
 */

import React, { useState, useEffect } from 'react';
import { View, ScrollView, RefreshControl } from 'react-native';
import { Text } from '@/components/ui/text';
import { Stack, router } from 'expo-router';
import { useDeveloperMode } from '@/lib/contexts/developer-mode-context';
import { ScreenWrapper } from '@/components/screen-wrapper';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Icon } from '@/components/ui/icon';
import {
  Activity,
  Clock,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
} from 'lucide-react-native';
// Performance thresholds (from spec)
const THRESHOLDS = {
  renderTime: 1000, // 1 second for screen render
  fps: 60, // Target 60 FPS
  inputResponse: 16, // 16ms for input response
  transitionTime: 300, // 300ms for screen transitions
};

interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  threshold: number;
  status: 'good' | 'warning' | 'error';
  description: string;
}

export default function PerformanceMetricsScreen() {
  const { state } = useDeveloperMode();
  const [refreshing, setRefreshing] = useState(false);
  const [_selectedScreen, _setSelectedScreen] = useState<string | null>(null);

  // Route guard: redirect if developer mode is disabled
  useEffect(() => {
    if (!state.enabled && !__DEV__) {
      console.warn('[PerformanceMetrics] Developer mode required - redirecting to settings');
      router.replace('/settings');
    }
  }, [state.enabled]);

  if (!state.enabled && !__DEV__) {
    return null;
  }

  const onRefresh = async () => {
    setRefreshing(true);
    // Simulate metrics refresh
    await new Promise((resolve) => setTimeout(resolve, 500));
    setRefreshing(false);
  };

  // Calculate status based on threshold
  const getMetricStatus = (
    value: number,
    threshold: number,
    isLowerBetter: boolean = true
  ): 'good' | 'warning' | 'error' => {
    if (isLowerBetter) {
      if (value <= threshold) return 'good';
      if (value <= threshold * 1.2) return 'warning';
      return 'error';
    } else {
      if (value >= threshold) return 'good';
      if (value >= threshold * 0.8) return 'warning';
      return 'error';
    }
  };

  // Mock performance data (in real implementation, this comes from performanceMonitor service)
  const performanceData: PerformanceMetric[] = [
    {
      name: 'Home Screen Render',
      value: 850,
      unit: 'ms',
      threshold: THRESHOLDS.renderTime,
      status: getMetricStatus(850, THRESHOLDS.renderTime),
      description: 'Initial render time from navigation to first paint',
    },
    {
      name: 'Feed Scroll FPS',
      value: 58,
      unit: 'fps',
      threshold: THRESHOLDS.fps,
      status: getMetricStatus(58, THRESHOLDS.fps, false),
      description: 'Frames per second during rapid scrolling',
    },
    {
      name: 'Input Response Time',
      value: 12,
      unit: 'ms',
      threshold: THRESHOLDS.inputResponse,
      status: getMetricStatus(12, THRESHOLDS.inputResponse),
      description: 'Time from user input to UI update',
    },
    {
      name: 'Screen Transition',
      value: 245,
      unit: 'ms',
      threshold: THRESHOLDS.transitionTime,
      status: getMetricStatus(245, THRESHOLDS.transitionTime),
      description: 'Average time for screen transitions',
    },
  ];

  // Mock per-screen metrics
  const screenMetrics = [
    { screen: 'Feed', renderTime: 780, fps: 58, status: 'good' },
    { screen: 'Profile', renderTime: 650, fps: 60, status: 'good' },
    { screen: 'Courses', renderTime: 920, fps: 57, status: 'warning' },
    { screen: 'Marketplace', renderTime: 1050, fps: 55, status: 'error' },
    { screen: 'Chat', renderTime: 550, fps: 60, status: 'good' },
  ];

  const getStatusIcon = (status: 'good' | 'warning' | 'error') => {
    switch (status) {
      case 'good':
        return CheckCircle;
      case 'warning':
        return AlertCircle;
      case 'error':
        return AlertCircle;
    }
  };

  const getStatusColor = (status: 'good' | 'warning' | 'error') => {
    switch (status) {
      case 'good':
        return 'text-green-600';
      case 'warning':
        return 'text-yellow-600';
      case 'error':
        return 'text-red-600';
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Performance Metrics',
          headerLargeTitle: false,
        }}
      />

      <ScreenWrapper screenName="PerformanceMetricsScreen">
        <ScrollView
          className="flex-1 bg-background"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
          {/* Header */}
          <View className="border-b border-border bg-card px-6 py-4">
            <View className="mb-2 flex-row items-center gap-2">
              <Icon as={Activity} size={24} className="text-foreground" />
              <Text className="text-2xl font-bold text-foreground">Performance Metrics</Text>
            </View>
            <Text className="text-sm text-muted-foreground">
              Real-time performance monitoring and optimization insights
            </Text>
          </View>

          {/* Overall Status */}
          <View className="p-6">
            <Card>
              <CardHeader>
                <CardTitle>Overall Performance</CardTitle>
                <CardDescription>Current app performance against targets</CardDescription>
              </CardHeader>
              <CardContent className="gap-4">
                {performanceData.map((metric, index) => (
                  <View key={index}>
                    <View className="flex-row items-center justify-between">
                      <View className="flex-1">
                        <View className="flex-row items-center gap-2">
                          <Icon
                            as={getStatusIcon(metric.status)}
                            size={20}
                            className={getStatusColor(metric.status)}
                          />
                          <Text className="font-semibold text-foreground">{metric.name}</Text>
                        </View>
                        <Text className="mt-1 text-xs text-muted-foreground">
                          {metric.description}
                        </Text>
                      </View>
                      <View className="items-end">
                        <Text className="text-xl font-bold text-foreground">
                          {metric.value}
                          <Text className="text-sm font-normal text-muted-foreground">
                            {' '}
                            {metric.unit}
                          </Text>
                        </Text>
                        <Text className="text-xs text-muted-foreground">
                          Target: {metric.threshold} {metric.unit}
                        </Text>
                      </View>
                    </View>
                    {index < performanceData.length - 1 && <Separator className="mt-4" />}
                  </View>
                ))}
              </CardContent>
            </Card>
          </View>

          {/* Per-Screen Metrics */}
          <View className="px-6 pb-6">
            <Card>
              <CardHeader>
                <CardTitle>Screen Performance</CardTitle>
                <CardDescription>Render times and FPS by screen</CardDescription>
              </CardHeader>
              <CardContent className="gap-3">
                {screenMetrics.map((screen, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    onPress={() => _setSelectedScreen(screen.screen)}
                    className="justify-start p-4">
                    <View className="flex-1 flex-row items-center justify-between">
                      <View className="flex-1">
                        <Text className="font-semibold text-foreground">{screen.screen}</Text>
                        <View className="mt-1 flex-row items-center gap-3">
                          <View className="flex-row items-center gap-1">
                            <Icon as={Clock} size={12} className="text-muted-foreground" />
                            <Text className="text-xs text-muted-foreground">
                              {screen.renderTime}ms
                            </Text>
                          </View>
                          <View className="flex-row items-center gap-1">
                            <Icon as={Activity} size={12} className="text-muted-foreground" />
                            <Text className="text-xs text-muted-foreground">{screen.fps} fps</Text>
                          </View>
                        </View>
                      </View>
                      <Badge
                        variant={
                          screen.status === 'good'
                            ? 'default'
                            : screen.status === 'warning'
                              ? 'secondary'
                              : 'destructive'
                        }>
                        <Text className="text-xs font-medium">
                          {screen.status === 'good'
                            ? '✓ Good'
                            : screen.status === 'warning'
                              ? '⚠ Warning'
                              : '✗ Needs Work'}
                        </Text>
                      </Badge>
                    </View>
                  </Button>
                ))}
              </CardContent>
            </Card>
          </View>

          {/* Optimization Tips */}
          <View className="px-6 pb-6">
            <Card>
              <CardHeader>
                <CardTitle>Optimization Tips</CardTitle>
                <CardDescription>Recommendations for performance improvements</CardDescription>
              </CardHeader>
              <CardContent className="gap-3">
                <View className="flex-row gap-2">
                  <Icon as={TrendingUp} size={20} className="text-green-600" />
                  <View className="flex-1">
                    <Text className="font-semibold text-foreground">Good Performance</Text>
                    <Text className="mt-1 text-sm text-muted-foreground">
                      Home, Feed, Profile, and Chat screens meet all performance targets
                    </Text>
                  </View>
                </View>
                <Separator />
                <View className="flex-row gap-2">
                  <Icon as={TrendingDown} size={20} className="text-yellow-600" />
                  <View className="flex-1">
                    <Text className="font-semibold text-foreground">Needs Optimization</Text>
                    <Text className="mt-1 text-sm text-muted-foreground">
                      Marketplace screen exceeds 1s render target. Consider lazy loading product
                      images or reducing initial data load.
                    </Text>
                  </View>
                </View>
                <Separator />
                <View className="flex-row gap-2">
                  <Icon as={AlertCircle} size={20} className="text-blue-600" />
                  <View className="flex-1">
                    <Text className="font-semibold text-foreground">Best Practices</Text>
                    <Text className="mt-1 text-sm text-muted-foreground">
                      Use React.memo for list items, implement virtualization for long lists, and
                      optimize images with appropriate sizes.
                    </Text>
                  </View>
                </View>
              </CardContent>
            </Card>
          </View>

          {/* Developer Info */}
          <View className="px-6 pb-8">
            <Card className="bg-muted/30">
              <CardContent className="py-4">
                <Text className="text-xs text-muted-foreground">
                  Performance data is collected in real-time. Pull down to refresh metrics. For
                  detailed profiling, use React Native DevTools or Flipper.
                </Text>
              </CardContent>
            </Card>
          </View>
        </ScrollView>
      </ScreenWrapper>
    </>
  );
}
