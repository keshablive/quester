import React, { useRef, useEffect } from 'react';
import { View } from 'react-native';
import { Text } from '@/components/ui/text';
import MapView, { Marker, Circle, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { Property } from '@/lib/api/properties';

interface PropertyMapProps {
  properties: Property[];
  userLocation?: { latitude: number; longitude: number };
  radius?: number; // Search radius in meters
  // Accept either a property object or an id (string|number) for callbacks in different callers
  onPropertyPress?: (propertyId: string | number) => void;
  selectedPropertyId?: string | number;
  initialRegion?: Region;
}

export function PropertyMap({
  properties,
  userLocation,
  radius = 5000,
  onPropertyPress,
  selectedPropertyId,
  initialRegion,
}: PropertyMapProps) {
  const mapRef = useRef<MapView>(null);

  // Auto-fit markers on mount or when properties change
  useEffect(() => {
    if (properties.length > 0 && mapRef.current) {
      const coordinates = properties.map((property) => ({
        latitude: property.location.coordinates[1],
        longitude: property.location.coordinates[0],
      }));

      // Add user location if available
      if (userLocation) {
        coordinates.push(userLocation);
      }

      mapRef.current.fitToCoordinates(coordinates, {
        edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
        animated: true,
      });
    }
  }, [properties, userLocation]);

  const getDefaultRegion = (): Region => {
    if (initialRegion) return initialRegion;

    if (userLocation) {
      return {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };
    }

    // Default to Delhi, India
    return {
      latitude: 28.6139,
      longitude: 77.209,
      latitudeDelta: 0.1,
      longitudeDelta: 0.1,
    };
  };

  const getMarkerColor = (property: Property) => {
    if (String(property.id) === String(selectedPropertyId)) return '#3B82F6'; // Blue for selected
    if (property.listing_type === 'for_sale') return '#EF4444'; // Red for sale
    if (property.listing_type === 'for_rent') return '#10B981'; // Green for rent
    return '#6B7280'; // Gray default
  };

  const formatPrice = (price: number, currency: string) => {
    if (currency === 'INR') {
      return `₹${(price / 100000).toFixed(1)}L`;
    } else if (currency === 'USD') {
      return `$${(price / 1000).toFixed(0)}k`;
    }
    return `${price.toLocaleString()}`;
  };

  return (
    <View className="flex-1">
      <MapView
        ref={mapRef}
        className="flex-1"
        provider={PROVIDER_GOOGLE}
        initialRegion={getDefaultRegion()}
        showsUserLocation={true}
        showsMyLocationButton={true}
        showsCompass={true}
        showsScale={true}>
        {/* User Location Circle */}
        {userLocation && (
          <Circle
            center={userLocation}
            radius={radius}
            strokeColor="rgba(59, 130, 246, 0.5)"
            fillColor="rgba(59, 130, 246, 0.1)"
            strokeWidth={2}
          />
        )}

        {/* Property Markers */}
        {properties.map((property) => (
          <Marker
            key={property.id}
            coordinate={{
              latitude: property.location.coordinates[1],
              longitude: property.location.coordinates[0],
            }}
            pinColor={getMarkerColor(property)}
            onPress={() => onPropertyPress?.(property.id)}>
            {/* Custom Marker Callout */}
            <View
              className="rounded border-2 px-2 py-1 shadow"
              style={{
                backgroundColor:
                  String(property.id) === String(selectedPropertyId) ? '#3B82F6' : 'white',
                borderColor: getMarkerColor(property),
              }}>
              <Text
                className="text-xs font-bold"
                style={{
                  color: String(property.id) === String(selectedPropertyId) ? 'white' : '#1F2937',
                }}>
                {formatPrice(property.price, property.currency)}
              </Text>
            </View>
          </Marker>
        ))}
      </MapView>

      {/* Legend */}
      <View className="absolute bottom-5 left-5 rounded-lg bg-white p-3 shadow-md">
        <View className="mb-1 flex-row items-center">
          <View className="mr-2 h-3 w-3 rounded-full" style={{ backgroundColor: '#EF4444' }} />
          <Text className="text-xs text-gray-800">For Sale</Text>
        </View>
        <View className="mb-1 flex-row items-center">
          <View className="mr-2 h-3 w-3 rounded-full" style={{ backgroundColor: '#10B981' }} />
          <Text className="text-xs text-gray-800">For Rent</Text>
        </View>
        {selectedPropertyId && (
          <View className="mb-1 flex-row items-center">
            <View className="mr-2 h-3 w-3 rounded-full" style={{ backgroundColor: '#3B82F6' }} />
            <Text className="text-xs text-gray-800">Selected</Text>
          </View>
        )}
      </View>

      {/* Property Count */}
      <View className="absolute right-5 top-5 rounded-full bg-white px-3 py-1.5 shadow-md">
        <Text className="text-xs font-semibold text-gray-800">
          {properties.length} {properties.length === 1 ? 'property' : 'properties'}
        </Text>
      </View>
    </View>
  );
}
