import React, { useState } from 'react';
import { View, ScrollView, Image, Pressable, TextInput } from 'react-native';
import { Text } from '@/components/ui/text';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Star, ShoppingCart, User, Tag } from 'lucide-react-native';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SellerReputationCard } from '@/components/marketplace/seller-reputation-card';
import { useListing, useListingReviews, useAddReview } from '@/lib/hooks/useMarketplace';

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState('');

  const { data: listing, isLoading, isError } = useListing(id);
  const { data: reviewsData } = useListingReviews(id);
  const addReviewMutation = useAddReview(id);

  const handleBuyNow = () => {
    router.push(`/marketplace/checkout/${id}`);
  };

  const handleSubmitReview = () => {
    if (!reviewText.trim()) return;

    addReviewMutation.mutate(
      {
        transaction_id: '', // Should be passed from purchase
        rating: reviewRating,
        review_text: reviewText,
      },
      {
        onSuccess: () => {
          setReviewText('');
          setReviewRating(5);
        },
      }
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background">
        <Text className="text-muted-foreground">Loading listing...</Text>
      </SafeAreaView>
    );
  }

  if (isError || !listing) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background">
        <Text className="text-destructive">Failed to load listing</Text>
      </SafeAreaView>
    );
  }

  const formatPrice = (price: number, currency: string) => {
    const symbol = currency === 'INR' ? '₹' : '$';
    return `${symbol}${price.toLocaleString()}`;
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView>
        {/* Image */}
        <Image
          source={{ uri: listing.images?.[0] || 'https://via.placeholder.com/400' }}
          className="h-64 w-full"
          resizeMode="cover"
        />

        {/* Content */}
        <View className="p-4">
          {/* Type Badge */}
          <Badge variant="secondary" className="mb-2 self-start">
            {listing.listing_type.replace('_', ' ').toUpperCase()}
          </Badge>

          {/* Title */}
          <Text className="mb-2 text-2xl font-bold text-foreground">{listing.title}</Text>

          {/* Seller Reputation Card */}
          {listing.seller && (listing.seller as any).reputation && (
            <View className="mb-4">
              <SellerReputationCard
                reputation={(listing.seller as any).reputation}
                variant="compact"
                onPress={() => {
                  // Navigate to seller profile
                  if (listing.seller?.id) {
                    router.push(`/user-profile?id=${listing.seller.id}` as any);
                  }
                }}
              />
            </View>
          )}

          {/* Seller Info (Fallback if no reputation data) */}
          {listing.seller && !(listing.seller as any).reputation && (
            <View className="mb-4 flex-row items-center">
              <User size={16} color="#6b7280" />
              <Text className="ml-2 text-sm text-muted-foreground">
                by {listing.seller?.username || 'Unknown'}
              </Text>
            </View>
          )}

          {/* Rating */}
          <View className="mb-4 flex-row items-center">
            <View className="flex-row">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  size={20}
                  color={star <= listing.average_rating ? '#f59e0b' : '#d1d5db'}
                  fill={star <= listing.average_rating ? '#f59e0b' : 'transparent'}
                />
              ))}
            </View>
            <Text className="ml-2 text-sm text-muted-foreground">
              {listing.average_rating.toFixed(1)} ({listing.total_reviews} reviews)
            </Text>
          </View>

          {/* Price */}
          <Card className="mb-4 bg-primary/10 p-4">
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-3xl font-bold text-primary">
                  {formatPrice(listing.price, listing.currency)}
                </Text>
                {listing.quantity && listing.quantity > 0 && (
                  <Text className="mt-1 text-sm text-muted-foreground">
                    {listing.quantity} available
                  </Text>
                )}
              </View>
              <Button onPress={handleBuyNow} size="lg">
                <ShoppingCart size={20} color="white" />
                <Text className="ml-2 font-semibold text-white">Buy Now</Text>
              </Button>
            </View>
          </Card>

          {/* Description */}
          <Card className="mb-4 p-4">
            <Text className="mb-2 text-lg font-semibold text-foreground">Description</Text>
            <Text className="leading-6 text-muted-foreground">{listing.description}</Text>
          </Card>

          {/* Tags */}
          {listing.tags && listing.tags.length > 0 && (
            <Card className="mb-4 p-4">
              <Text className="mb-2 text-lg font-semibold text-foreground">Tags</Text>
              <View className="flex-row flex-wrap gap-2">
                {listing.tags.map((tag, index) => (
                  <Badge key={index} variant="outline">
                    <Tag size={12} color="#6b7280" />
                    <Text className="ml-1">{tag}</Text>
                  </Badge>
                ))}
              </View>
            </Card>
          )}

          {/* Reviews */}
          <Card className="mb-4 p-4">
            <Text className="mb-4 text-lg font-semibold text-foreground">
              Reviews ({reviewsData?.total || 0})
            </Text>

            {/* Review List */}
            {reviewsData?.reviews.map((review) => (
              <View key={review.id} className="mb-4 border-b border-border pb-4">
                <View className="mb-2 flex-row items-center">
                  <Text className="font-medium text-foreground">
                    {review.reviewer?.username || 'Anonymous'}
                  </Text>
                  <View className="ml-2 flex-row">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        size={14}
                        color={star <= review.rating ? '#f59e0b' : '#d1d5db'}
                        fill={star <= review.rating ? '#f59e0b' : 'transparent'}
                      />
                    ))}
                  </View>
                </View>
                {review.title && (
                  <Text className="mb-1 font-medium text-foreground">{review.title}</Text>
                )}
                <Text className="text-sm text-muted-foreground">{review.review_text}</Text>
                {review.seller_response && (
                  <View className="ml-4 mt-2 rounded bg-muted p-2">
                    <Text className="mb-1 text-xs font-medium text-foreground">
                      Seller Response:
                    </Text>
                    <Text className="text-xs text-muted-foreground">{review.seller_response}</Text>
                  </View>
                )}
              </View>
            ))}

            {/* Add Review Form - Only if user has purchased */}
            {/* TODO: Add check for purchase */}
            <View className="mt-4">
              <Text className="mb-2 text-base font-semibold text-foreground">Write a Review</Text>

              {/* Rating Selector */}
              <View className="mb-3 flex-row items-center">
                <Text className="mr-2 text-sm text-muted-foreground">Rating:</Text>
                <View className="flex-row">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Pressable key={star} onPress={() => setReviewRating(star)}>
                      <Star
                        size={24}
                        color={star <= reviewRating ? '#f59e0b' : '#d1d5db'}
                        fill={star <= reviewRating ? '#f59e0b' : 'transparent'}
                      />
                    </Pressable>
                  ))}
                </View>
              </View>

              <TextInput
                className="mb-3 rounded-lg bg-muted p-3 text-foreground"
                placeholder="Share your experience..."
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={4}
                value={reviewText}
                onChangeText={setReviewText}
                textAlignVertical="top"
              />

              <Button
                onPress={handleSubmitReview}
                disabled={!reviewText.trim() || addReviewMutation.isPending}>
                <Text className="text-white">
                  {addReviewMutation.isPending ? 'Submitting...' : 'Submit Review'}
                </Text>
              </Button>
            </View>
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
