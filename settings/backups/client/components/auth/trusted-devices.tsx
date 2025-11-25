/**
 * Trusted Devices Management Component
 *
 * Allows users to:
 * - View all logged-in devices
 * - See current device
 * - Revoke access from specific devices
 * - Logout from all other devices
 */

import { authAPI } from '@/lib/api/auth';
import { Alert } from 'react-native';
import * as React from 'react';
import { View, ScrollView, RefreshControl } from 'react-native';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';

interface Device {
  id: string;
  device_type: string;
  name: string;
  last_used: string;
  created_at: string;
  is_current: boolean;
}

interface TrustedDevicesProps {
  accessToken: string;
}

export function TrustedDevices({ accessToken }: TrustedDevicesProps) {
  const [devices, setDevices] = React.useState<Device[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const loadDevices = React.useCallback(
    async (isRefresh = false) => {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      try {
        const response = await authAPI.getTrustedDevices(accessToken);
        setDevices(response.data.devices);
      } catch (err: any) {
        setError(err.message || 'Failed to load devices');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [accessToken]
  );

  React.useEffect(() => {
    loadDevices();
  }, [loadDevices]);

  const handleRevokeDevice = async (deviceId: string, deviceName: string) => {
    Alert.alert(
      'Revoke Device Access',
      `Are you sure you want to log out "${deviceName}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke',
          style: 'destructive',
          onPress: async () => {
            try {
              await authAPI.revokeTrustedDevice(accessToken, deviceId);
              Alert.alert('Success', 'Device access revoked');
              loadDevices();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to revoke device access');
            }
          },
        },
      ]
    );
  };

  const handleRevokeAllOtherDevices = () => {
    const otherDevices = devices.filter((d) => !d.is_current);

    if (otherDevices.length === 0) {
      Alert.alert('No Other Devices', 'You are only logged in on this device.');
      return;
    }

    Alert.alert(
      'Logout All Other Devices',
      `This will log you out of ${otherDevices.length} other device(s). Continue?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout All',
          style: 'destructive',
          onPress: async () => {
            try {
              await Promise.all(
                otherDevices.map((device) => authAPI.revokeTrustedDevice(accessToken, device.id))
              );
              Alert.alert('Success', 'All other devices logged out');
              loadDevices();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to logout devices');
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType.toLowerCase()) {
      case 'mobile':
      case 'ios':
      case 'android':
        return '📱';
      case 'tablet':
      case 'ipad':
        return '📱';
      case 'desktop':
      case 'windows':
      case 'macos':
      case 'linux':
        return '💻';
      default:
        return '🖥️';
    }
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center p-6">
        <Text variant="h3">Loading devices...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center p-6">
        <Text variant="h3" className="mb-4 text-destructive">
          {error}
        </Text>
        <Button onPress={() => loadDevices()}>
          <Text>Try Again</Text>
        </Button>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1"
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={() => loadDevices(true)} />
      }>
      <View className="p-6">
        <Text variant="h1" className="mb-2">
          Trusted Devices
        </Text>
        <Text className="mb-6 text-muted-foreground">
          Manage devices that have access to your account. You can revoke access from any device at
          any time.
        </Text>

        {devices.length > 1 && (
          <Button onPress={handleRevokeAllOtherDevices} variant="destructive" className="mb-6">
            <Text>Logout All Other Devices</Text>
          </Button>
        )}

        {devices.length === 0 ? (
          <Card className="items-center p-6">
            <Text className="text-muted-foreground">No devices found</Text>
          </Card>
        ) : (
          <View className="gap-4">
            {devices.map((device) => (
              <Card key={device.id} className="p-4">
                <View className="flex-row items-start">
                  <Text className="mr-3 text-2xl">{getDeviceIcon(device.device_type)}</Text>
                  <View className="flex-1">
                    <View className="mb-1 flex-row items-center">
                      <Text variant="h3" className="flex-1">
                        {device.name}
                      </Text>
                      {device.is_current && (
                        <View className="rounded bg-green-500 px-2 py-1">
                          <Text variant="small" className="font-medium text-white">
                            This Device
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text variant="small" className="mb-1 text-muted-foreground">
                      {device.device_type}
                    </Text>
                    <Text variant="small" className="text-muted-foreground">
                      Last used: {formatDate(device.last_used)}
                    </Text>
                    <Text variant="small" className="text-muted-foreground">
                      Added: {formatDate(device.created_at)}
                    </Text>
                    {!device.is_current && (
                      <Button
                        onPress={() => handleRevokeDevice(device.id, device.name)}
                        variant="destructive"
                        className="mt-3">
                        <Text variant="small">Revoke Access</Text>
                      </Button>
                    )}
                  </View>
                </View>
              </Card>
            ))}
          </View>
        )}

        <View className="mt-6 rounded-lg bg-muted/50 p-4">
          <Text variant="small" className="text-muted-foreground">
            💡 Tip: If you see an unfamiliar device, revoke its access immediately and change your
            password.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
