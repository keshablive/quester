import React, { useState } from 'react';
import { View } from 'react-native';
import { Tabs, TabsList, TabsTrigger, TabsContent, Icon, Text } from '@/components/ui';
import { Bell, Settings as SettingsIcon } from 'lucide-react-native';
import { NotificationList, NotificationSettings } from '@/components/pages/notifications';

export default function NotificationsPage() {
  const [activeTab, setActiveTab] = useState('list');

  return (
    <View className="flex-1 bg-background">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
        <TabsList className="flex-row border-b border-border bg-card">
          <TabsTrigger value="list" className="flex-1 flex-row items-center justify-center py-4">
            <Icon as={Bell} size={20} className="mr-2" />
            <Text>Notifications</Text>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex-1 flex-row items-center justify-center py-4">
            <Icon as={SettingsIcon} size={20} className="mr-2" />
            <Text>Settings</Text>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="flex-1">
          <NotificationList />
        </TabsContent>

        <TabsContent value="settings" className="flex-1">
          <NotificationSettings />
        </TabsContent>
      </Tabs>
    </View>
  );
}
