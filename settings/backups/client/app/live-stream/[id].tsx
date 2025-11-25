import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  UserCircle2,
  AlertCircle,
  X,
  Eye,
  Heart,
  Share2,
  MessageCircle,
  Send,
} from 'lucide-react-native';
import { LiveStreamPlayer } from '@/components/video/live-stream-player';
import { useStream, useStreamInteractions } from '@/lib/hooks/useStream';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { ScreenWrapper } from '@/components/screen-wrapper';

interface Comment {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  message: string;
  createdAt: string;
}

export default function LiveStreamScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [showChat, setShowChat] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [localComments, setLocalComments] = useState<Comment[]>([]);

  const { stream, stats, isLoading, error } = useStream(id);
  const { like, unlike, postComment, comments, isLoadingComments, isLiking, isCommenting } =
    useStreamInteractions(id);

  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);

  useEffect(() => {
    if (stream) {
      setIsLiked(false); // TODO: Get from user's liked streams
      setLikesCount(0); // TODO: Get from stream metadata
    }
  }, [stream]);

  // Merge server comments with local optimistic updates
  useEffect(() => {
    if (comments.length > 0) {
      setLocalComments(comments);
    }
  }, [comments]);

  const handleLike = async () => {
    try {
      setIsLiked(!isLiked);
      setLikesCount(isLiked ? likesCount - 1 : likesCount + 1);

      if (isLiked) {
        await unlike();
      } else {
        await like();
      }
    } catch (err) {
      // Revert optimistic update on error
      setIsLiked(!isLiked);
      setLikesCount(isLiked ? likesCount + 1 : likesCount - 1);
      console.error('Failed to like stream:', err);
    }
  };

  const handleSendComment = async () => {
    if (!commentText.trim() || isCommenting) return;

    const tempComment: Comment = {
      id: `temp-${Date.now()}`,
      userId: 'current-user',
      userName: 'You',
      message: commentText,
      createdAt: new Date().toISOString(),
    };

    // Optimistic update
    setLocalComments([tempComment, ...localComments]);
    const messageToSend = commentText;
    setCommentText('');

    try {
      await postComment(messageToSend);
    } catch (err) {
      // Remove optimistic comment on error
      setLocalComments(localComments.filter((c) => c.id !== tempComment.id));
      setCommentText(messageToSend);
      console.error('Failed to post comment:', err);
    }
  };

  const handleShare = () => {
    // TODO: Implement share functionality
    console.log('Share stream:', id);
  };

  const formatViewCount = (count: number): string => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const formatTimeAgo = (dateString: string): string => {
    const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const renderComment = ({ item }: { item: Comment }) => (
    <View style={styles.commentItem}>
      <View style={styles.commentAvatar}>
        <UserCircle2 size={32} color="#9ca3af" />
      </View>
      <View style={styles.commentContent}>
        <View style={styles.commentHeader}>
          <Text style={styles.commentUserName}>{item.userName}</Text>
          <Text style={styles.commentTime}>{formatTimeAgo(item.createdAt)}</Text>
        </View>
        <Text style={styles.commentMessage}>{item.message}</Text>
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <ScreenWrapper screenName="LiveStream">
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading stream...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  if (error || !stream) {
    return (
      <ScreenWrapper screenName="LiveStream">
        <View style={styles.errorContainer}>
          <AlertCircle size={64} color="#ef4444" />
          <Text style={styles.errorText}>Failed to load stream</Text>
          <Button variant="default" style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </Button>
        </View>
      </ScreenWrapper>
    );
  }

  const isLive = stream.status === 'live';
  const currentViewers = stats?.currentViewers || stream.viewerCount;

  return (
    <ScreenWrapper screenName="LiveStream">
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {/* Video Player */}
        <View style={styles.playerContainer}>
          <LiveStreamPlayer
            streamUrl={stream.playbackUrl}
            isLive={isLive}
            dvrEnabled={stream.dvrEnabled}
          />

          {/* Close Button */}
          <Button
            variant="ghost"
            size="icon"
            style={styles.closeButton}
            onPress={() => router.back()}>
            <X size={28} color="#ffffff" />
          </Button>
        </View>

        {/* Content Section */}
        <View style={styles.contentContainer}>
          {/* Stream Info */}
          <View style={styles.streamInfo}>
            <View style={styles.streamHeader}>
              <View style={styles.streamTitleContainer}>
                <Text style={styles.streamTitle}>{stream.title}</Text>
                {isLive && (
                  <View style={styles.liveBadge}>
                    <View style={styles.liveDot} />
                    <Text style={styles.liveText}>LIVE</Text>
                  </View>
                )}
              </View>
              <View style={styles.viewerCount}>
                <Eye size={16} color="#6b7280" />
                <Text style={styles.viewerText}>{formatViewCount(currentViewers)}</Text>
              </View>
            </View>

            {stream.description && (
              <Text style={styles.streamDescription} numberOfLines={2}>
                {stream.description}
              </Text>
            )}

            {/* Action Buttons */}
            <View style={styles.actionsRow}>
              <Button
                variant="ghost"
                style={styles.actionButton}
                onPress={handleLike}
                disabled={isLiking}>
                <Heart
                  size={24}
                  color={isLiked ? '#ef4444' : '#6b7280'}
                  fill={isLiked ? '#ef4444' : 'none'}
                />
                <Text style={styles.actionText}>{formatViewCount(likesCount)}</Text>
              </Button>

              <Button variant="ghost" style={styles.actionButton} onPress={handleShare}>
                <Share2 size={24} color="#6b7280" />
                <Text style={styles.actionText}>Share</Text>
              </Button>

              <Button
                variant="ghost"
                style={styles.actionButton}
                onPress={() => setShowChat(!showChat)}>
                <MessageCircle
                  size={24}
                  color={showChat ? '#3b82f6' : '#6b7280'}
                  fill={showChat ? '#3b82f6' : 'none'}
                />
                <Text style={styles.actionText}>Chat</Text>
              </Button>

              {stats && (
                <View style={styles.statsContainer}>
                  <Text style={styles.statsText}>Peak: {formatViewCount(stats.peakViewers)}</Text>
                  {stats.bitrateKbps > 0 && (
                    <Text style={styles.statsText}>
                      {Math.round(stats.bitrateKbps)} kbps • {stats.resolution}
                    </Text>
                  )}
                </View>
              )}
            </View>
          </View>

          {/* Chat Section */}
          {showChat && (
            <View style={styles.chatContainer}>
              <View style={styles.chatHeader}>
                <Text style={styles.chatTitle}>
                  Chat {localComments.length > 0 && `(${localComments.length})`}
                </Text>
              </View>

              {/* Comments List */}
              <FlatList
                data={localComments}
                renderItem={renderComment}
                keyExtractor={(item) => item.id}
                style={styles.commentsList}
                contentContainerStyle={styles.commentsListContent}
                inverted
                ListEmptyComponent={() => (
                  <View style={styles.emptyChat}>
                    <Text style={styles.emptyChatText}>
                      {isLoadingComments ? 'Loading chat...' : 'No messages yet. Be the first!'}
                    </Text>
                  </View>
                )}
              />

              {/* Comment Input */}
              <View style={styles.commentInputContainer}>
                <TextInput
                  style={styles.commentInput}
                  placeholder="Type a message..."
                  placeholderTextColor="#9ca3af"
                  value={commentText}
                  onChangeText={setCommentText}
                  onSubmitEditing={handleSendComment}
                  returnKeyType="send"
                  multiline
                  maxLength={500}
                />
                <Button
                  variant="default"
                  size="icon"
                  style={[
                    styles.sendButton,
                    (!commentText.trim() || isCommenting) && styles.sendButtonDisabled,
                  ]}
                  onPress={handleSendComment}
                  disabled={!commentText.trim() || isCommenting}>
                  {isCommenting ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Send size={20} color="#ffffff" />
                  )}
                </Button>
              </View>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#ffffff',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#ffffff',
    marginTop: 16,
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  playerContainer: {
    position: 'relative',
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000000',
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: 8,
    zIndex: 10,
  },
  contentContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  streamInfo: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  streamHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  streamTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  streamTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginRight: 8,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ef4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ffffff',
  },
  liveText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  viewerCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  streamDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
    lineHeight: 20,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  statsContainer: {
    marginLeft: 'auto',
    alignItems: 'flex-end',
  },
  statsText: {
    fontSize: 11,
    color: '#9ca3af',
  },
  chatContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  chatTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  commentsList: {
    flex: 1,
  },
  commentsListContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexGrow: 1,
  },
  commentItem: {
    flexDirection: 'row',
    paddingVertical: 8,
  },
  commentAvatar: {
    marginRight: 12,
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  commentUserName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginRight: 8,
  },
  commentTime: {
    fontSize: 12,
    color: '#9ca3af',
  },
  commentMessage: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  emptyChat: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyChatText: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#ffffff',
  },
  commentInput: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111827',
    maxHeight: 100,
    marginRight: 12,
  },
  sendButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#d1d5db',
  },
});
