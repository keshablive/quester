/**
 * Cart Item Card Component
 *
 * Individual cart item with quantity controls
 */

import * as React from 'react';
import { View } from 'react-native';
import { Text, Button, Card, CardContent } from '@/components/ui';
import { Minus, Plus, Trash2 } from 'lucide-react-native';
import { Row } from '@/core';
import type { CartItem } from './types';

interface CartItemCardProps {
  item: CartItem;
  onUpdateQuantity: (id: string, delta: number) => void;
  onRemove: (id: string) => void;
}

export function CartItemCard({ item, onUpdateQuantity, onRemove }: CartItemCardProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <Row className="gap-4">
          {/* Image Placeholder */}
          <View className="h-20 w-20 items-center justify-center overflow-hidden rounded-xl bg-muted">
            <Text className="text-2xl">📦</Text>
          </View>

          <View className="flex-1 justify-between">
            <View>
              <Text className="font-bold text-foreground">{item.title}</Text>
              <Text className="mt-1 font-bold text-primary">${item.price.toFixed(2)}</Text>
            </View>

            <Row className="mt-2 items-center justify-between">
              <Row className="items-center gap-2 rounded-lg bg-muted/50 p-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onPress={() => onUpdateQuantity(item.id, -1)}
                  className="h-6 w-6 p-0">
                  <Minus size={12} />
                </Button>
                <Text className="w-6 text-center font-medium">{item.quantity}</Text>
                <Button
                  variant="ghost"
                  size="sm"
                  onPress={() => onUpdateQuantity(item.id, 1)}
                  className="h-6 w-6 p-0">
                  <Plus size={12} />
                </Button>
              </Row>

              <Button
                variant="ghost"
                size="sm"
                onPress={() => onRemove(item.id)}
                className="h-8 w-8 p-0">
                <Trash2 size={16} className="text-destructive" />
              </Button>
            </Row>
          </View>
        </Row>
      </CardContent>
    </Card>
  );
}
