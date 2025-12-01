import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  RefreshControl,
} from 'react-native';
import {
  propertiesService,
  classifiedsService,
  useMarketplaceProperty,
  useMarketplaceClassified,
  Property,
  ClassifiedAd,
  OptimizedImage,
} from '@/core';
import { OfflineIndicator, ErrorState, StaleDataIndicator } from '@/components/shared';
import {
  MapPin,
  DollarSign,
  Home,
  Calendar,
  User,
  Phone,
  MessageCircle,
  Tag,
  CheckCircle,
  Package,
  RefreshCw,
} from 'lucide-react-native';

import { MarketplaceDetailProps } from './types';

/**
 * MarketplaceDetail Component
 *
 * Displays property or classified ad details with TanStack Query caching.
 * Supports offline viewing, background refresh, and instant cache display.
 *
 * US2: Fast Marketplace Browsing with Caching
 *
 * @module components/features/marketplace/MarketplaceDetail
 */
export function MarketplaceDetail({ itemId, type, onEdit, onContact }: MarketplaceDetailProps) {
  // T018-T020: Use appropriate hook based on type
  // Both hooks are called but only one will be enabled based on type
  const propertyQuery = useMarketplaceProperty(itemId, {
    enabled: type === 'property',
  });

  const classifiedQuery = useMarketplaceClassified(itemId, {
    enabled: type === 'classified',
  });

  // Select the active query based on type
  const activeQuery = type === 'property' ? propertyQuery : classifiedQuery;
  const {
    data: item,
    isLoading,
    isRefetching,
    error,
    refetch,
    dataUpdatedAt,
  } = activeQuery as typeof propertyQuery; // Type assertion for unified access

  // T025: Removed manual loadItem async function - using hooks instead

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
      await classifiedsService.markAsSold(itemId);
      // Refetch to get updated data from server
      await refetch();
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

  // T022: Loading state only on initial load (when no cached data)
  if (isLoading && !item) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // T023: Error state with retry button using refetch
  if (error && !item) {
    return (
      <ErrorState
        message={
          error.message ?? `Failed to load ${type === 'property' ? 'property' : 'classified ad'}`
        }
        onRetry={() => refetch()}
      />
    );
  }

  // Handle case where item doesn't exist
  if (!item) {
    return (
      <ErrorState
        message={`${type === 'property' ? 'Property' : 'Classified ad'} not found`}
        onRetry={() => refetch()}
      />
    );
  }

  const isProperty = type === 'property';
  const property = isProperty ? (item as Property) : null;
  const classified = !isProperty ? (item as ClassifiedAd) : null;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#4F46E5" />
      }>
      {/* T021: Offline indicator (network status) */}
      <OfflineIndicator />
      {/* T021: Stale data indicator (cached data age) */}
      <StaleDataIndicator dataUpdatedAt={dataUpdatedAt} />

      {/* T024: Background refetch indicator */}
      {isRefetching && (
        <View style={styles.refetchingIndicator}>
          <RefreshCw size={14} color="#6B7280" />
          <Text style={styles.refetchingText}>Updating...</Text>
        </View>
      )}

      {/* Image Gallery */}
      {item.images && item.images.length > 0 ? (
        <ScrollView horizontal pagingEnabled style={styles.imageGallery}>
          {item.images.map((image, index) => (
            <OptimizedImage
              key={index}
              source={image}
              style={styles.image}
              contentFit="cover"
              placeholder="marketplace"
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
            <Text style={styles.detailLabel}>{isProperty ? 'Listed on:' : 'Posted:'}</Text>
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
              <View
                style={[
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
              {isProperty ? (
                <Phone size={20} color="#FFFFFF" />
              ) : (
                <MessageCircle size={20} color="#FFFFFF" />
              )}
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
  refetchingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 6,
    backgroundColor: '#F3F4F6',
  },
  refetchingText: {
    fontSize: 12,
    color: '#6B7280',
  },
  imageGallery: {},
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
