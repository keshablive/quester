import React, { useState, useEffect } from 'react';
import { View, ScrollView, Pressable, Switch, ActivityIndicator } from 'react-native';
import { Text } from '@/components/ui';
import { Settings, Save } from 'lucide-react-native';
import { notificationsService, NotificationSettings as NotificationSettingsType } from '@/core';
import { NotificationSettingsProps } from './types';

export function NotificationSettings({ onSave }: NotificationSettingsProps) {
  const [settings, setSettings] = useState<NotificationSettingsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await notificationsService.getSettings();
      setSettings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;
    
    try {
      setSaving(true);
      await notificationsService.updateSettings(settings);
      onSave?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (key: keyof NotificationSettingsType, value: boolean) => {
    if (!settings) return;
    setSettings({ ...settings, [key]: value });
  };

  const updateNotificationType = (type: keyof NotificationSettingsType['notificationTypes'], value: boolean) => {
    if (!settings) return;
    setSettings({
      ...settings,
      notificationTypes: {
        ...settings.notificationTypes,
        [type]: value,
      },
    });
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" className="text-primary" />
        <Text className="mt-3 text-base text-muted-foreground">Loading settings...</Text>
      </View>
    );
  }

  if (error || !settings) {
    return (
      <View className="flex-1 items-center justify-center p-6 bg-background">
        <Text className="text-base text-destructive text-center mb-4">{error}</Text>
        <Pressable className="bg-primary px-6 py-3 rounded-lg" onPress={loadSettings}>
          <Text className="text-base font-semibold text-primary-foreground">Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-background">
      <View className="p-4">
        {/* Header */}
        <View className="flex-row items-center mb-6">
          <Settings size={24} className="text-primary mr-2" />
          <Text className="text-2xl font-bold text-foreground">Notification Settings</Text>
        </View>

        {/* Delivery Methods */}
        <View className="bg-card rounded-xl p-4 mb-4 border border-border">
          <Text className="text-lg font-semibold text-foreground mb-4">Delivery Methods</Text>
          
          <View className="flex-row items-center justify-between py-3 border-b border-border">
            <Text className="text-base text-foreground">Email Notifications</Text>
            <Switch
              value={settings.emailNotifications}
              onValueChange={(value) => updateSetting('emailNotifications', value)}
            />
          </View>

          <View className="flex-row items-center justify-between py-3 border-b border-border">
            <Text className="text-base text-foreground">Push Notifications</Text>
            <Switch
              value={settings.pushNotifications}
              onValueChange={(value) => updateSetting('pushNotifications', value)}
            />
          </View>

          <View className="flex-row items-center justify-between py-3">
            <Text className="text-base text-foreground">SMS Notifications</Text>
            <Switch
              value={settings.smsNotifications}
              onValueChange={(value) => updateSetting('smsNotifications', value)}
            />
          </View>
        </View>

        {/* Notification Types */}
        <View className="bg-card rounded-xl p-4 mb-4 border border-border">
          <Text className="text-lg font-semibold text-foreground mb-4">Notification Types</Text>
          
          <View className="flex-row items-center justify-between py-3 border-b border-border">
            <Text className="text-base text-foreground">Likes</Text>
            <Switch
              value={settings.notificationTypes.likes}
              onValueChange={(value) => updateNotificationType('likes', value)}
            />
          </View>

          <View className="flex-row items-center justify-between py-3 border-b border-border">
            <Text className="text-base text-foreground">Comments</Text>
            <Switch
              value={settings.notificationTypes.comments}
              onValueChange={(value) => updateNotificationType('comments', value)}
            />
          </View>

          <View className="flex-row items-center justify-between py-3 border-b border-border">
            <Text className="text-base text-foreground">Follows</Text>
            <Switch
              value={settings.notificationTypes.follows}
              onValueChange={(value) => updateNotificationType('follows', value)}
            />
          </View>

          <View className="flex-row items-center justify-between py-3 border-b border-border">
            <Text className="text-base text-foreground">Messages</Text>
            <Switch
              value={settings.notificationTypes.messages}
              onValueChange={(value) => updateNotificationType('messages', value)}
            />
          </View>

          <View className="flex-row items-center justify-between py-3 border-b border-border">
            <Text className="text-base text-foreground">Achievements</Text>
            <Switch
              value={settings.notificationTypes.achievements}
              onValueChange={(value) => updateNotificationType('achievements', value)}
            />
          </View>

          <View className="flex-row items-center justify-between py-3">
            <Text className="text-base text-foreground">Quests</Text>
            <Switch
              value={settings.notificationTypes.quests}
              onValueChange={(value) => updateNotificationType('quests', value)}
            />
          </View>
        </View>

        {/* Save Button */}
        <Pressable
          className="bg-primary py-4 rounded-xl flex-row items-center justify-center"
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Save size={20} color="#fff" className="mr-2" />
              <Text className="text-base font-semibold text-primary-foreground">Save Settings</Text>
            </>
          )}
        </Pressable>
      </View>
    </ScrollView>
  );
}
