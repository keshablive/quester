import React from 'react';
import { View, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { ScreenWrapper } from '@/components/screen-wrapper';
import { WalletBalance } from '@/components/marketplace/wallet-balance';
import { useWallet } from '@/hooks/use-wallet';
import { useScreenPerformanceMetrics } from '@/lib/hooks/use-performance-metrics';

export default function WalletScreen() {
  const router = useRouter();

  useScreenPerformanceMetrics('WalletScreen');

  const { wallet, isLoading, isRefreshing, error, refresh } = useWallet({
    autoRefresh: true,
    refreshInterval: 30000,
  });

  const handleWithdraw = () => {
    // Navigate to withdrawal screen
    router.push('/marketplace/withdraw' as any);
  };

  const handleViewTransactions = () => {
    router.push('/marketplace/transactions' as any);
  };

  const handleViewEscrow = () => {
    router.push('/marketplace/transactions?tab=escrow' as any);
  };

  if (isLoading && !wallet) {
    return (
      <ScreenWrapper screenName="WalletScreen">
        <SafeAreaView className="flex-1 items-center justify-center bg-background">
          <Text className="text-muted-foreground">Loading wallet...</Text>
        </SafeAreaView>
      </ScreenWrapper>
    );
  }

  if (error && !wallet) {
    return (
      <ScreenWrapper screenName="WalletScreen">
        <SafeAreaView className="flex-1 items-center justify-center bg-background">
          <Text className="mb-4 text-destructive">{error}</Text>
          <Button onPress={refresh}>
            <Text>Retry</Text>
          </Button>
        </SafeAreaView>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper screenName="WalletScreen">
      <SafeAreaView className="flex-1 bg-background">
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 16 }}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refresh} />}>
          {/* Page Title */}
          <Text className="mb-6 text-2xl font-bold">My Wallet</Text>

          {/* Wallet Balance Card */}
          {wallet && (
            <WalletBalance
              wallet={wallet}
              onWithdraw={handleWithdraw}
              onViewTransactions={handleViewTransactions}
              onViewEscrow={handleViewEscrow}
            />
          )}

          {/* Error Display */}
          {error && (
            <View className="mt-4 rounded-md bg-destructive/10 p-3">
              <Text className="text-sm text-destructive">{error}</Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </ScreenWrapper>
  );
}
