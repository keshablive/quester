import React from 'react';
import { View } from 'react-native';
import { Wallet, TrendingUp, Clock, DollarSign, Eye, EyeOff } from 'lucide-react-native';
import { Text } from '@/components/ui/text';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { WalletState } from '@/lib/types/marketplace';

interface WalletBalanceProps {
  wallet: WalletState;
  onWithdraw?: () => void;
  onViewTransactions?: () => void;
  onViewEscrow?: () => void;
}

export const WalletBalance = React.memo<WalletBalanceProps>(
  ({ wallet, onWithdraw, onViewTransactions, onViewEscrow }) => {
    const { availableBalance, pendingEscrow, totalEarnings, currency } = wallet;
    const [hideBalance, setHideBalance] = React.useState(false);

    const formatCurrency = (amount: number) => {
      if (hideBalance) {
        return '••••••';
      }
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency || 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount);
    };

    const totalBalance = availableBalance + pendingEscrow;

    return (
      <Card testID="wallet-balance">
        {/* Header with Hide Balance Toggle */}
        <CardHeader className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <Wallet size={24} color="gray" />
            <CardTitle>Wallet</CardTitle>
          </View>
          <Button
            variant="ghost"
            size="sm"
            onPress={() => setHideBalance(!hideBalance)}
            accessibilityLabel={hideBalance ? 'Show balance' : 'Hide balance'}
            accessibilityHint="Toggle balance visibility">
            {hideBalance ? <Eye size={20} /> : <EyeOff size={20} />}
          </Button>
        </CardHeader>

        <CardContent>
          {/* Available Balance - Primary Display */}
          <View className="mb-6" testID="available-balance">
            <Text variant="small" className="mb-1 text-muted-foreground">
              Available Balance
            </Text>
            <Text
              className="text-4xl font-bold text-primary"
              accessibilityLabel={`Available balance: ${formatCurrency(availableBalance)}`}>
              {formatCurrency(availableBalance)}
            </Text>
            <Text variant="small" className="mt-1 text-muted-foreground">
              Ready to withdraw or spend
            </Text>
          </View>

          {/* Balance Cards Grid */}
          <View className="mb-4 flex-row gap-3">
            {/* Pending Escrow */}
            <View
              className="flex-1 rounded-md bg-secondary/50 p-3"
              testID="pending-escrow"
              accessibilityLabel={`Pending in escrow: ${formatCurrency(pendingEscrow)}`}>
              <View className="mb-2 flex-row items-center gap-2">
                <Clock size={16} color="gray" />
                <Text variant="small" className="text-muted-foreground">
                  Pending Escrow
                </Text>
              </View>
              <Text variant="h2">{formatCurrency(pendingEscrow)}</Text>
              {pendingEscrow > 0 && (
                <Button
                  variant="link"
                  size="sm"
                  onPress={onViewEscrow}
                  className="mt-2 p-0"
                  accessibilityLabel="View escrow transactions">
                  <Text variant="small">View Details</Text>
                </Button>
              )}
            </View>

            {/* Total Earnings */}
            <View
              className="flex-1 rounded-md bg-secondary/50 p-3"
              testID="total-earnings"
              accessibilityLabel={`Total earnings: ${formatCurrency(totalEarnings)}`}>
              <View className="mb-2 flex-row items-center gap-2">
                <TrendingUp size={16} color="green" />
                <Text variant="small" className="text-muted-foreground">
                  Total Earnings
                </Text>
              </View>
              <Text variant="h2" className="text-green-600 dark:text-green-400">
                {formatCurrency(totalEarnings)}
              </Text>
              <Text variant="small" className="mt-1 text-muted-foreground">
                All time
              </Text>
            </View>
          </View>

          {/* Total Balance Summary */}
          <View className="mb-4 rounded-md bg-primary/10 p-3">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <DollarSign size={16} color="gray" />
                <Text variant="small" className="text-muted-foreground">
                  Total Balance
                </Text>
              </View>
              <Text variant="h3">{formatCurrency(totalBalance)}</Text>
            </View>
            <Text variant="small" className="mt-1 text-muted-foreground">
              Available + Pending
            </Text>
          </View>

          {/* Action Buttons */}
          <View className="gap-2">
            {onWithdraw && availableBalance > 0 && (
              <Button
                onPress={onWithdraw}
                className="w-full"
                testID="withdraw-button"
                accessibilityLabel="Withdraw funds to bank account">
                <Text>Withdraw Funds</Text>
              </Button>
            )}

            {onViewTransactions && (
              <Button
                variant="outline"
                onPress={onViewTransactions}
                className="w-full"
                testID="view-transactions-button"
                accessibilityLabel="View transaction history">
                <Text>View Transactions</Text>
              </Button>
            )}
          </View>

          {/* Info Note */}
          {pendingEscrow > 0 && (
            <View className="mt-4 rounded-md bg-secondary/30 p-3">
              <Text variant="small" className="text-muted-foreground">
                💡 Funds in escrow will be automatically released after the buyer confirms delivery
                or the escrow period expires.
              </Text>
            </View>
          )}

          {availableBalance === 0 && pendingEscrow === 0 && totalEarnings === 0 && (
            <View className="mt-4 items-center rounded-md bg-secondary/30 p-4">
              <Text variant="small" className="text-center text-muted-foreground">
                Your wallet is empty. Start selling courses, quests, or certificates to earn!
              </Text>
            </View>
          )}
        </CardContent>
      </Card>
    );
  }
);

WalletBalance.displayName = 'WalletBalance';
