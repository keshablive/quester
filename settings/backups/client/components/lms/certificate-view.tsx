import React, { useState } from 'react';
import { View, Image, Pressable, ScrollView, Share, Alert } from 'react-native';
import { Text } from '@/components/ui/text';
import * as Clipboard from 'expo-clipboard';

interface Certificate {
  id: string;
  verificationCode: string;
  issuedAt: string;
  grade: number;
  pdfUrl?: string;
  course: {
    title: string;
    difficulty: string;
    instructorName: string;
  };
  user: {
    name: string;
  };
}

interface CertificateViewProps {
  certificate: Certificate;
  onDownload?: () => void;
  onShare?: () => void;
}

export function CertificateView({ certificate, onDownload, onShare }: CertificateViewProps) {
  const [showQRCode, setShowQRCode] = useState(false);

  const verificationUrl = `https://quester.app/verify/${certificate.verificationCode}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(verificationUrl)}`;

  const handleCopyCode = async () => {
    await Clipboard.setStringAsync(certificate.verificationCode);
    Alert.alert('Copied!', 'Verification code copied to clipboard');
  };

  const handleCopyUrl = async () => {
    await Clipboard.setStringAsync(verificationUrl);
    Alert.alert('Copied!', 'Verification URL copied to clipboard');
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `I've completed "${certificate.course.title}" with a grade of ${certificate.grade}%! 🎉\n\nVerify my certificate: ${verificationUrl}`,
        url: certificate.pdfUrl,
      });
      onShare?.();
    } catch (error) {
      console.error('Error sharing certificate:', error);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'beginner':
        return 'text-green-700 bg-green-100';
      case 'intermediate':
        return 'text-yellow-700 bg-yellow-100';
      case 'advanced':
        return 'text-red-700 bg-red-100';
      default:
        return 'text-gray-700 bg-gray-100';
    }
  };

  const getGradeColor = (grade: number) => {
    if (grade >= 90) return 'text-green-700';
    if (grade >= 80) return 'text-blue-700';
    if (grade >= 70) return 'text-yellow-700';
    return 'text-orange-700';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="p-6">
        {/* Certificate Card */}
        <View className="mb-6 overflow-hidden rounded-xl bg-white shadow-lg">
          {/* Header */}
          <View className="bg-gradient-to-r from-blue-500 to-blue-600 p-6">
            <Text variant="h1" className="mb-2 text-center text-white">
              🏆 Certificate of Completion
            </Text>
            <Text variant="small" className="text-center text-blue-100">
              Issued on {formatDate(certificate.issuedAt)}
            </Text>
          </View>

          {/* Certificate Content */}
          <View className="p-6">
            {/* Recipient */}
            <View className="mb-6 text-center">
              <Text variant="small" className="mb-2 text-gray-600">
                This certifies that
              </Text>
              <Text className="mb-1 text-3xl font-bold text-gray-900">{certificate.user.name}</Text>
              <View className="mx-auto h-1 w-32 rounded-full bg-blue-500" />
            </View>

            {/* Course Details */}
            <View className="mb-6">
              <Text variant="small" className="mb-2 text-center text-gray-600">
                has successfully completed
              </Text>
              <Text variant="h2" className="mb-3 text-center text-gray-900">
                {certificate.course.title}
              </Text>

              <View className="mb-3 flex-row items-center justify-center gap-3">
                <View
                  className={`rounded-full px-3 py-1 ${getDifficultyColor(certificate.course.difficulty)}`}>
                  <Text variant="small" className="font-semibold">
                    {certificate.course.difficulty.toUpperCase()}
                  </Text>
                </View>
                <View className="rounded-full bg-blue-100 px-3 py-1">
                  <Text variant="small" className="font-semibold text-blue-700">
                    Grade: {certificate.grade}%
                  </Text>
                </View>
              </View>

              <Text variant="small" className="text-center text-gray-600">
                Instructed by {certificate.course.instructorName}
              </Text>
            </View>

            {/* Grade Display */}
            <View className="mb-6 rounded-lg bg-gray-50 p-4">
              <View className="flex-row items-center justify-between">
                <Text variant="small" className="font-semibold text-gray-700">
                  Final Grade
                </Text>
                <Text className={`text-3xl font-bold ${getGradeColor(certificate.grade)}`}>
                  {certificate.grade}%
                </Text>
              </View>
              {certificate.grade >= 90 && (
                <Text variant="small" className="mt-2 text-center text-green-600">
                  🌟 Outstanding Performance!
                </Text>
              )}
            </View>

            {/* Verification Code */}
            <View className="border-t border-gray-200 pt-4">
              <Text variant="small" className="mb-2 text-center text-gray-600">
                Verification Code
              </Text>
              <View className="mb-2 rounded-lg bg-gray-100 p-3">
                <Text variant="code" className="text-center tracking-wider text-gray-900">
                  {certificate.verificationCode}
                </Text>
              </View>
              <Pressable
                onPress={handleCopyCode}
                className="rounded-lg bg-blue-50 px-4 py-2 active:opacity-70">
                <Text variant="small" className="text-center font-semibold text-blue-600">
                  📋 Copy Code
                </Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* QR Code Section */}
        <View className="mb-6 rounded-xl bg-white p-6 shadow-md">
          <Pressable
            onPress={() => setShowQRCode(!showQRCode)}
            className="flex-row items-center justify-between">
            <View>
              <Text variant="h3" className="mb-1 text-gray-900">
                QR Code Verification
              </Text>
              <Text variant="small" className="text-gray-600">
                Scan to verify certificate
              </Text>
            </View>
            <Text className="text-2xl">{showQRCode ? '▼' : '▶'}</Text>
          </Pressable>

          {showQRCode && (
            <View className="mt-4 items-center">
              <Image source={{ uri: qrCodeUrl }} className="mb-4 h-48 w-48" resizeMode="contain" />
              <Text variant="small" className="mb-3 text-center text-gray-600">
                {verificationUrl}
              </Text>
              <Pressable
                onPress={handleCopyUrl}
                className="rounded-lg bg-blue-50 px-4 py-2 active:opacity-70">
                <Text variant="small" className="font-semibold text-blue-600">
                  📋 Copy Verification URL
                </Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View className="gap-3">
          {certificate.pdfUrl && (
            <Pressable
              onPress={onDownload}
              className="flex-row items-center justify-center rounded-xl bg-blue-500 px-6 py-4 shadow-md active:opacity-80">
              <Text className="mr-2 text-lg">📥</Text>
              <Text variant="h3" className="text-white">
                Download PDF
              </Text>
            </Pressable>
          )}

          <Pressable
            onPress={handleShare}
            className="flex-row items-center justify-center rounded-xl bg-green-500 px-6 py-4 shadow-md active:opacity-80">
            <Text className="mr-2 text-lg">📤</Text>
            <Text variant="h3" className="text-white">
              Share Certificate
            </Text>
          </Pressable>
        </View>

        {/* Footer Info */}
        <View className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
          <Text variant="small" className="text-center leading-5 text-blue-700">
            💡 This certificate is publicly verifiable using the verification code or QR code.
            Anyone can verify its authenticity at quester.app/verify
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

// Certificate Card for List View
export function CertificateCard({
  certificate,
  onPress,
}: {
  certificate: Certificate;
  onPress: () => void;
}) {
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'beginner':
        return 'bg-green-100 text-green-700';
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-700';
      case 'advanced':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <Pressable
      onPress={onPress}
      className="mb-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm active:opacity-70">
      <View className="mb-3 flex-row items-start">
        <View className="mr-3 h-12 w-12 items-center justify-center rounded-full bg-blue-100">
          <Text className="text-2xl">🏆</Text>
        </View>
        <View className="flex-1">
          <Text variant="h4" className="mb-1 text-gray-900" numberOfLines={2}>
            {certificate.course.title}
          </Text>
          <Text variant="small" className="text-gray-600">
            Issued {formatDate(certificate.issuedAt)}
          </Text>
        </View>
      </View>

      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <View
            className={`rounded px-2 py-1 ${getDifficultyColor(certificate.course.difficulty)}`}>
            <Text variant="small" className="font-semibold">
              {certificate.course.difficulty}
            </Text>
          </View>
          <View className="rounded bg-blue-100 px-2 py-1">
            <Text variant="small" className="font-semibold text-blue-700">
              Grade: {certificate.grade}%
            </Text>
          </View>
        </View>
        <Text className="text-gray-400">→</Text>
      </View>
    </Pressable>
  );
}

// Empty State
export function CertificatesEmpty() {
  return (
    <View className="items-center justify-center py-12">
      <Text className="mb-4 text-6xl">🏆</Text>
      <Text variant="h2" className="mb-2 text-gray-900">
        No Certificates Yet
      </Text>
      <Text variant="small" className="px-6 text-center text-gray-600">
        Complete courses with a grade of 70% or higher to earn certificates
      </Text>
    </View>
  );
}
