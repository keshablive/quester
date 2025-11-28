import React, { useState, useEffect } from 'react';
import { View, FlatList, ActivityIndicator, Pressable } from 'react-native';
import { Text } from '@/components/ui';
import { CertificateCard } from './CertificateCard';
import { certificatesService, Certificate } from '@/core';
import { Award } from 'lucide-react-native';

import { CertificateListProps } from './certificate.types';

export function CertificateList({ onCertificatePress }: CertificateListProps) {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCertificates();
  }, []);

  const loadCertificates = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await certificatesService.getMyCertificates();
      setCertificates(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load certificates');
    } finally {
      setLoading(false);
    }
  };

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
      <View className="flex-row items-center bg-card p-5 rounded-xl shadow-sm">
        <Award size={32} className="text-amber-500" />
        <View className="ml-4">
          <Text className="text-2xl font-bold text-foreground">My Certificates</Text>
          <Text className="text-sm text-muted-foreground mt-0.5">{certificates.length} earned</Text>
        </View>
      </View>
    </View>
  );

  const renderEmpty = () => (
    <View className="py-12 items-center">
      <Award size={64} className="text-muted-foreground/30" />
      <Text className="text-lg font-semibold text-foreground mt-4 mb-2">No certificates yet</Text>
      <Text className="text-sm text-muted-foreground">Complete courses to earn certificates</Text>
    </View>
  );

  const renderError = () => (
    <View className="flex-1 justify-center items-center bg-background p-6">
      <Text className="text-base text-destructive text-center mb-4">{error}</Text>
      <Pressable className="bg-primary px-6 py-3 rounded-lg" onPress={loadCertificates}>
        <Text className="text-base font-semibold text-primary-foreground">Retry</Text>
      </Pressable>
    </View>
  );

  if (loading && certificates.length === 0) {
    return (
      <View className="flex-1 justify-center items-center bg-background">
        <ActivityIndicator size="large" className="text-primary" />
        <Text className="mt-3 text-base text-muted-foreground">Loading certificates...</Text>
      </View>
    );
  }

  if (error && certificates.length === 0) {
    return renderError();
  }

  return (
    <View className="flex-1 bg-background">
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
        refreshing={loading}
        onRefresh={loadCertificates}
      />
    </View>
  );
}
