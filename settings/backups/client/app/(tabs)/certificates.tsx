import React, { useState } from 'react';
import { View, ScrollView, RefreshControl, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { CertificateCard, CertificatesEmpty } from '@/components/lms/certificate-view';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScreenWrapper } from '@/components/screen-wrapper';
import SuggestedContent from '@/components/workflow/suggested-content';
import { GamificationHeader } from '@/components/gamification/gamification-header';

// Types
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

// API Base URL
const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080/api/v1';

// Helper function to get auth token
const getAuthToken = async (): Promise<string | null> => {
  // TODO: Implement token retrieval from secure storage
  return null;
};

// API function to fetch user certificates
async function getUserCertificates(): Promise<Certificate[]> {
  const token = await getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}/certificates`, {
    headers,
  });

  if (!response.ok) {
    throw new Error('Failed to fetch certificates');
  }

  const data = await response.json();
  return data.certificates;
}

export default function MyCertificatesScreen() {
  const [refreshing, setRefreshing] = useState(false);

  // Fetch certificates
  const {
    data: certificates,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['certificates', 'user'],
    queryFn: getUserCertificates,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleCertificatePress = (certificateId: string) => {
    router.push(`/certificates/${certificateId}` as any);
  };

  // Sort certificates by issue date (newest first)
  const sortedCertificates = certificates
    ? [...certificates].sort(
        (a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime()
      )
    : [];

  return (
    <ScreenWrapper screenName="MyCertificatesScreen">
      <View className="flex-1 bg-background">
        {/* Gamification Header */}
        <View style={suggestedStyles.gamificationHeaderContainer}>
          <GamificationHeader compact />
        </View>

        {/* Header */}
        <View className="border-b border-border bg-card px-6 pb-4 pt-12">
          <Text className="mb-2 text-3xl font-bold text-foreground">My Certificates</Text>
          <Text className="text-sm text-muted-foreground">
            Your earned certificates and achievements
          </Text>
        </View>

        <ScrollView
          className="flex-1"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}>
          <View className="p-6">
            {/* Loading State */}
            {isLoading && !certificates && (
              <View className="py-12">
                <Text className="text-center text-muted-foreground">Loading certificates...</Text>
              </View>
            )}

            {/* Error State */}
            {error && (
              <View className="px-6 py-12">
                <Text className="mb-4 text-center text-destructive">
                  Failed to load certificates
                </Text>
                <Button onPress={() => refetch()} variant="default" className="mx-auto">
                  <Text>Try Again</Text>
                </Button>
              </View>
            )}

            {/* Empty State */}
            {!isLoading && !error && sortedCertificates.length === 0 && <CertificatesEmpty />}

            {/* Certificates List */}
            {!isLoading && !error && sortedCertificates.length > 0 && (
              <>
                {/* Stats Summary */}
                <Card className="mb-6">
                  <CardContent className="p-6">
                    <View className="mb-4 flex-row items-center justify-between">
                      <Text className="text-lg font-bold text-foreground">Your Achievement</Text>
                      <Text className="text-4xl">🏆</Text>
                    </View>
                    <View className="flex-row justify-around">
                      <View className="items-center">
                        <Text className="mb-1 text-3xl font-bold text-blue-600">
                          {sortedCertificates.length}
                        </Text>
                        <Text className="text-sm text-muted-foreground">
                          {sortedCertificates.length === 1 ? 'Certificate' : 'Certificates'}
                        </Text>
                      </View>
                      <View className="items-center">
                        <Text className="mb-1 text-3xl font-bold text-green-600">
                          {Math.round(
                            sortedCertificates.reduce((sum, cert) => sum + cert.grade, 0) /
                              sortedCertificates.length
                          )}
                          %
                        </Text>
                        <Text className="text-sm text-muted-foreground">Avg. Grade</Text>
                      </View>
                      <View className="items-center">
                        <Text className="mb-1 text-3xl font-bold text-purple-600">
                          {
                            new Set(sortedCertificates.map((cert) => cert.course.instructorName))
                              .size
                          }
                        </Text>
                        <Text className="text-sm text-muted-foreground">Instructors</Text>
                      </View>
                    </View>
                  </CardContent>
                </Card>

                {/* Filter by Difficulty */}
                <View className="mb-4 flex-row items-center justify-between">
                  <Text className="text-lg font-bold text-foreground">
                    All Certificates ({sortedCertificates.length})
                  </Text>
                </View>

                {/* Certificates List */}
                {sortedCertificates.map((certificate) => (
                  <CertificateCard
                    key={certificate.id}
                    certificate={certificate}
                    onPress={() => handleCertificatePress(certificate.id)}
                  />
                ))}

                {/* T085.4: Suggested Content for Certificates Browsing */}
                <View style={suggestedStyles.section}>
                  <Text className="mb-3 text-lg font-semibold text-foreground">
                    Continue Your Learning Journey
                  </Text>
                  <SuggestedContent
                    currentFeature="certificates"
                    context="browsing"
                    contextData={{
                      certificateCount: sortedCertificates.length,
                      averageGrade:
                        Math.round(
                          sortedCertificates.reduce((sum, cert) => sum + cert.grade, 0) /
                            sortedCertificates.length
                        ) || 0,
                      difficulties: Array.from(
                        new Set(sortedCertificates.map((c) => c.course.difficulty))
                      ),
                    }}
                    onSuggestionPress={(suggestion: any) => {
                      if (suggestion.route) router.push(suggestion.route);
                    }}
                    layout="list"
                    maxSuggestions={3}
                  />
                </View>
              </>
            )}
          </View>
        </ScrollView>
      </View>
    </ScreenWrapper>
  );
}

const suggestedStyles = StyleSheet.create({
  gamificationHeaderContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
    backgroundColor: '#fff',
  },
  section: {
    marginTop: 24,
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#2d3748',
    borderRadius: 8,
  },
});
