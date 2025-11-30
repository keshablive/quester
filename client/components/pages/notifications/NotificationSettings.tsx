import React from 'react';
import { View, ScrollView, Pressable, Switch, ActivityIndicator } from 'react-native';
import { Text } from '@/components/ui';
import { Settings, Save, WifiOff } from 'lucide-react-native';
import {
  useNotificationSettings,
  useUpdateNotificationSettings,
  NotificationSettings as NotificationSettingsType,
} from '@/core';
import { MutationErrorToast } from '@/components/shared/MutationErrorToast';
import { NotificationSettingsProps } from './types';

// Threshold for showing offline indicator (1 hour)
const OFFLINE_THRESHOLD_MS = 60 * 60 * 1000;

/**
 * Offline Indicator Component (FR-012)
 * Shows when cached data may be outdated
 */
function OfflineIndicator({ dataUpdatedAt }: { dataUpdatedAt: number }) {
  const isStale = Date.now() - dataUpdatedAt > OFFLINE_THRESHOLD_MS;

  if (!isStale) return null;

  return (
    <View className="mx-4 mb-2 flex-row items-center gap-2 rounded-lg bg-amber-100 px-3 py-2 dark:bg-amber-900/30">
      <WifiOff size={16} className="text-amber-600 dark:text-amber-400" />
      <Text className="flex-1 text-sm text-amber-700 dark:text-amber-300">
        Showing cached data. Changes will sync when online.
      </Text>
    </View>
  );
}

/**
 * NotificationSettings Component
 *
 * Displays notification settings with TanStack Query caching and
 * optimistic updates for instant UI feedback.
 *
 * US4: Notification Settings with Optimistic Updates (Feature 020)
 */
export function NotificationSettings({ onSave }: NotificationSettingsProps) {
  // TanStack Query hook for notification settings (US4)
  const { data: settings, isLoading, error, refetch, dataUpdatedAt } = useNotificationSettings();

  // Error state for toast notification (FR-013)
  const [syncError, setSyncError] = React.useState<string | null>(null);

  // Mutation with optimistic updates (US4)
  const {
    mutate: updateSettings,
    isPending: isSaving,
    variables: pendingMutation,
  } = useUpdateNotificationSettings({
    onSuccess: () => {
      setSyncError(null);
      onSave?.();
    },
    onError: (err) => {
      // FR-013: Show toast notification for sync failures
      setSyncError(err.message ?? 'Failed to save settings. Changes have been reverted.');
    },
  });

  // Local state for pending changes before save
  const [pendingChanges, setPendingChanges] = React.useState<Partial<NotificationSettingsType>>({});

  // Merge settings with pending changes
  const displaySettings = React.useMemo(() => {
    if (!settings) return null;
    return { ...settings, ...pendingChanges };
  }, [settings, pendingChanges]);

  const updateSetting = (key: keyof NotificationSettingsType, value: boolean) => {
    setPendingChanges((prev) => ({ ...prev, [key]: value }));
  };

  const updateNotificationType = (
    type: keyof NotificationSettingsType['notificationTypes'],
    value: boolean
  ) => {
    setPendingChanges((prev) => {
      const currentTypes = (prev.notificationTypes || settings?.notificationTypes) ?? {};
      return {
        ...prev,
        notificationTypes: {
          ...currentTypes,
          [type]: value,
        } as NotificationSettingsType['notificationTypes'],
      };
    });
  };

  const handleSave = () => {
    if (Object.keys(pendingChanges).length === 0) {
      onSave?.();
      return;
    }

    updateSettings(pendingChanges, {
      onSuccess: () => {
        setPendingChanges({});
      },
    });
  };

  // Retry handler for toast (FR-013)
  const handleRetry = () => {
    if (pendingMutation) {
      updateSettings(pendingMutation);
    }
    setSyncError(null);
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" className="text-primary" />
        <Text className="mt-3 text-base text-muted-foreground">Loading settings...</Text>
      </View>
    );
  }

  if (error || !displaySettings) {
    return (
      <View className="flex-1 items-center justify-center bg-background p-6">
        <Text className="mb-4 text-center text-base text-destructive">
          {error?.message ?? 'Failed to load settings'}
        </Text>
        <Pressable className="rounded-lg bg-primary px-6 py-3" onPress={() => refetch()}>
          <Text className="text-base font-semibold text-primary-foreground">Retry</Text>
        </Pressable>
      </View>
    );
  }

  const hasPendingChanges = Object.keys(pendingChanges).length > 0;

  return (
    <ScrollView className="flex-1 bg-background">
      {/* Offline Indicator - FR-012 */}
      <OfflineIndicator dataUpdatedAt={dataUpdatedAt} />

      <View className="p-4">
        {/* Header */}
        <View className="mb-6 flex-row items-center">
          <Settings size={24} className="mr-2 text-primary" />
          <Text className="text-2xl font-bold text-foreground">Notification Settings</Text>
        </View>

        {/* Delivery Methods */}
        <View className="mb-4 rounded-xl border border-border bg-card p-4">
          <Text className="mb-4 text-lg font-semibold text-foreground">Delivery Methods</Text>

          <View className="flex-row items-center justify-between border-b border-border py-3">
            <Text className="text-base text-foreground">Email Notifications</Text>
            <Switch
              value={displaySettings.emailNotifications}
              onValueChange={(value) => updateSetting('emailNotifications', value)}
            />
          </View>

          <View className="flex-row items-center justify-between border-b border-border py-3">
            <Text className="text-base text-foreground">Push Notifications</Text>
            <Switch
              value={displaySettings.pushNotifications}
              onValueChange={(value) => updateSetting('pushNotifications', value)}
            />
          </View>

          <View className="flex-row items-center justify-between py-3">
            <Text className="text-base text-foreground">SMS Notifications</Text>
            <Switch
              value={displaySettings.smsNotifications}
              onValueChange={(value) => updateSetting('smsNotifications', value)}
            />
          </View>
        </View>

        {/* Notification Types */}
        <View className="mb-4 rounded-xl border border-border bg-card p-4">
          <Text className="mb-4 text-lg font-semibold text-foreground">Notification Types</Text>

          <View className="flex-row items-center justify-between border-b border-border py-3">
            <Text className="text-base text-foreground">Likes</Text>
            <Switch
              value={displaySettings.notificationTypes.likes}
              onValueChange={(value) => updateNotificationType('likes', value)}
            />
          </View>

          <View className="flex-row items-center justify-between border-b border-border py-3">
            <Text className="text-base text-foreground">Comments</Text>
            <Switch
              value={displaySettings.notificationTypes.comments}
              onValueChange={(value) => updateNotificationType('comments', value)}
            />
          </View>

          <View className="flex-row items-center justify-between border-b border-border py-3">
            <Text className="text-base text-foreground">Follows</Text>
            <Switch
              value={displaySettings.notificationTypes.follows}
              onValueChange={(value) => updateNotificationType('follows', value)}
            />
          </View>

          <View className="flex-row items-center justify-between border-b border-border py-3">
            <Text className="text-base text-foreground">Messages</Text>
            <Switch
              value={displaySettings.notificationTypes.messages}
              onValueChange={(value) => updateNotificationType('messages', value)}
            />
          </View>

          <View className="flex-row items-center justify-between border-b border-border py-3">
            <Text className="text-base text-foreground">Achievements</Text>
            <Switch
              value={displaySettings.notificationTypes.achievements}
              onValueChange={(value) => updateNotificationType('achievements', value)}
            />
          </View>

          <View className="flex-row items-center justify-between py-3">
            <Text className="text-base text-foreground">Quests</Text>
            <Switch
              value={displaySettings.notificationTypes.quests}
              onValueChange={(value) => updateNotificationType('quests', value)}
            />
          </View>
        </View>

        {/* Save Button */}
        <Pressable
          className={`flex-row items-center justify-center rounded-xl py-4 ${
            hasPendingChanges ? 'bg-primary' : 'bg-muted'
          }`}
          onPress={handleSave}
          disabled={isSaving || !hasPendingChanges}>
          {isSaving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Save size={20} color={hasPendingChanges ? '#fff' : '#888'} className="mr-2" />
              <Text
                className={`text-base font-semibold ${
                  hasPendingChanges ? 'text-primary-foreground' : 'text-muted-foreground'
                }`}>
                {hasPendingChanges ? 'Save Settings' : 'No Changes'}
              </Text>
            </>
          )}
        </Pressable>
      </View>

      {/* Error Toast for sync failures - FR-013 */}
      <MutationErrorToast
        message={syncError ?? ''}
        visible={!!syncError}
        onDismiss={() => setSyncError(null)}
        onRetry={handleRetry}
        type="error"
      />
    </ScrollView>
  );
}
