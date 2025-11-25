import React from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Activity, Code } from 'lucide-react-native';
import { Icon } from '@/components/ui/icon';
import { useDeveloperMode } from '@/lib/contexts/developer-mode-context';
import Constants from 'expo-constants';
import { Text } from '@/components/ui/text';
import { ScreenWrapper } from '@/components/screen-wrapper';

export default function SettingsScreen() {
  const {
    state,
    handleVersionTap,
    tapCount,
    toggleVerboseLogging,
    toggleComponentLifecycleLogging,
    togglePerformanceOverlay,
    toggleAccessibilityOverlay,
  } = useDeveloperMode();

  return (
    <ScreenWrapper screenName="Settings">
      <ScrollView className="flex-1 bg-background p-4">
        <View className="gap-4">
          <Text className="text-2xl font-bold text-foreground">Settings</Text>

          {/* Developer Tools (Phase 5, T130 + Phase 6, T139-T140) */}
          {(state.enabled || __DEV__) && (
            <Card>
              <CardHeader>
                <CardTitle>Developer Tools</CardTitle>
                {state.enabled && (
                  <Text className="text-xs text-green-600">🔧 Developer Mode Active</Text>
                )}
              </CardHeader>
              <CardContent className="gap-3">
                <Button
                  onPress={() => router.push('/performance-dashboard' as any)}
                  variant="outline"
                  className="flex-row items-center gap-2">
                  <Icon as={Activity} size={20} />
                  <Text>Performance Dashboard</Text>
                </Button>
                <Text className="text-xs text-muted-foreground">
                  View real-time performance metrics, render times, and frame drops
                </Text>

                <Separator />

                <Button
                  onPress={() => router.push('/showcase' as any)}
                  variant="outline"
                  className="flex-row items-center gap-2">
                  <Icon as={Code} size={20} />
                  <Text>Component Showcase</Text>
                </Button>
                <Text className="text-xs text-muted-foreground">
                  Browse all 32 UI components with live examples and code snippets
                </Text>

                <Separator />

                <Button
                  onPress={() => router.push('/performance-metrics' as any)}
                  variant="outline"
                  className="flex-row items-center gap-2">
                  <Icon as={Activity} size={20} />
                  <Text>Performance Metrics</Text>
                </Button>
                <Text className="text-xs text-muted-foreground">
                  Real-time performance monitoring and optimization insights (T172)
                </Text>

                <Separator />

                <Button
                  onPress={() => router.push('/accessibility-audit' as any)}
                  variant="outline"
                  className="flex-row items-center gap-2">
                  <Icon as={Code} size={20} />
                  <Text>Accessibility Audit</Text>
                </Button>
                <Text className="text-xs text-muted-foreground">
                  WCAG compliance status and accessibility violations (T173)
                </Text>

                <Separator />

                <Button
                  onPress={() => router.push('/error-logs' as any)}
                  variant="outline"
                  className="flex-row items-center gap-2">
                  <Icon as={Activity} size={20} />
                  <Text>Error Logs</Text>
                </Button>
                <Text className="text-xs text-muted-foreground">
                  Application errors, warnings, and debug information (T175)
                </Text>

                <Separator />

                {/* T174: Component Lifecycle Logger Toggle */}
                <View className="gap-3">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1">
                      <Text className="font-semibold text-foreground">Verbose Logging</Text>
                      <Text className="text-xs text-muted-foreground">
                        Enable detailed console logs for debugging (FR-026)
                      </Text>
                    </View>
                    <Switch checked={state.verboseLogging} onCheckedChange={toggleVerboseLogging} />
                  </View>

                  <View className="flex-row items-center justify-between">
                    <View className="flex-1">
                      <Text className="font-semibold text-foreground">
                        Component Lifecycle Logging
                      </Text>
                      <Text className="text-xs text-muted-foreground">
                        Log component mount, update, and unmount events (T174)
                      </Text>
                    </View>
                    <Switch
                      checked={state.componentLifecycleLogging}
                      onCheckedChange={toggleComponentLifecycleLogging}
                    />
                  </View>

                  <View className="flex-row items-center justify-between">
                    <View className="flex-1">
                      <Text className="font-semibold text-foreground">Performance Overlay</Text>
                      <Text className="text-xs text-muted-foreground">
                        Show real-time FPS and render time overlay
                      </Text>
                    </View>
                    <Switch
                      checked={state.showPerformanceOverlay}
                      onCheckedChange={togglePerformanceOverlay}
                    />
                  </View>

                  <View className="flex-row items-center justify-between">
                    <View className="flex-1">
                      <Text className="font-semibold text-foreground">Accessibility Overlay</Text>
                      <Text className="text-xs text-muted-foreground">
                        Highlight accessibility violations in real-time
                      </Text>
                    </View>
                    <Switch
                      checked={state.showAccessibilityOverlay}
                      onCheckedChange={toggleAccessibilityOverlay}
                    />
                  </View>
                </View>
              </CardContent>
            </Card>
          )}

          {/* TODO: Implement settings screen */}
          <Card>
            <CardHeader>
              <CardTitle>Coming Soon</CardTitle>
            </CardHeader>
            <CardContent className="gap-2">
              <Text className="text-muted-foreground">• Account settings</Text>
              <Text className="text-muted-foreground">• Privacy and security</Text>
              <Text className="text-muted-foreground">• Notifications</Text>
              <Text className="text-muted-foreground">• Appearance and theme</Text>
              <Text className="text-muted-foreground">• Data and storage</Text>
            </CardContent>
          </Card>

          <Separator />

          {/* App Info with 10-tap activation (Phase 6, T140) */}
          <Card>
            <CardHeader>
              <CardTitle>About</CardTitle>
            </CardHeader>
            <CardContent className="gap-2">
              <View className="flex-row items-center justify-between">
                <Text className="text-muted-foreground">App Version</Text>
                <TouchableOpacity
                  onPress={handleVersionTap}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="App version - Tap 10 times rapidly to toggle developer mode"
                  accessibilityHint={`Tap count: ${tapCount} of 10`}>
                  <Text className="font-mono text-foreground">
                    {Constants.expoConfig?.version || '1.0.0'}
                  </Text>
                  {tapCount > 0 && tapCount < 10 && (
                    <Text className="text-xs text-muted-foreground">{tapCount}/10</Text>
                  )}
                </TouchableOpacity>
              </View>
              <View className="flex-row items-center justify-between">
                <Text className="text-muted-foreground">Build Number</Text>
                <Text className="font-mono text-foreground">
                  {Constants.expoConfig?.android?.versionCode ||
                    Constants.expoConfig?.ios?.buildNumber ||
                    '1'}
                </Text>
              </View>
              <View className="flex-row items-center justify-between">
                <Text className="text-muted-foreground">Environment</Text>
                <Text className="font-mono text-foreground">
                  {__DEV__ ? 'Development' : 'Production'}
                </Text>
              </View>
            </CardContent>
          </Card>

          <Separator />

          <Button onPress={() => router.back()} variant="outline">
            <Text>Go Back</Text>
          </Button>
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}
