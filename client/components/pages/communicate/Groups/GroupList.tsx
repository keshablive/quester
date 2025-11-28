import React, { useState, useEffect } from 'react';
import { View, FlatList, ActivityIndicator, Pressable, TextInput } from 'react-native';
import { Text } from '@/components/ui';
import { Users, Plus, Search } from 'lucide-react-native';
import { groupsService, Group } from '@/core';
import { useRouter } from 'expo-router';

function GroupCard({ group, onPress }: { group: Group; onPress: (id: string) => void }) {
  return (
    <Pressable
      className="flex-row items-center p-4 bg-card rounded-xl border border-border mb-3"
      onPress={() => onPress(group.id)}
    >
      <View className="w-12 h-12 rounded-full bg-primary/10 items-center justify-center mr-3">
        <Users size={24} className="text-primary" />
      </View>
      <View className="flex-1">
        <Text className="text-base font-semibold text-foreground mb-1">{group.name}</Text>
        {group.description && (
          <Text className="text-sm text-muted-foreground line-clamp-1">{group.description}</Text>
        )}
        <Text className="text-xs text-muted-foreground mt-1">{group.memberCount} members</Text>
      </View>
    </Pressable>
  );
}

interface GroupListProps {
  onCreateGroup?: () => void;
}

export function GroupList({ onCreateGroup }: GroupListProps = {}) {
  const router = useRouter();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    try {
      setLoading(true);
      const data = await groupsService.getUserGroups();
      setGroups(data);
    } catch (err) {
      console.error('Failed to load groups:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredGroups = groups.filter(g =>
    g.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" className="text-primary" />
      </View>
    );
  }

  return (
    <View className="flex-1">
      {/* Search */}
      <View className="p-4">
        <View className="flex-row items-center bg-muted rounded-lg px-3 py-2">
          <Search size={20} className="text-muted-foreground mr-2" />
          <TextInput
            className="flex-1 text-base text-foreground"
            placeholder="Search groups..."
            placeholderTextColor="#888"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Groups List */}
      <FlatList
        data={filteredGroups}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <GroupCard group={item} onPress={(id) => router.push(`/groups/${id}`)} />}
        contentContainerClassName="px-4 pb-4"
        ListEmptyComponent={
          <View className="items-center justify-center py-12">
            <Users size={64} className="text-muted-foreground/30 mb-4" />
            <Text className="text-lg font-semibold text-foreground mb-2">No groups yet</Text>
            <Text className="text-sm text-muted-foreground">Create a group to get started</Text>
          </View>
        }
      />

      {/* Create Group Button */}
      <Pressable
        className="absolute bottom-6 right-6 w-14 h-14 bg-primary rounded-full items-center justify-center shadow-lg"
        onPress={onCreateGroup || (() => router.push('/groups/create'))}
      >
        <Plus size={24} color="#fff" />
      </Pressable>
    </View>
  );
}
