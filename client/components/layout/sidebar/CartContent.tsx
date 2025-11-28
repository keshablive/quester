/**
 * Cart Content Component
 *
 * Displays shopping cart items and checkout summary
 */

import * as React from 'react';
import { View, ScrollView } from 'react-native';
import { Text, Button, Separator } from '@/components/ui';
import { ShoppingBag, CreditCard, ArrowRight } from 'lucide-react-native';
import { Stack } from '@/core';
import { CartItemCard } from './CartItemCard';
import type { CartContentProps } from './types';

export function CartContent({ items, onUpdateQuantity, onRemove, onCheckout }: CartContentProps) {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = subtotal * 0.08;
  const total = subtotal + tax;

  if (items.length === 0) {
    return (
      <View className="flex-1 items-center justify-center p-8">
        <View className="mb-4 h-20 w-20 items-center justify-center rounded-full bg-muted/30">
          <ShoppingBag size={40} className="text-muted-foreground/50" />
        </View>
        <Text className="text-xl font-bold text-foreground">Your cart is empty</Text>
        <Text className="mt-2 text-center text-muted-foreground">
          Looks like you haven't added anything to your cart yet.
        </Text>
      </View>
    );
  }

  return (
    <Stack className="flex-1">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 24, gap: 16 }}
        showsVerticalScrollIndicator={false}>
        {items.map((item) => (
          <CartItemCard
            key={item.id}
            item={item}
            onUpdateQuantity={onUpdateQuantity}
            onRemove={onRemove}
          />
        ))}
      </ScrollView>

      {/* Summary */}
      <View className="border-t border-border bg-muted/20 p-6">
        <Stack className="mb-4 gap-2">
          <View className="flex-row justify-between">
            <Text className="text-muted-foreground">Subtotal</Text>
            <Text className="font-medium">${subtotal.toFixed(2)}</Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-muted-foreground">Tax (8%)</Text>
            <Text className="font-medium">${tax.toFixed(2)}</Text>
          </View>
          <Separator className="my-2" />
          <View className="flex-row items-end justify-between">
            <Text className="text-lg font-bold">Total</Text>
            <Text className="text-2xl font-bold text-primary">${total.toFixed(2)}</Text>
          </View>
        </Stack>

        <Button size="lg" className="w-full" onPress={onCheckout}>
          <CreditCard size={18} className="mr-2" />
          <Text>Checkout</Text>
          <ArrowRight size={18} className="ml-2 opacity-50" />
        </Button>
      </View>
    </Stack>
  );
}
