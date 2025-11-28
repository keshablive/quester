import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Image, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import { propertiesService, classifiedsService, Property, ClassifiedAd } from '@/core';
import { MapPin, DollarSign, Home, Calendar, User, Phone, MessageCircle, Tag, CheckCircle, Package } from 'lucide-react-native';

import { MarketplaceDetailProps } from './types';

export function MarketplaceDetail({ itemId, type, onEdit, onContact }: MarketplaceDetailProps) {
  const [item, setItem] = useState<Property | ClassifiedAd | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadItem();
  }, [itemId]);

  const loadItem = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (type === 'property') {
        const data = await propertiesService.get(itemId);
        setItem(data);
      } else {
        const data = await classifiedsService.get(itemId);
        setItem(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load item');
    } finally {
      setLoading(false);
    }
  };

  const handleContact = async () => {
    if (!item) return;
    
    try {
      if (type === 'property') {
        await propertiesService.contact(itemId);
      }
      onContact?.(item);
    } catch (err) {
      console.error('Failed to process contact:', err);
    }
  };

  const handleMarkAsSold = async () => {
    if (!item || type !== 'classified') return;
    try {
      const updated = await classifiedsService.markAsSold(itemId);
      setItem(updated);
    } catch (err) {
      console.error('Failed to mark as sold:', err);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (error || !item) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error || 'Item not found'}</Text>
        <Pressable style={styles.retryButton} onPress={loadItem}>
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  const isProperty = type === 'property';
  const property = isProperty ? (item as Property) : null;
  const classified = !isProperty ? (item as ClassifiedAd) : null;

  return (
    <ScrollView style={styles.container}>
      {/* Image Gallery */}
      {item.images && item.images.length > 0 ? (
        <ScrollView horizontal pagingEnabled style={styles.imageGallery}>
          {item.images.map((image, index) => (
            <Image
              key={index}
              source={{ uri: image }}
              style={styles.image}
              resizeMode="cover"
            />
          ))}
        </ScrollView>
      ) : (
        <View style={styles.imagePlaceholder}>
          {isProperty ? <Home size={64} color="#9CA3AF" /> : <Package size={64} color="#9CA3AF" />}
        </View>
      )}

      {/* Content */}
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.price}>{formatPrice(item.price)}</Text>
        </View>

        {/* Location (Properties) or Category (Classifieds) */}
        {isProperty && property ? (
          <View style={styles.row}>
            <MapPin size={20} color="#6B7280" />
            <Text style={styles.location}>{property.location}</Text>
          </View>
        ) : classified ? (
          <View style={styles.badge}>
            <Tag size={16} color="#4F46E5" />
            <Text style={styles.badgeText}>{classified.category}</Text>
          </View>
        ) : null}

        {/* Type Badge (Properties only) */}
        {isProperty && property && (
          <View style={styles.typeBadge}>
            <Text style={styles.badgeText}>{property.type}</Text>
          </View>
        )}

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{item.description}</Text>
        </View>

        {/* Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Details</Text>
          
          <View style={styles.detailRow}>
            <Calendar size={18} color="#6B7280" />
            <Text style={styles.detailLabel}>
              {isProperty ? 'Listed on:' : 'Posted:'}
            </Text>
            <Text style={styles.detailValue}>{formatDate(item.createdAt)}</Text>
          </View>

          {classified && (
            <View style={styles.detailRow}>
              <Calendar size={18} color="#6B7280" />
              <Text style={styles.detailLabel}>Expires:</Text>
              <Text style={styles.detailValue}>{formatDate(classified.expiresAt)}</Text>
            </View>
          )}

          <View style={styles.detailRow}>
            <User size={18} color="#6B7280" />
            <Text style={styles.detailLabel}>Owner ID:</Text>
            <Text style={styles.detailValue}>{item.ownerId}</Text>
          </View>

          {item.status && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Status:</Text>
              <View style={[
                styles.statusBadge,
                (item.status === 'published' || item.status === 'active') && styles.statusActive,
                item.status === 'draft' && styles.statusDraft,
                item.status === 'sold' && styles.statusSold,
                item.status === 'expired' && styles.statusExpired,
              ]}>
                <Text style={styles.statusText}>{item.status}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          {(isProperty || classified?.status === 'active') && (
            <Pressable style={styles.contactButton} onPress={handleContact}>
              {isProperty ? <Phone size={20} color="#FFFFFF" /> : <MessageCircle size={20} color="#FFFFFF" />}
              <Text style={styles.contactButtonText}>
                {isProperty ? 'Contact Owner' : 'Contact Seller'}
              </Text>
            </Pressable>
          )}

          {onEdit && (!classified || classified.status !== 'sold') && (
            <Pressable style={styles.editButton} onPress={() => onEdit(item)}>
              <Text style={styles.editButtonText}>Edit {isProperty ? 'Property' : 'Ad'}</Text>
            </Pressable>
          )}

          {classified && classified.status === 'active' && onEdit && (
            <Pressable style={styles.soldButton} onPress={handleMarkAsSold}>
              <CheckCircle size={20} color="#FFFFFF" />
              <Text style={styles.soldButtonText}>Mark as Sold</Text>
            </Pressable>
          )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  imageGallery: {
    height: 300,
  },
  image: {
    width: 400,
    height: 300,
  },
  imagePlaceholder: {
    width: '100%',
    height: 300,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 20,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  price: {
    fontSize: 28,
    fontWeight: '700',
    color: '#10B981',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  location: {
    fontSize: 16,
    color: '#6B7280',
    marginLeft: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 16,
    gap: 6,
  },
  typeBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 24,
  },
  badgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4F46E5',
    textTransform: 'capitalize',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: '#374151',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 8,
    marginRight: 8,
  },
  detailValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusActive: {
    backgroundColor: '#10B981',
  },
  statusDraft: {
    backgroundColor: '#F59E0B',
  },
  statusSold: {
    backgroundColor: '#6B7280',
  },
  statusExpired: {
    backgroundColor: '#F59E0B',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  actions: {
    marginTop: 24,
    gap: 12,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4F46E5',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  contactButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  editButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#4F46E5',
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4F46E5',
  },
  soldButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  soldButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
