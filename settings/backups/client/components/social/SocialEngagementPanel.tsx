import React, { useState } from 'react';
import { View, ScrollView, ActivityIndicator, Pressable } from 'react-native';
import { Text } from '@/components/ui/text';
import { MessageCircle, Share2, Heart, Star } from 'lucide-react-native';
import { CommentThread } from './CommentThread';
import { ShareButtons } from './ShareButtons';
import { RatingStars, RatingInput } from './RatingStars';
import { useInteractions } from '@/lib/hooks/useInteractions';
import { Ionicons } from '@expo/vector-icons';

interface SocialEngagementPanelProps {
  targetType: string; // 'quest', 'course', 'property', etc.
  targetId: string;
  title: string;
  url: string;
  description?: string;
  imageUrl?: string;
  currentUserId?: number;
  showComments?: boolean;
  showSharing?: boolean;
  showRating?: boolean;
  showLikes?: boolean;
}

export function SocialEngagementPanel({
  targetType,
  targetId,
  title,
  url,
  description,
  imageUrl,
  currentUserId,
  showComments = true,
  showSharing = true,
  showRating = true,
  showLikes = true,
}: SocialEngagementPanelProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'comments'>('overview');
  const [showRatingInput, setShowRatingInput] = useState(false);
  const [userRatingValue, setUserRatingValue] = useState(0);

  const { counts, userStatus, loading, createLike, createShare, createRating } = useInteractions({
    targetType,
    targetId,
    autoLoad: true,
  });

  const handleLike = async () => {
    try {
      await createLike();
    } catch (error: any) {
      console.error('Failed to like:', error);
    }
  };

  const handleShare = async (platform: string) => {
    try {
      await createShare();
      console.log(`Shared on ${platform}`);
    } catch (error: any) {
      console.error('Failed to record share:', error);
    }
  };

  const handleRatingSubmit = async () => {
    try {
      await createRating(userRatingValue);
      setShowRatingInput(false);
      setUserRatingValue(0);
    } catch (error: any) {
      console.error('Failed to submit rating:', error);
    }
  };

  return (
    <View style={{ backgroundColor: 'white', borderRadius: 12, marginVertical: 16 }}>
      {/* Header with Stats */}
      <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: '#E5E5E5' }}>
        <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 12 }}>
          Community Engagement
        </Text>

        {loading && !counts ? (
          <ActivityIndicator size="small" color="#007AFF" />
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            {/* Likes */}
            {showLikes && counts && (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Heart
                  size={20}
                  color={userStatus?.has_liked ? '#DC3545' : '#666'}
                  fill={userStatus?.has_liked ? '#DC3545' : 'none'}
                />
                <Text style={{ marginLeft: 4, fontSize: 14, color: '#666' }}>
                  {counts.likes_count.toLocaleString()}
                </Text>
              </View>
            )}

            {/* Comments */}
            {showComments && counts && (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <MessageCircle size={20} color="#666" />
                <Text style={{ marginLeft: 4, fontSize: 14, color: '#666' }}>
                  {counts.comments_count.toLocaleString()}
                </Text>
              </View>
            )}

            {/* Shares */}
            {showSharing && counts && (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Share2 size={20} color="#666" />
                <Text style={{ marginLeft: 4, fontSize: 14, color: '#666' }}>
                  {counts.shares_count.toLocaleString()}
                </Text>
              </View>
            )}

            {/* Rating */}
            {showRating && counts && counts.ratings_count > 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <RatingStars
                  rating={counts.avg_rating}
                  size="small"
                  readOnly
                  showValue
                  showCount
                  count={counts.ratings_count}
                />
              </View>
            )}
          </View>
        )}
      </View>

      {/* Action Buttons */}
      <View
        style={{
          flexDirection: 'row',
          padding: 12,
          borderBottomWidth: 1,
          borderBottomColor: '#E5E5E5',
          gap: 8,
        }}>
        {showLikes && (
          <Pressable
            onPress={handleLike}
            disabled={loading}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: userStatus?.has_liked ? '#DC354520' : '#F5F5F5',
              paddingVertical: 10,
              paddingHorizontal: 16,
              borderRadius: 8,
            }}>
            <Ionicons
              name={userStatus?.has_liked ? 'heart' : 'heart-outline'}
              size={20}
              color={userStatus?.has_liked ? '#DC3545' : '#666'}
            />
            <Text
              style={{
                marginLeft: 6,
                fontSize: 14,
                fontWeight: '600',
                color: userStatus?.has_liked ? '#DC3545' : '#666',
              }}>
              {userStatus?.has_liked ? 'Liked' : 'Like'}
            </Text>
          </Pressable>
        )}

        {showComments && (
          <Pressable
            onPress={() => setActiveTab('comments')}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: activeTab === 'comments' ? '#007AFF20' : '#F5F5F5',
              paddingVertical: 10,
              paddingHorizontal: 16,
              borderRadius: 8,
            }}>
            <Ionicons
              name="chatbubble-outline"
              size={20}
              color={activeTab === 'comments' ? '#007AFF' : '#666'}
            />
            <Text
              style={{
                marginLeft: 6,
                fontSize: 14,
                fontWeight: '600',
                color: activeTab === 'comments' ? '#007AFF' : '#666',
              }}>
              Comment
            </Text>
          </Pressable>
        )}

        {showRating && (
          <Pressable
            onPress={() => setShowRatingInput(!showRatingInput)}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: userStatus?.user_rating ? '#FFC10720' : '#F5F5F5',
              paddingVertical: 10,
              paddingHorizontal: 16,
              borderRadius: 8,
            }}>
            <Ionicons
              name={userStatus?.user_rating ? 'star' : 'star-outline'}
              size={20}
              color={userStatus?.user_rating ? '#FFC107' : '#666'}
            />
            <Text
              style={{
                marginLeft: 6,
                fontSize: 14,
                fontWeight: '600',
                color: userStatus?.user_rating ? '#FFC107' : '#666',
              }}>
              {userStatus?.user_rating ? 'Rated' : 'Rate'}
            </Text>
          </Pressable>
        )}
      </View>

      {/* Rating Input */}
      {showRatingInput && (
        <View style={{ padding: 16, backgroundColor: '#F9F9F9' }}>
          <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 12 }}>
            Rate this {targetType}
          </Text>
          <RatingInput value={userRatingValue} onChange={setUserRatingValue} size="large" />
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
            <Pressable
              onPress={handleRatingSubmit}
              disabled={userRatingValue === 0}
              style={{
                flex: 1,
                backgroundColor: userRatingValue > 0 ? '#007AFF' : '#CCCCCC',
                paddingVertical: 12,
                borderRadius: 8,
                alignItems: 'center',
              }}>
              <Text style={{ color: 'white', fontWeight: '600', fontSize: 15 }}>Submit</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setShowRatingInput(false);
                setUserRatingValue(0);
              }}
              style={{
                flex: 1,
                backgroundColor: '#F5F5F5',
                paddingVertical: 12,
                borderRadius: 8,
                alignItems: 'center',
              }}>
              <Text style={{ color: '#666', fontWeight: '600', fontSize: 15 }}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Tabs */}
      <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#E5E5E5' }}>
        <Pressable
          onPress={() => setActiveTab('overview')}
          style={{
            flex: 1,
            paddingVertical: 12,
            borderBottomWidth: 2,
            borderBottomColor: activeTab === 'overview' ? '#007AFF' : 'transparent',
          }}>
          <Text
            style={{
              textAlign: 'center',
              fontSize: 15,
              fontWeight: activeTab === 'overview' ? '600' : '400',
              color: activeTab === 'overview' ? '#007AFF' : '#666',
            }}>
            Overview
          </Text>
        </Pressable>

        {showComments && (
          <Pressable
            onPress={() => setActiveTab('comments')}
            style={{
              flex: 1,
              paddingVertical: 12,
              borderBottomWidth: 2,
              borderBottomColor: activeTab === 'comments' ? '#007AFF' : 'transparent',
            }}>
            <Text
              style={{
                textAlign: 'center',
                fontSize: 15,
                fontWeight: activeTab === 'comments' ? '600' : '400',
                color: activeTab === 'comments' ? '#007AFF' : '#666',
              }}>
              Comments {counts && `(${counts.comments_count})`}
            </Text>
          </Pressable>
        )}
      </View>

      {/* Content */}
      <View style={{ minHeight: 400 }}>
        {activeTab === 'overview' ? (
          <ScrollView style={{ padding: 16 }}>
            {showSharing && (
              <>
                <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 12 }}>
                  Share this {targetType}
                </Text>
                <ShareButtons
                  title={title}
                  url={url}
                  description={description}
                  imageUrl={imageUrl}
                  onShare={handleShare}
                  variant="buttons"
                  style={{ marginBottom: 24 }}
                />
              </>
            )}

            {showRating && counts && counts.ratings_count > 0 && (
              <>
                <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 12 }}>
                  Average Rating
                </Text>
                <RatingStars
                  rating={counts.avg_rating}
                  size="large"
                  readOnly
                  showValue
                  showCount
                  count={counts.ratings_count}
                  style={{ marginBottom: 24 }}
                />
              </>
            )}
          </ScrollView>
        ) : (
          <View style={{ flex: 1, padding: 16 }}>
            <CommentThread
              targetType={targetType}
              targetId={targetId}
              maxDepth={5}
              allowReplies={true}
              currentUserId={currentUserId}
            />
          </View>
        )}
      </View>
    </View>
  );
}
