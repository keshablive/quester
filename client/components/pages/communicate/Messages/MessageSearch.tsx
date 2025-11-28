import * as React from 'react';
import { View, TextInput } from 'react-native';
import { Icon } from '@/components/ui';
import { Search } from 'lucide-react-native';

export function MessageSearch() {
  return (
    <View className="relative flex-row items-center bg-muted/30 rounded-lg px-3 py-2">
      <Icon as={Search} size={18} className="text-muted-foreground mr-2" />
      <TextInput 
        placeholder="Search messages..."
        placeholderTextColor="#999"
        className="flex-1 text-foreground"
      />
    </View>
  );
}
