import { View, ScrollView } from 'react-native';
import {
  DashboardHeader,
  StatsCards,
  QuickActions,
  RecentActivity,
} from '@/components/pages/dashboard';
import { OfflineIndicator } from '@/components/shared';

export default function DashboardPage() {
  return (
    <View className="flex-1">
      <OfflineIndicator />
      <ScrollView className="flex-1">
        <View className="gap-6 p-6">
          <DashboardHeader />
          <StatsCards />
          <QuickActions />
          <RecentActivity />
        </View>
      </ScrollView>
    </View>
  );
}
