import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  Pressable,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, ChevronRight, Clock, Bell, Mail, Megaphone, MessageSquare, type LucideIcon } from 'lucide-react-native';
import { useNotifications } from '@/lib/hooks/useNotifications';

interface NotificationChannel {
  key: keyof NotificationSettings['channels'];
  label: string;
  icon: LucideIcon;
  description: string;
}

interface NotificationPreference {
  key: string;
  label: string;
  description: string;
}

interface NotificationSettings {
  channels: {
    email: boolean;
    push: boolean;
    in_app: boolean;
    sms: boolean;
  };
  preferences: Record<string, boolean>;
  quiet_hours: {
    enabled: boolean;
    start: string;
    end: string;
    timezone: string;
  };
}

export default function NotificationSettingsScreen() {
  const router = useRouter();
  const { settings, registerForPushNotifications, unregisterPushNotifications, fcmRegistered } =
    useNotifications({ autoSubscribe: false });

  const [localSettings, setLocalSettings] = useState<NotificationSettings | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize local settings from hook
  useEffect(() => {
    if (settings) {
      setLocalSettings(settings);
    }
  }, [settings]);

  // Notification channels
  const channels: NotificationChannel[] = [
    {
      key: 'push',
      label: 'Push Notifications',
      icon: Bell,
      description: 'Receive notifications on your device',
    },
    {
      key: 'email',
      label: 'Email',
      icon: Mail,
      description: 'Receive notifications via email',
    },
    {
      key: 'in_app',
      label: 'In-App',
      icon: Megaphone,
      description: 'Show notifications within the app',
    },
    {
      key: 'sms',
      label: 'SMS',
      icon: MessageSquare,
      description: 'Receive notifications via text message',
    },
  ];

  // Notification preferences
  const preferences: NotificationPreference[] = [
    {
      key: 'messages',
      label: 'Messages',
      description: 'New direct messages and group messages',
    },
    {
      key: 'mentions',
      label: 'Mentions',
      description: 'When someone mentions you',
    },
    {
      key: 'badges',
      label: 'Badges',
      description: 'Badge earned or revoked',
    },
    {
      key: 'achievements',
      label: 'Achievements',
      description: 'Achievement unlocked or milestone reached',
    },
    {
      key: 'courses',
      label: 'Courses',
      description: 'Course updates and new lessons',
    },
    {
      key: 'streams',
      label: 'Live Streams',
      description: 'When someone you follow goes live',
    },
    {
      key: 'follows',
      label: 'Follows',
      description: 'When someone follows you',
    },
    {
      key: 'likes',
      label: 'Likes',
      description: 'When someone likes your content',
    },
    {
      key: 'comments',
      label: 'Comments',
      description: 'When someone comments on your content',
    },
  ];

  // Handle channel toggle
  const handleChannelToggle = async (channelKey: keyof NotificationSettings['channels']) => {
    if (!localSettings) return;

    const newValue = !localSettings.channels[channelKey];

    // Handle push notification registration
    if (channelKey === 'push') {
      if (newValue && !fcmRegistered) {
        const token = await registerForPushNotifications();
        if (!token) {
          Alert.alert(
            'Permission Required',
            'Please enable notifications in your device settings to receive push notifications.'
          );
          return;
        }
      } else if (!newValue && fcmRegistered) {
        await unregisterPushNotifications();
      }
    }

    const updatedSettings = {
      ...localSettings,
      channels: {
        ...localSettings.channels,
        [channelKey]: newValue,
      },
    };

    setLocalSettings(updatedSettings);
    await saveSettings({ channels: updatedSettings.channels });
  };

  // Handle preference toggle
  const handlePreferenceToggle = async (preferenceKey: string) => {
    if (!localSettings) return;

    const newValue = !localSettings.preferences[preferenceKey];

    const updatedSettings = {
      ...localSettings,
      preferences: {
        ...localSettings.preferences,
        [preferenceKey]: newValue,
      },
    };

    setLocalSettings(updatedSettings);
    await saveSettings({ preferences: updatedSettings.preferences });
  };

  // Handle quiet hours toggle
  const handleQuietHoursToggle = async () => {
    if (!localSettings) return;

    const newValue = !localSettings.quiet_hours.enabled;

    const updatedSettings = {
      ...localSettings,
      quiet_hours: {
        ...localSettings.quiet_hours,
        enabled: newValue,
      },
    };

    setLocalSettings(updatedSettings);
    await saveSettings({ quiet_hours: updatedSettings.quiet_hours });
  };

  // Save settings
  const saveSettings = async (updates: Partial<NotificationSettings>) => {
    setIsSaving(true);
    try {
      // await updateNotificationSettings(updates); // TODO: Implement API call
      console.log('Settings to save:', updates);
    } catch (error) {
      console.error('Error saving settings:', error);
      Alert.alert('Error', 'Failed to save settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle quiet hours config
  const handleQuietHoursConfig = () => {
    Alert.alert(
      'Quiet Hours',
      "Configure quiet hours when you don't want to receive notifications.\n\nThis feature will be available in the next update.",
      [{ text: 'OK' }]
    );
  };

  // Handle back press
  const handleBack = () => {
    router.back();
  };

  if (!localSettings) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={handleBack}>
            <ChevronLeft size={24} color="#007AFF" />
          </Pressable>
          <Text style={styles.headerTitle}>Notification Settings</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading settings...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={handleBack}>
          <ChevronLeft size={24} color="#007AFF" />
        </Pressable>
        <Text style={styles.headerTitle}>Notification Settings</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Channels Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Channels</Text>
          <Text style={styles.sectionDescription}>
            Choose how you want to receive notifications
          </Text>

          {channels.map((channel) => {
            const IconComponent = channel.icon;
            return (
            <View key={channel.key} style={styles.settingItem}>
              <View style={styles.settingIcon}>
                <IconComponent size={24} color="#007AFF" />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingLabel}>{channel.label}</Text>
                <Text style={styles.settingDescription}>{channel.description}</Text>
              </View>
              <Switch
                value={localSettings.channels[channel.key]}
                onValueChange={() => handleChannelToggle(channel.key)}
                disabled={isSaving}
                trackColor={{ false: '#E0E0E0', true: '#34C759' }}
                thumbColor="#FFF"
              />
            </View>
          )})}
        </View>

        {/* Preferences Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notification Types</Text>
          <Text style={styles.sectionDescription}>
            Choose which notifications you want to receive
          </Text>

          {preferences.map((pref) => (
            <View key={pref.key} style={styles.settingItem}>
              <View style={styles.settingContent}>
                <Text style={styles.settingLabel}>{pref.label}</Text>
                <Text style={styles.settingDescription}>{pref.description}</Text>
              </View>
              <Switch
                value={localSettings.preferences[pref.key] !== false}
                onValueChange={() => handlePreferenceToggle(pref.key)}
                disabled={isSaving}
                trackColor={{ false: '#E0E0E0', true: '#34C759' }}
                thumbColor="#FFF"
              />
            </View>
          ))}
        </View>

        {/* Quiet Hours Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quiet Hours</Text>
          <Text style={styles.sectionDescription}>Pause notifications during specific hours</Text>

          <View style={styles.settingItem}>
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Enable Quiet Hours</Text>
              <Text style={styles.settingDescription}>
                {localSettings.quiet_hours.enabled
                  ? `Active from ${localSettings.quiet_hours.start} to ${localSettings.quiet_hours.end}`
                  : 'Receive notifications at all times'}
              </Text>
            </View>
            <Switch
              value={localSettings.quiet_hours.enabled}
              onValueChange={handleQuietHoursToggle}
              disabled={isSaving}
              trackColor={{ false: '#E0E0E0', true: '#34C759' }}
              thumbColor="#FFF"
            />
          </View>

          {localSettings.quiet_hours.enabled && (
            <Pressable style={styles.configButton} onPress={handleQuietHoursConfig}>
              <Clock size={20} color="#007AFF" />
              <Text style={styles.configButtonText}>Configure Quiet Hours</Text>
              <ChevronRight size={20} color="#C7C7CC" />
            </Pressable>
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Changes are saved automatically. You can manage notification permissions in your device
            settings.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF',
    paddingHorizontal: 8,
    paddingVertical: 12,
    paddingTop: Platform.OS === 'ios' ? 56 : 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
  },
  placeholder: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#999',
  },
  content: {
    flex: 1,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingContent: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 13,
    color: '#666',
  },
  configButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginTop: 8,
    gap: 8,
  },
  configButtonText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 32,
  },
  footerText: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
    lineHeight: 18,
  },
});
