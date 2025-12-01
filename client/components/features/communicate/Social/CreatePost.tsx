import React, { useState } from 'react';
import { View, KeyboardAvoidingView, Platform } from 'react-native';
import { socialService } from '@/core';
import { Send, X } from 'lucide-react-native';
import { 
  Text, 
  Button, 
  Textarea, 
  Icon,
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '@/components/ui';

import { CreatePostProps } from './types';

export function CreatePost({ onSuccess, onCancel }: CreatePostProps) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!content.trim()) return;

    try {
      setLoading(true);
      setError(null);
      await socialService.createPost(content);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create post');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-background"
    >
      <View className="flex-row justify-between items-center p-4 border-b border-border bg-background">
        <Text className="text-xl font-bold">Create Post</Text>
        <Button variant="ghost" size="icon" onPress={onCancel}>
          <Icon as={X} size={24} className="text-muted-foreground" />
        </Button>
      </View>

      {error && (
        <View className="bg-destructive/10 p-4 mx-4 mt-4 rounded-md">
          <Text className="text-destructive text-sm">{error}</Text>
        </View>
      )}

      <View className="flex-1 p-4 gap-4">
        <Textarea
          placeholder="What's on your mind?"
          value={content}
          onChangeText={setContent}
          numberOfLines={6}
          editable={!loading}
          autoFocus
          className="flex-1 text-base p-4"
        />

        <View className="gap-3">
          <Button 
            onPress={handleSubmit} 
            disabled={!content.trim() || loading}
            className="w-full"
          >
            <Text>{loading ? 'Posting...' : 'Post'}</Text>
            {!loading && <Icon as={Send} size={16} className="ml-2" />}
          </Button>

          <Button 
            variant="outline" 
            onPress={onCancel} 
            disabled={loading}
            className="w-full"
          >
            <Text>Cancel</Text>
          </Button>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

