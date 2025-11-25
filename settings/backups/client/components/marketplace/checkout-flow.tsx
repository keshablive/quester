/**
 * CheckoutFlow Component
 *
 * Multi-step checkout process for marketplace purchases:
 * 1. Review - Display listing details and pricing breakdown
 * 2. Payment - Select payment method
 * 3. Confirm - Review final details before purchase
 * 4. Processing - Show purchase processing state
 * 5. Success - Display confirmation
 */

import { useState, useCallback, useEffect } from 'react';
import { View, ScrollView, ActivityIndicator } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import type { PaymentMethod } from '@/lib/types/marketplace';

interface Listing {
  id: string;
  title: string;
  price: number;
  seller: {
    id: string;
    username: string;
    avatar?: string;
  };
}

interface CheckoutFlowProps {
  listing: Listing;
  paymentMethods?: PaymentMethod[];
  onComplete: (result: { listingId: string; paymentMethodId: string; total: number }) => void;
  onCancel?: () => void;
}

export function CheckoutFlow({
  listing,
  paymentMethods = [{ id: 'pm-1', type: 'wallet', label: 'Default Payment', isDefault: true }],
  onComplete,
  onCancel,
}: CheckoutFlowProps) {
  const [step, setStep] = useState<'review' | 'payment' | 'confirm' | 'processing' | 'success'>(
    'review'
  );
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>(
    paymentMethods.find((pm) => pm.isDefault)?.id || paymentMethods[0]?.id || ''
  );
  const [error, setError] = useState<string | null>(null);

  // Calculate pricing
  const platformFee = listing.price * 0.05;
  const total = listing.price + platformFee;

  const handleContinueToPayment = useCallback(() => {
    setStep('payment');
  }, []);

  const handleContinueToConfirm = useCallback(() => {
    // Validate sufficient points if using points payment
    const selectedMethod = paymentMethods.find((pm) => pm.id === selectedPaymentMethod);
    if (selectedMethod?.type === 'points') {
      const match = selectedMethod.label.match(/\(([\d,]+)\s+available\)/);
      const availablePoints = match ? parseInt(match[1].replace(/,/g, ''), 10) : 0;
      const pointsNeeded = Math.ceil(total);
      if (availablePoints < pointsNeeded) {
        setError(`Insufficient points. You have ${availablePoints} but need ${pointsNeeded}.`);
        return;
      }
    }
    setError(null);
    setStep('confirm');
  }, [paymentMethods, selectedPaymentMethod, total]);

  const handleCompletePurchase = useCallback(async () => {
    setError(null);
    setStep('processing');

    try {
      // Simulate processing (reduced for tests)
      await new Promise((resolve) => setTimeout(resolve, 750));

      await onComplete({
        listingId: listing.id,
        paymentMethodId: selectedPaymentMethod,
        total,
      });

      setStep('success');
    } catch (err: any) {
      setError(err?.message || 'Payment failed');
      setStep('confirm');
    }
  }, [listing.id, selectedPaymentMethod, total, onComplete]);

  const handleRetry = useCallback(() => {
    setError(null);
    handleCompletePurchase();
  }, [handleCompletePurchase]);

  const handleBack = useCallback(() => {
    if (step === 'payment') setStep('review');
    else if (step === 'confirm') setStep('payment');
  }, [step]);

  // Validate points when on payment step
  useEffect(() => {
    if (step === 'payment') {
      const selectedMethod = paymentMethods.find((pm) => pm.id === selectedPaymentMethod);
      if (selectedMethod?.type === 'points') {
        const match = selectedMethod.label.match(/\(([\d,]+)\s+available\)/);
        const availablePoints = match ? parseInt(match[1].replace(/,/g, ''), 10) : 0;
        const pointsNeeded = Math.ceil(total);
        if (availablePoints < pointsNeeded) {
          setError(`Insufficient points. You have ${availablePoints} but need ${pointsNeeded}.`);
        } else {
          setError(null);
        }
      }
    }
  }, [step, selectedPaymentMethod, paymentMethods, total]);

  // Step 1: Review
  if (step === 'review') {
    return (
      <ScrollView className="flex-1 p-4" accessibilityLabel="Step 1 of 3: Review Purchase">
        <Card>
          <CardHeader>
            <Text variant="h2">Review Purchase</Text>
            <Text variant="small" className="text-muted-foreground">
              Step 1 of 3
            </Text>
          </CardHeader>
          <CardContent>
            <Text variant="h3" className="mb-2">
              {listing.title}
            </Text>
            <Text variant="small" className="mb-4 text-muted-foreground">
              {listing.seller.username}
            </Text>

            <View className="mt-4 border-t border-border pt-4">
              <Text variant="h4" className="mb-2">
                Pricing Breakdown
              </Text>
              <View className="mb-2 flex-row justify-between">
                <Text variant="p">Item Price</Text>
                <Text variant="p" testID="item-price">
                  ${listing.price.toFixed(2)}
                </Text>
              </View>
              <View className="mb-2 flex-row justify-between">
                <Text variant="p">Platform Fee (5%)</Text>
                <Text variant="p" testID="platform-fee">
                  ${platformFee.toFixed(2)}
                </Text>
              </View>
              <View className="mt-2 flex-row justify-between border-t border-border pt-2">
                <Text variant="h4">Total</Text>
                <Text variant="h4" testID="total-price">
                  ${total.toFixed(2)}
                </Text>
              </View>
            </View>

            <Button
              onPress={handleContinueToPayment}
              className="mt-6"
              accessibilityLabel="Continue to payment selection">
              <Text>Continue to Payment</Text>
            </Button>

            {onCancel && (
              <Button onPress={onCancel} variant="outline" className="mt-2">
                <Text>Cancel</Text>
              </Button>
            )}
          </CardContent>
        </Card>
      </ScrollView>
    );
  }

  // Step 2: Payment
  if (step === 'payment') {
    return (
      <ScrollView className="flex-1 p-4" accessibilityLabel="Step 2 of 3: Select Payment Method">
        <Card>
          <CardHeader>
            <Text variant="h2">Select Payment Method</Text>
            <Text variant="small" className="text-muted-foreground">
              Step 2 of 3
            </Text>
          </CardHeader>
          <CardContent>
            {error && (
              <View className="mb-4 rounded-lg bg-destructive/10 p-3">
                <Text variant="small" className="text-destructive">
                  {error}
                </Text>
              </View>
            )}

            {paymentMethods.map((method) => (
              <Button
                key={method.id}
                testID={`payment-method-${method.id}`}
                onPress={() => {
                  setSelectedPaymentMethod(method.id);
                  setError(null);
                }}
                variant={selectedPaymentMethod === method.id ? 'default' : 'outline'}
                className="mb-2"
                accessibilityRole="radio"
                accessibilityState={{ selected: selectedPaymentMethod === method.id }}>
                <Text>{method.label}</Text>
              </Button>
            ))}

            <Button
              onPress={handleContinueToConfirm}
              disabled={!!error}
              className="mt-6"
              accessibilityLabel="Continue to confirmation">
              <Text>Continue to Confirm</Text>
            </Button>

            <Button onPress={handleBack} variant="outline" className="mt-2">
              <Text>Back</Text>
            </Button>
          </CardContent>
        </Card>
      </ScrollView>
    );
  }

  // Step 3: Confirm
  if (step === 'confirm') {
    const selectedMethod = paymentMethods.find((pm) => pm.id === selectedPaymentMethod);

    return (
      <ScrollView className="flex-1 p-4" accessibilityLabel="Step 3 of 3: Confirm Purchase">
        <Card>
          <CardHeader>
            <Text variant="h2">Confirm Purchase</Text>
            <Text variant="small" className="text-muted-foreground">
              Step 3 of 3
            </Text>
          </CardHeader>
          <CardContent>
            {error && (
              <View className="mb-4 rounded-lg bg-destructive/10 p-3">
                <Text variant="small" className="text-destructive">
                  {error}
                </Text>
              </View>
            )}

            <Text variant="h3" className="mb-2" testID="confirm-title">
              {listing.title}
            </Text>
            <Text variant="p" className="mb-2" testID="confirm-payment">
              Payment Method: {selectedMethod?.label}
            </Text>
            <Text variant="h4" className="mb-4" testID="confirm-total">
              Total: ${total.toFixed(2)}
            </Text>

            <View className="mb-4 rounded-lg bg-muted p-4" testID="escrow-info">
              <Text variant="h4" className="mb-2">
                Buyer Protection
              </Text>
              <Text variant="small">
                Your payment will be held in escrow for a 7-day escrow period to ensure transaction
                security.
              </Text>
            </View>

            {error ? (
              <Button
                onPress={handleRetry}
                className="mt-6"
                accessibilityLabel="Try purchasing again">
                <Text>Try Again</Text>
              </Button>
            ) : (
              <Button
                onPress={handleCompletePurchase}
                className="mt-6"
                accessibilityLabel="Complete purchase">
                <Text>Complete Purchase</Text>
              </Button>
            )}

            <Button onPress={handleBack} variant="outline" className="mt-2">
              <Text>Back</Text>
            </Button>
          </CardContent>
        </Card>
      </ScrollView>
    );
  }

  // Step 4: Processing
  if (step === 'processing') {
    return (
      <View className="flex-1 items-center justify-center p-4">
        <ActivityIndicator testID="loading-spinner" size="large" />
        <Text variant="h2" className="mt-4">
          Processing Payment...
        </Text>
        <Text variant="p" className="mt-2 text-muted-foreground">
          Please wait
        </Text>
      </View>
    );
  }

  // Step 5: Success
  return (
    <View className="flex-1 items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <Text variant="h1" className="text-center">
            Purchase Successful!
          </Text>
        </CardHeader>
        <CardContent>
          <Text variant="p" className="mb-4 text-center">
            Transaction Complete
          </Text>
          <Text variant="small" className="mb-6 text-center text-muted-foreground">
            You will receive a confirmation email shortly. The seller has been notified and will
            begin processing your order.
          </Text>

          <View className="rounded-lg bg-muted p-4">
            <Text variant="small">
              <Text className="font-semibold">Order ID:</Text> {listing.id}
            </Text>
            <Text variant="small" className="mt-2">
              <Text className="font-semibold">Amount:</Text> ${total.toFixed(2)}
            </Text>
          </View>
        </CardContent>
      </Card>
    </View>
  );
}
