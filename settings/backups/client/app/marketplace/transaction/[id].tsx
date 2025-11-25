import React, { useState, useEffect } from 'react';
import { View, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { ScreenWrapper } from '@/components/screen-wrapper';
import { TransactionReceipt } from '@/components/marketplace/transaction-receipt';
import { EscrowStatusIndicator } from '@/components/marketplace/escrow-status-indicator';
import { useScreenPerformanceMetrics } from '@/lib/hooks/use-performance-metrics';
import { useWallet } from '@/hooks/use-wallet';
import QuickActionsMenu from '@/components/navigation/quick-actions-menu';
import SuggestedContent from '@/components/workflow/suggested-content';
import { useWorkflowAnalytics } from '@/lib/utils/workflow-analytics';
import { useGamificationFeedback } from '@/lib/hooks/use-gamification-feedback';
import { XPGainAnimation } from '@/components/gamification/xp-gain-animation';
import LevelUpModal from '@/components/gamification/level-up-modal';

export default function MarketplaceTransactionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [showQuickActions, setShowQuickActions] = useState(true);
  const analytics = useWorkflowAnalytics();

  // Gamification feedback hook
  const {
    awardXP,
    dismissXPAnimation,
    dismissLevelUpModal,
    activeXPAnimation,
    showLevelUpModal,
    levelUpInfo,
  } = useGamificationFeedback();

  // Fetch transaction details using wallet hook
  const {
    fetchTransactionDetails,
    confirmDelivery,
    initiateDispute,
    escrowTransactions,
    fetchEscrowTransactions,
  } = useWallet();

  const [transaction, setTransaction] = React.useState<any>(null);
  const [escrow, setEscrow] = React.useState<any>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  useScreenPerformanceMetrics('MarketplaceTransactionScreen');

  React.useEffect(() => {
    const loadTransaction = async () => {
      if (!id) return;

      setIsLoading(true);
      const txn = await fetchTransactionDetails(id);
      setTransaction(txn);

      // Fetch escrow if transaction involves escrow
      if (txn && (txn.type === 'purchase' || txn.type === 'sale')) {
        await fetchEscrowTransactions();
        // Find matching escrow for this transaction
        const matchingEscrow = escrowTransactions.find((e: any) => e.transactionId === id);
        setEscrow(matchingEscrow);
      }

      setIsLoading(false);
    };

    loadTransaction();
  }, [id]);

  useEffect(() => {
    if (transaction && transaction.status === 'completed' && transaction.type === 'purchase') {
      // Track payment workflow
      const workflowId = `payment_success_${id}_${Date.now()}`;
      analytics.startWorkflow(workflowId, 'marketplace', id || 'transaction-unknown');

      // Award XP for marketplace purchase (75 XP)
      awardXP(75, 'marketplace_purchase');

      return () => {
        analytics.completeWorkflow(`payment_success_${id}`);
      };
    }
    return undefined;
  }, [transaction, id]);

  const handleDownloadReceipt = () => {
    Alert.alert('Download Receipt', 'Receipt download functionality will be implemented here.');
  };

  const handleContactSupport = () => {
    router.push(('/support?context=transaction&id=' + id) as any);
  };

  const handleConfirmDelivery = async () => {
    if (!escrow) return;

    try {
      await confirmDelivery(escrow.id);
      Alert.alert('Success', 'Delivery confirmed. Funds will be released to the seller.');
      // Reload transaction
      const updated = await fetchTransactionDetails(id);
      setTransaction(updated);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to confirm delivery');
    }
  };

  const handleInitiateDispute = async () => {
    if (!escrow) return;

    Alert.prompt(
      'Report Issue',
      'Please describe the issue with this transaction:',
      async (reason) => {
        if (!reason) return;

        try {
          await initiateDispute(escrow.id, reason);
          Alert.alert('Dispute Initiated', 'Our support team will review your case.');
          // Reload escrow status
          await fetchEscrowTransactions();
        } catch (error: any) {
          Alert.alert('Error', error.message || 'Failed to initiate dispute');
        }
      }
    );
  };

  if (isLoading) {
    return (
      <ScreenWrapper screenName="MarketplaceTransactionScreen">
        <SafeAreaView className="flex-1 items-center justify-center bg-background">
          <Text className="text-muted-foreground">Loading transaction...</Text>
        </SafeAreaView>
      </ScreenWrapper>
    );
  }

  if (!transaction) {
    return (
      <ScreenWrapper screenName="MarketplaceTransactionScreen">
        <SafeAreaView className="flex-1 items-center justify-center bg-background">
          <Text className="mb-4 text-destructive">Transaction not found</Text>
          <Button onPress={() => router.back()}>
            <Text>Go Back</Text>
          </Button>
        </SafeAreaView>
      </ScreenWrapper>
    );
  }

  const paymentSuccess = transaction.status === 'completed';

  return (
    <ScreenWrapper screenName="MarketplaceTransactionScreen">
      <SafeAreaView className="flex-1 bg-background">
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 16 }}
          accessibilityLabel="Transaction details"
          removeClippedSubviews>
          {/* XP Gain Animation */}
          {activeXPAnimation && (
            <XPGainAnimation
              amount={activeXPAnimation.amount}
              source={activeXPAnimation.source}
              visible={true}
              onComplete={dismissXPAnimation}
            />
          )}

          {/* Level Up Modal */}
          {showLevelUpModal && levelUpInfo && (
            <LevelUpModal
              visible={true}
              level={levelUpInfo.level}
              unlockedFeatures={levelUpInfo.unlockedFeatures}
              onClose={dismissLevelUpModal}
            />
          )}

          {/* Transaction Receipt */}
          <TransactionReceipt
            transaction={transaction}
            onDownload={handleDownloadReceipt}
            onContactSupport={handleContactSupport}
          />

          {/* Escrow Status (if applicable) */}
          {escrow && (
            <View className="mt-4">
              <EscrowStatusIndicator
                escrow={escrow}
                userType={transaction.type === 'purchase' ? 'buyer' : 'seller'}
                onConfirmDelivery={handleConfirmDelivery}
                onInitiateDispute={handleInitiateDispute}
              />
            </View>
          )}

          {/* Quick Actions for Payment Success */}
          {paymentSuccess && showQuickActions && (
            <View className="mt-6 rounded-lg bg-secondary/50 p-4">
              <View className="mb-3 flex-row items-center justify-between">
                <Text className="text-lg font-semibold">What's Next?</Text>
                <Button variant="ghost" onPress={() => setShowQuickActions(false)}>
                  <Text className="text-sm text-primary">Dismiss</Text>
                </Button>
              </View>
              <QuickActionsMenu
                currentFeature="marketplace"
                onActionPress={(action) => {
                  analytics.trackQuickAction(
                    'marketplace',
                    action.feature as any,
                    id || 'transaction-unknown',
                    action.id
                  );
                  if (action.id === 'browse-marketplace') router.push('/marketplace' as any);
                  else if (action.id === 'sell-item') router.push('/marketplace/create' as any);
                }}
                layout="horizontal"
                maxActions={3}
              />
            </View>
          )}

          {/* Suggested Content */}
          {paymentSuccess && (
            <View className="mt-6">
              <Text className="mb-3 text-lg font-semibold">Recommended for You</Text>
              <SuggestedContent
                currentFeature="marketplace"
                context="payment_received"
                contextData={{
                  transactionId: id,
                  itemPurchased: true,
                }}
                onSuggestionPress={(suggestion: any) => {
                  analytics.trackSuggestionClick(
                    'marketplace',
                    suggestion.targetFeature,
                    id || 'transaction-unknown',
                    suggestion.targetId,
                    suggestion.type
                  );
                  if (suggestion.route) router.push(suggestion.route);
                }}
                layout="list"
                maxSuggestions={3}
              />
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </ScreenWrapper>
  );
}
