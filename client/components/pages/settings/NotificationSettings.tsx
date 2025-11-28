import * as React from 'react';
import { View } from 'react-native';
import { Text, Card, Switch, Label, Icon, Separator } from '@/components/ui';
import { Bell } from 'lucide-react-native';

export function NotificationSettings() {
  const [notifications, setNotifications] = React.useState(true);
  const [emailUpdates, setEmailUpdates] = React.useState(false);

  return (
    <View>
      <Text className="text-lg font-semibold mb-3">Notifications</Text>
      <Card className="p-4 gap-4">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-3 flex-1">
            <Icon as={Bell} size={20} />
            <View className="flex-1">
              <Label nativeID="push">Push Notifications</Label>
              <Text className="text-sm text-muted-foreground">
                Receive push notifications
              </Text>
            </View>
          </View>
          <Switch 
            checked={notifications}
            onCheckedChange={setNotifications}
            nativeID="push"
          />
        </View>

        <Separator />

        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <Label nativeID="email">Email Updates</Label>
            <Text className="text-sm text-muted-foreground">
              Get email about your activity
            </Text>
          </View>
          <Switch 
            checked={emailUpdates}
            onCheckedChange={setEmailUpdates}
            nativeID="email"
          />
        </View>
      </Card>
    </View>
  );
}
