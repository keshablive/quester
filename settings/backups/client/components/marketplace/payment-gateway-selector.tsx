import React from 'react';
import { View, Pressable } from 'react-native';
import { Text } from '@/components/ui/text';
import { CreditCard, Smartphone, Bitcoin, Wallet } from 'lucide-react-native';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

export type PaymentGateway = 'razorpay' | 'stripe' | 'paypal' | 'crypto' | 'upi';

interface PaymentGatewayOption {
  id: PaymentGateway;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  enabled: boolean;
  badges?: string[];
}

interface PaymentGatewaySelectorProps {
  selectedGateway: PaymentGateway;
  onSelectGateway: (gateway: PaymentGateway) => void;
  amount: number;
  currency: string;
}

const paymentGateways: PaymentGatewayOption[] = [
  {
    id: 'razorpay',
    name: 'Razorpay',
    description: 'Credit Card, Debit Card, UPI, Net Banking',
    icon: CreditCard,
    enabled: true,
    badges: ['Popular', 'Instant'],
  },
  {
    id: 'upi',
    name: 'UPI',
    description: 'Google Pay, PhonePe, Paytm, BHIM',
    icon: Smartphone,
    enabled: true,
    badges: ['Fastest'],
  },
  {
    id: 'stripe',
    name: 'Stripe',
    description: 'International Cards, Apple Pay, Google Pay',
    icon: CreditCard,
    enabled: true,
    badges: ['International'],
  },
  {
    id: 'paypal',
    name: 'PayPal',
    description: 'Pay with your PayPal account',
    icon: Wallet,
    enabled: false, // Coming soon
  },
  {
    id: 'crypto',
    name: 'Cryptocurrency',
    description: 'Bitcoin, Ethereum, USDT',
    icon: Bitcoin,
    enabled: false, // Coming soon
  },
];

export function PaymentGatewaySelector({
  selectedGateway,
  onSelectGateway,
  amount,
  currency,
}: PaymentGatewaySelectorProps) {
  const formatPrice = (price: number, curr: string) => {
    if (curr === 'INR') {
      return `₹${price.toLocaleString('en-IN')}`;
    } else if (curr === 'USD') {
      return `$${price.toLocaleString('en-US')}`;
    }
    return `${curr} ${price.toLocaleString()}`;
  };

  return (
    <View className="w-full">
      {/* Amount Summary */}
      <Card className="mb-4 border-primary/20 bg-primary/10">
        <CardHeader className="flex-row items-center justify-between">
          <Text variant="small" className="text-muted-foreground">
            Total Amount
          </Text>
          <CardTitle className="text-primary">{formatPrice(amount, currency)}</CardTitle>
        </CardHeader>
        <CardContent>
          <Text variant="small" className="text-muted-foreground">
            Funds will be held in escrow until delivery is confirmed
          </Text>
        </CardContent>
      </Card>

      {/* Payment Methods */}
      <Text variant="h3" className="mb-3 text-foreground">
        Select Payment Method
      </Text>

      <RadioGroup
        value={selectedGateway}
        onValueChange={(value) => onSelectGateway(value as PaymentGateway)}>
        {paymentGateways.map((gateway) => (
          <Pressable
            key={gateway.id}
            onPress={() => gateway.enabled && onSelectGateway(gateway.id)}
            disabled={!gateway.enabled}
            className="mb-3">
            <Card
              testID={`gateway-${gateway.id}`}
              className={`${
                selectedGateway === gateway.id ? 'border-2 border-primary' : 'border-border'
              } ${!gateway.enabled ? 'opacity-50' : ''}`}>
              <CardContent className="flex-row items-center">
                {/* Radio Button */}
                <View className="mr-3">
                  <RadioGroupItem
                    value={gateway.id}
                    disabled={!gateway.enabled}
                    className={selectedGateway === gateway.id ? 'border-primary' : ''}
                  />
                </View>

                {/* Icon */}
                <View className="mr-3">
                  <View className="h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <gateway.icon size={24} color="#6366f1" />
                  </View>
                </View>

                {/* Details */}
                <View className="flex-1">
                  <View className="mb-1 flex-row items-center">
                    <Text variant="h4" className="text-foreground">
                      {gateway.name}
                    </Text>
                    {!gateway.enabled && (
                      <View className="ml-2 rounded bg-muted px-2 py-0.5">
                        <Text variant="small" className="text-muted-foreground">
                          Coming Soon
                        </Text>
                      </View>
                    )}
                    {gateway.badges?.map((badge, index) => (
                      <View key={index} className="ml-2 rounded bg-green-100 px-2 py-0.5">
                        <Text variant="small" className="font-medium text-green-700">
                          {badge}
                        </Text>
                      </View>
                    ))}
                  </View>
                  <Text variant="small" className="text-muted-foreground" numberOfLines={1}>
                    {gateway.description}
                  </Text>
                </View>
              </CardContent>
            </Card>
          </Pressable>
        ))}
      </RadioGroup>

      {/* Security Notice */}
      <Card className="mt-4 border-muted bg-muted/50">
        <CardContent className="flex-row items-start">
          <Text variant="small" className="mr-2 text-muted-foreground">
            🔒
          </Text>
          <View className="flex-1">
            <Text variant="small" className="text-muted-foreground">
              Your payment is secured with industry-standard encryption. Funds are held in escrow
              until you confirm delivery.
            </Text>
          </View>
        </CardContent>
      </Card>
    </View>
  );
}
