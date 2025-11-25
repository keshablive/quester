import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Share,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import {
  MapPin,
  Bed,
  Bath,
  Maximize,
  Heart,
  Share2,
  Phone,
  Mail,
  CheckCircle,
  Eye,
} from 'lucide-react-native';
import { PropertyMap } from '@/components/marketplace/property-map';
import { VirtualTour } from '@/components/marketplace/virtual-tour';
import { getProperty, incrementContactCount, Property } from '@/lib/api/properties';

const { width } = Dimensions.get('window');

export default function PropertyDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showVirtualTour, setShowVirtualTour] = useState(false);

  useEffect(() => {
    loadProperty();
  }, [id]);

  const loadProperty = async () => {
    if (!id) return;

    try {
      setLoading(true);
      const data = await getProperty(id);
      setProperty(data);
    } catch (error) {
      console.error('Failed to load property:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleContactOwner = async () => {
    if (!property) return;

    try {
      await incrementContactCount(property.id);
      // TODO: Open contact modal or navigate to chat
      console.log('Contact owner:', property.owner_id);
    } catch (error) {
      console.error('Failed to increment contact count:', error);
    }
  };

  const handleCall = async () => {
    if (!property?.contact_phone) return;

    try {
      await incrementContactCount(property.id);
      await Linking.openURL(`tel:${property.contact_phone}`);
    } catch (error) {
      console.error('Failed to open phone:', error);
    }
  };

  const handleEmail = async () => {
    if (!property?.contact_email) return;

    try {
      await incrementContactCount(property.id);
      await Linking.openURL(`mailto:${property.contact_email}`);
    } catch (error) {
      console.error('Failed to open email:', error);
    }
  };

  const handleShare = async () => {
    if (!property) return;

    try {
      await Share.share({
        message: `Check out this ${property.property_type} for ${property.listing_type}: ${property.title}`,
        url: `https://quester.app/properties/${property.id}`,
      });
    } catch (error) {
      console.error('Failed to share:', error);
    }
  };

  const handleToggleFavorite = () => {
    // TODO: API call to toggle favorite
    setIsFavorite(!isFavorite);
  };

  const formatPrice = (price: number, currency: string) => {
    if (currency === 'INR') {
      const lakhs = price / 100000;
      return `₹${lakhs.toFixed(2)}L`;
    } else {
      const thousands = price / 1000;
      return `$${thousands.toFixed(0)}k`;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  if (!property) {
    return (
      <View className="flex-1 items-center justify-center bg-white p-4">
        <Text className="text-lg font-semibold text-gray-900">Property not found</Text>
      </View>
    );
  }

  const images = property.images || [];
  const hasVirtualTour = property.virtual_tour_urls && property.virtual_tour_urls.length > 0;

  return (
    <>
      <Stack.Screen
        options={{
          title: property.title,
          headerRight: () => (
            <View className="flex-row space-x-3">
              <TouchableOpacity onPress={handleShare}>
                <Share2 size={24} color="#3B82F6" />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleToggleFavorite}>
                <Heart
                  size={24}
                  color={isFavorite ? '#EF4444' : '#3B82F6'}
                  fill={isFavorite ? '#EF4444' : 'none'}
                />
              </TouchableOpacity>
            </View>
          ),
        }}
      />

      <ScrollView className="flex-1 bg-white">
        {/* Image Gallery */}
        <View className="relative">
          {images.length > 0 ? (
            <>
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={(e) => {
                  const index = Math.round(e.nativeEvent.contentOffset.x / width);
                  setCurrentImageIndex(index);
                }}
                scrollEventThrottle={16}>
                {images.map((image, index) => (
                  <Image
                    key={index}
                    source={{ uri: image }}
                    className="h-80 w-full"
                    style={{ width }}
                    resizeMode="cover"
                  />
                ))}
              </ScrollView>
              <View className="absolute bottom-4 right-4 rounded-full bg-black/50 px-3 py-1">
                <Text className="text-sm text-white">
                  {currentImageIndex + 1} / {images.length}
                </Text>
              </View>
            </>
          ) : (
            <View className="h-80 w-full items-center justify-center bg-gray-200">
              <Text className="text-gray-500">No images available</Text>
            </View>
          )}

          {/* Virtual Tour Button */}
          {hasVirtualTour && (
            <TouchableOpacity
              onPress={() => setShowVirtualTour(true)}
              className="absolute right-4 top-4 flex-row items-center rounded-lg bg-blue-500 px-4 py-2">
              <Maximize size={20} color="#FFFFFF" />
              <Text className="ml-2 font-semibold text-white">360° Tour</Text>
            </TouchableOpacity>
          )}

          {/* Listing Type Badge */}
          <View className="absolute left-4 top-4">
            <View
              className={`rounded-full px-3 py-1 ${
                property.listing_type === 'for_sale' ? 'bg-red-500' : 'bg-green-500'
              }`}>
              <Text className="text-sm font-semibold capitalize text-white">
                For {property.listing_type === 'for_sale' ? 'Sale' : 'Rent'}
              </Text>
            </View>
          </View>
        </View>

        {/* Property Details */}
        <View className="p-4">
          {/* Price & Title */}
          <View className="mb-3 flex-row items-start justify-between">
            <View className="flex-1">
              <Text className="mb-1 text-3xl font-bold text-gray-900">
                {formatPrice(property.price, property.currency)}
              </Text>
              <Text className="text-xl font-semibold text-gray-800">{property.title}</Text>
            </View>
            {property.is_verified && (
              <View className="flex-row items-center rounded-full bg-green-100 px-2 py-1">
                <CheckCircle size={16} color="#10B981" />
                <Text className="ml-1 text-xs font-medium text-green-700">Verified</Text>
              </View>
            )}
          </View>

          {/* Location */}
          <View className="mb-4 flex-row items-center">
            <MapPin size={16} color="#6B7280" />
            <Text className="ml-1 text-gray-600">
              {property.address.city}, {property.address.state}
            </Text>
          </View>

          {/* Quick Stats */}
          <View className="mb-4 flex-row items-center justify-between border-b border-t border-gray-200 py-4">
            <View className="items-center">
              <Bed size={24} color="#3B82F6" />
              <Text className="mt-1 font-semibold text-gray-900">{property.bedrooms}</Text>
              <Text className="text-xs text-gray-500">Bedrooms</Text>
            </View>
            <View className="items-center">
              <Bath size={24} color="#3B82F6" />
              <Text className="mt-1 font-semibold text-gray-900">{property.bathrooms}</Text>
              <Text className="text-xs text-gray-500">Bathrooms</Text>
            </View>
            <View className="items-center">
              <Maximize size={24} color="#3B82F6" />
              <Text className="mt-1 font-semibold text-gray-900">{property.area_sqft}</Text>
              <Text className="text-xs text-gray-500">Sq Ft</Text>
            </View>
            <View className="items-center">
              <Eye size={24} color="#3B82F6" />
              <Text className="mt-1 font-semibold text-gray-900">{property.view_count}</Text>
              <Text className="text-xs text-gray-500">Views</Text>
            </View>
          </View>

          {/* Description */}
          <View className="mb-4">
            <Text className="mb-2 text-lg font-semibold text-gray-900">Description</Text>
            <Text className="leading-6 text-gray-700">{property.description}</Text>
          </View>

          {/* Amenities */}
          {property.amenities && property.amenities.length > 0 && (
            <View className="mb-4">
              <Text className="mb-2 text-lg font-semibold text-gray-900">Amenities</Text>
              <View className="flex-row flex-wrap gap-2">
                {property.amenities.map((amenity, index) => (
                  <View key={index} className="rounded-full bg-gray-100 px-3 py-1.5">
                    <Text className="text-sm text-gray-700">{amenity}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Property Info */}
          <View className="mb-4">
            <Text className="mb-2 text-lg font-semibold text-gray-900">Property Information</Text>
            <View className="space-y-2">
              <View className="flex-row items-center border-b border-gray-100 py-2">
                <Text className="flex-1 text-gray-600">Property Type</Text>
                <Text className="font-medium capitalize text-gray-900">
                  {property.property_type}
                </Text>
              </View>
              <View className="flex-row items-center border-b border-gray-100 py-2">
                <Text className="flex-1 text-gray-600">Listing Type</Text>
                <Text className="font-medium capitalize text-gray-900">
                  {property.listing_type}
                </Text>
              </View>
              <View className="flex-row items-center border-b border-gray-100 py-2">
                <Text className="flex-1 text-gray-600">Status</Text>
                <Text className="font-medium capitalize text-gray-900">{property.status}</Text>
              </View>
              <View className="flex-row items-center border-b border-gray-100 py-2">
                <Text className="flex-1 text-gray-600">Posted</Text>
                <Text className="font-medium text-gray-900">{formatDate(property.created_at)}</Text>
              </View>
            </View>
          </View>

          {/* Location Map */}
          <View className="mb-4">
            <Text className="mb-2 text-lg font-semibold text-gray-900">Location</Text>
            <View className="h-48 overflow-hidden rounded-lg">
              <PropertyMap
                properties={[property]}
                initialRegion={{
                  latitude: property.location.coordinates[1],
                  longitude: property.location.coordinates[0],
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                }}
              />
            </View>
            <Text className="mt-2 text-gray-600">
              {property.address.street}, {property.address.city}, {property.address.state}{' '}
              {property.address.postal_code}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Contact Buttons */}
      <View className="border-t border-gray-200 bg-white p-4">
        <View className="flex-row space-x-2">
          {property.contact_phone && (
            <TouchableOpacity
              onPress={handleCall}
              className="flex-1 flex-row items-center justify-center rounded-lg bg-green-500 py-3">
              <Phone size={20} color="#FFFFFF" />
              <Text className="ml-2 font-semibold text-white">Call</Text>
            </TouchableOpacity>
          )}
          {property.contact_email && (
            <TouchableOpacity
              onPress={handleEmail}
              className="flex-1 flex-row items-center justify-center rounded-lg bg-blue-500 py-3">
              <Mail size={20} color="#FFFFFF" />
              <Text className="ml-2 font-semibold text-white">Email</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={handleContactOwner}
            className="flex-1 items-center justify-center rounded-lg bg-purple-500 py-3">
            <Text className="font-semibold text-white">Contact Owner</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Virtual Tour Modal */}
      {showVirtualTour && hasVirtualTour && (
        <VirtualTour
          tourUrls={property.virtual_tour_urls!}
          onClose={() => setShowVirtualTour(false)}
          fullscreen
        />
      )}
    </>
  );
}
