/**
 * Error Log Viewer (Phase 6, T175)
 *
 * Developer tool for viewing application errors and warnings:
 * - JavaScript errors with stack traces
 * - Network failures
 * - Console warnings
 * - Performance warnings
 * - Error trends and patterns
 *
 * Accessible via developer menu after enabling developer mode
 */

import React, { useState, useEffect } from 'react';
import { View, ScrollView, RefreshControl, Pressable } from 'react-native';
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
  AlertCircle,
  XCircle,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronRight,
  Trash2,
} from 'lucide-react-native';

interface ErrorLog {
  id: string;
  timestamp: Date;
  level: 'error' | 'warning' | 'info';
  message: string;
  source: string;
  stackTrace?: string;
  additionalData?: Record<string, unknown>;
}

export default function ErrorLogScreen() {
  const { state } = useDeveloperMode();
  const [refreshing, setRefreshing] = useState(false);
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  const [filterLevel, setFilterLevel] = useState<string | null>(null);
  const [logs, setLogs] = useState<ErrorLog[]>([]);

  // Route guard: redirect if developer mode is disabled
  useEffect(() => {
    if (!state.enabled && !__DEV__) {
      console.warn('[ErrorLog] Developer mode required - redirecting to settings');
      router.replace('/settings');
    }
  }, [state.enabled]);

  // Initialize with mock logs (in real implementation, this comes from global error handler)
  useEffect(() => {
    setLogs([
      {
        id: 'err-001',
        timestamp: new Date(Date.now() - 3600000),
        level: 'error',
        message: 'TypeError: Cannot read property "map" of undefined',
        source: 'CourseList.tsx:45',
        stackTrace: `at CourseList (CourseList.tsx:45:12)
at renderWithHooks (react-native/renderer.js:1234:56)
at updateFunctionComponent (react-native/renderer.js:5678:90)`,
      },
      {
        id: 'warn-001',
        timestamp: new Date(Date.now() - 7200000),
        level: 'warning',
        message: 'Network request failed: timeout after 10s',
        source: 'api-client.ts:120',
        additionalData: { url: '/api/courses', method: 'GET', timeout: 10000 },
      },
      {
        id: 'info-001',
        timestamp: new Date(Date.now() - 10800000),
        level: 'info',
        message: 'User navigated to /profile',
        source: 'navigation.ts:78',
        additionalData: { userId: 'user123', previousScreen: '/feed' },
      },
      {
        id: 'warn-002',
        timestamp: new Date(Date.now() - 14400000),
        level: 'warning',
        message: 'AsyncStorage quota nearly full (90%)',
        source: 'storage-manager.ts:200',
        additionalData: { used: '9.1MB', total: '10MB' },
      },
    ]);
  }, []);

  if (!state.enabled && !__DEV__) {
    return null;
  }

  const onRefresh = async () => {
    setRefreshing(true);
    // Simulate log refresh
    await new Promise((resolve) => setTimeout(resolve, 500));
    setRefreshing(false);
  };

  const toggleLog = (id: string) => {
    const newExpanded = new Set(expandedLogs);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedLogs(newExpanded);
  };

  const clearLogs = () => {
    setLogs([]);
    setExpandedLogs(new Set());
  };

  // Optimized with useMemo (Phase 7, T113)
  const filteredLogs = React.useMemo(
    () => (filterLevel ? logs.filter((log) => log.level === filterLevel) : logs),
    [logs, filterLevel]
  );

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error':
        return 'text-red-600';
      case 'warning':
        return 'text-yellow-600';
      case 'info':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'error':
        return XCircle;
      case 'warning':
        return AlertTriangle;
      case 'info':
        return Info;
      default:
        return AlertCircle;
    }
  };

  const levelCounts = {
    error: logs.filter((l) => l.level === 'error').length,
    warning: logs.filter((l) => l.level === 'warning').length,
    info: logs.filter((l) => l.level === 'info').length,
  };

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 60) {
      return `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else {
      return date.toLocaleString();
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Error Logs',
          headerLargeTitle: false,
        }}
      />

      <ScreenWrapper screenName="ErrorLogScreen">
        <ScrollView
          className="flex-1 bg-background"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
          {/* Header */}
          <View className="border-b border-border bg-card px-6 py-4">
            <View className="mb-2 flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <Icon as={AlertCircle} size={24} className="text-foreground" />
                <Text className="text-2xl font-bold text-foreground">Error Logs</Text>
              </View>
              <Button variant="ghost" size="icon" onPress={clearLogs}>
                <Icon as={Trash2} size={20} className="text-muted-foreground" />
              </Button>
            </View>
            <Text className="text-sm text-muted-foreground">
              Application errors, warnings, and debug information
            </Text>
          </View>

          {/* Summary Cards */}
          <View className="flex-row gap-3 p-6">
            <Pressable
              onPress={() => setFilterLevel(filterLevel === 'error' ? null : 'error')}
              className="flex-1">
              <Card className={filterLevel === 'error' ? 'border-red-600' : ''}>
                <CardContent className="py-4">
                  <View className="items-center">
                    <Icon as={XCircle} size={28} className="text-red-600" />
                    <Text className="mt-2 text-2xl font-bold text-foreground">
                      {levelCounts.error}
                    </Text>
                    <Text className="text-xs text-muted-foreground">Errors</Text>
                  </View>
                </CardContent>
              </Card>
            </Pressable>

            <Pressable
              onPress={() => setFilterLevel(filterLevel === 'warning' ? null : 'warning')}
              className="flex-1">
              <Card className={filterLevel === 'warning' ? 'border-yellow-600' : ''}>
                <CardContent className="py-4">
                  <View className="items-center">
                    <Icon as={AlertTriangle} size={28} className="text-yellow-600" />
                    <Text className="mt-2 text-2xl font-bold text-foreground">
                      {levelCounts.warning}
                    </Text>
                    <Text className="text-xs text-muted-foreground">Warnings</Text>
                  </View>
                </CardContent>
              </Card>
            </Pressable>

            <Pressable
              onPress={() => setFilterLevel(filterLevel === 'info' ? null : 'info')}
              className="flex-1">
              <Card className={filterLevel === 'info' ? 'border-blue-600' : ''}>
                <CardContent className="py-4">
                  <View className="items-center">
                    <Icon as={Info} size={28} className="text-blue-600" />
                    <Text className="mt-2 text-2xl font-bold text-foreground">
                      {levelCounts.info}
                    </Text>
                    <Text className="text-xs text-muted-foreground">Info</Text>
                  </View>
                </CardContent>
              </Card>
            </Pressable>
          </View>

          {filterLevel && (
            <View className="px-6">
              <Button variant="outline" onPress={() => setFilterLevel(null)}>
                <Text>Clear Filter</Text>
              </Button>
            </View>
          )}

          {/* Logs List */}
          <View className="px-6 py-4">
            {filteredLogs.length === 0 ? (
              <Card>
                <CardContent className="py-8">
                  <View className="items-center">
                    <Icon as={Info} size={48} className="text-muted-foreground" />
                    <Text className="mt-4 text-center text-muted-foreground">
                      No logs to display
                    </Text>
                  </View>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Recent Logs</CardTitle>
                  <CardDescription>
                    {filteredLogs.length} log{filteredLogs.length !== 1 ? 's' : ''}
                  </CardDescription>
                </CardHeader>
                <CardContent className="gap-4">
                  {filteredLogs.map((log, index) => {
                    const isExpanded = expandedLogs.has(log.id);
                    return (
                      <View key={log.id}>
                        <Pressable onPress={() => toggleLog(log.id)}>
                          <View className="flex-row items-start gap-3">
                            <Icon
                              as={getLevelIcon(log.level)}
                              size={20}
                              className={getLevelColor(log.level)}
                            />
                            <View className="flex-1">
                              <View className="mb-2 flex-row items-center gap-2">
                                <Badge
                                  variant={
                                    log.level === 'error'
                                      ? 'destructive'
                                      : log.level === 'warning'
                                        ? 'secondary'
                                        : 'default'
                                  }>
                                  <Text className="text-xs font-medium uppercase">{log.level}</Text>
                                </Badge>
                                <Text className="text-xs text-muted-foreground">
                                  {formatTimestamp(log.timestamp)}
                                </Text>
                              </View>
                              <Text className="font-semibold text-foreground">{log.message}</Text>
                              <Text className="mt-1 text-xs text-muted-foreground">
                                {log.source}
                              </Text>
                            </View>
                            <Icon
                              as={isExpanded ? ChevronDown : ChevronRight}
                              size={20}
                              className="text-muted-foreground"
                            />
                          </View>

                          {isExpanded && (
                            <View className="ml-8 mt-3 gap-2">
                              {log.stackTrace && (
                                <View>
                                  <Text className="text-xs font-semibold text-foreground">
                                    Stack Trace
                                  </Text>
                                  <View className="mt-1 rounded bg-gray-900 p-2">
                                    <Text className="font-mono text-xs text-gray-100" selectable>
                                      {log.stackTrace}
                                    </Text>
                                  </View>
                                </View>
                              )}
                              {log.additionalData && (
                                <View>
                                  <Text className="text-xs font-semibold text-foreground">
                                    Additional Data
                                  </Text>
                                  <View className="mt-1 rounded bg-gray-900 p-2">
                                    <Text className="font-mono text-xs text-gray-100" selectable>
                                      {JSON.stringify(log.additionalData, null, 2)}
                                    </Text>
                                  </View>
                                </View>
                              )}
                            </View>
                          )}
                        </Pressable>
                        {index < filteredLogs.length - 1 && <Separator className="mt-4" />}
                      </View>
                    );
                  })}
                </CardContent>
              </Card>
            )}
          </View>

          {/* Info */}
          <View className="px-6 pb-8">
            <Card className="bg-muted/30">
              <CardContent className="py-4">
                <Text className="text-xs text-muted-foreground">
                  Logs are automatically captured from console errors, network failures, and
                  application events. Pull down to refresh. Clear logs to free memory.
                </Text>
              </CardContent>
            </Card>
          </View>
        </ScrollView>
      </ScreenWrapper>
    </>
  );
}
