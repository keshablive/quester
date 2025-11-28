import React, { useState } from 'react';
import { View, FlatList, Pressable } from 'react-native';
import { Text } from '@/components/ui';
import { Video, Plus, Radio } from 'lucide-react-native';
import { cn } from '@/core';

interface Stream {
  id: string;
  title: string;
  key: string;
  status: string;
  viewers?: number;
}

import { StreamListProps } from './types';

export function StreamList({ onStreamPress, onCreateStream }: StreamListProps) {
  // In a real app, this would fetch from the API
  const [streams] = useState<Stream[]>([]);

  const renderStream = ({ item }: { item: Stream }) => (
    <Pressable
      className="flex-1 bg-card rounded-xl mb-4 mx-1 overflow-hidden shadow-sm"
      onPress={() => onStreamPress(item.key)}
    >
      <View className="aspect-video bg-muted items-center justify-center">
        <Video size={32} className="text-muted-foreground" />
        {item.status === 'live' && (
          <View className="absolute top-2 left-2 flex-row items-center bg-destructive px-2 py-1 rounded gap-1">
            <Radio size={12} className="text-destructive-foreground" />
            <Text className="text-[10px] font-bold text-destructive-foreground">LIVE</Text>
          </View>
        )}
      </View>

      <View className="p-3">
        <Text className="text-sm font-semibold text-foreground mb-1" numberOfLines={2}>
          {item.title}
        </Text>
        {item.viewers !== undefined && (
          <Text className="text-xs text-muted-foreground">{item.viewers} viewers</Text>
        )}
      </View>
    </Pressable>
  );

  const renderHeader = () => (
    <View className="flex-row justify-between items-center mb-5 w-full">
      <Text className="text-3xl font-bold text-foreground">Live Streams</Text>
      <Pressable 
        className="flex-row items-center bg-destructive px-4 py-2.5 rounded-full gap-1.5" 
        onPress={onCreateStream}
      >
        <Plus size={20} className="text-destructive-foreground" />
        <Text className="text-sm font-semibold text-destructive-foreground">Go Live</Text>
      </Pressable>
    </View>
  );

  const renderEmpty = () => (
    <View className="py-12 items-center w-full">
      <Video size={64} className="text-muted-foreground/30" />
      <Text className="text-lg font-semibold text-foreground mt-4 mb-2">No live streams</Text>
      <Text className="text-sm text-muted-foreground mb-6 text-center">Start streaming to share with your audience</Text>
      <Pressable className="bg-destructive px-6 py-3 rounded-lg" onPress={onCreateStream}>
        <Text className="text-base font-semibold text-destructive-foreground">Create Stream</Text>
      </Pressable>
    </View>
  );

  return (
    <View className="flex-1 bg-background">
      <FlatList
        data={streams}
        keyExtractor={(item) => item.id}
        renderItem={renderStream}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={{ padding: 16 }}
        numColumns={2}
        columnWrapperStyle={streams.length > 0 ? { justifyContent: 'space-between' } : undefined}
      />
    </View>
  );
}
