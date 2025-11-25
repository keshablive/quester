import React from 'react';
import { View, Image, Pressable } from 'react-native';
import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Bed, Bath, Square, Eye, Heart } from 'lucide-react-native';
import { Property } from '@/lib/api/properties';

interface PropertyCardProps {
  property: Property;
  distance?: number; // Distance in meters
  onPress: (property: Property) => void;
  onFavoritePress?: (property: Property) => void;
  showDistance?: boolean;
}

export function PropertyCard({
  property,
  distance,
  onPress,
  onFavoritePress,
  showDistance = true,
}: PropertyCardProps) {
  const imageUrl = property.images?.[0] || 'https://via.placeholder.com/400x300';

  const formatPrice = (price: number, currency: string) => {
    if (currency === 'INR') {
      return `₹${(price / 100000).toFixed(1)}L`; // Convert to lakhs
    } else if (currency === 'USD') {
      return `$${(price / 1000).toFixed(0)}k`;
    }
    return `${currency} ${price.toLocaleString()}`;
  };

  const formatDistance = (meters?: number) => {
    if (!meters) return null;
    if (meters < 1000) {
      return `${meters.toFixed(0)}m away`;
    }
    return `${(meters / 1000).toFixed(1)}km away`;
  };

  const formatPropertyType = (type: string) => {
    return type
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getListingTypeBadge = () => {
    if (property.listing_type === 'for_sale') {
      return { label: 'For Sale', color: 'bg-blue-600' };
    } else if (property.listing_type === 'for_rent') {
      return { label: 'For Rent', color: 'bg-green-600' };
    }
    return { label: property.listing_type, color: 'bg-gray-600' };
  };

  const badge = getListingTypeBadge();

  return (
    <Pressable onPress={() => onPress(property)}>
      <Card testID="property-card" className="mb-4 overflow-hidden">
        {/* Image */}
        <View className="relative">
          <Image source={{ uri: imageUrl }} className="h-[200px] w-full" resizeMode="cover" />

          {/* Listing Type Badge */}
          <View className="absolute left-2 top-2">
            <Badge variant="secondary" className={badge.color}>
              <Text variant="small" className="font-medium text-white">
                {badge.label}
              </Text>
            </Badge>
          </View>

          {/* Property Type Badge */}
          <View className="absolute right-2 top-2">
            <Badge variant="secondary" className="bg-black/70">
              <Text variant="small" className="font-medium text-white">
                {formatPropertyType(property.property_type)}
              </Text>
            </Badge>
          </View>

          {/* Verified Badge */}
          {property.is_verified && (
            <View className="absolute bottom-2 right-2">
              <Badge variant="secondary" className="bg-green-500">
                <Text variant="small" className="font-bold text-white">
                  ✓ Verified
                </Text>
              </Badge>
            </View>
          )}

          {/* Favorite Button */}
          {onFavoritePress && (
            <Pressable
              className="absolute bottom-2 left-2 rounded-full bg-white/90 p-2"
              onPress={() => onFavoritePress(property)}>
              <Heart
                size={20}
                color={property.favorite_count > 0 ? '#EF4444' : '#6B7280'}
                fill={property.favorite_count > 0 ? '#EF4444' : 'none'}
              />
            </Pressable>
          )}
        </View>

        {/* Content */}
        <View className="p-4">
          {/* Price */}
          <Text variant="h1" className="mb-1 text-foreground">
            {formatPrice(property.price, property.currency)}
          </Text>

          {/* Title */}
          <Text variant="h4" className="mb-2 text-foreground" numberOfLines={2}>
            {property.title}
          </Text>

          {/* Location */}
          <View className="mb-3 flex-row items-center">
            <MapPin size={14} color="#6B7280" />
            <Text variant="small" className="ml-1 flex-1 text-muted-foreground" numberOfLines={1}>
              {property.address?.city}, {property.address?.state}
            </Text>
            {showDistance && distance && (
              <Text variant="small" className="ml-2 font-medium text-blue-600">
                {formatDistance(distance)}
              </Text>
            )}
          </View>

          {/* Property Details */}
          <View className="mb-3 flex-row items-center space-x-4">
            {property.bedrooms !== null && (
              <View className="flex-row items-center">
                <Bed size={16} color="#6B7280" />
                <Text variant="small" className="ml-1 text-muted-foreground">
                  {property.bedrooms} BHK
                </Text>
              </View>
            )}

            {property.bathrooms !== null && (
              <View className="ml-3 flex-row items-center">
                <Bath size={16} color="#6B7280" />
                <Text variant="small" className="ml-1 text-muted-foreground">
                  {property.bathrooms} Bath
                </Text>
              </View>
            )}

            {property.area_sqft !== null && property.area_sqft !== undefined && (
              <View className="ml-3 flex-row items-center">
                <Square size={16} color="#6B7280" />
                <Text variant="small" className="ml-1 text-muted-foreground">
                  {property.area_sqft.toLocaleString()} sq ft
                </Text>
              </View>
            )}
          </View>

          {/* Amenities */}
          {property.amenities && property.amenities.length > 0 && (
            <View className="mb-3 flex-row flex-wrap">
              {property.amenities.slice(0, 3).map((amenity, index) => (
                <Badge key={index} variant="outline" className="mb-1 mr-2">
                  <Text variant="small" className="text-muted-foreground">
                    {amenity}
                  </Text>
                </Badge>
              ))}
              {property.amenities.length > 3 && (
                <Badge variant="outline" className="mb-1">
                  <Text variant="small" className="text-muted-foreground">
                    +{property.amenities.length - 3} more
                  </Text>
                </Badge>
              )}
            </View>
          )}

          {/* Footer */}
          <View className="flex-row items-center justify-between border-t border-border pt-3">
            <View className="flex-row items-center">
              <Eye size={14} color="#6B7280" />
              <Text variant="small" className="ml-1 text-muted-foreground">
                {property.view_count} views
              </Text>
            </View>

            {property.virtual_tour_urls && property.virtual_tour_urls.length > 0 && (
              <Badge variant="secondary" className="bg-purple-100">
                <Text variant="small" className="font-medium text-purple-700">
                  360° Tour
                </Text>
              </Badge>
            )}
          </View>
        </View>
      </Card>
    </Pressable>
  );
}
