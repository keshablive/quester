/**
 * Notifications Page
 *
 * Route file for notifications view with settings tab.
 * Uses TanStack Query via NotificationList component.
 *
 * Phase 3 Migration: Verified TanStack Query integration
 * FR-009: System MUST migrate Notifications page to use TanStack Query
 *
 * @module app/notifications
 */

import React, { useState } from 'react';
import { View } from 'react-native';
import { Tabs, TabsList, TabsTrigger, TabsContent, Icon, Text } from '@/components/ui';
import { Bell, Settings as SettingsIcon } from 'lucide-react-native';
import { NotificationList, NotificationSettings } from '@/components/pages/notifications';
import { OfflineIndicator } from '@/components/shared';
import { ChunkErrorBoundary } from '@/core/routes';

export default function NotificationsPage() {
  const [activeTab, setActiveTab] = useState('list');

  return (
    <ChunkErrorBoundary>
      <View className="flex-1 bg-background">
        <OfflineIndicator />
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <TabsList className="flex-row border-b border-border bg-card">
            <TabsTrigger value="list" className="flex-1 flex-row items-center justify-center py-4">
              <Icon as={Bell} size={20} className="mr-2" />
              <Text>Notifications</Text>
            </TabsTrigger>
            <TabsTrigger
              value="settings"
              className="flex-1 flex-row items-center justify-center py-4">
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
    </ChunkErrorBoundary>
  );
}
