import * as React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Text, Card, Switch, Label, Icon, Separator } from '@/components/ui';
import { Bell, Mail, MessageSquare, RefreshCw } from 'lucide-react-native';
import {
  useNotificationSettings,
  useUpdateNotificationSettings,
  useDebouncedCallback,
} from '@/core';
import { ErrorState, MutationErrorToast, StaleDataIndicator } from '@/components/shared';

/**
 * NotificationSettings Component
 *
 * Manages user notification preferences with TanStack Query.
 * Features optimistic updates with 300ms debounce for responsive UX.
 *
 * US3: Responsive Settings Updates with Optimistic Updates
 *
 * @module components/features/settings/NotificationSettings
 */
export function NotificationSettings() {
  // T026: Use useNotificationSettings query hook
  const {
    data: settings,
    isLoading,
    isRefetching,
    error,
    refetch,
    dataUpdatedAt,
  } = useNotificationSettings();

  // T027: Use useUpdateNotificationSettings mutation hook
  const {
    mutate: updateSettings,
    isPending,
    error: mutationError,
    reset: resetMutation,
  } = useUpdateNotificationSettings();

  // T028: Implement 300ms debounced toggle handlers
  const debouncedUpdate = useDebouncedCallback((updates: Record<string, boolean>) => {
    updateSettings(updates);
  }, 300);

  // T029: Connect Switch components to mutation with optimistic updates
  const handleToggle = (key: string) => (value: boolean) => {
    debouncedUpdate({ [key]: value });
  };

  // T030: Loading state indicator during initial settings fetch
  if (isLoading && !settings) {
    return (
      <View className="flex-1 items-center justify-center p-4">
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text className="mt-3 text-muted-foreground">Loading settings...</Text>
      </View>
    );
  }

  // Error state with retry
  if (error && !settings) {
    return (
      <ErrorState
        message={error.message ?? 'Failed to load notification settings'}
        onRetry={() => refetch()}
      />
    );
  }

  // Fallback if no settings
  if (!settings) {
    return <ErrorState message="Notification settings not available" onRetry={() => refetch()} />;
  }

  return (
    <View>
      {/* T031: Error toast display on mutation failure */}
      <MutationErrorToast
        message={mutationError?.message ?? 'Failed to save settings'}
        visible={!!mutationError}
        onDismiss={resetMutation}
      />

      {/* Stale data indicator (cached data age) */}
      <StaleDataIndicator dataUpdatedAt={dataUpdatedAt} />

      {/* Background refetch indicator */}
      {isRefetching && (
        <View className="mb-3 flex-row items-center justify-center rounded-lg bg-muted/50 py-2">
          <RefreshCw size={14} className="mr-2 text-muted-foreground" />
          <Text className="text-xs text-muted-foreground">Syncing...</Text>
        </View>
      )}

      <Text className="mb-3 text-lg font-semibold">Notifications</Text>
      <Card className="gap-4 p-4">
        {/* Push Notifications */}
        <View className="flex-row items-center justify-between">
          <View className="flex-1 flex-row items-center gap-3">
            <Icon as={Bell} size={20} />
            <View className="flex-1">
              <Label nativeID="push">Push Notifications</Label>
              <Text className="text-sm text-muted-foreground">Receive push notifications</Text>
            </View>
          </View>
          <View className="flex-row items-center gap-2">
            {/* T032: isPending indicator on toggles during mutation */}
            {isPending && <ActivityIndicator size="small" color="#6B7280" />}
            <Switch
              checked={settings.pushNotifications}
              onCheckedChange={handleToggle('pushNotifications')}
              nativeID="push"
              disabled={isPending}
            />
          </View>
        </View>

        <Separator />

        {/* Email Notifications */}
        <View className="flex-row items-center justify-between">
          <View className="flex-1 flex-row items-center gap-3">
            <Icon as={Mail} size={20} />
            <View className="flex-1">
              <Label nativeID="email">Email Updates</Label>
              <Text className="text-sm text-muted-foreground">Get email about your activity</Text>
            </View>
          </View>
          <View className="flex-row items-center gap-2">
            {isPending && <ActivityIndicator size="small" color="#6B7280" />}
            <Switch
              checked={settings.emailNotifications}
              onCheckedChange={handleToggle('emailNotifications')}
              nativeID="email"
              disabled={isPending}
            />
          </View>
        </View>

        <Separator />

        {/* SMS Notifications */}
        <View className="flex-row items-center justify-between">
          <View className="flex-1 flex-row items-center gap-3">
            <Icon as={MessageSquare} size={20} />
            <View className="flex-1">
              <Label nativeID="sms">SMS Notifications</Label>
              <Text className="text-sm text-muted-foreground">Receive text message alerts</Text>
            </View>
          </View>
          <View className="flex-row items-center gap-2">
            {isPending && <ActivityIndicator size="small" color="#6B7280" />}
            <Switch
              checked={settings.smsNotifications}
              onCheckedChange={handleToggle('smsNotifications')}
              nativeID="sms"
              disabled={isPending}
            />
          </View>
        </View>
      </Card>
    </View>
  );
}
