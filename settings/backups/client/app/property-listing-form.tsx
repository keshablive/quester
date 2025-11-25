import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { MapPin, Upload, X, FileText, Check } from 'lucide-react-native';
import {
  createProperty,
  uploadDocuments,
  verifyDocuments,
  publishProperty,
} from '@/lib/api/properties';
import { useCurrentPosition } from '@/lib/hooks/useGeolocation';

// Backend property types
type BackendPropertyType = 'residential' | 'commercial' | 'land' | 'industrial';
// Frontend display types
type PropertyType = 'house' | 'apartment' | 'villa' | 'plot' | 'commercial';
type ListingType = 'for_sale' | 'for_rent';

interface FormData {
  title: string;
  description: string;
  property_type: PropertyType;
  listing_type: ListingType;
  price: string;
  currency: string;
  bedrooms: string;
  bathrooms: string;
  area_sqft: string;
  address: {
    street: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
  location: {
    latitude: number;
    longitude: number;
  } | null;
  amenities: string[];
  images: string[];
  virtual_tour_urls: string[];
  documents: Array<{ uri: string; type: string; name: string }>;
}

const PROPERTY_TYPES: { value: PropertyType; label: string }[] = [
  { value: 'house', label: 'House' },
  { value: 'apartment', label: 'Apartment' },
  { value: 'villa', label: 'Villa' },
  { value: 'plot', label: 'Plot' },
  { value: 'commercial', label: 'Commercial' },
];

const LISTING_TYPES: { value: ListingType; label: string }[] = [
  { value: 'for_sale', label: 'For Sale' },
  { value: 'for_rent', label: 'For Rent' },
];

const COMMON_AMENITIES = [
  'Parking',
  'Swimming Pool',
  'Gym',
  'Garden',
  'Security',
  'Power Backup',
  'Elevator',
  'Water Supply',
  'Club House',
  'Kids Play Area',
];

export default function PropertyListingFormScreen() {
  const router = useRouter();
  const { coords, loading: locationLoading } = useCurrentPosition();

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    property_type: 'apartment',
    listing_type: 'for_sale',
    price: '',
    currency: 'USD',
    bedrooms: '',
    bathrooms: '',
    area_sqft: '',
    address: {
      street: '',
      city: '',
      state: '',
      postal_code: '',
      country: '',
    },
    location: null,
    amenities: [],
    images: [],
    virtual_tour_urls: [],
    documents: [],
  });

  const handlePickImages = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      const newImages = result.assets.map((asset) => asset.uri);
      setFormData({
        ...formData,
        images: [...formData.images, ...newImages],
      });
    }
  };

  const handleRemoveImage = (index: number) => {
    setFormData({
      ...formData,
      images: formData.images.filter((_, i) => i !== index),
    });
  };

  const handlePickDocuments = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/*'],
      multiple: true,
    });

    if (!result.canceled) {
      const newDocs = result.assets.map((asset) => ({
        uri: asset.uri,
        type: asset.mimeType || 'application/pdf',
        name: asset.name,
      }));
      setFormData({
        ...formData,
        documents: [...formData.documents, ...newDocs],
      });
    }
  };

  const handleRemoveDocument = (index: number) => {
    setFormData({
      ...formData,
      documents: formData.documents.filter((_, i) => i !== index),
    });
  };

  const handleToggleAmenity = (amenity: string) => {
    if (formData.amenities.includes(amenity)) {
      setFormData({
        ...formData,
        amenities: formData.amenities.filter((a) => a !== amenity),
      });
    } else {
      setFormData({
        ...formData,
        amenities: [...formData.amenities, amenity],
      });
    }
  };

  const handleAddVirtualTourUrl = () => {
    setFormData({
      ...formData,
      virtual_tour_urls: [...formData.virtual_tour_urls, ''],
    });
  };

  const handleUpdateVirtualTourUrl = (index: number, value: string) => {
    const updated = [...formData.virtual_tour_urls];
    updated[index] = value;
    setFormData({
      ...formData,
      virtual_tour_urls: updated,
    });
  };

  const handleRemoveVirtualTourUrl = (index: number) => {
    setFormData({
      ...formData,
      virtual_tour_urls: formData.virtual_tour_urls.filter((_, i) => i !== index),
    });
  };

  const handleUseCurrentLocation = () => {
    if (coords) {
      setFormData({
        ...formData,
        location: {
          latitude: coords.latitude,
          longitude: coords.longitude,
        },
      });
      Alert.alert('Success', 'Current location set successfully');
    } else {
      Alert.alert('Error', 'Unable to get current location');
    }
  };

  const validateStep = (stepNum: number): boolean => {
    switch (stepNum) {
      case 1:
        if (!formData.title || !formData.description) {
          Alert.alert('Error', 'Please fill in title and description');
          return false;
        }
        return true;
      case 2:
        if (!formData.price || !formData.bedrooms || !formData.bathrooms || !formData.area_sqft) {
          Alert.alert('Error', 'Please fill in all property details');
          return false;
        }
        return true;
      case 3:
        if (
          !formData.address.street ||
          !formData.address.city ||
          !formData.address.state ||
          !formData.address.country
        ) {
          Alert.alert('Error', 'Please fill in complete address');
          return false;
        }
        if (!formData.location) {
          Alert.alert('Error', 'Please set property location on map');
          return false;
        }
        return true;
      case 4:
        if (formData.images.length === 0) {
          Alert.alert('Error', 'Please upload at least one property image');
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const handleSubmit = async () => {
    if (!validateStep(step)) return;

    try {
      setSubmitting(true);

      // Map frontend property type to backend type
      const mapPropertyType = (type: PropertyType): BackendPropertyType => {
        switch (type) {
          case 'house':
          case 'apartment':
          case 'villa':
            return 'residential';
          case 'plot':
            return 'land';
          case 'commercial':
            return 'commercial';
          default:
            return 'residential';
        }
      };

      // Create property
      const propertyData = {
        title: formData.title,
        description: formData.description,
        property_type: mapPropertyType(formData.property_type),
        listing_type: formData.listing_type,
        price: parseFloat(formData.price),
        currency: formData.currency,
        bedrooms: parseInt(formData.bedrooms),
        bathrooms: parseInt(formData.bathrooms),
        area_sqft: parseFloat(formData.area_sqft),
        address: formData.address,
        location: {
          type: 'Point' as const,
          coordinates: [formData.location!.longitude, formData.location!.latitude] as [
            number,
            number,
          ],
        },
        amenities: formData.amenities,
        images: formData.images,
        virtual_tour_urls: formData.virtual_tour_urls.filter((url) => url.trim() !== ''),
      };

      const property = await createProperty(propertyData);

      // Upload documents if any
      if (formData.documents.length > 0) {
        await uploadDocuments(
          property.id,
          formData.documents.map((doc) => ({
            type: 'ownership_deed',
            url: doc.uri,
          }))
        );

        // Trigger verification
        await verifyDocuments(property.id);
      }

      // Publish property
      await publishProperty(property.id);

      Alert.alert('Success', 'Property listed successfully!', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      console.error('Failed to create property:', error);
      Alert.alert('Error', 'Failed to create property listing. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStepIndicator = () => (
    <View className="flex-row items-center justify-between border-b border-gray-200 bg-white px-4 py-4">
      {[1, 2, 3, 4, 5].map((stepNum) => (
        <View key={stepNum} className="flex-1 flex-row items-center">
          <View
            className={`h-8 w-8 items-center justify-center rounded-full ${
              stepNum === step ? 'bg-blue-500' : stepNum < step ? 'bg-green-500' : 'bg-gray-300'
            }`}>
            {stepNum < step ? (
              <Check size={20} color="#FFFFFF" />
            ) : (
              <Text
                className={`font-semibold ${stepNum === step ? 'text-white' : 'text-gray-600'}`}>
                {stepNum}
              </Text>
            )}
          </View>
          {stepNum < 5 && <View className="mx-1 h-0.5 flex-1 bg-gray-300" />}
        </View>
      ))}
    </View>
  );

  const renderStep1 = () => (
    <ScrollView className="flex-1 p-4">
      <Text className="mb-6 text-2xl font-bold text-gray-900">Basic Information</Text>

      {/* Property Type */}
      <View className="mb-4">
        <Text className="mb-2 text-base font-semibold">Property Type *</Text>
        <View className="flex-row flex-wrap gap-2">
          {PROPERTY_TYPES.map((type) => (
            <TouchableOpacity
              key={type.value}
              onPress={() => setFormData({ ...formData, property_type: type.value })}
              className={`rounded-lg border px-4 py-2 ${
                formData.property_type === type.value
                  ? 'border-blue-500 bg-blue-500'
                  : 'border-gray-300 bg-white'
              }`}>
              <Text
                className={`font-medium ${
                  formData.property_type === type.value ? 'text-white' : 'text-gray-700'
                }`}>
                {type.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Listing Type */}
      <View className="mb-4">
        <Text className="mb-2 text-base font-semibold">Listing Type *</Text>
        <View className="flex-row space-x-2">
          {LISTING_TYPES.map((type) => (
            <TouchableOpacity
              key={type.value}
              onPress={() => setFormData({ ...formData, listing_type: type.value })}
              className={`flex-1 rounded-lg border py-3 ${
                formData.listing_type === type.value
                  ? 'border-blue-500 bg-blue-500'
                  : 'border-gray-300 bg-white'
              }`}>
              <Text
                className={`text-center font-medium ${
                  formData.listing_type === type.value ? 'text-white' : 'text-gray-700'
                }`}>
                {type.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Title */}
      <View className="mb-4">
        <Text className="mb-2 text-base font-semibold">Title *</Text>
        <TextInput
          placeholder="e.g., 3 BHK Apartment in Downtown"
          value={formData.title}
          onChangeText={(text) => setFormData({ ...formData, title: text })}
          className="rounded-lg border border-gray-300 px-4 py-3"
        />
      </View>

      {/* Description */}
      <View className="mb-4">
        <Text className="mb-2 text-base font-semibold">Description *</Text>
        <TextInput
          placeholder="Describe your property..."
          value={formData.description}
          onChangeText={(text) => setFormData({ ...formData, description: text })}
          multiline
          numberOfLines={4}
          className="rounded-lg border border-gray-300 px-4 py-3"
          textAlignVertical="top"
        />
      </View>
    </ScrollView>
  );

  const renderStep2 = () => (
    <ScrollView className="flex-1 p-4">
      <Text className="mb-6 text-2xl font-bold text-gray-900">Property Details</Text>

      {/* Price */}
      <View className="mb-4">
        <Text className="mb-2 text-base font-semibold">Price *</Text>
        <View className="flex-row space-x-2">
          <TextInput
            placeholder="0"
            value={formData.price}
            onChangeText={(text) => setFormData({ ...formData, price: text })}
            keyboardType="numeric"
            className="flex-1 rounded-lg border border-gray-300 px-4 py-3"
          />
          <View className="w-24 justify-center rounded-lg border border-gray-300 px-4 py-3">
            <Text className="text-gray-700">{formData.currency}</Text>
          </View>
        </View>
      </View>

      {/* Bedrooms */}
      <View className="mb-4">
        <Text className="mb-2 text-base font-semibold">Bedrooms *</Text>
        <View className="flex-row space-x-2">
          {[1, 2, 3, 4, 5].map((num) => (
            <TouchableOpacity
              key={num}
              onPress={() => setFormData({ ...formData, bedrooms: num.toString() })}
              className={`flex-1 rounded-lg border py-3 ${
                formData.bedrooms === num.toString()
                  ? 'border-blue-500 bg-blue-500'
                  : 'border-gray-300 bg-white'
              }`}>
              <Text
                className={`text-center font-medium ${
                  formData.bedrooms === num.toString() ? 'text-white' : 'text-gray-700'
                }`}>
                {num}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Bathrooms */}
      <View className="mb-4">
        <Text className="mb-2 text-base font-semibold">Bathrooms *</Text>
        <View className="flex-row space-x-2">
          {[1, 2, 3, 4, 5].map((num) => (
            <TouchableOpacity
              key={num}
              onPress={() => setFormData({ ...formData, bathrooms: num.toString() })}
              className={`flex-1 rounded-lg border py-3 ${
                formData.bathrooms === num.toString()
                  ? 'border-blue-500 bg-blue-500'
                  : 'border-gray-300 bg-white'
              }`}>
              <Text
                className={`text-center font-medium ${
                  formData.bathrooms === num.toString() ? 'text-white' : 'text-gray-700'
                }`}>
                {num}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Area */}
      <View className="mb-4">
        <Text className="mb-2 text-base font-semibold">Area (sq ft) *</Text>
        <TextInput
          placeholder="e.g., 1200"
          value={formData.area_sqft}
          onChangeText={(text) => setFormData({ ...formData, area_sqft: text })}
          keyboardType="numeric"
          className="rounded-lg border border-gray-300 px-4 py-3"
        />
      </View>

      {/* Amenities */}
      <View className="mb-4">
        <Text className="mb-2 text-base font-semibold">Amenities</Text>
        <View className="flex-row flex-wrap gap-2">
          {COMMON_AMENITIES.map((amenity) => (
            <TouchableOpacity
              key={amenity}
              onPress={() => handleToggleAmenity(amenity)}
              className={`rounded-lg border px-3 py-2 ${
                formData.amenities.includes(amenity)
                  ? 'border-blue-500 bg-blue-500'
                  : 'border-gray-300 bg-white'
              }`}>
              <Text
                className={`text-sm ${
                  formData.amenities.includes(amenity) ? 'text-white' : 'text-gray-700'
                }`}>
                {amenity}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>
  );

  const renderStep3 = () => (
    <ScrollView className="flex-1 p-4">
      <Text className="mb-6 text-2xl font-bold text-gray-900">Location & Address</Text>

      {/* Street */}
      <View className="mb-4">
        <Text className="mb-2 text-base font-semibold">Street Address *</Text>
        <TextInput
          placeholder="e.g., 123 Main Street"
          value={formData.address.street}
          onChangeText={(text) =>
            setFormData({ ...formData, address: { ...formData.address, street: text } })
          }
          className="rounded-lg border border-gray-300 px-4 py-3"
        />
      </View>

      {/* City & State */}
      <View className="mb-4 flex-row space-x-2">
        <View className="flex-1">
          <Text className="mb-2 text-base font-semibold">City *</Text>
          <TextInput
            placeholder="City"
            value={formData.address.city}
            onChangeText={(text) =>
              setFormData({ ...formData, address: { ...formData.address, city: text } })
            }
            className="rounded-lg border border-gray-300 px-4 py-3"
          />
        </View>
        <View className="flex-1">
          <Text className="mb-2 text-base font-semibold">State *</Text>
          <TextInput
            placeholder="State"
            value={formData.address.state}
            onChangeText={(text) =>
              setFormData({ ...formData, address: { ...formData.address, state: text } })
            }
            className="rounded-lg border border-gray-300 px-4 py-3"
          />
        </View>
      </View>

      {/* Postal Code & Country */}
      <View className="mb-4 flex-row space-x-2">
        <View className="flex-1">
          <Text className="mb-2 text-base font-semibold">Postal Code</Text>
          <TextInput
            placeholder="ZIP/Postal Code"
            value={formData.address.postal_code}
            onChangeText={(text) =>
              setFormData({ ...formData, address: { ...formData.address, postal_code: text } })
            }
            className="rounded-lg border border-gray-300 px-4 py-3"
          />
        </View>
        <View className="flex-1">
          <Text className="mb-2 text-base font-semibold">Country *</Text>
          <TextInput
            placeholder="Country"
            value={formData.address.country}
            onChangeText={(text) =>
              setFormData({ ...formData, address: { ...formData.address, country: text } })
            }
            className="rounded-lg border border-gray-300 px-4 py-3"
          />
        </View>
      </View>

      {/* Location Picker */}
      <View className="mb-4">
        <Text className="mb-2 text-base font-semibold">GPS Location *</Text>
        <TouchableOpacity
          onPress={handleUseCurrentLocation}
          disabled={locationLoading}
          className="flex-row items-center justify-center rounded-lg bg-blue-500 py-3">
          {locationLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <MapPin size={20} color="#FFFFFF" />
              <Text className="ml-2 font-semibold text-white">Use Current Location</Text>
            </>
          )}
        </TouchableOpacity>
        {formData.location && (
          <View className="mt-2 rounded-lg bg-green-50 p-3">
            <Text className="text-sm text-green-700">
              📍 Location set: {formData.location.latitude.toFixed(6)},{' '}
              {formData.location.longitude.toFixed(6)}
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );

  const renderStep4 = () => (
    <ScrollView className="flex-1 p-4">
      <Text className="mb-6 text-2xl font-bold text-gray-900">Images & Media</Text>

      {/* Images */}
      <View className="mb-6">
        <Text className="mb-2 text-base font-semibold">Property Images *</Text>
        <TouchableOpacity
          onPress={handlePickImages}
          className="mb-3 items-center rounded-lg border-2 border-dashed border-gray-300 p-6">
          <Upload size={32} color="#6B7280" />
          <Text className="mt-2 text-gray-600">Tap to upload images</Text>
          <Text className="mt-1 text-sm text-gray-500">JPG, PNG up to 10MB each</Text>
        </TouchableOpacity>

        {formData.images.length > 0 && (
          <View className="flex-row flex-wrap gap-2">
            {formData.images.map((image, index) => (
              <View key={index} className="relative">
                <Image source={{ uri: image }} className="h-24 w-24 rounded-lg" />
                <TouchableOpacity
                  onPress={() => handleRemoveImage(index)}
                  className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1">
                  <X size={16} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Virtual Tours */}
      <View className="mb-4">
        <Text className="mb-2 text-base font-semibold">360° Virtual Tour URLs</Text>
        {formData.virtual_tour_urls.map((url, index) => (
          <View key={index} className="mb-2 flex-row items-center">
            <TextInput
              placeholder="https://..."
              value={url}
              onChangeText={(text) => handleUpdateVirtualTourUrl(index, text)}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-3"
            />
            <TouchableOpacity
              onPress={() => handleRemoveVirtualTourUrl(index)}
              className="ml-2 p-2">
              <X size={24} color="#EF4444" />
            </TouchableOpacity>
          </View>
        ))}
        <TouchableOpacity
          onPress={handleAddVirtualTourUrl}
          className="mt-2 items-center rounded-lg border border-blue-500 py-2">
          <Text className="font-medium text-blue-500">+ Add Virtual Tour URL</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderStep5 = () => (
    <ScrollView className="flex-1 p-4">
      <Text className="mb-6 text-2xl font-bold text-gray-900">Documents & Verification</Text>

      <Text className="mb-4 text-gray-600">
        Upload property documents for verification. This helps build trust with potential buyers.
      </Text>

      <TouchableOpacity
        onPress={handlePickDocuments}
        className="mb-4 items-center rounded-lg border-2 border-dashed border-gray-300 p-6">
        <FileText size={32} color="#6B7280" />
        <Text className="mt-2 text-gray-600">Upload Documents</Text>
        <Text className="mt-1 text-sm text-gray-500">Ownership deed, tax receipts, etc.</Text>
      </TouchableOpacity>

      {formData.documents.length > 0 && (
        <View className="space-y-2">
          {formData.documents.map((doc, index) => (
            <View
              key={index}
              className="flex-row items-center justify-between rounded-lg bg-gray-50 p-3">
              <View className="flex-1 flex-row items-center">
                <FileText size={20} color="#3B82F6" />
                <Text className="ml-2 flex-1 text-gray-900" numberOfLines={1}>
                  {doc.name}
                </Text>
              </View>
              <TouchableOpacity onPress={() => handleRemoveDocument(index)}>
                <X size={20} color="#EF4444" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      <View className="mt-6 rounded-lg bg-blue-50 p-4">
        <Text className="mb-2 font-semibold text-blue-900">📋 Review Your Listing</Text>
        <View className="space-y-1">
          <Text className="text-blue-700">• {formData.title}</Text>
          <Text className="text-blue-700">
            • {formData.property_type} - {formData.listing_type}
          </Text>
          <Text className="text-blue-700">
            • {formData.bedrooms} bed, {formData.bathrooms} bath, {formData.area_sqft} sq ft
          </Text>
          <Text className="text-blue-700">
            • {formData.currency} {formData.price}
          </Text>
          <Text className="text-blue-700">
            • {formData.address.city}, {formData.address.state}
          </Text>
          <Text className="text-blue-700">• {formData.images.length} images</Text>
          {formData.documents.length > 0 && (
            <Text className="text-blue-700">• {formData.documents.length} documents</Text>
          )}
        </View>
      </View>
    </ScrollView>
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Create Property Listing',
        }}
      />

      <View className="flex-1 bg-white">
        {renderStepIndicator()}

        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
        {step === 5 && renderStep5()}

        {/* Navigation Buttons */}
        <View className="border-t border-gray-200 p-4">
          <View className="flex-row space-x-2">
            {step > 1 && (
              <TouchableOpacity
                onPress={handleBack}
                className="flex-1 items-center rounded-lg bg-gray-200 py-3">
                <Text className="font-semibold text-gray-700">Back</Text>
              </TouchableOpacity>
            )}
            {step < 5 ? (
              <TouchableOpacity
                onPress={handleNext}
                className="flex-1 items-center rounded-lg bg-blue-500 py-3">
                <Text className="font-semibold text-white">Next</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={handleSubmit}
                disabled={submitting}
                className="flex-1 items-center rounded-lg bg-green-500 py-3">
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text className="font-semibold text-white">Publish Listing</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </>
  );
}
