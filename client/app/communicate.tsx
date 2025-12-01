import React, { useState } from 'react';
import { View, Modal, ScrollView, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  CommunicateDashboard,
  // Messages
  MessagesHeader,
  MessageSearch,
  MessageList,
  // Social
  Feed,
  CreatePost,
  // Streams
  StreamList,
  CreateStream,
  StreamPlayer,
  // Groups
  GroupList,
  CreateGroup,
} from '@/components/features/communicate';
import { Post } from '@/core';
import { useUnreadCount } from '@/core/hooks/queries';

export default function CommunicateScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ view: string }>();
  const view = params.view || 'dashboard';

  // Modal states
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [showCreateStream, setShowCreateStream] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showStreamPlayer, setShowStreamPlayer] = useState(false);
  const [currentStreamKey, setCurrentStreamKey] = useState<string | null>(null);

  const navigateTo = (newView: string) => {
    router.push({
      pathname: '/communicate',
      params: { view: newView },
    });
  };

  // Get unread count from API
  const { data: unreadCount = 0 } = useUnreadCount();

  // Handlers
  const handleCreatePostSuccess = () => {
    setShowCreatePost(false);
  };

  const handlePostPress = (post: Post) => {
    console.log('View post:', post.id);
  };

  const handleCreateStreamSuccess = (streamKey: string, rtmpUrl: string) => {
    setShowCreateStream(false);
    Alert.alert(
      'Stream Created',
      `Stream Key: ${streamKey}\nRTMP URL: ${rtmpUrl}\n\nUse these credentials in your streaming software (OBS, etc.)`,
      [{ text: 'OK' }]
    );
  };

  const handleStreamPress = (streamKey: string) => {
    setCurrentStreamKey(streamKey);
    setShowStreamPlayer(true);
  };

  const renderContent = () => {
    switch (view) {
      case 'messages':
        return (
          <View className="flex-1">
            <View className="p-6 pb-4">
              <MessagesHeader unreadCount={unreadCount} />
              <MessageSearch />
            </View>
            <ScrollView className="flex-1">
              <View className="px-6 pb-6">
                <MessageList />
              </View>
            </ScrollView>
          </View>
        );

      case 'social':
        return <Feed onCreatePost={() => setShowCreatePost(true)} onPostPress={handlePostPress} />;

      case 'streams':
        return (
          <StreamList
            onStreamPress={handleStreamPress}
            onCreateStream={() => setShowCreateStream(true)}
          />
        );

      case 'groups':
        return (
          <View className="flex-1 bg-background p-6">
            <GroupList onCreateGroup={() => setShowCreateGroup(true)} />
          </View>
        );

      default:
        return <CommunicateDashboard onNavigate={navigateTo} onPostPress={handlePostPress} />;
    }
  };

  return (
    <View className="flex-1 bg-background">
      {renderContent()}

      {/* Create Post Modal */}
      <Modal
        visible={showCreatePost}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCreatePost(false)}>
        <CreatePost onSuccess={handleCreatePostSuccess} onCancel={() => setShowCreatePost(false)} />
      </Modal>

      {/* Create Stream Modal */}
      <Modal
        visible={showCreateStream}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCreateStream(false)}>
        <CreateStream
          onSuccess={handleCreateStreamSuccess}
          onCancel={() => setShowCreateStream(false)}
        />
      </Modal>

      {/* Create Group Modal */}
      <Modal
        visible={showCreateGroup}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCreateGroup(false)}>
        <CreateGroup onCancel={() => setShowCreateGroup(false)} />
      </Modal>

      {/* Stream Player Modal */}
      <Modal
        visible={showStreamPlayer}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowStreamPlayer(false)}>
        {currentStreamKey && <StreamPlayer streamKey={currentStreamKey} />}
      </Modal>
    </View>
  );
}
