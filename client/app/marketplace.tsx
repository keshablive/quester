/**
 * Marketplace Page
 *
 * Route file for marketplace view (properties/classifieds).
 * Uses TanStack Query via sub-components for data fetching.
 *
 * Phase 3 Migration: Verified TanStack Query integration
 * FR-008: System MUST migrate Marketplace page to use TanStack Query
 *
 * @module app/marketplace
 */

import React, { useState } from 'react';
import { View, Modal } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  MarketplaceDashboard,
  MarketplaceList,
  MarketplaceDetail,
  MarketplaceForm,
} from '@/components/features/marketplace';
import { Property, ClassifiedAd } from '@/core';
import { MarketplaceItem, MarketplaceItemType } from '@/components/features/marketplace/types';
import { OfflineIndicator } from '@/components/shared';
import { ChunkErrorBoundary } from '@/core/routes';

export default function MarketplaceScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ view: string }>();
  const view = params.view || 'dashboard';

  const [selectedItem, setSelectedItem] = useState<MarketplaceItem | null>(null);
  const [selectedType, setSelectedType] = useState<MarketplaceItemType>('property');
  const [showDetail, setShowDetail] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<MarketplaceItem | undefined>(undefined);
  const [editingType, setEditingType] = useState<MarketplaceItemType>('property');

  const navigateTo = (newView: string) => {
    router.push({
      pathname: '/marketplace',
      params: { view: newView },
    });
  };

  const handleItemPress = (item: MarketplaceItem, type: MarketplaceItemType) => {
    setSelectedItem(item);
    setSelectedType(type);
    setShowDetail(true);
  };

  const handleEdit = (item: MarketplaceItem) => {
    setEditingItem(item);
    setEditingType(selectedType);
    setShowDetail(false);
    setShowForm(true);
  };

  const handleFormSuccess = (item: MarketplaceItem) => {
    setShowForm(false);
    setEditingItem(undefined);
    // Optionally show the updated item
    setSelectedItem(item);
    setShowDetail(true);
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingItem(undefined);
  };

  const handleDetailClose = () => {
    setShowDetail(false);
    setSelectedItem(null);
  };

  const handleContact = (item: MarketplaceItem) => {
    console.log('Contact for item:', item.id);
    // Handle contact logic here
  };

  const renderContent = () => {
    switch (view) {
      case 'properties':
        return <MarketplaceList onItemPress={handleItemPress} initialTab="properties" />;
      case 'classifieds':
        return <MarketplaceList onItemPress={handleItemPress} initialTab="classifieds" />;
      default:
        return <MarketplaceDashboard onNavigate={navigateTo} onItemPress={handleItemPress} />;
    }
  };

  return (
    <ChunkErrorBoundary>
      <View className="flex-1 bg-background">
        <OfflineIndicator />
        {renderContent()}

        {/* Item Detail Modal */}
        <Modal
          visible={showDetail}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={handleDetailClose}>
          {selectedItem && (
            <MarketplaceDetail
              itemId={selectedItem.id}
              type={selectedType}
              onEdit={handleEdit}
              onContact={handleContact}
            />
          )}
        </Modal>

        {/* Item Form Modal */}
        <Modal
          visible={showForm}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={handleFormCancel}>
          <MarketplaceForm
            item={editingItem}
            type={editingType}
            onSuccess={handleFormSuccess}
            onCancel={handleFormCancel}
          />
        </Modal>
      </View>
    </ChunkErrorBoundary>
  );
}
