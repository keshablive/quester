import React from 'react';
import { View } from 'react-native';
import { Clock, AlertCircle, CheckCircle, ShieldAlert } from 'lucide-react-native';
import { Text } from '@/components/ui/text';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import type { EscrowStatus } from '@/lib/types/marketplace';

interface EscrowStatusIndicatorProps {
  escrow: EscrowStatus;
  userType: 'buyer' | 'seller';
  onConfirmDelivery?: () => void;
  onInitiateDispute?: () => void;
}

export const EscrowStatusIndicator = React.memo<EscrowStatusIndicatorProps>(
  ({ escrow, userType, onConfirmDelivery, onInitiateDispute }) => {
    const { status, amount, releaseDate, daysRemaining, canConfirm, canDispute } = escrow;

    // Calculate progress percentage (0-100)
    const progressPercentage = Math.max(0, 100 - (daysRemaining / 7) * 100);

    // Status configuration
    const statusConfig = {
      held: {
        icon: Clock,
        color: 'hsl(48, 96%, 53%)', // yellow
        label: 'Funds Held in Escrow',
        description:
          userType === 'buyer'
            ? 'Funds are securely held until you confirm delivery'
            : 'Funds will be released once buyer confirms delivery',
      },
      released: {
        icon: CheckCircle,
        color: 'hsl(142, 76%, 36%)', // green
        label: 'Funds Released',
        description:
          userType === 'seller'
            ? 'Funds have been released to your wallet'
            : 'Transaction completed successfully',
      },
      disputed: {
        icon: ShieldAlert,
        color: 'hsl(0, 84%, 60%)', // red
        label: 'Dispute in Progress',
        description: 'Our support team is reviewing this transaction',
      },
    };

    const config = statusConfig[status];
    const Icon = config.icon;

    // Format currency
    const formatAmount = (value: number) => `$${value.toFixed(2)}`;

    // Format date
    const formatDate = (timestamp: number) => {
      return new Date(timestamp).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    };

    return (
      <Card
        testID="escrow-status-indicator"
        accessibilityRole="summary"
        accessibilityLabel={`${config.label}: ${formatAmount(amount)}`}>
        {/* Header with Icon and Status */}
        <CardHeader className="flex-row items-center gap-3">
          <View
            className="h-12 w-12 items-center justify-center rounded-full"
            style={{ backgroundColor: `${config.color}20` }}>
            <Icon size={24} color={config.color} />
          </View>
          <View className="flex-1">
            <CardTitle style={{ color: config.color }}>{config.label}</CardTitle>
            <Text variant="small" className="text-muted-foreground">
              {config.description}
            </Text>
          </View>
        </CardHeader>

        <CardContent>
          {/* Amount */}
          <View className="mb-4">
            <Text variant="h1">{formatAmount(amount)}</Text>
            <Text variant="small" className="text-muted-foreground">
              {status === 'held'
                ? 'Held in Escrow'
                : status === 'released'
                  ? 'Released'
                  : 'Disputed Amount'}
            </Text>
          </View>

          {/* Progress Bar (for held status only) */}
          {status === 'held' && (
            <View className="mb-4">
              <View className="mb-2 flex-row justify-between">
                <Text variant="h4">Escrow Period</Text>
                <Text variant="small" className="text-muted-foreground">
                  {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} remaining
                </Text>
              </View>
              <Progress value={progressPercentage} className="h-2" />
              <Text variant="small" className="mt-1 text-muted-foreground">
                Auto-release on {formatDate(releaseDate)}
              </Text>
            </View>
          )}

          {/* Release Date Info (for held status) */}
          {status === 'held' && (
            <View className="mb-4 rounded-md bg-secondary/50 p-3" accessibilityRole="alert">
              <View className="flex-row items-start gap-2">
                <AlertCircle size={16} color="gray" className="mt-0.5" />
                <Text variant="small" className="flex-1 text-muted-foreground">
                  {userType === 'buyer'
                    ? 'Confirm delivery to release funds immediately, or they will auto-release in ' +
                      daysRemaining +
                      ' days'
                    : 'Funds will automatically be released to you in ' +
                      daysRemaining +
                      ' days unless buyer initiates a dispute'}
                </Text>
              </View>
            </View>
          )}

          {/* Action Buttons (for held status) */}
          {status === 'held' && (
            <View className="gap-2">
              {userType === 'buyer' && canConfirm && (
                <Button
                  onPress={onConfirmDelivery}
                  className="w-full"
                  testID="confirm-delivery-button"
                  accessibilityLabel="Confirm delivery and release funds"
                  accessibilityHint="Double tap to confirm you received the item">
                  <Text>Confirm Delivery</Text>
                </Button>
              )}

              {canDispute && (
                <Button
                  variant="destructive"
                  onPress={onInitiateDispute}
                  className="w-full"
                  testID="dispute-button"
                  accessibilityLabel="Initiate dispute"
                  accessibilityHint="Double tap to report an issue with this transaction">
                  <Text>Report Issue</Text>
                </Button>
              )}
            </View>
          )}

          {/* Success Message (for released status) */}
          {status === 'released' && (
            <View className="rounded-md bg-green-500/10 p-3">
              <Text variant="small" className="text-green-700 dark:text-green-400">
                {userType === 'seller'
                  ? '✓ Funds are now available in your wallet'
                  : '✓ Transaction completed successfully'}
              </Text>
            </View>
          )}

          {/* Dispute Message (for disputed status) */}
          {status === 'disputed' && (
            <View className="rounded-md bg-red-500/10 p-3">
              <Text variant="small" className="text-red-700 dark:text-red-400">
                ⚠ Our support team will contact you within 24 hours
              </Text>
            </View>
          )}
        </CardContent>
      </Card>
    );
  }
);

EscrowStatusIndicator.displayName = 'EscrowStatusIndicator';
