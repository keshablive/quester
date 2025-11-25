import React from 'react';
import { View, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Check } from 'lucide-react-native';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { ScreenWrapper } from '@/components/screen-wrapper';
import { useScreenPerformanceMetrics } from '@/lib/hooks/use-performance-metrics';
import { CheckoutProgress } from '@/components/marketplace/checkout-progress';
import { PricingBreakdown } from '@/components/marketplace/pricing-breakdown';
import { useListing } from '@/lib/hooks/useMarketplace';
import { useCheckout } from '@/hooks/use-checkout';
import type { PaymentMethod } from '@/lib/types/marketplace';

export default function CheckoutScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  useScreenPerformanceMetrics('CheckoutScreen');

  const { data: listing, isLoading } = useListing(id);

  // Use the new checkout hook
  const {
    currentStep,
    selectedPaymentMethod,
    pricing,
    isProcessing,
    error,
    canProceed,
    nextStep,
    previousStep,
    selectPaymentMethod,
    completePurchase,
    clearError,
  } = useCheckout({
    listingId: id,
    basePrice: listing?.price || 0,
    currency: listing?.currency || 'USD',
    onSuccess: (transaction) => {
      // Navigate to transaction details
      router.push(`/marketplace/transaction/${transaction.id}` as any);
    },
    onError: (error) => {
      Alert.alert('Payment Failed', error.message);
    },
  });

  // Payment method options
  const paymentMethods: PaymentMethod[] = [
    { id: 'points', type: 'points', label: 'Platform Points', isDefault: true },
    { id: 'card', type: 'card', label: 'Credit/Debit Card', isDefault: false },
    { id: 'wallet', type: 'wallet', label: 'Digital Wallet', isDefault: false },
  ];

  const handlePaymentMethodSelect = (method: PaymentMethod) => {
    selectPaymentMethod(method);
    clearError();
  };

  if (isLoading) {
    return (
      <ScreenWrapper screenName="CheckoutScreen">
        <SafeAreaView className="flex-1 items-center justify-center bg-background">
          <Text className="text-muted-foreground" accessibilityRole="progressbar">
            Loading...
          </Text>
        </SafeAreaView>
      </ScreenWrapper>
    );
  }

  if (!listing) {
    return (
      <ScreenWrapper screenName="CheckoutScreen">
        <SafeAreaView className="flex-1 items-center justify-center bg-background">
          <Text className="text-destructive" accessibilityRole="alert">
            Listing not found
          </Text>
        </SafeAreaView>
      </ScreenWrapper>
    );
  }

  // Render step-specific content
  const renderStepContent = () => {
    switch (currentStep) {
      case 'review':
        return (
          <>
            <Card className="mb-4 p-4">
              <Text className="mb-4 text-lg font-bold">Order Summary</Text>
              <View className="mb-4 gap-2">
                <Text className="text-base font-semibold">{listing.title}</Text>
                <Text className="text-sm text-muted-foreground">
                  {listing.listing_type.replace('_', ' ')}
                </Text>
              </View>
            </Card>

            <PricingBreakdown pricing={pricing} showEscrowInfo={true} className="mb-4" />

            <Button
              onPress={nextStep}
              disabled={!canProceed}
              className="w-full"
              accessibilityLabel="Continue to payment">
              <Text>Continue to Payment</Text>
            </Button>
          </>
        );

      case 'payment':
        return (
          <>
            <Card className="mb-4 p-4">
              <Text className="mb-4 text-lg font-bold">Select Payment Method</Text>
              <View className="gap-3">
                {paymentMethods.map((method) => (
                  <Button
                    key={method.type}
                    variant={selectedPaymentMethod?.type === method.type ? 'default' : 'outline'}
                    onPress={() => handlePaymentMethodSelect(method)}
                    className="w-full justify-start"
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selectedPaymentMethod?.type === method.type }}>
                    <Text>{method.label}</Text>
                    {method.isDefault && <Text className="ml-2 text-xs">(Default)</Text>}
                  </Button>
                ))}
              </View>
            </Card>

            <View className="flex-row gap-2">
              <Button variant="outline" onPress={previousStep} className="flex-1">
                <Text>Back</Text>
              </Button>
              <Button onPress={nextStep} disabled={!canProceed} className="flex-1">
                <Text>Continue</Text>
              </Button>
            </View>
          </>
        );

      case 'confirm':
        return (
          <>
            <Card className="mb-4 p-4">
              <Text className="mb-4 text-lg font-bold">Confirm Purchase</Text>
              <View className="gap-3">
                <View>
                  <Text className="text-sm text-muted-foreground">Item</Text>
                  <Text className="text-base font-semibold">{listing.title}</Text>
                </View>
                <View>
                  <Text className="text-sm text-muted-foreground">Payment Method</Text>
                  <Text className="text-base">{selectedPaymentMethod?.label}</Text>
                </View>
              </View>
            </Card>

            <PricingBreakdown pricing={pricing} showEscrowInfo={true} className="mb-4" />

            {error && (
              <View className="mb-4 rounded-md bg-destructive/10 p-3">
                <Text className="text-sm text-destructive">{error}</Text>
              </View>
            )}

            <View className="flex-row gap-2">
              <Button variant="outline" onPress={previousStep} className="flex-1">
                <Text>Back</Text>
              </Button>
              <Button
                onPress={completePurchase}
                disabled={!canProceed || isProcessing}
                className="flex-1">
                <Text>{isProcessing ? 'Processing...' : 'Complete Purchase'}</Text>
              </Button>
            </View>
          </>
        );

      case 'processing':
        return (
          <View className="items-center py-8">
            <Text className="mb-4 text-xl font-bold">Processing Payment...</Text>
            <Text className="text-center text-muted-foreground">
              Please wait while we process your payment securely.
            </Text>
          </View>
        );

      case 'success':
        return (
          <View className="items-center py-8">
            <View className="mb-4 h-20 w-20 items-center justify-center rounded-full bg-green-500/20">
              <Check size={40} color="green" />
            </View>
            <Text className="mb-2 text-2xl font-bold">Payment Successful!</Text>
            <Text className="mb-6 text-center text-muted-foreground">
              Your purchase has been completed. Funds are held in escrow.
            </Text>
            <Button onPress={() => router.push('/marketplace/transactions' as any)}>
              <Text>View Transactions</Text>
            </Button>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <ScreenWrapper screenName="CheckoutScreen">
      <SafeAreaView className="flex-1 bg-background">
        {/* Header */}
        <View className="flex-row items-center border-b border-border px-4 py-3">
          <Button
            variant="ghost"
            onPress={() => router.back()}
            accessibilityLabel="Go back"
            className="mr-3 p-2">
            <ChevronLeft size={24} color="#6b7280" />
          </Button>
          <Text className="text-xl font-bold">Checkout</Text>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 16 }}
          accessibilityLabel="Checkout form"
          removeClippedSubviews>
          {/* Checkout Progress Indicator */}
          {currentStep !== 'processing' && currentStep !== 'success' && (
            <View className="mb-6">
              <CheckoutProgress currentStep={currentStep} />
            </View>
          )}

          {/* Step Content */}
          {renderStepContent()}

          {/* Terms (show on confirm step) */}
          {currentStep === 'confirm' && (
            <Text className="mt-4 text-center text-xs text-muted-foreground">
              By completing this purchase, you agree to our Terms of Service and acknowledge that
              your payment will be held in escrow until delivery is confirmed.
            </Text>
          )}
        </ScrollView>
      </SafeAreaView>
    </ScreenWrapper>
  );
}
