import React, { useState, useCallback } from 'react';
import { View, TextInput, Pressable, FlatList, ActivityIndicator, Alert } from 'react-native';
import { Text } from '@/components/ui/text';
import {
  Send,
  XCircle,
  Trash2,
  MessageCircle,
  AlertCircle,
  MessagesSquare,
  ChevronUp,
  ChevronDown,
  Clock,
  Flag,
} from 'lucide-react-native';
import { useInteractions } from '@/lib/hooks/useInteractions';
import type { Interaction } from '@/lib/api/interactions';
import { getTimeAgo } from '@/lib/utils/date';

export interface Comment {
  id: string;
  user_id: string;
  user_name?: string;
  user_avatar?: string;
  content?: string; // Optional to align with Interaction type
  created_at: string;
  parent_interaction_id?: string;
  depth: number;
  moderation_status: 'pending' | 'approved' | 'flagged' | 'rejected';
  children_count: number;
}

interface CommentThreadProps {
  targetType: string;
  targetId: string;
  maxDepth?: number;
  allowReplies?: boolean;
  showModerationStatus?: boolean;
  currentUserId?: number;
  onCommentAdded?: () => void;
}

export function CommentThread({
  targetType,
  targetId,
  maxDepth = 5,
  allowReplies = true,
  showModerationStatus = false,
  currentUserId,
  onCommentAdded,
}: CommentThreadProps) {
  const {
    comments,
    loading,
    error,
    hasMore,
    loadMore,
    createComment,
    deleteComment,
    loadChildComments,
  } = useInteractions({
    targetType,
    targetId,
    interactionType: 'comment',
  });

  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());

  const handleSubmitComment = useCallback(
    async (parentId?: string) => {
      if (!replyText.trim()) {
        Alert.alert('Error', 'Please enter a comment');
        return;
      }

      setSubmitting(true);
      try {
        const result = await createComment({
          content: replyText.trim(),
          parent_interaction_id: parentId,
        });

        // Check moderation status
        if (result.moderation_status === 'flagged') {
          Alert.alert(
            'Comment Under Review',
            'Your comment has been flagged for review by our moderation team. It will be visible once approved.'
          );
        } else if (result.moderation_status === 'rejected') {
          Alert.alert(
            'Comment Rejected',
            'Your comment violates our community guidelines and was not posted.'
          );
          return;
        }

        setReplyText('');
        setReplyingTo(null);
        onCommentAdded?.();
      } catch (err: any) {
        Alert.alert('Error', err.message || 'Failed to post comment');
      } finally {
        setSubmitting(false);
      }
    },
    [replyText, createComment, onCommentAdded]
  );

  const handleDeleteComment = useCallback(
    (commentId: string) => {
      Alert.alert('Delete Comment', 'Are you sure you want to delete this comment?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteComment(commentId);
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to delete comment');
            }
          },
        },
      ]);
    },
    [deleteComment]
  );

  const handleToggleReplies = useCallback(
    async (commentId: string) => {
      const newExpanded = new Set(expandedComments);
      if (newExpanded.has(commentId)) {
        newExpanded.delete(commentId);
      } else {
        newExpanded.add(commentId);
        // Load child comments if not already loaded
        await loadChildComments(commentId);
      }
      setExpandedComments(newExpanded);
    },
    [expandedComments, loadChildComments]
  );

  const renderModerationBadge = (status: string) => {
    if (!showModerationStatus || status === 'approved') return null;

    const badges = {
      pending: { text: 'Pending', color: '#FFA500', Icon: Clock },
      flagged: { text: 'Under Review', color: '#FF6B6B', Icon: Flag },
      rejected: { text: 'Rejected', color: '#DC3545', Icon: XCircle },
    };

    const badge = badges[status as keyof typeof badges];
    if (!badge) return null;

    const { Icon } = badge;

    return (
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: badge.color + '20',
          paddingHorizontal: 8,
          paddingVertical: 4,
          borderRadius: 4,
          marginLeft: 8,
        }}>
        <Icon size={12} color={badge.color} />
        <Text style={{ fontSize: 11, color: badge.color, marginLeft: 4 }}>{badge.text}</Text>
      </View>
    );
  };

  const renderCommentInput = (parentId?: number) => (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F5F5F5',
        borderRadius: 8,
        padding: 8,
        marginTop: 8,
      }}>
      <TextInput
        style={{
          flex: 1,
          backgroundColor: 'white',
          borderRadius: 6,
          paddingHorizontal: 12,
          paddingVertical: 8,
          marginRight: 8,
          maxHeight: 100,
        }}
        placeholder={parentId ? 'Write a reply...' : 'Write a comment...'}
        value={replyText}
        onChangeText={setReplyText}
        multiline
        editable={!submitting}
      />
      <Pressable
        onPress={() => handleSubmitComment(parentId ? String(parentId) : undefined)}
        disabled={submitting || !replyText.trim()}
        style={{
          backgroundColor: replyText.trim() ? '#007AFF' : '#CCCCCC',
          borderRadius: 6,
          padding: 10,
        }}>
        {submitting ? (
          <ActivityIndicator size="small" color="white" />
        ) : (
          <Send size={20} color="white" />
        )}
      </Pressable>
      {parentId && (
        <Pressable
          onPress={() => {
            setReplyingTo(null);
            setReplyText('');
          }}
          style={{ marginLeft: 8 }}>
          <XCircle size={24} color="#999" />
        </Pressable>
      )}
    </View>
  );

  const renderComment = ({ item: comment }: { item: Interaction }) => {
    const isOwner = String(currentUserId) === String(comment.user_id);
    const canReply = allowReplies && comment.depth < maxDepth;
    const hasReplies = comment.children_count > 0;
    const isExpanded = expandedComments.has(comment.id);
    const isReplying = replyingTo === comment.id;

    return (
      <View
        style={{
          marginLeft: comment.depth * 16,
          marginVertical: 8,
          backgroundColor: 'white',
          borderRadius: 8,
          padding: 12,
          borderLeftWidth: comment.depth > 0 ? 3 : 0,
          borderLeftColor: '#007AFF',
        }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: '#007AFF',
              justifyContent: 'center',
              alignItems: 'center',
            }}>
            <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 14 }}>
              {comment.user_name?.charAt(0).toUpperCase() || 'U'}
            </Text>
          </View>
          <View style={{ flex: 1, marginLeft: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ fontWeight: '600', fontSize: 14 }}>
                {comment.user_name || 'Anonymous'}
              </Text>
              {isOwner && (
                <View
                  style={{
                    backgroundColor: '#007AFF20',
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    borderRadius: 4,
                    marginLeft: 6,
                  }}>
                  <Text style={{ fontSize: 10, color: '#007AFF', fontWeight: '600' }}>YOU</Text>
                </View>
              )}
              {renderModerationBadge(comment.moderation_status)}
            </View>
            <Text style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
              {getTimeAgo(comment.created_at)}
            </Text>
          </View>
          {isOwner && (
            <Pressable onPress={() => handleDeleteComment(comment.id)}>
              <Trash2 size={18} color="#DC3545" />
            </Pressable>
          )}
        </View>

        {/* Content */}
        <Text style={{ fontSize: 14, lineHeight: 20, color: '#333' }}>{comment.content}</Text>

        {/* Actions */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
          {canReply && (
            <Pressable
              onPress={() => setReplyingTo(isReplying ? null : comment.id)}
              style={{ flexDirection: 'row', alignItems: 'center', marginRight: 16 }}>
              <MessageCircle size={16} color={isReplying ? '#007AFF' : '#666'} />
              <Text
                style={{
                  fontSize: 13,
                  color: isReplying ? '#007AFF' : '#666',
                  marginLeft: 4,
                  fontWeight: isReplying ? '600' : '400',
                }}>
                {isReplying ? 'Cancel' : 'Reply'}
              </Text>
            </Pressable>
          )}

          {hasReplies && (
            <Pressable
              onPress={() => handleToggleReplies(comment.id)}
              style={{ flexDirection: 'row', alignItems: 'center' }}>
              {isExpanded ? (
                <ChevronUp size={16} color="#007AFF" />
              ) : (
                <ChevronDown size={16} color="#007AFF" />
              )}
              <Text style={{ fontSize: 13, color: '#007AFF', marginLeft: 4 }}>
                {isExpanded ? 'Hide' : 'Show'} {comment.children_count}{' '}
                {comment.children_count === 1 ? 'reply' : 'replies'}
              </Text>
            </Pressable>
          )}
        </View>

        {/* Reply Input */}
        {isReplying && renderCommentInput(typeof comment.id === 'number' ? comment.id : undefined)}
      </View>
    );
  };

  if (error) {
    return (
      <View style={{ padding: 16, alignItems: 'center' }}>
        <AlertCircle size={48} color="#DC3545" />
        <Text style={{ fontSize: 16, color: '#DC3545', marginTop: 8, textAlign: 'center' }}>
          {error}
        </Text>
        <Pressable
          onPress={() => loadMore()}
          style={{
            backgroundColor: '#007AFF',
            paddingHorizontal: 20,
            paddingVertical: 10,
            borderRadius: 8,
            marginTop: 12,
          }}>
          <Text style={{ color: 'white', fontWeight: '600' }}>Try Again</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {/* New Comment Input */}
      {!replyingTo && renderCommentInput()}

      {/* Comments List */}
      <FlatList
        data={comments}
        renderItem={renderComment}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ paddingVertical: 8 }}
        ListEmptyComponent={
          loading ? (
            <View style={{ padding: 32, alignItems: 'center' }}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={{ fontSize: 14, color: '#666', marginTop: 12 }}>
                Loading comments...
              </Text>
            </View>
          ) : (
            <View style={{ padding: 32, alignItems: 'center' }}>
              <MessagesSquare size={48} color="#CCC" />
              <Text style={{ fontSize: 16, color: '#999', marginTop: 12 }}>No comments yet</Text>
              <Text style={{ fontSize: 14, color: '#999', marginTop: 4 }}>
                Be the first to comment!
              </Text>
            </View>
          )
        }
        ListFooterComponent={
          hasMore ? (
            <Pressable
              onPress={loadMore}
              disabled={loading}
              style={{
                padding: 16,
                alignItems: 'center',
                backgroundColor: '#F5F5F5',
                borderRadius: 8,
                marginVertical: 8,
              }}>
              {loading ? (
                <ActivityIndicator size="small" color="#007AFF" />
              ) : (
                <Text style={{ color: '#007AFF', fontWeight: '600' }}>Load More</Text>
              )}
            </Pressable>
          ) : null
        }
      />
    </View>
  );
}
