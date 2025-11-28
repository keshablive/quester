import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AdminDashboard } from '@/components/pages/admin';

export default function AdminScreen() {
  return (
    <View style={styles.container}>
      <AdminDashboard />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
