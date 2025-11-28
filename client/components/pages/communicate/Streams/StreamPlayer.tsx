import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Video } from 'lucide-react-native';

import { StreamPlayerProps } from './types';

export function StreamPlayer({ streamKey }: StreamPlayerProps) {
  // In a real app, you would use a video player library like react-native-video
  // or expo-av to display the HLS stream

  return (
    <View style={styles.container}>
      <View style={styles.playerPlaceholder}>
        <Video size={64} color="#9CA3AF" />
        <Text style={styles.placeholderText}>Video Player</Text>
        <Text style={styles.streamKey}>Stream: {streamKey}</Text>
      </View>

      <View style={styles.info}>
        <Text style={styles.infoTitle}>Stream Information</Text>
        <Text style={styles.infoText}>
          This is a placeholder for the video player. In a production app, you would integrate a video player library to display the HLS stream.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  playerPlaceholder: {
    aspectRatio: 16 / 9,
    backgroundColor: '#1F2937',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#9CA3AF',
    marginTop: 16,
  },
  streamKey: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 8,
    fontFamily: 'monospace',
  },
  info: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    flex: 1,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#6B7280',
  },
});
