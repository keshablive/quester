import React from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { Property, ClassifiedAd } from '@/core';
import { MapPin, DollarSign, Home, Tag, Calendar, Package } from 'lucide-react-native';

import { MarketplaceCardProps } from './types';

export function MarketplaceCard({ item, type, onPress }: MarketplaceCardProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const formatDate = (date: string) => {
    const now = new Date();
    const itemDate = new Date(date);
    const diffTime = Math.abs(now.getTime() - itemDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  const isProperty = type === 'property';
  const property = isProperty ? (item as Property) : null;
  const classified = !isProperty ? (item as ClassifiedAd) : null;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        pressed && styles.cardPressed,
      ]}
      onPress={() => onPress(item)}
    >
      {item.images && item.images.length > 0 ? (
        <Image
          source={{ uri: item.images[0] }}
          style={styles.image}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.imagePlaceholder}>
          {isProperty ? (
            <Home size={48} color="#9CA3AF" />
          ) : (
            <Package size={48} color="#9CA3AF" />
          )}
        </View>
      )}

      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>
          {item.title}
        </Text>

        {isProperty && property ? (
          <View style={styles.row}>
            <MapPin size={16} color="#6B7280" />
            <Text style={styles.location} numberOfLines={1}>
              {property.location}
            </Text>
          </View>
        ) : classified ? (
          <View style={styles.row}>
            <Tag size={16} color="#6B7280" />
            <Text style={styles.category}>{classified.category}</Text>
          </View>
        ) : null}

        <View style={styles.footer}>
          <View style={styles.row}>
            <DollarSign size={18} color="#10B981" />
            <Text style={styles.price}>{formatPrice(item.price)}</Text>
          </View>

          {isProperty && property ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{property.type}</Text>
            </View>
          ) : classified ? (
            <View style={styles.row}>
              <Calendar size={14} color="#9CA3AF" />
              <Text style={styles.date}>{formatDate(classified.createdAt)}</Text>
            </View>
          ) : null}
        </View>

        {item.status && (
          <View style={[
            styles.statusBadge,
            (item.status === 'published' || item.status === 'active') && styles.statusActive,
            (item.status === 'draft') && styles.statusDraft,
            (item.status === 'sold') && styles.statusSold,
            (item.status === 'expired') && styles.statusExpired,
          ]}>
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardPressed: {
    opacity: 0.7,
  },
  image: {
    width: '100%',
    height: 200,
  },
  imagePlaceholder: {
    width: '100%',
    height: 200,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  location: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 4,
    flex: 1,
  },
  category: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 6,
    textTransform: 'capitalize',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  price: {
    fontSize: 20,
    fontWeight: '700',
    color: '#10B981',
    marginLeft: 4,
  },
  badge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4F46E5',
    textTransform: 'capitalize',
  },
  date: {
    fontSize: 12,
    color: '#9CA3AF',
    marginLeft: 4,
  },
  statusBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    paddingHorizontal: 8,
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
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
});
