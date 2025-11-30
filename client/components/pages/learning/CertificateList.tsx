import React from 'react';
import { View, FlatList, ActivityIndicator, Pressable } from 'react-native';
import { Text } from '@/components/ui';
import { CertificateCard } from './CertificateCard';
import { Certificate, useCertificates, certificatesService } from '@/core';
import { Award, WifiOff } from 'lucide-react-native';

import { CertificateListProps } from './certificate.types';

// Threshold for showing offline indicator (1 hour)
const OFFLINE_THRESHOLD_MS = 60 * 60 * 1000;

/**
 * Offline Indicator Component (FR-012)
 * Shows when cached data may be outdated
 */
function OfflineIndicator({ dataUpdatedAt }: { dataUpdatedAt: number }) {
  const isStale = Date.now() - dataUpdatedAt > OFFLINE_THRESHOLD_MS;

  if (!isStale) return null;

  return (
    <View className="mx-4 mb-2 flex-row items-center gap-2 rounded-lg bg-amber-100 px-3 py-2 dark:bg-amber-900/30">
      <WifiOff size={16} className="text-amber-600 dark:text-amber-400" />
      <Text className="flex-1 text-sm text-amber-700 dark:text-amber-300">
        Showing cached data. Pull down to refresh.
      </Text>
    </View>
  );
}

/**
 * CertificateList Component
 *
 * Displays user certificates with TanStack Query caching,
 * pull-to-refresh, and offline support.
 *
 * US3: Certificate Display with Cache (Feature 020)
 */
export function CertificateList({ onCertificatePress }: CertificateListProps) {
  // TanStack Query hook for certificates (US3)
  const {
    data: certificates = [],
    isLoading,
    isRefetching,
    error,
    refetch,
    dataUpdatedAt,
  } = useCertificates();

  const handleDownload = async (certificate: Certificate) => {
    try {
      const { url } = await certificatesService.getDownloadUrl(certificate.id);
      console.log('Download certificate from:', url);
      // In a real app, you would open the URL or trigger a download
    } catch (err) {
      console.error('Failed to get download URL:', err);
    }
  };

  const renderHeader = () => (
    <View className="mb-6">
      <View className="flex-row items-center rounded-xl bg-card p-5 shadow-sm">
        <Award size={32} className="text-amber-500" />
        <View className="ml-4">
          <Text className="text-2xl font-bold text-foreground">My Certificates</Text>
          <Text className="mt-0.5 text-sm text-muted-foreground">{certificates.length} earned</Text>
        </View>
      </View>
    </View>
  );

  const renderEmpty = () => (
    <View className="items-center py-12">
      <Award size={64} className="text-muted-foreground/30" />
      <Text className="mb-2 mt-4 text-lg font-semibold text-foreground">No certificates yet</Text>
      <Text className="text-sm text-muted-foreground">Complete courses to earn certificates</Text>
    </View>
  );

  const renderError = () => (
    <View className="flex-1 items-center justify-center bg-background p-6">
      <Text className="mb-4 text-center text-base text-destructive">
        {error?.message ?? 'Failed to load certificates'}
      </Text>
      <Pressable className="rounded-lg bg-primary px-6 py-3" onPress={() => refetch()}>
        <Text className="text-base font-semibold text-primary-foreground">Retry</Text>
      </Pressable>
    </View>
  );

  // Show loading indicator for initial load only
  if (isLoading && certificates.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" className="text-primary" />
        <Text className="mt-3 text-base text-muted-foreground">Loading certificates...</Text>
      </View>
    );
  }

  // Show error screen only if no cached data available
  if (error && certificates.length === 0) {
    return renderError();
  }

  return (
    <View className="flex-1 bg-background">
      {/* Offline Indicator - FR-012 */}
      <OfflineIndicator dataUpdatedAt={dataUpdatedAt} />

      <FlatList
        data={certificates}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <CertificateCard
            certificate={item}
            onPress={onCertificatePress}
            onDownload={handleDownload}
          />
        )}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={{ padding: 16 }}
        refreshing={isRefetching && !isLoading}
        onRefresh={() => refetch()}
      />
    </View>
  );
}
