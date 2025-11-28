import React from 'react';
import { View } from 'react-native';
import { Post } from '@/core';
import { Heart, MessageCircle, User } from 'lucide-react-native';
import {
  Card,
  CardContent,
  CardHeader,
  CardFooter,
  Text,
  Avatar,
  AvatarFallback,
  Button,
  Icon,
} from '@/components/ui';
import { AutoMilestoneBadge } from '@/components/ui/MilestoneBadge';

import { PostCardProps } from './types';

export function PostCard({ post, onLike, onComment, onPress }: PostCardProps) {
  const formatDate = (date: string) => {
    const now = new Date();
    const postDate = new Date(date);
    const diffTime = Math.abs(now.getTime() - postDate.getTime());
    const diffMinutes = Math.floor(diffTime / (1000 * 60));

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;

    return postDate.toLocaleDateString();
  };

  return (
    <Card className="mb-4">
      <CardHeader className="flex-row items-center gap-3 pb-2">
        <Avatar className="h-10 w-10" alt={`Avatar of user ${post.authorId}`}>
          <AvatarFallback className="bg-primary/10">
            <Icon as={User} size={20} className="text-primary" />
          </AvatarFallback>
        </Avatar>
        <View className="flex-1">
          <View className="flex-row items-center gap-2">
            <Text className="font-semibold text-foreground">User {post.authorId.slice(0, 8)}</Text>
            {/* T069: Milestone badge indicator */}
            <AutoMilestoneBadge likeCount={post.likesCount} size="sm" />
          </View>
          <Text className="text-xs text-muted-foreground">{formatDate(post.createdAt)}</Text>
        </View>
      </CardHeader>

      <CardContent className="pb-2">
        <Text className="text-base leading-6 text-foreground" onPress={() => onPress?.(post)}>
          {post.content}
        </Text>
      </CardContent>

      <CardFooter className="mt-2 flex-row gap-6 border-t border-border pt-3">
        <Button
          variant="ghost"
          size="sm"
          className="flex-row gap-2 px-2"
          onPress={() => onLike(post)}>
          <Icon as={Heart} size={20} className="text-destructive" />
          <Text className="text-muted-foreground">{post.likesCount}</Text>
          {/* XP hint for likes - FR-001 */}
          <Text className="text-[10px] font-medium text-yellow-500">+2 XP</Text>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="flex-row gap-2 px-2"
          onPress={() => onComment(post)}>
          <Icon as={MessageCircle} size={20} className="text-blue-500" />
          <Text className="text-muted-foreground">{post.commentsCount}</Text>
          {/* XP hint for comments - FR-001 */}
          <Text className="text-[10px] font-medium text-yellow-500">+5 XP</Text>
        </Button>
      </CardFooter>
    </Card>
  );
}
