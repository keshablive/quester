import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { Text, Card, CardContent, Button, Icon, Skeleton } from '@/components/ui';
import {
  MessageCircle,
  Users,
  Video,
  UserPlus,
  Send,
  ArrowRight,
  Hash,
  AlertCircle,
  RefreshCw,
} from 'lucide-react-native';
import { cn, groupsService, Post, Group } from '@/core';
import { useRecentMessages, useUnreadCount } from '@/core/hooks/queries';
import { MessageItem, threadToLegacyMessage } from './Messages';
import { PostCard } from './Social/PostCard';
import type { LegacyMessage, MessageThread } from './Messages/types';

interface CommunicateDashboardProps {
  onNavigate: (view: string) => void;
  onPostPress?: (post: Post) => void;
  onThreadSelect?: (thread: MessageThread) => void;
}

export function CommunicateDashboard({
  onNavigate,
  onPostPress,
  onThreadSelect,
}: CommunicateDashboardProps) {
  // Fetch recent messages using TanStack Query hook (Feature 017 - T033, T034)
  const {
    data: recentThreads = [],
    isLoading: messagesLoading,
    isError: messagesError,
    refetch: refetchMessages,
    isRefetching: messagesRefetching,
  } = useRecentMessages(3);

  // Fetch unread count (T039)
  const { data: unreadCount = 0 } = useUnreadCount();

  const recentMessages: LegacyMessage[] = recentThreads.map(threadToLegacyMessage);

  const [recentPosts, setRecentPosts] = useState<Post[]>([]);
  const [userGroups, setUserGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    unreadMessages: 0,
    activeStreams: 0,
    groupMembers: 0,
  });

  // FR-010: Track mounted state to prevent state updates after unmount
  const isMountedRef = useRef(true);

  /**
   * Load groups data
   * FR-006: Extracted to useCallback with proper dependencies
   */
  const loadGroups = useCallback(async (): Promise<Group[]> => {
    try {
      const groups = await groupsService.getUserGroups();
      return groups.slice(0, 3);
    } catch (err) {
      console.log('Groups not available');
      return [];
    }
  }, []);

  /**
   * Effect for loading groups
   * FR-006: Separate effect for groups loading
   * FR-010: Cleanup function prevents state updates on unmounted component
   */
  useEffect(() => {
    let cancelled = false;

    const fetchGroups = async () => {
      setLoading(true);
      const groups = await loadGroups();

      if (!cancelled && isMountedRef.current) {
        setUserGroups(groups);
        setLoading(false);
      }
    };

    fetchGroups();

    return () => {
      cancelled = true;
    };
  }, [loadGroups]);

  /**
   * Effect for updating stats when dependencies change
   * FR-006: Separate effect for stats updates with correct dependencies
   */
  useEffect(() => {
    if (!isMountedRef.current) return;

    const groupMemberCount = userGroups.reduce(
      (sum: number, g: Group) => sum + (g.memberCount || 0),
      0
    );

    setStats({
      unreadMessages: unreadCount,
      activeStreams: 3, // Mock data - will be replaced with real streams API
      groupMembers: groupMemberCount,
    });
  }, [unreadCount, userGroups]);

  /**
   * Cleanup on unmount
   * FR-010: Mark component as unmounted
   */
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const STATS = [
    {
      label: 'Unread Messages',
      value: stats.unreadMessages.toString(),
      icon: MessageCircle,
      color: 'text-blue-500',
    },
    {
      label: 'Active Streams',
      value: stats.activeStreams.toString(),
      icon: Video,
      color: 'text-red-500',
    },
    {
      label: 'Group Members',
      value: stats.groupMembers.toString(),
      icon: Users,
      color: 'text-green-500',
    },
  ];

  const FEATURES = [
    {
      title: 'Messages',
      description: 'Chat with your connections',
      icon: MessageCircle,
      view: 'messages',
      color: 'bg-blue-500/10',
      iconColor: 'text-blue-500',
    },
    {
      title: 'Social Feed',
      description: 'Share posts and updates',
      icon: Hash,
      view: 'social',
      color: 'bg-purple-500/10',
      iconColor: 'text-purple-500',
    },
    {
      title: 'Live Streams',
      description: 'Watch and broadcast live',
      icon: Video,
      view: 'streams',
      color: 'bg-red-500/10',
      iconColor: 'text-red-500',
    },
    {
      title: 'Groups',
      description: 'Connect with communities',
      icon: Users,
      view: 'groups',
      color: 'bg-green-500/10',
      iconColor: 'text-green-500',
    },
  ];

  return (
    <ScrollView className="flex-1 bg-background">
      <View className="gap-6 p-6">
        {/* Header */}
        <View>
          <Text className="text-3xl font-bold">Communicate</Text>
          <Text className="text-muted-foreground">
            Connect, share, and engage with your community
          </Text>
        </View>

        {/* Stats Row */}
        <View className="flex-row gap-4">
          {STATS.map((stat, index) => (
            <Card key={index} className="flex-1">
              <CardContent className="items-center gap-2 p-4">
                <Icon as={stat.icon} size={24} className={stat.color} />
                <Text className="text-2xl font-bold">{stat.value}</Text>
                <Text className="text-center text-xs text-muted-foreground">{stat.label}</Text>
              </CardContent>
            </Card>
          ))}
        </View>

        {/* Feature Cards */}
        <View className="gap-4">
          <Text className="text-xl font-semibold">Features</Text>
          <View className="flex-row flex-wrap gap-4">
            {FEATURES.map((feature, index) => (
              <Pressable
                key={index}
                className="min-w-[150px] flex-1"
                onPress={() => onNavigate(feature.view)}>
                <View className={cn('items-center gap-3 rounded-xl p-6', feature.color)}>
                  <Icon as={feature.icon} size={32} className={feature.iconColor} />
                  <Text className="text-center font-semibold">{feature.title}</Text>
                  <Icon as={ArrowRight} size={16} className="text-muted-foreground" />
                </View>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Recent Messages (T033-T037) */}
        <View className="gap-4">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <Text className="text-xl font-semibold">Recent Messages</Text>
              {/* Unread count badge (T039) */}
              {unreadCount > 0 && (
                <View className="rounded-full bg-primary px-2 py-0.5">
                  <Text className="text-xs font-medium text-primary-foreground">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Text>
                </View>
              )}
            </View>
            <Button variant="ghost" size="sm" onPress={() => onNavigate('messages')}>
              <Text>View All</Text>
              <Icon as={ArrowRight} size={16} className="ml-1" />
            </Button>
          </View>

          {/* Loading state (T035) */}
          {messagesLoading && (
            <Card>
              {[1, 2, 3].map((i) => (
                <View
                  key={i}
                  className={`flex-row items-center gap-3 p-4 ${i < 3 ? 'border-b border-border' : ''}`}>
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <View className="flex-1 gap-2">
                    <View className="flex-row justify-between">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-12" />
                    </View>
                    <Skeleton className="h-3 w-full" />
                  </View>
                </View>
              ))}
            </Card>
          )}

          {/* Error state (T036) */}
          {messagesError && !messagesLoading && (
            <Card>
              <View className="items-center gap-3 p-4">
                <Icon as={AlertCircle} size={32} className="text-destructive/70" />
                <Text className="text-center text-muted-foreground">Failed to load messages</Text>
                <Button
                  variant="outline"
                  size="sm"
                  onPress={() => refetchMessages()}
                  disabled={messagesRefetching}>
                  {messagesRefetching ? (
                    <ActivityIndicator size="small" className="mr-2" />
                  ) : (
                    <Icon as={RefreshCw} size={14} className="mr-2" />
                  )}
                  <Text>{messagesRefetching ? 'Retrying...' : 'Retry'}</Text>
                </Button>
              </View>
            </Card>
          )}

          {/* Messages list with tap handler (T037) */}
          {!messagesLoading && !messagesError && recentMessages.length > 0 && (
            <Card>
              {recentThreads.map((thread, index) => (
                <Pressable key={thread.id} onPress={() => onThreadSelect?.(thread)}>
                  <MessageItem
                    message={threadToLegacyMessage(thread)}
                    isLast={index === recentThreads.length - 1}
                  />
                </Pressable>
              ))}
            </Card>
          )}

          {/* Empty state */}
          {!messagesLoading && !messagesError && recentMessages.length === 0 && (
            <Card>
              <View className="items-center gap-2 p-8">
                <Icon as={MessageCircle} size={40} className="text-muted-foreground/50" />
                <Text className="text-muted-foreground">No recent messages</Text>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onPress={() => onNavigate('messages')}>
                  <Text>Start a conversation</Text>
                </Button>
              </View>
            </Card>
          )}
        </View>

        {/* Recent Posts */}
        {recentPosts.length > 0 && (
          <View className="gap-4">
            <View className="flex-row items-center justify-between">
              <Text className="text-xl font-semibold">Recent Posts</Text>
              <Button variant="ghost" size="sm" onPress={() => onNavigate('social')}>
                <Text>View All</Text>
                <Icon as={ArrowRight} size={16} className="ml-1" />
              </Button>
            </View>
            <View className="gap-4">
              {recentPosts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onLike={() => console.log('Like post:', post.id)}
                  onComment={() => console.log('Comment on post:', post.id)}
                  onPress={onPostPress}
                />
              ))}
            </View>
          </View>
        )}

        {/* User Groups */}
        {userGroups.length > 0 && (
          <View className="gap-4">
            <View className="flex-row items-center justify-between">
              <Text className="text-xl font-semibold">Your Groups</Text>
              <Button variant="ghost" size="sm" onPress={() => onNavigate('groups')}>
                <Text>View All</Text>
                <Icon as={ArrowRight} size={16} className="ml-1" />
              </Button>
            </View>
            <View className="gap-3">
              {userGroups.map((group) => (
                <Pressable
                  key={group.id}
                  className="flex-row items-center rounded-xl border border-border bg-card p-4"
                  onPress={() => onNavigate('groups')}>
                  <View className="mr-3 h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <Users size={24} className="text-primary" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-semibold">{group.name}</Text>
                    <Text className="text-sm text-muted-foreground">
                      {group.memberCount} members
                    </Text>
                  </View>
                  <Icon as={ArrowRight} size={20} className="text-muted-foreground" />
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* Quick Actions */}
        <Card>
          <CardContent className="gap-4 p-6">
            <Text className="mb-2 text-lg font-semibold">Quick Actions</Text>
            <View className="gap-3">
              <Pressable
                className="flex-row items-center gap-3 rounded-lg bg-primary/5 p-3"
                onPress={() => onNavigate('messages')}>
                <Icon as={Send} size={20} className="text-primary" />
                <Text className="text-base font-medium">Send a message</Text>
              </Pressable>
              <Pressable
                className="flex-row items-center gap-3 rounded-lg bg-primary/5 p-3"
                onPress={() => onNavigate('groups')}>
                <Icon as={UserPlus} size={20} className="text-primary" />
                <Text className="text-base font-medium">Create a group</Text>
              </Pressable>
              <Pressable
                className="flex-row items-center gap-3 rounded-lg bg-primary/5 p-3"
                onPress={() => onNavigate('streams')}>
                <Icon as={Video} size={20} className="text-primary" />
                <Text className="text-base font-medium">Start a stream</Text>
              </Pressable>
            </View>
          </CardContent>
        </Card>
      </View>
    </ScrollView>
  );
}
