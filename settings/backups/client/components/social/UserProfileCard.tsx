import React, { useEffect, useState } from 'react';
import { View, Image, Pressable } from 'react-native';
import { Text } from '@/components/ui/text';
import { UserPlus, UserMinus, Edit } from 'lucide-react-native';
import { OnlineStatusBadge } from '@/components/real-time/online-status-badge';
import { useRealTimeConnection } from '@/lib/hooks/use-real-time-connection';
import type { UserStatus } from '@/lib/types/real-time';

interface UserProfile {
  id: string;
  username: string;
  email?: string;
  avatar_url?: string;
  bio?: string;
  follower_count: number;
  following_count: number;
  post_count: number;
  is_following?: boolean;
  status?: UserStatus;
  last_seen?: number;
}

interface UserProfileCardProps {
  profile: UserProfile;
  isOwnProfile: boolean;
  onFollow?: () => void;
  onUnfollow?: () => void;
  onEditProfile?: () => void;
  onFollowersPress: () => void;
  onFollowingPress: () => void;
}

export const UserProfileCard: React.FC<UserProfileCardProps> = ({
  profile,
  isOwnProfile,
  onFollow,
  onUnfollow,
  onEditProfile,
  onFollowersPress,
  onFollowingPress,
}) => {
  const [userStatus, setUserStatus] = useState<{
    status: UserStatus;
    lastSeen?: number;
  }>({
    status: profile.status || 'offline',
    lastSeen: profile.last_seen,
  });

  const { isConnected, on, off } = useRealTimeConnection(
    process.env.EXPO_PUBLIC_WS_URL || 'ws://localhost:8080',
    { autoConnect: true }
  );

  // Subscribe to user presence events
  useEffect(() => {
    if (!isConnected || isOwnProfile) return;

    const handleUserOnline = (data: { userId: string; status: UserStatus }) => {
      if (data.userId === profile.id) {
        setUserStatus({
          status: data.status,
          lastSeen: undefined,
        });
      }
    };

    const handleUserOffline = (data: { userId: string; lastSeen?: number }) => {
      if (data.userId === profile.id) {
        setUserStatus({
          status: 'offline',
          lastSeen: data.lastSeen || Date.now(),
        });
      }
    };

    on('user:online', handleUserOnline);
    on('user:offline', handleUserOffline);

    return () => {
      off('user:online', handleUserOnline);
      off('user:offline', handleUserOffline);
    };
  }, [isConnected, isOwnProfile, profile.id, on, off]);

  const formatCount = (count: number) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  return (
    <View className="items-center border-b border-border bg-background p-6">
      {/* Avatar */}
      <View className="mb-4">
        {profile.avatar_url ? (
          <Image
            source={{ uri: profile.avatar_url }}
            className="h-[100px] w-[100px] rounded-full"
          />
        ) : (
          <View className="h-[100px] w-[100px] items-center justify-center rounded-full bg-primary">
            <Text className="text-[40px] font-semibold text-primary-foreground">
              {profile.username[0].toUpperCase()}
            </Text>
          </View>
        )}
        {/* Online Status Badge */}
        {!isOwnProfile && (
          <View className="absolute bottom-1 right-1">
            <OnlineStatusBadge
              status={userStatus.status}
              lastSeen={userStatus.lastSeen}
              size="large"
              showAbsolute
            />
          </View>
        )}
      </View>

      {/* Username */}
      <Text variant="h1" className="mb-2">
        {profile.username}
      </Text>

      {/* Bio */}
      {profile.bio && (
        <Text variant="muted" className="mb-5 px-4 text-center text-[15px] leading-[22px]">
          {profile.bio}
        </Text>
      )}

      {/* Stats */}
      <View className="mb-5 w-full flex-row justify-around border-b border-t border-border py-4">
        <View className="flex-1 items-center">
          <Text variant="h2" className="mb-1">
            {formatCount(profile.post_count)}
          </Text>
          <Text variant="muted" className="text-sm">
            Posts
          </Text>
        </View>

        <Pressable
          className="flex-1 items-center"
          onPress={onFollowersPress}
          accessibilityRole="button"
          accessibilityLabel={`${formatCount(profile.follower_count)} followers`}>
          <Text variant="h2" className="mb-1">
            {formatCount(profile.follower_count)}
          </Text>
          <Text variant="muted" className="text-sm">
            Followers
          </Text>
        </Pressable>

        <Pressable
          className="flex-1 items-center"
          onPress={onFollowingPress}
          accessibilityRole="button"
          accessibilityLabel={`Following ${formatCount(profile.following_count)}`}>
          <Text variant="h2" className="mb-1">
            {formatCount(profile.following_count)}
          </Text>
          <Text variant="muted" className="text-sm">
            Following
          </Text>
        </Pressable>
      </View>

      {/* Action Button */}
      {isOwnProfile ? (
        <Pressable
          className="min-w-[200px] flex-row items-center justify-center gap-2 rounded-lg bg-muted px-6 py-2.5"
          onPress={onEditProfile}
          accessibilityRole="button"
          accessibilityLabel="Edit profile">
          <Edit size={20} color="#374151" />
          <Text variant="p" className="font-semibold text-muted-foreground">
            Edit Profile
          </Text>
        </Pressable>
      ) : (
        <Pressable
          className={`min-w-[200px] flex-row items-center justify-center gap-2 rounded-lg px-6 py-2.5 ${
            profile.is_following ? 'border border-border bg-muted' : 'bg-primary'
          }`}
          onPress={profile.is_following ? onUnfollow : onFollow}
          accessibilityRole="button"
          accessibilityLabel={profile.is_following ? 'Unfollow' : 'Follow'}>
          {profile.is_following ? (
            <>
              <UserMinus size={20} color="#374151" />
              <Text variant="p" className="font-semibold text-muted-foreground">
                Following
              </Text>
            </>
          ) : (
            <>
              <UserPlus size={20} color="#fff" />
              <Text variant="p" className="font-semibold text-primary-foreground">
                Follow
              </Text>
            </>
          )}
        </Pressable>
      )}
    </View>
  );
};
