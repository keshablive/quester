import React, { useState } from 'react';
import { View, Image, Pressable, FlatList, TextInput } from 'react-native';
import { Text } from '@/components/ui/text';
import { MessagesSquare } from 'lucide-react-native';

interface Comment {
  id: string;
  user: {
    id: string;
    username: string;
    avatar_url?: string;
  };
  content: string;
  created_at: string;
  updated_at?: string;
  parent_id?: string;
  replies?: Comment[];
}

interface CommentListProps {
  comments: Comment[];
  currentUserId: string;
  onReply: (commentId: string, content: string) => void;
  onEdit: (commentId: string, content: string) => void;
  onDelete: (commentId: string) => void;
  onUserPress: (userId: string) => void;
  onLoadReplies?: (commentId: string) => void;
}

export const CommentList: React.FC<CommentListProps> = ({
  comments,
  currentUserId,
  onReply,
  onEdit,
  onDelete,
  onUserPress,
  onLoadReplies,
}) => {
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [editText, setEditText] = useState('');
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ago`;
    } else if (hours > 0) {
      return `${hours}h ago`;
    } else if (minutes > 0) {
      return `${minutes}m ago`;
    } else {
      return 'Just now';
    }
  };

  const handleReply = (commentId: string) => {
    if (replyText.trim()) {
      onReply(commentId, replyText.trim());
      setReplyText('');
      setReplyingTo(null);
    }
  };

  const handleEdit = (commentId: string) => {
    if (editText.trim()) {
      onEdit(commentId, editText.trim());
      setEditText('');
      setEditingComment(null);
    }
  };

  const toggleReplies = (commentId: string) => {
    const newExpanded = new Set(expandedComments);
    if (newExpanded.has(commentId)) {
      newExpanded.delete(commentId);
    } else {
      newExpanded.add(commentId);
      onLoadReplies?.(commentId);
    }
    setExpandedComments(newExpanded);
  };

  const renderComment = (comment: Comment, isReply: boolean = false) => {
    const isEditing = editingComment === comment.id;
    const isReplying = replyingTo === comment.id;
    const isExpanded = expandedComments.has(comment.id);
    const hasReplies = comment.replies && comment.replies.length > 0;

    return (
      <View
        key={comment.id}
        className={`mb-4 ${isReply ? 'ml-10 border-l-2 border-gray-200 pl-3' : ''}`}>
        {/* Comment Header */}
        <Pressable
          className="mb-2 flex-row items-center"
          onPress={() => onUserPress(comment.user.id)}>
          <View className="mr-3 h-10 w-10 overflow-hidden rounded-full bg-gray-200">
            {comment.user.avatar_url ? (
              <Image source={{ uri: comment.user.avatar_url }} className="h-full w-full" />
            ) : (
              <View className="h-full w-full items-center justify-center bg-blue-500">
                <Text variant="h3" className="text-white">
                  {comment.user.username[0].toUpperCase()}
                </Text>
              </View>
            )}
          </View>
          <View className="flex-1">
            <Text variant="h4" className="text-gray-900">
              {comment.user.username}
            </Text>
            <Text variant="small" className="text-gray-500">
              {formatTimestamp(comment.created_at)}
              {comment.updated_at && comment.updated_at !== comment.created_at && ' (edited)'}
            </Text>
          </View>
        </Pressable>

        {/* Comment Content */}
        {isEditing ? (
          <View className="mb-3">
            <TextInput
              className="min-h-[80px] rounded-lg border border-gray-300 bg-white p-3 text-base"
              value={editText}
              onChangeText={setEditText}
              placeholder="Edit comment..."
              multiline
              autoFocus
            />
            <View className="mt-2 flex-row justify-end gap-2">
              <Pressable
                className="rounded-lg px-4 py-2"
                onPress={() => {
                  setEditText('');
                  setEditingComment(null);
                }}>
                <Text className="font-medium text-gray-600">Cancel</Text>
              </Pressable>
              <Pressable
                className="rounded-lg bg-blue-500 px-4 py-2"
                onPress={() => handleEdit(comment.id)}>
                <Text className="font-semibold text-white">Save</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Text variant="p" className="mb-2 leading-6 text-gray-800">
            {comment.content}
          </Text>
        )}

        {/* Comment Actions */}
        {!isEditing && (
          <View className="flex-row gap-4">
            <Pressable
              className="py-1"
              onPress={() => {
                setReplyingTo(comment.id);
                setReplyText('');
              }}>
              <Text variant="small" className="font-medium text-blue-600">
                Reply
              </Text>
            </Pressable>

            {comment.user.id === currentUserId && (
              <>
                <Pressable
                  className="py-1"
                  onPress={() => {
                    setEditingComment(comment.id);
                    setEditText(comment.content);
                  }}>
                  <Text variant="small" className="font-medium text-blue-600">
                    Edit
                  </Text>
                </Pressable>
                <Pressable className="py-1" onPress={() => onDelete(comment.id)}>
                  <Text variant="small" className="font-medium text-red-600">
                    Delete
                  </Text>
                </Pressable>
              </>
            )}

            {hasReplies && (
              <Pressable className="py-1" onPress={() => toggleReplies(comment.id)}>
                <Text variant="small" className="font-medium text-blue-600">
                  {isExpanded ? 'Hide' : `View ${comment.replies!.length}`} replies
                </Text>
              </Pressable>
            )}
          </View>
        )}

        {/* Reply Input */}
        {isReplying && (
          <View className="mt-3">
            <TextInput
              className="min-h-[80px] rounded-lg border border-gray-300 bg-white p-3 text-base"
              value={replyText}
              onChangeText={setReplyText}
              placeholder={`Reply to ${comment.user.username}...`}
              multiline
              autoFocus
            />
            <View className="mt-2 flex-row justify-end gap-2">
              <Pressable
                className="rounded-lg px-4 py-2"
                onPress={() => {
                  setReplyText('');
                  setReplyingTo(null);
                }}>
                <Text className="font-medium text-gray-600">Cancel</Text>
              </Pressable>
              <Pressable
                className="rounded-lg bg-blue-500 px-4 py-2"
                onPress={() => handleReply(comment.id)}>
                <Text className="font-semibold text-white">Reply</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Nested Replies */}
        {isExpanded && hasReplies && (
          <View className="mt-2">
            {comment.replies!.map((reply) => renderComment(reply, true))}
          </View>
        )}
      </View>
    );
  };

  return (
    <FlatList
      data={comments}
      renderItem={({ item }) => renderComment(item)}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ flexGrow: 1, padding: 16 }}
      ListEmptyComponent={
        <View className="flex-1 items-center justify-center py-12">
          <MessagesSquare size={48} color="#9CA3AF" />
          <Text variant="h3" className="mt-4 text-gray-700">
            No comments yet
          </Text>
          <Text variant="small" className="mt-1 text-gray-500">
            Be the first to comment!
          </Text>
        </View>
      }
    />
  );
};
