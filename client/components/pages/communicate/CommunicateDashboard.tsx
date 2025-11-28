import React, { useState, useEffect } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { Text, Card, CardContent, Button, Icon } from '@/components/ui';
import { MessageCircle, Users, Video, UserPlus, Send, ArrowRight, Hash } from 'lucide-react-native';
import { cn, groupsService, Post, Group } from '@/core';
import { MessageItem } from './Messages/MessageItem';
import { PostCard } from './Social/PostCard';
import type { Message } from './Messages/types';

interface CommunicateDashboardProps {
  onNavigate: (view: string) => void;
  onPostPress?: (post: Post) => void;
}

export function CommunicateDashboard({ onNavigate, onPostPress }: CommunicateDashboardProps) {
  const [recentMessages, setRecentMessages] = useState<Message[]>([]);
  const [recentPosts, setRecentPosts] = useState<Post[]>([]);
  const [userGroups, setUserGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    unreadMessages: 0,
    activeStreams: 0,
    groupMembers: 0,
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Mock recent messages
      const mockMessages: Message[] = [
        {
          sender: 'Sarah Wilson',
          preview: 'Hey! I loved your latest project...',
          time: '2m ago',
          unread: true,
          initials: 'SW',
        },
        {
          sender: 'Mike Johnson',
          preview: 'Can we schedule a meeting for...',
          time: '1h ago',
          unread: true,
          initials: 'MJ',
        },
        {
          sender: 'Emma Davis',
          preview: 'Thanks for the feedback! I will...',
          time: '3h ago',
          unread: false,
          initials: 'ED',
        },
      ];
      setRecentMessages(mockMessages);
      
      // Load user groups
      try {
        const groups = await groupsService.getUserGroups();
        setUserGroups(groups.slice(0, 3));
      } catch (err) {
        console.log('Groups not available');
        setUserGroups([]);
      }
      
      // Mock posts - in real app would fetch from postsService
      const mockPosts: Post[] = [];
      setRecentPosts(mockPosts);
      
      // Set stats
      setStats({
        unreadMessages: mockMessages.filter(m => m.unread).length,
        activeStreams: 3, // Mock data
        groupMembers: userGroups.reduce((sum: number, g: Group) => sum + (g.memberCount || 0), 0),
      });
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const STATS = [
    { label: 'Unread Messages', value: stats.unreadMessages.toString(), icon: MessageCircle, color: 'text-blue-500' },
    { label: 'Active Streams', value: stats.activeStreams.toString(), icon: Video, color: 'text-red-500' },
    { label: 'Group Members', value: stats.groupMembers.toString(), icon: Users, color: 'text-green-500' },
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
      <View className="p-6 gap-6">
        {/* Header */}
        <View>
          <Text className="text-3xl font-bold">Communicate</Text>
          <Text className="text-muted-foreground">Connect, share, and engage with your community</Text>
        </View>

        {/* Stats Row */}
        <View className="flex-row gap-4">
          {STATS.map((stat, index) => (
            <Card key={index} className="flex-1">
              <CardContent className="p-4 items-center gap-2">
                <Icon as={stat.icon} size={24} className={stat.color} />
                <Text className="text-2xl font-bold">{stat.value}</Text>
                <Text className="text-xs text-center text-muted-foreground">{stat.label}</Text>
              </CardContent>
            </Card>
          ))}
        </View>

        {/* Feature Cards */}
        <View className="gap-4">
          <Text className="text-xl font-semibold">Features</Text>
          <View className="flex-row gap-4 flex-wrap">
            {FEATURES.map((feature, index) => (
              <Pressable
                key={index}
                className="flex-1 min-w-[150px]"
                onPress={() => onNavigate(feature.view)}
              >
                <View className={cn("p-6 rounded-xl items-center gap-3", feature.color)}>
                  <Icon as={feature.icon} size={32} className={feature.iconColor} />
                  <Text className="font-semibold text-center">{feature.title}</Text>
                  <Icon as={ArrowRight} size={16} className="text-muted-foreground" />
                </View>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Recent Messages */}
        {recentMessages.length > 0 && (
          <View className="gap-4">
            <View className="flex-row items-center justify-between">
              <Text className="text-xl font-semibold">Recent Messages</Text>
              <Button variant="ghost" size="sm" onPress={() => onNavigate('messages')}>
                <Text>View All</Text>
                <Icon as={ArrowRight} size={16} className="ml-1" />
              </Button>
            </View>
            <Card>
              {recentMessages.map((message, index) => (
                <MessageItem 
                  key={index} 
                  message={message} 
                  isLast={index === recentMessages.length - 1} 
                />
              ))}
            </Card>
          </View>
        )}

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
                  className="flex-row items-center p-4 bg-card rounded-xl border border-border"
                  onPress={() => onNavigate('groups')}
                >
                  <View className="w-12 h-12 rounded-full bg-primary/10 items-center justify-center mr-3">
                    <Users size={24} className="text-primary" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-semibold">{group.name}</Text>
                    <Text className="text-sm text-muted-foreground">{group.memberCount} members</Text>
                  </View>
                  <Icon as={ArrowRight} size={20} className="text-muted-foreground" />
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* Quick Actions */}
        <Card>
          <CardContent className="p-6 gap-4">
            <Text className="text-lg font-semibold mb-2">Quick Actions</Text>
            <View className="gap-3">
              <Pressable 
                className="flex-row items-center gap-3 p-3 bg-primary/5 rounded-lg"
                onPress={() => onNavigate('messages')}
              >
                <Icon as={Send} size={20} className="text-primary" />
                <Text className="text-base font-medium">Send a message</Text>
              </Pressable>
              <Pressable 
                className="flex-row items-center gap-3 p-3 bg-primary/5 rounded-lg"
                onPress={() => onNavigate('groups')}
              >
                <Icon as={UserPlus} size={20} className="text-primary" />
                <Text className="text-base font-medium">Create a group</Text>
              </Pressable>
              <Pressable 
                className="flex-row items-center gap-3 p-3 bg-primary/5 rounded-lg"
                onPress={() => onNavigate('streams')}
              >
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
