import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Certificate } from '@/core';
import { Award, Calendar, Download } from 'lucide-react-native';

import { CertificateCardProps } from './certificate.types';

export function CertificateCard({ certificate, onPress, onDownload }: CertificateCardProps) {
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        pressed && styles.cardPressed,
      ]}
      onPress={() => onPress(certificate)}
    >
      <View style={styles.iconContainer}>
        <Award size={40} color="#F59E0B" />
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>Course Certificate</Text>
        <Text style={styles.courseId}>Course ID: {certificate.courseId}</Text>

        <View style={styles.row}>
          <Calendar size={16} color="#6B7280" />
          <Text style={styles.date}>Issued: {formatDate(certificate.issuedAt)}</Text>
        </View>

        {certificate.expiresAt && (
          <View style={styles.row}>
            <Calendar size={16} color="#EF4444" />
            <Text style={styles.expiryDate}>Expires: {formatDate(certificate.expiresAt)}</Text>
          </View>
        )}

        <View style={styles.codeContainer}>
          <Text style={styles.codeLabel}>Verification Code:</Text>
          <Text style={styles.code}>{certificate.code}</Text>
        </View>
      </View>

      <Pressable
        style={styles.downloadButton}
        onPress={(e) => {
          e.stopPropagation();
          onDownload(certificate);
        }}
      >
        <Download size={20} color="#4F46E5" />
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardPressed: {
    opacity: 0.7,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  courseId: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  date: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 6,
  },
  expiryDate: {
    fontSize: 12,
    color: '#EF4444',
    marginLeft: 6,
  },
  codeContainer: {
    marginTop: 8,
    backgroundColor: '#F3F4F6',
    padding: 8,
    borderRadius: 6,
  },
  codeLabel: {
    fontSize: 10,
    color: '#6B7280',
    marginBottom: 2,
  },
  code: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
    fontFamily: 'monospace',
  },
  downloadButton: {
    padding: 8,
  },
});
