import React, { lazy, Suspense } from 'react';
import { View, StyleSheet } from 'react-native';
import { ChunkErrorBoundary, PageLoadingFallback } from '@/core';

// US3: Code split the AdminDashboard component for faster app launch
const AdminDashboard = lazy(() =>
  import('@/components/features/admin').then((module) => ({
    default: module.AdminDashboard,
  }))
);

export default function AdminScreen() {
  return (
    <View style={styles.container}>
      <ChunkErrorBoundary
        maxRetries={3}
        onError={(error) => console.error('Admin chunk load failed:', error)}>
        <Suspense fallback={<PageLoadingFallback message="Loading admin dashboard..." />}>
          <AdminDashboard />
        </Suspense>
      </ChunkErrorBoundary>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
