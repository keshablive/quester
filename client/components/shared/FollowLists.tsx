import React, { useState } from 'react';
import { View, FlatList, ActivityIndicator, Pressable, Modal } from 'react-native';
import { Text } from '@/components/ui';
import { Users, X } from 'lucide-react-native';

interface User {
  id: string;
  name: string;
  avatar?: string;
}

interface FollowersListProps {
  userId: string;
  visible: boolean;
  onClose: () => void;
  onLoadFollowers: (userId: string) => Promise<User[]>;
}

export function FollowersList({ userId, visible, onClose, onLoadFollowers }: FollowersListProps) {
  const [followers, setFollowers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (visible) {
      loadFollowers();
    }
  }, [visible]);

  const loadFollowers = async () => {
    try {
      setLoading(true);
      const data = await onLoadFollowers(userId);
      setFollowers(data);
    } catch (err) {
      console.error('Failed to load followers:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View className="flex-1 bg-black/50 justify-end">
        <View className="bg-background rounded-t-3xl max-h-[80%]">
          {/* Header */}
          <View className="flex-row items-center justify-between p-4 border-b border-border">
            <View className="flex-row items-center">
              <Users size={20} className="text-primary mr-2" />
              <Text className="text-lg font-bold text-foreground">Followers</Text>
            </View>
            <Pressable onPress={onClose}>
              <X size={24} className="text-muted-foreground" />
            </Pressable>
          </View>

          {/* List */}
          {loading ? (
            <View className="items-center justify-center py-12">
              <ActivityIndicator size="large" className="text-primary" />
            </View>
          ) : (
            <FlatList
              data={followers}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View className="flex-row items-center p-4 border-b border-border">
                  <View className="w-10 h-10 rounded-full bg-primary/10 items-center justify-center mr-3">
                    <Text className="text-base font-bold text-primary">
                      {item.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <Text className="text-base text-foreground">{item.name}</Text>
                </View>
              )}
              ListEmptyComponent={
                <View className="items-center justify-center py-12">
                  <Text className="text-base text-muted-foreground">No followers yet</Text>
                </View>
              }
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

interface FollowingListProps {
  userId: string;
  visible: boolean;
  onClose: () => void;
  onLoadFollowing: (userId: string) => Promise<User[]>;
}

export function FollowingList({ userId, visible, onClose, onLoadFollowing }: FollowingListProps) {
  const [following, setFollowing] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (visible) {
      loadFollowing();
    }
  }, [visible]);

  const loadFollowing = async () => {
    try {
      setLoading(true);
      const data = await onLoadFollowing(userId);
      setFollowing(data);
    } catch (err) {
      console.error('Failed to load following:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View className="flex-1 bg-black/50 justify-end">
        <View className="bg-background rounded-t-3xl max-h-[80%]">
          {/* Header */}
          <View className="flex-row items-center justify-between p-4 border-b border-border">
            <View className="flex-row items-center">
              <Users size={20} className="text-primary mr-2" />
              <Text className="text-lg font-bold text-foreground">Following</Text>
            </View>
            <Pressable onPress={onClose}>
              <X size={24} className="text-muted-foreground" />
            </Pressable>
          </View>

          {/* List */}
          {loading ? (
            <View className="items-center justify-center py-12">
              <ActivityIndicator size="large" className="text-primary" />
            </View>
          ) : (
            <FlatList
              data={following}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View className="flex-row items-center p-4 border-b border-border">
                  <View className="w-10 h-10 rounded-full bg-primary/10 items-center justify-center mr-3">
                    <Text className="text-base font-bold text-primary">
                      {item.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <Text className="text-base text-foreground">{item.name}</Text>
                </View>
              )}
              ListEmptyComponent={
                <View className="items-center justify-center py-12">
                  <Text className="text-base text-muted-foreground">Not following anyone yet</Text>
                </View>
              }
            />
          )}
        </View>
      </View>
    </Modal>
  );
}
