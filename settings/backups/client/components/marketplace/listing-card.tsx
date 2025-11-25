import React, { memo } from 'react';
import { View, Image, Pressable } from 'react-native';
import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star, ShoppingCart } from 'lucide-react-native';
import { MarketplaceListing } from '@/lib/api/marketplace';

interface ListingCardProps {
  listing: MarketplaceListing;
  onPress: (listing: MarketplaceListing) => void;
  onBuyPress?: (listing: MarketplaceListing) => void;
}

/**
 * ListingCard Component - Optimized with React.memo (Phase 5, T117)
 *
 * Memoized to prevent unnecessary re-renders when parent re-renders.
 * Only re-renders when listing data or callbacks change.
 */
export const ListingCard = memo(function ListingCard({
  listing,
  onPress,
  onBuyPress,
}: ListingCardProps) {
  const imageUrl = listing.images?.[0] || 'https://via.placeholder.com/400x300';

  const formatPrice = (price: number, currency: string) => {
    if (currency === 'INR') {
      return `₹${price.toLocaleString('en-IN')}`;
    } else if (currency === 'USD') {
      return `$${price.toLocaleString('en-US')}`;
    }
    return `${currency} ${price.toLocaleString()}`;
  };

  const formatListingType = (type: string) => {
    return type
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <Pressable onPress={() => onPress(listing)}>
      <Card className="mb-4 overflow-hidden">
        {/* Image */}
        <View className="relative">
          <Image
            source={{ uri: imageUrl }}
            className="h-[200px] w-full bg-gray-200"
            resizeMode="cover"
          />

          {/* Type Badge */}
          <View className="absolute left-2 top-2">
            <Badge variant="secondary" className="bg-black/70">
              <Text className="text-xs font-medium text-white">
                {formatListingType(listing.listing_type)}
              </Text>
            </Badge>
          </View>

          {/* Sold Count Badge */}
          {listing.sold_count > 0 && (
            <View className="absolute right-2 top-2">
              <Badge variant="secondary" className="bg-green-600">
                <Text className="text-xs font-medium text-white">{listing.sold_count} sold</Text>
              </Badge>
            </View>
          )}
        </View>

        {/* Content */}
        <View className="p-4">
          {/* Title */}
          <Text className="mb-1 text-lg font-bold text-foreground" numberOfLines={2}>
            {listing.title}
          </Text>

          {/* Seller */}
          <View className="mb-2 flex-row items-center">
            <Text className="text-sm text-muted-foreground">
              by {listing.seller?.username || 'Unknown'}
            </Text>
          </View>

          {/* Rating */}
          {listing.total_reviews > 0 && (
            <View className="mb-3 flex-row items-center">
              <Star size={16} color="#FFA500" fill="#FFA500" />
              <Text className="ml-1 text-sm font-medium text-foreground">
                {listing.average_rating.toFixed(1)}
              </Text>
              <Text className="ml-1 text-sm text-muted-foreground">
                ({listing.total_reviews} {listing.total_reviews === 1 ? 'review' : 'reviews'})
              </Text>
            </View>
          )}

          {/* Price & Actions */}
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-2xl font-bold text-primary">
                {formatPrice(listing.price, listing.currency)}
              </Text>
            </View>

            {onBuyPress && (
              <Pressable
                onPress={(e) => {
                  e.stopPropagation();
                  onBuyPress(listing);
                }}
                className="flex-row items-center rounded-lg bg-primary px-4 py-2">
                <ShoppingCart size={16} color="white" />
                <Text className="ml-2 font-semibold text-white">Buy Now</Text>
              </Pressable>
            )}
          </View>
        </View>
      </Card>
    </Pressable>
  );
});
