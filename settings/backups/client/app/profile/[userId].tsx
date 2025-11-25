import React, { useState, useEffect } from 'react';
import { View, ScrollView, RefreshControl, StyleSheet, Alert } from 'react-native';
import { Text } from '@/components/ui/text';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { UserProfileCard } from '@/components/social/UserProfileCard';
import { PostCard } from '@/components/social/PostCard';
import { useProfile } from '@/lib/hooks/useProfile';
import { useSocial } from '@/lib/hooks/useSocial';
import { UserProfile } from '@/lib/api/profile';
import { Post } from '@/lib/api/social';

export default function ProfileScreen() {
  const router = useRouter();
  const { userId } = useLocalSearchParams();
  const { loading: _profileLoading, getUserProfile, followUser, unfollowUser } = useProfile();
  const { loading: _postsLoading, getUserPosts, likePost, unlikePost, sharePost } = useSocial();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [isOwnProfile, _setIsOwnProfile] = useState(false);

  const loadProfile = async () => {
    try {
      const data = await getUserProfile(userId as string);
      setProfile(data);
      // TODO: Check if it's own profile by comparing with current user ID
      // setIsOwnProfile(data.id === currentUserId);
    } catch (err) {
      console.error('Failed to load profile:', err);
      Alert.alert('Error', 'Failed to load profile');
    }
  };

  const loadPosts = async () => {
    try {
      const result = await getUserPosts(userId as string, 1, 20);
      setPosts(result.data);
    } catch (err) {
      console.error('Failed to load posts:', err);
    }
  };

  useEffect(() => {
    if (userId) {
      loadProfile();
      loadPosts();
    }
  }, [userId]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadProfile(), loadPosts()]);
    setRefreshing(false);
  };

  const handleFollow = async () => {
    if (!profile) return;

    // Save previous state for rollback
    const previousState = {
      is_following: profile.is_following,
      follower_count: profile.follower_count,
    };

    // Optimistic update
    setProfile({ ...profile, is_following: true, follower_count: profile.follower_count + 1 });

    try {
      await followUser(profile.id);
    } catch (err) {
      // Rollback on error
      setProfile({ ...profile, ...previousState });
      console.error('Failed to follow user:', err);
      Alert.alert('Error', 'Failed to follow user');
    }
  };

  const handleUnfollow = async () => {
    if (!profile) return;

    // Save previous state for rollback
    const previousState = {
      is_following: profile.is_following,
      follower_count: profile.follower_count,
    };

    // Optimistic update
    setProfile({ ...profile, is_following: false, follower_count: profile.follower_count - 1 });

    try {
      await unfollowUser(profile.id);
    } catch (err) {
      // Rollback on error
      setProfile({ ...profile, ...previousState });
      console.error('Failed to unfollow user:', err);
      Alert.alert('Error', 'Failed to unfollow user');
    }
  };

  const handleEditProfile = () => {
    router.push('/edit-profile' as any);
  };

  const handleFollowersPress = () => {
    router.push(`/followers/${userId}` as any);
  };

  const handleFollowingPress = () => {
    router.push(`/following/${userId}` as any);
  };

  const handleLike = async (postId: string) => {
    const post = posts.find((p) => p.id === postId);
    if (!post) return;

    // Save previous state for rollback
    const previousState = {
      is_liked: post.is_liked,
      like_count: post.like_count,
    };

    // Optimistic update
    const newLikeState = !post.is_liked;
    const newLikeCount = newLikeState ? post.like_count + 1 : post.like_count - 1;

    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId ? { ...p, is_liked: newLikeState, like_count: newLikeCount } : p
      )
    );

    try {
      if (previousState.is_liked) {
        await unlikePost(postId);
      } else {
        await likePost(postId);
      }
    } catch (err) {
      // Rollback on error
      setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, ...previousState } : p)));
      console.error('Failed to toggle like:', err);
      Alert.alert('Error', 'Failed to like post');
    }
  };

  const handleComment = (postId: string) => {
    router.push(`/posts/${postId}` as any);
  };

  const handleShare = async (postId: string) => {
    const post = posts.find((p) => p.id === postId);
    if (!post) return;

    // Save previous state for rollback
    const previousShareCount = post.share_count;

    // Optimistic update
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, share_count: p.share_count + 1 } : p))
    );

    try {
      await sharePost(postId);
    } catch (err) {
      // Rollback on error
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, share_count: previousShareCount } : p))
      );
      console.error('Failed to share post:', err);
      Alert.alert('Error', 'Failed to share post');
    }
  };

  const handleUserPress = (userId: string) => {
    router.push(`/profile/${userId}` as any);
  };

  const handlePostPress = (postId: string) => {
    router.push(`/posts/${postId}` as any);
  };

  if (!profile) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}>
      <UserProfileCard
        profile={profile}
        isOwnProfile={isOwnProfile}
        onFollow={handleFollow}
        onUnfollow={handleUnfollow}
        onEditProfile={handleEditProfile}
        onFollowersPress={handleFollowersPress}
        onFollowingPress={handleFollowingPress}
      />

      {/* Posts Section */}
      <View style={styles.postsSection}>
        <Text style={styles.sectionTitle}>Posts</Text>
        {posts.length === 0 ? (
          <View style={styles.emptyPosts}>
            <Ionicons name="images-outline" size={48} color="#9CA3AF" />
            <Text style={styles.emptyText}>No posts yet</Text>
          </View>
        ) : (
          posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onLike={handleLike}
              onComment={handleComment}
              onShare={handleShare}
              onUserPress={handleUserPress}
              onPostPress={handlePostPress}
            />
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  postsSection: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  emptyPosts: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
    backgroundColor: '#fff',
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 12,
  },
});
