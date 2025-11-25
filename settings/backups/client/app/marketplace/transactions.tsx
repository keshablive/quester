import React, { useState } from 'react';
import { View, FlatList, RefreshControl, Alert } from 'react-native';
import { Text } from '@/components/ui/text';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EscrowStatus } from '@/components/marketplace/escrow-status';
import { ScreenWrapper } from '@/components/screen-wrapper';
import { useScreenPerformanceMetrics } from '@/lib/hooks/use-performance-metrics';
import { ShoppingCart, Package, DollarSign, AlertCircle, CheckCircle } from 'lucide-react-native';
import { useTransactions } from '@/lib/hooks/useTransactions';
import { useConfirmDelivery, useReleaseFunds } from '@/lib/hooks/useTransactions';
import { Transaction } from '@/lib/api/transactions';

type TabType = 'all' | 'buyer' | 'seller';

export default function MyTransactionsScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [page, setPage] = useState(1);

  useScreenPerformanceMetrics('MyTransactionsScreen');

  const { data, isLoading, refetch } = useTransactions(
    activeTab === 'all' ? 'all' : activeTab,
    page,
    20
  );

  const handleViewDetails = (transactionId: string) => {
    router.push(`/marketplace/transaction/${transactionId}` as any);
  };

  const formatPrice = (price: number, currency: string) => {
    const symbol = currency === 'INR' ? '₹' : '$';
    return `${symbol}${price.toLocaleString()}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <ScreenWrapper screenName="MyTransactionsScreen">
      <SafeAreaView className="flex-1 bg-background">
        {/* Header */}
        <View className="border-b border-border px-4 py-3">
          <Text className="mb-4 text-2xl font-bold text-foreground">My Transactions</Text>

          {/* Tabs */}
          <View className="flex-row gap-2" accessibilityRole="tablist">
            {[
              { key: 'all' as TabType, label: 'All', icon: DollarSign },
              { key: 'buyer' as TabType, label: 'Purchases', icon: ShoppingCart },
              { key: 'seller' as TabType, label: 'Sales', icon: Package },
            ].map((tab) => (
              <Button
                key={tab.key}
                variant={activeTab === tab.key ? 'default' : 'secondary'}
                onPress={() => {
                  setActiveTab(tab.key);
                  setPage(1);
                }}
                accessibilityRole="tab"
                accessibilityState={{ selected: activeTab === tab.key }}
                accessibilityLabel={`${tab.label} transactions tab`}
                className="flex-1 flex-row items-center justify-center">
                <tab.icon size={16} color={activeTab === tab.key ? 'white' : '#6b7280'} />
                <Text
                  className={`ml-2 font-medium ${
                    activeTab === tab.key ? 'text-white' : 'text-muted-foreground'
                  }`}>
                  {tab.label}
                </Text>
              </Button>
            ))}
          </View>
        </View>

        {/* Transactions List */}
        <FlatList
          data={data?.transactions || []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => (
            <TransactionCard
              transaction={item}
              activeTab={activeTab}
              onPress={() => handleViewDetails(item.id)}
              formatPrice={formatPrice}
              formatDate={formatDate}
            />
          )}
          accessibilityRole="list"
          accessibilityLabel="Transactions list"
          removeClippedSubviews
          maxToRenderPerBatch={10}
          windowSize={21}
          initialNumToRender={10}
          updateCellsBatchingPeriod={50}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center py-12" accessible>
              {isLoading ? (
                <Text className="text-muted-foreground">Loading transactions...</Text>
              ) : (
                <View className="items-center">
                  <Text className="mb-2 text-lg text-muted-foreground">No transactions found</Text>
                  <Text className="text-sm text-muted-foreground">
                    Your{' '}
                    {activeTab === 'buyer'
                      ? 'purchases'
                      : activeTab === 'seller'
                        ? 'sales'
                        : 'transactions'}{' '}
                    will appear here
                  </Text>
                </View>
              )}
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={refetch}
              accessibilityLabel="Pull to refresh transactions"
            />
          }
          onEndReached={() => {
            if (data && data.page < Math.ceil(data.total / 20)) {
              setPage(page + 1);
            }
          }}
          onEndReachedThreshold={0.5}
        />
      </SafeAreaView>
    </ScreenWrapper>
  );
}

interface TransactionCardProps {
  transaction: Transaction;
  activeTab: TabType;
  onPress: () => void;
  formatPrice: (price: number, currency: string) => string;
  formatDate: (dateString: string) => string;
}

function TransactionCard({
  transaction,
  activeTab,
  onPress,
  formatPrice,
  formatDate,
}: TransactionCardProps) {
  const confirmDeliveryMutation = useConfirmDelivery(transaction.id);
  const releaseFundsMutation = useReleaseFunds(transaction.id);

  const isBuyer = activeTab === 'buyer' || activeTab === 'all';
  const isSeller = activeTab === 'seller' || activeTab === 'all';

  const handleConfirmDelivery = () => {
    Alert.alert(
      'Confirm Delivery',
      'Have you delivered the item to the buyer? This will start the 7-day auto-release timer.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () => {
            confirmDeliveryMutation.mutate(undefined, {
              onSuccess: () => {
                Alert.alert(
                  'Success',
                  'Delivery confirmed! Buyer has 7 days to release funds or open a dispute.'
                );
              },
              onError: (error: any) => {
                Alert.alert('Error', error.response?.data?.error || 'Failed to confirm delivery');
              },
            });
          },
        },
      ]
    );
  };

  const handleReleaseFunds = () => {
    Alert.alert(
      'Release Funds',
      'Are you satisfied with the delivery? This will release the payment to the seller.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Release',
          style: 'default',
          onPress: () => {
            releaseFundsMutation.mutate(undefined, {
              onSuccess: () => {
                Alert.alert('Success', 'Funds released to seller!');
              },
              onError: (error: any) => {
                Alert.alert('Error', error.response?.data?.error || 'Failed to release funds');
              },
            });
          },
        },
      ]
    );
  };

  return (
    <Button
      variant="ghost"
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Transaction for ${transaction.listing?.title || 'Deleted Listing'}, ${formatPrice(transaction.amount, transaction.currency)}`}
      className="mb-4 p-0">
      <Card className="w-full overflow-hidden">
        <View className="p-4">
          {/* Header */}
          <View className="mb-3 flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="mb-1 font-bold text-foreground" numberOfLines={1}>
                {transaction.listing?.title || 'Deleted Listing'}
              </Text>
              <Text className="text-xs text-muted-foreground">
                {formatDate(transaction.created_at)}
              </Text>
            </View>
            <View className="ml-3">
              <Text className="text-right text-lg font-bold text-primary">
                {formatPrice(transaction.amount, transaction.currency)}
              </Text>
              {isSeller && (
                <Text className="text-right text-xs text-green-600">
                  You receive: {formatPrice(transaction.seller_payout, transaction.currency)}
                </Text>
              )}
            </View>
          </View>

          {/* Role Badge */}
          <View className="mb-3 flex-row items-center">
            {isBuyer && (
              <Badge variant="outline" className="mr-2">
                <ShoppingCart size={12} color="#6b7280" />
                <Text className="ml-1">Purchase</Text>
              </Badge>
            )}
            {isSeller && (
              <Badge variant="outline" className="mr-2">
                <Package size={12} color="#6b7280" />
                <Text className="ml-1">Sale</Text>
              </Badge>
            )}
            <Badge variant="secondary">
              {transaction.listing?.listing_type?.replace('_', ' ')}
            </Badge>
          </View>

          {/* Escrow Status */}
          <EscrowStatus
            status={transaction.status}
            escrowHeldAt={transaction.escrow_held_at}
            deliveryConfirmedAt={transaction.delivery_confirmed_at}
            fundsReleasedAt={transaction.funds_released_at}
            autoReleaseDate={transaction.auto_release_date}
            disputeOpenedAt={transaction.dispute_opened_at}
            showTimeline={false}
          />

          {/* Action Buttons */}
          {isSeller && transaction.status === 'escrow_held' && (
            <Button
              onPress={handleConfirmDelivery}
              disabled={confirmDeliveryMutation.isPending}
              className="mt-3">
              <CheckCircle size={16} color="white" />
              <Text className="ml-2 text-white">
                {confirmDeliveryMutation.isPending ? 'Confirming...' : 'Confirm Delivery'}
              </Text>
            </Button>
          )}

          {isBuyer && transaction.status === 'delivered' && (
            <View className="mt-3 flex-row gap-2">
              <Button
                onPress={handleReleaseFunds}
                disabled={releaseFundsMutation.isPending}
                className="flex-1">
                <CheckCircle size={16} color="white" />
                <Text className="ml-2 text-white">
                  {releaseFundsMutation.isPending ? 'Releasing...' : 'Release Funds'}
                </Text>
              </Button>
              <Button onPress={() => {}} variant="outline" className="flex-1">
                <AlertCircle size={16} color="#6b7280" />
                <Text className="ml-2">Dispute</Text>
              </Button>
            </View>
          )}
        </View>
      </Card>
    </Button>
  );
}
