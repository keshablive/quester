/**
 * Search Result Card Component
 *
 * Individual search result item
 */

import * as React from 'react';
import { Pressable, View } from 'react-native';
import { Text, Card, CardContent } from '@/components/ui';
import { FileText, User, Settings, LayoutDashboard, ChevronRight } from 'lucide-react-native';
import { Row } from '@/core';
import type { SearchResult } from './types';

interface SearchResultCardProps {
  result: SearchResult;
  onSelect: (result: SearchResult) => void;
}

export function SearchResultCard({ result, onSelect }: SearchResultCardProps) {
  const getIcon = () => {
    switch (result.type) {
      case 'page':
        return LayoutDashboard;
      case 'user':
        return User;
      case 'file':
        return FileText;
      case 'setting':
        return Settings;
      default:
        return FileText;
    }
  };

  const IconComponent = getIcon();

  return (
    <Pressable onPress={() => onSelect(result)}>
      <Card>
        <CardContent className="p-3">
          <Row className="items-center">
            <View className="mr-3 h-10 w-10 items-center justify-center rounded-lg bg-muted">
              <IconComponent size={20} className="text-foreground/70" />
            </View>
            <View className="flex-1">
              <Text className="font-medium text-foreground">{result.title}</Text>
              <Text className="text-sm text-muted-foreground">{result.subtitle}</Text>
            </View>
            <ChevronRight size={16} className="text-muted-foreground/30" />
          </Row>
        </CardContent>
      </Card>
    </Pressable>
  );
}
