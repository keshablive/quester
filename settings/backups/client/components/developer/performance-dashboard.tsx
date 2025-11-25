/**
 * Performance Dashboard Component
 *
 * Developer tool for monitoring app performance metrics.
 * Displays aggregated render times, frame drops, and screen-level metrics.
 *
 * Phase 5, T130: Performance dashboard view in developer menu
 *
 * @module performance-dashboard
 */

import React, { useState, useEffect } from 'react';
import { View, ScrollView, RefreshControl } from 'react-native';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { performanceMonitor } from '@/lib/services/performance-monitor';
import { getAllEnhancedMetrics, clearEnhancedMetrics } from '@/lib/hooks/use-performance-monitor';
import { Activity, Zap, TrendingUp, AlertCircle, Gauge } from 'lucide-react-native';
import { Icon } from '@/components/ui/icon';

interface ScreenMetrics {
  screenName: string;
  avgRenderTime: number;
  avgFrameDrops: number;
  totalRenders: number;
}

export function PerformanceDashboard() {
  const [metrics, setMetrics] = useState<ScreenMetrics[]>([]);
  const [enhancedMetrics, setEnhancedMetrics] = useState(new Map());
  const [refreshing, setRefreshing] = useState(false);

  const loadMetrics = () => {
    // Get metrics for all known screens
    const screens = [
      'FeedScreen',
      'ProfileScreen',
      'CoursesScreen',
      'MarketplaceScreen',
      'HomeScreen',
      'NotificationsScreen',
      'BadgesScreen',
    ];

    const screenMetrics = screens
      .map((screenName) => ({
        screenName,
        ...performanceMonitor.getScreenMetrics(screenName),
      }))
      .filter((m) => m.totalRenders > 0); // Only show screens with data

    setMetrics(screenMetrics);

    // Load enhanced FPS metrics
    setEnhancedMetrics(new Map(getAllEnhancedMetrics()));
  };

  useEffect(() => {
    loadMetrics();

    // Auto-refresh enhanced metrics every second
    const interval = setInterval(() => {
      setEnhancedMetrics(new Map(getAllEnhancedMetrics()));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadMetrics();
    setTimeout(() => setRefreshing(false), 500);
  };

  const handleClearMetrics = () => {
    performanceMonitor.clearMetrics();
    clearEnhancedMetrics();
    loadMetrics();
  };

  const handleExportMetrics = () => {
    const json = performanceMonitor.exportMetrics();
    console.log('[PerformanceDashboard] Exported metrics:');
    console.log(json);
    // In a real app, could share via Share API or save to file
  };

  const getPerformanceStatus = (avgRenderTime: number, avgFrameDrops: number) => {
    if (avgRenderTime > 1000 || avgFrameDrops > 5) {
      return { label: 'Poor', variant: 'destructive' as const, color: '#ef4444' };
    }
    if (avgRenderTime > 500 || avgFrameDrops > 2) {
      return { label: 'Fair', variant: 'secondary' as const, color: '#f59e0b' };
    }
    return { label: 'Good', variant: 'default' as const, color: '#10b981' };
  };

  const totalRenders = metrics.reduce((sum, m) => sum + m.totalRenders, 0);
  const avgRenderTime =
    metrics.length > 0 ? metrics.reduce((sum, m) => sum + m.avgRenderTime, 0) / metrics.length : 0;
  const avgFrameDrops =
    metrics.length > 0 ? metrics.reduce((sum, m) => sum + m.avgFrameDrops, 0) / metrics.length : 0;

  // Calculate overall FPS from enhanced metrics
  const enhancedMetricsArray = Array.from(enhancedMetrics.values());
  const avgFps =
    enhancedMetricsArray.length > 0
      ? Math.round(
          enhancedMetricsArray.reduce((sum: number, m: any) => sum + m.averageFps, 0) /
            enhancedMetricsArray.length
        )
      : 0;

  return (
    <ScrollView
      className="flex-1 bg-background"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}>
      <View className="gap-4 p-4">
        {/* Header */}
        <View>
          <Text variant="h1" className="text-foreground">
            Performance Dashboard
          </Text>
          <Text variant="small" className="mt-1 text-muted-foreground">
            Real-time app performance metrics
          </Text>
        </View>

        {/* Summary Cards */}
        <View className="flex-row gap-3">
          <Card className="flex-1">
            <CardContent className="items-center justify-center py-4">
              <Icon as={Activity} size={24} className="mb-2 text-primary" />
              <Text variant="h2" className="text-foreground">
                {totalRenders}
              </Text>
              <Text variant="small" className="text-muted-foreground">
                Total Renders
              </Text>
            </CardContent>
          </Card>

          <Card className="flex-1">
            <CardContent className="items-center justify-center py-4">
              <Icon as={Zap} size={24} className="mb-2 text-primary" />
              <Text variant="h2" className="text-foreground">
                {avgRenderTime.toFixed(0)}ms
              </Text>
              <Text variant="small" className="text-muted-foreground">
                Avg Render Time
              </Text>
            </CardContent>
          </Card>

          <Card className="flex-1">
            <CardContent className="items-center justify-center py-4">
              <Icon as={TrendingUp} size={24} className="mb-2 text-primary" />
              <Text variant="h2" className="text-foreground">
                {avgFrameDrops.toFixed(1)}
              </Text>
              <Text variant="small" className="text-muted-foreground">
                Avg Frame Drops
              </Text>
            </CardContent>
          </Card>
        </View>

        {/* Enhanced FPS Monitoring Card */}
        {avgFps > 0 && (
          <Card>
            <CardHeader>
              <View className="flex-row items-center gap-2">
                <Icon as={Gauge} size={20} className="text-primary" />
                <CardTitle>Real-Time FPS (T124-T130)</CardTitle>
              </View>
              <CardDescription>Frame rate monitoring across active screens</CardDescription>
            </CardHeader>
            <CardContent>
              <View className="gap-3">
                <View className="items-center py-4">
                  <Text
                    className={`text-5xl font-bold ${avgFps >= 58 ? 'text-green-500' : avgFps >= 50 ? 'text-yellow-500' : 'text-red-500'}`}>
                    {avgFps}
                  </Text>
                  <Text variant="small" className="mt-1 text-muted-foreground">
                    Average FPS
                  </Text>
                  <View className="mt-2 w-full">
                    <View className="h-3 w-full overflow-hidden rounded-full bg-gray-200">
                      <View
                        className={`h-full ${avgFps >= 58 ? 'bg-green-500' : avgFps >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                        style={{ width: `${(avgFps / 60) * 100}%` }}
                      />
                    </View>
                    <View className="mt-1 flex-row justify-between">
                      <Text variant="small" className="text-muted-foreground">
                        0
                      </Text>
                      <Text variant="small" className="font-medium">
                        Target: 60 FPS
                      </Text>
                      <Text variant="small" className="text-muted-foreground">
                        60
                      </Text>
                    </View>
                  </View>
                </View>
                <Separator />
                <View className="flex-row justify-around">
                  <View className="items-center">
                    <Badge variant={avgFps >= 58 ? 'default' : 'secondary'}>
                      <Text variant="small">Excellent: ≥58</Text>
                    </Badge>
                  </View>
                  <View className="items-center">
                    <Badge variant={avgFps >= 50 && avgFps < 58 ? 'default' : 'secondary'}>
                      <Text variant="small">Good: ≥50</Text>
                    </Badge>
                  </View>
                  <View className="items-center">
                    <Badge variant={avgFps < 50 ? 'destructive' : 'secondary'}>
                      <Text variant="small">Poor: &lt;50</Text>
                    </Badge>
                  </View>
                </View>
              </View>
            </CardContent>
          </Card>
        )}

        {/* Performance Targets */}
        <Card>
          <CardHeader>
            <CardTitle>Performance Targets</CardTitle>
            <CardDescription>Success criteria from FR-016, SC-005, SC-006</CardDescription>
          </CardHeader>
          <CardContent className="gap-2">
            <View className="flex-row items-center justify-between">
              <Text variant="small" className="text-muted-foreground">
                Render Time Target
              </Text>
              <View className="flex-row items-center gap-2">
                <Text variant="small" className="font-medium">
                  &lt;1000ms
                </Text>
                {avgRenderTime < 1000 ? (
                  <Badge variant="default">
                    <Text variant="small">✓ Pass</Text>
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    <Text variant="small">✗ Fail</Text>
                  </Badge>
                )}
              </View>
            </View>
            <Separator />
            <View className="flex-row items-center justify-between">
              <Text variant="small" className="text-muted-foreground">
                Frame Rate Target
              </Text>
              <View className="flex-row items-center gap-2">
                <Text variant="small" className="font-medium">
                  60 FPS
                </Text>
                {avgFrameDrops < 5 ? (
                  <Badge variant="default">
                    <Text variant="small">✓ Pass</Text>
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    <Text className="text-xs">✗ Fail</Text>
                  </Badge>
                )}
              </View>
            </View>
          </CardContent>
        </Card>

        {/* Per-Screen Metrics */}
        <Card>
          <CardHeader>
            <CardTitle>Screen Performance</CardTitle>
            <CardDescription>{metrics.length} screens with performance data</CardDescription>
          </CardHeader>
          <CardContent className="gap-3">
            {metrics.length === 0 ? (
              <View className="items-center py-8">
                <Icon as={AlertCircle} size={48} className="mb-2 text-muted-foreground" />
                <Text className="text-center text-muted-foreground">No performance data yet</Text>
                <Text className="mt-1 text-center text-xs text-muted-foreground">
                  Navigate through the app to collect metrics
                </Text>
              </View>
            ) : (
              metrics.map((metric, index) => {
                const status = getPerformanceStatus(metric.avgRenderTime, metric.avgFrameDrops);
                const enhanced = enhancedMetrics.get(metric.screenName);

                return (
                  <View key={metric.screenName}>
                    {index > 0 && <Separator className="my-2" />}
                    <View className="gap-2">
                      <View className="flex-row items-center justify-between">
                        <Text className="font-medium text-foreground">
                          {metric.screenName.replace('Screen', '')}
                        </Text>
                        <Badge variant={status.variant}>
                          <Text className="text-xs">{status.label}</Text>
                        </Badge>
                      </View>
                      <View className="flex-row gap-4">
                        <View className="flex-1">
                          <Text className="text-xs text-muted-foreground">Avg Render</Text>
                          <Text className="text-sm font-medium">
                            {metric.avgRenderTime.toFixed(1)}ms
                          </Text>
                        </View>
                        <View className="flex-1">
                          <Text className="text-xs text-muted-foreground">Frame Drops</Text>
                          <Text className="text-sm font-medium">
                            {metric.avgFrameDrops.toFixed(1)}
                          </Text>
                        </View>
                        <View className="flex-1">
                          <Text className="text-xs text-muted-foreground">Renders</Text>
                          <Text className="text-sm font-medium">{metric.totalRenders}</Text>
                        </View>
                      </View>
                      {enhanced && (
                        <View className="mt-2 gap-1 rounded-md bg-primary/10 p-2">
                          <View className="flex-row items-center justify-between">
                            <Text className="text-xs text-muted-foreground">Current FPS</Text>
                            <Text
                              className={`text-sm font-bold ${enhanced.averageFps >= 50 ? 'text-green-600' : 'text-red-600'}`}>
                              {enhanced.averageFps} fps
                            </Text>
                          </View>
                          {enhanced.warnings.length > 0 && (
                            <View className="mt-1">
                              <Text className="text-xs text-yellow-600">
                                ⚠️ {enhanced.warnings[0]}
                              </Text>
                            </View>
                          )}
                        </View>
                      )}
                    </View>
                  </View>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <View className="gap-3">
          <Button onPress={handleRefresh} variant="outline">
            <Text>Refresh Metrics</Text>
          </Button>
          <Button onPress={handleExportMetrics} variant="outline">
            <Text>Export to Console</Text>
          </Button>
          <Button onPress={handleClearMetrics} variant="destructive">
            <Text>Clear All Metrics</Text>
          </Button>
        </View>

        {/* Footer Info */}
        <Card>
          <CardContent className="py-3">
            <Text className="text-xs text-muted-foreground">
              Performance metrics are collected automatically via useScreenPerformanceMetrics hook.
              Data resets on app restart. Verbose logging can be enabled in developer settings.
            </Text>
          </CardContent>
        </Card>
      </View>
    </ScrollView>
  );
}
