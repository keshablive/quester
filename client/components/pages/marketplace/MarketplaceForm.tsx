import React, { useState } from 'react';
import { View, Text, TextInput, ScrollView, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { propertiesService, classifiedsService, Property, ClassifiedAd } from '@/core';
import { Save, X } from 'lucide-react-native';

import { MarketplaceFormProps } from './types';

export function MarketplaceForm({ item, type, onSuccess, onCancel }: MarketplaceFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const isProperty = type === 'property';
  const property = isProperty ? (item as Property) : null;
  const classified = !isProperty ? (item as ClassifiedAd) : null;

  const [formData, setFormData] = useState({
    title: item?.title || '',
    description: item?.description || '',
    price: item?.price?.toString() || '',
    // Property-specific
    location: property?.location || '',
    propertyType: property?.type || '',
    // Classified-specific
    category: classified?.category || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (!formData.price || isNaN(Number(formData.price)) || Number(formData.price) <= 0) {
      newErrors.price = 'Valid price is required';
    }

    if (isProperty && !formData.location.trim()) {
      newErrors.location = 'Location is required';
    }

    if (isProperty && !formData.propertyType.trim()) {
      newErrors.propertyType = 'Property type is required';
    }

    if (!isProperty && !formData.category.trim()) {
      newErrors.category = 'Category is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    try {
      setLoading(true);
      setError(null);

      const commonData = {
        title: formData.title,
        description: formData.description,
        price: Number(formData.price),
      };

      let result: Property | ClassifiedAd;
      
      if (isProperty) {
        const propertyData = {
          ...commonData,
          location: formData.location,
          type: formData.propertyType,
        };

        if (item?.id) {
          result = await propertiesService.update(item.id, propertyData);
        } else {
          result = await propertiesService.create(propertyData);
        }
      } else {
        const classifiedData = {
          ...commonData,
          category: formData.category,
        };

        if (item?.id) {
          result = await classifiedsService.update(item.id, classifiedData);
        } else {
          result = await classifiedsService.create(classifiedData);
        }
      }

      onSuccess(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to save ${isProperty ? 'property' : 'ad'}`);
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {item ? `Edit ${isProperty ? 'Property' : 'Classified Ad'}` : `Create ${isProperty ? 'Property' : 'Classified Ad'}`}
        </Text>
        <Pressable onPress={onCancel} style={styles.closeButton}>
          <X size={24} color="#6B7280" />
        </Pressable>
      </View>

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <View style={styles.form}>
        {/* Title */}
        <View style={styles.field}>
          <Text style={styles.label}>Title *</Text>
          <TextInput
            style={[styles.input, errors.title && styles.inputError]}
            placeholder="Enter title"
            value={formData.title}
            onChangeText={(value) => updateField('title', value)}
            editable={!loading}
          />
          {errors.title && <Text style={styles.fieldError}>{errors.title}</Text>}
        </View>

        {/* Description */}
        <View style={styles.field}>
          <Text style={styles.label}>Description *</Text>
          <TextInput
            style={[styles.textArea, errors.description && styles.inputError]}
            placeholder="Enter description"
            value={formData.description}
            onChangeText={(value) => updateField('description', value)}
            multiline
            numberOfLines={4}
            editable={!loading}
          />
          {errors.description && <Text style={styles.fieldError}>{errors.description}</Text>}
        </View>

        {/* Price */}
        <View style={styles.field}>
          <Text style={styles.label}>Price (USD) *</Text>
          <TextInput
            style={[styles.input, errors.price && styles.inputError]}
            placeholder="Enter price"
            value={formData.price}
            onChangeText={(value) => updateField('price', value)}
            keyboardType="numeric"
            editable={!loading}
          />
          {errors.price && <Text style={styles.fieldError}>{errors.price}</Text>}
        </View>

        {/* Property-specific fields */}
        {isProperty && (
          <>
            <View style={styles.field}>
              <Text style={styles.label}>Location *</Text>
              <TextInput
                style={[styles.input, errors.location && styles.inputError]}
                placeholder="e.g., New York, NY"
                value={formData.location}
                onChangeText={(value) => updateField('location', value)}
                editable={!loading}
              />
              {errors.location && <Text style={styles.fieldError}>{errors.location}</Text>}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Property Type *</Text>
              <TextInput
                style={[styles.input, errors.propertyType && styles.inputError]}
                placeholder="e.g., House, Apartment, Condo"
                value={formData.propertyType}
                onChangeText={(value) => updateField('propertyType', value)}
                editable={!loading}
              />
              {errors.propertyType && <Text style={styles.fieldError}>{errors.propertyType}</Text>}
            </View>
          </>
        )}

        {/* Classified-specific fields */}
        {!isProperty && (
          <View style={styles.field}>
            <Text style={styles.label}>Category *</Text>
            <TextInput
              style={[styles.input, errors.category && styles.inputError]}
              placeholder="e.g., Electronics, Furniture, Vehicles"
              value={formData.category}
              onChangeText={(value) => updateField('category', value)}
              editable={!loading}
            />
            {errors.category && <Text style={styles.fieldError}>{errors.category}</Text>}
          </View>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          <Pressable
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Save size={20} color="#FFFFFF" />
                <Text style={styles.submitButtonText}>
                  {item ? `Update ${isProperty ? 'Property' : 'Ad'}` : `Create ${isProperty ? 'Property' : 'Ad'}`}
                </Text>
              </>
            )}
          </Pressable>

          <Pressable
            style={styles.cancelButton}
            onPress={onCancel}
            disabled={loading}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  closeButton: {
    padding: 8,
  },
  errorBanner: {
    backgroundColor: '#FEE2E2',
    padding: 16,
    margin: 20,
    borderRadius: 8,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
  },
  form: {
    padding: 20,
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
  },
  textArea: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: '#EF4444',
  },
  fieldError: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
  },
  actions: {
    marginTop: 24,
    gap: 12,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4F46E5',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  cancelButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D1D5DB',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
});
