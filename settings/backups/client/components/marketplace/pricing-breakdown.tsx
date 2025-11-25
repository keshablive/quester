import React from 'react';
import { View } from 'react-native';
import { Info } from 'lucide-react-native';
import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import type { PricingBreakdown as PricingBreakdownType } from '@/lib/types/marketplace';

interface PricingBreakdownProps {
  pricing: PricingBreakdownType;
  showEscrowInfo?: boolean;
  className?: string;
}

export const PricingBreakdown = React.memo<PricingBreakdownProps>(
  ({ pricing, showEscrowInfo = true, className }) => {
    const { basePrice, platformFee, platformFeePercent, escrowPeriod, total, currency } = pricing;

    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency || 'USD',
      }).format(amount);
    };

    return (
      <Card className={className} testID="pricing-breakdown">
        <View className="p-4">
          {/* Title */}
          <Text variant="h3" className="mb-4">
            Pricing Breakdown
          </Text>

          {/* Base Price */}
          <View
            className="mb-3 flex-row items-center justify-between"
            accessibilityLabel={`Item price: ${formatCurrency(basePrice)}`}>
            <Text variant="p">Item Price</Text>
            <Text variant="p" className="font-semibold" testID="item-price">
              {formatCurrency(basePrice)}
            </Text>
          </View>

          {/* Platform Fee */}
          <View
            className="mb-4 flex-row items-center justify-between"
            accessibilityLabel={`Platform fee ${platformFeePercent}%: ${formatCurrency(platformFee)}`}>
            <View className="flex-row items-center gap-2">
              <Text variant="p">Platform Fee</Text>
              <Text variant="small" className="text-muted-foreground">
                ({platformFeePercent}%)
              </Text>
            </View>
            <Text variant="p" className="font-semibold" testID="platform-fee">
              {formatCurrency(platformFee)}
            </Text>
          </View>

          <Separator className="mb-4" />

          {/* Total */}
          <View
            className="mb-4 flex-row items-center justify-between"
            accessibilityLabel={`Total amount: ${formatCurrency(total)}`}>
            <Text variant="h2">Total</Text>
            <Text variant="h2" className="text-primary" testID="total-price">
              {formatCurrency(total)}
            </Text>
          </View>

          {/* Escrow Information */}
          {showEscrowInfo && (
            <View
              className="rounded-md bg-secondary/50 p-3"
              accessibilityRole="alert"
              testID="escrow-explanation">
              <View className="flex-row items-start gap-2">
                <Info size={16} color="gray" className="mt-0.5" />
                <View className="flex-1">
                  <Text variant="small" className="mb-1 font-semibold">
                    Buyer Protection
                  </Text>
                  <Text variant="small" className="text-muted-foreground">
                    Funds will be held in escrow for {escrowPeriod} days. You can release them early
                    by confirming delivery, or they'll be automatically released after the escrow
                    period.
                  </Text>
                </View>
              </View>
            </View>
          )}
        </View>
      </Card>
    );
  }
);

PricingBreakdown.displayName = 'PricingBreakdown';
