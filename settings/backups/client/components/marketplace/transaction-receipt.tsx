import React from 'react';
import { View, ScrollView } from 'react-native';
import { Download, Check, Clock, AlertCircle, XCircle } from 'lucide-react-native';
import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import type { Transaction } from '@/lib/types/marketplace';

interface TransactionReceiptProps {
  transaction: Transaction;
  onDownload?: () => void;
  onContactSupport?: () => void;
}

export const TransactionReceipt = React.memo<TransactionReceiptProps>(
  ({ transaction, onDownload, onContactSupport }) => {
    const {
      id,
      type,
      amount,
      currency,
      status,
      createdAt,
      completedAt,
      description,
      itemTitle,
      seller,
      buyer,
    } = transaction;

    const formatCurrency = (value: number) => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency || 'USD',
      }).format(Math.abs(value));
    };

    const formatDate = (timestamp: number) => {
      return new Date(timestamp).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    };

    // Status configuration
    const statusConfig = {
      pending: {
        icon: Clock,
        color: 'hsl(48, 96%, 53%)',
        label: 'Pending',
        variant: 'secondary' as const,
      },
      processing: {
        icon: Clock,
        color: 'hsl(221, 83%, 53%)',
        label: 'Processing',
        variant: 'secondary' as const,
      },
      completed: {
        icon: Check,
        color: 'hsl(142, 76%, 36%)',
        label: 'Completed',
        variant: 'default' as const,
      },
      failed: {
        icon: XCircle,
        color: 'hsl(0, 84%, 60%)',
        label: 'Failed',
        variant: 'destructive' as const,
      },
      refunded: {
        icon: AlertCircle,
        color: 'hsl(48, 96%, 53%)',
        label: 'Refunded',
        variant: 'secondary' as const,
      },
    };

    const config = statusConfig[status];
    const StatusIcon = config.icon;

    // Transaction type label
    const getTypeLabel = () => {
      switch (type) {
        case 'purchase':
          return 'Purchase';
        case 'sale':
          return 'Sale';
        case 'earning':
          return 'Earning';
        case 'refund':
          return 'Refund';
        default:
          return 'Transaction';
      }
    };

    return (
      <Card className="flex-1" testID="transaction-receipt">
        <ScrollView className="flex-1">
          <View className="p-4">
            {/* Header */}
            <View className="mb-6 items-center">
              <View
                className="mb-3 h-16 w-16 items-center justify-center rounded-full"
                style={{ backgroundColor: `${config.color}20` }}>
                <StatusIcon size={32} color={config.color} />
              </View>
              <Text variant="h2" className="mb-2">
                Transaction Receipt
              </Text>
              <Badge variant={config.variant} testID="transaction-status">
                <Text variant="small">{config.label}</Text>
              </Badge>
            </View>

            {/* Transaction ID */}
            <View className="mb-4">
              <Text variant="small" className="mb-1 text-muted-foreground">
                Transaction ID
              </Text>
              <Text variant="code" selectable>
                {id}
              </Text>
            </View>

            <Separator className="my-4" />

            {/* Details Section */}
            <View className="mb-4 gap-3">
              {/* Type */}
              <View>
                <Text variant="small" className="mb-1 text-muted-foreground">
                  Type
                </Text>
                <Text variant="p">{getTypeLabel()}</Text>
              </View>

              {/* Description */}
              <View>
                <Text variant="small" className="mb-1 text-muted-foreground">
                  Description
                </Text>
                <Text variant="p">{description}</Text>
              </View>

              {/* Item Title (if available) */}
              {itemTitle && (
                <View>
                  <Text variant="small" className="mb-1 text-muted-foreground">
                    Item
                  </Text>
                  <Text variant="h4">{itemTitle}</Text>
                </View>
              )}

              {/* Seller Info (for purchases) */}
              {seller && (
                <View>
                  <Text variant="small" className="mb-1 text-muted-foreground">
                    Seller
                  </Text>
                  <View className="flex-row items-center gap-2">
                    {seller.avatar && <View className="h-8 w-8 rounded-full bg-secondary" />}
                    <Text variant="p">{seller.username}</Text>
                  </View>
                </View>
              )}

              {/* Buyer Info (for sales) */}
              {buyer && (
                <View>
                  <Text variant="small" className="mb-1 text-muted-foreground">
                    Buyer
                  </Text>
                  <View className="flex-row items-center gap-2">
                    {buyer.avatar && <View className="h-8 w-8 rounded-full bg-secondary" />}
                    <Text variant="p">{buyer.username}</Text>
                  </View>
                </View>
              )}

              {/* Created Date */}
              <View>
                <Text variant="small" className="mb-1 text-muted-foreground">
                  Date
                </Text>
                <Text variant="p">{formatDate(createdAt)}</Text>
              </View>

              {/* Completed Date (if completed) */}
              {completedAt && (
                <View>
                  <Text variant="small" className="mb-1 text-muted-foreground">
                    Completed
                  </Text>
                  <Text variant="p">{formatDate(completedAt)}</Text>
                </View>
              )}
            </View>

            <Separator className="my-4" />

            {/* Amount */}
            <View className="mb-4 rounded-md bg-secondary/50 p-4">
              <View className="flex-row items-center justify-between">
                <Text variant="p" className="text-muted-foreground">
                  Amount
                </Text>
                <Text
                  variant="h2"
                  style={{
                    color: amount > 0 ? 'hsl(142, 76%, 36%)' : 'hsl(0, 84%, 60%)',
                  }}>
                  {amount > 0 ? '+' : '-'}
                  {formatCurrency(amount)}
                </Text>
              </View>
            </View>

            {/* Status-specific Messages */}
            {status === 'completed' && (
              <View className="mb-4 rounded-md bg-green-500/10 p-3">
                <Text variant="small" className="text-green-700 dark:text-green-400">
                  ✓ Transaction completed successfully
                </Text>
              </View>
            )}

            {status === 'failed' && (
              <View className="mb-4 rounded-md bg-red-500/10 p-3">
                <Text variant="small" className="text-red-700 dark:text-red-400">
                  ✗ Transaction failed. Please contact support if you need assistance.
                </Text>
              </View>
            )}

            {status === 'refunded' && (
              <View className="mb-4 rounded-md bg-yellow-500/10 p-3">
                <Text variant="small" className="text-yellow-700 dark:text-yellow-400">
                  ⟲ This transaction has been refunded to your original payment method.
                </Text>
              </View>
            )}

            {status === 'pending' && (
              <View className="mb-4 rounded-md bg-blue-500/10 p-3">
                <Text variant="small" className="text-blue-700 dark:text-blue-400">
                  ⏳ Transaction is being processed. This may take a few minutes.
                </Text>
              </View>
            )}

            {/* Action Buttons */}
            <View className="gap-2">
              {onDownload && (
                <Button
                  variant="outline"
                  onPress={onDownload}
                  className="w-full"
                  testID="download-receipt-button"
                  accessibilityLabel="Download receipt as PDF">
                  <View className="flex-row items-center gap-2">
                    <Download size={18} />
                    <Text>Download Receipt</Text>
                  </View>
                </Button>
              )}

              {(status === 'failed' || status === 'refunded') && onContactSupport && (
                <Button
                  variant="outline"
                  onPress={onContactSupport}
                  className="w-full"
                  testID="contact-support-button"
                  accessibilityLabel="Contact customer support">
                  <Text>Contact Support</Text>
                </Button>
              )}
            </View>

            {/* Footer Note */}
            <View className="mt-6 border-t border-border pt-4">
              <Text variant="small" className="text-center text-muted-foreground">
                For questions about this transaction, please contact support with Transaction ID:{' '}
                {id}
              </Text>
            </View>
          </View>
        </ScrollView>
      </Card>
    );
  }
);

TransactionReceipt.displayName = 'TransactionReceipt';
