import React, { useState } from 'react';
import { View, ScrollView, TextInput, Pressable, ActivityIndicator } from 'react-native';
import { Text } from '@/components/ui';
import { Users, ArrowLeft } from 'lucide-react-native';
import { groupsService } from '@/core';
import { useRouter } from 'expo-router';

interface CreateGroupProps {
  onCancel?: () => void;
}

export function CreateGroup({ onCancel }: CreateGroupProps = {}) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('Group name is required');
      return;
    }

    try {
      setCreating(true);
      setError(null);
      const group = await groupsService.createGroup(name, description);
      if (onCancel) {
        onCancel();
      } else {
        router.replace(`/groups/${group.id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create group');
    } finally {
      setCreating(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-background">
      <View className="p-4">
        {/* Header */}
        <Pressable
          className="flex-row items-center mb-6"
          onPress={onCancel || (() => router.back())}
        >
          <ArrowLeft size={20} className="text-primary mr-2" />
          <Text className="text-base text-primary">Back</Text>
        </Pressable>

        <View className="flex-row items-center mb-6">
          <Users size={24} className="text-primary mr-2" />
          <Text className="text-2xl font-bold text-foreground">Create Group</Text>
        </View>

        {/* Form */}
        <View className="bg-card rounded-xl p-4 border border-border mb-4">
          <Text className="text-sm font-semibold text-foreground mb-2">Group Name *</Text>
          <TextInput
            className="bg-background border border-border rounded-lg px-4 py-3 text-base text-foreground mb-4"
            placeholder="Enter group name"
            placeholderTextColor="#888"
            value={name}
            onChangeText={setName}
          />

          <Text className="text-sm font-semibold text-foreground mb-2">Description (Optional)</Text>
          <TextInput
            className="bg-background border border-border rounded-lg px-4 py-3 text-base text-foreground"
            placeholder="Enter group description"
            placeholderTextColor="#888"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {error && (
          <View className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 mb-4">
            <Text className="text-sm text-destructive">{error}</Text>
          </View>
        )}

        {/* Create Button */}
        <Pressable
          className="bg-primary py-4 rounded-xl flex-row items-center justify-center"
          onPress={handleCreate}
          disabled={creating || !name.trim()}
        >
          {creating ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Users size={20} color="#fff" className="mr-2" />
              <Text className="text-base font-semibold text-primary-foreground">Create Group</Text>
            </>
          )}
        </Pressable>
      </View>
    </ScrollView>
  );
}
