import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { ScreenWrapper } from '@/components/screen-wrapper';
import QuickActionsMenu from '@/components/navigation/quick-actions-menu';
import SuggestedContent from '@/components/workflow/suggested-content';
import { useWorkflowAnalytics } from '@/lib/utils/workflow-analytics';

export default function CertificateDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [showQuickActions, setShowQuickActions] = useState(true);
  const analytics = useWorkflowAnalytics();

  useEffect(() => {
    // Track certificate view as workflow event
    const workflowId = `cert_view_${id}_${Date.now()}`;
    analytics.startWorkflow(workflowId, 'certificates', id || 'cert-unknown');

    return () => {
      // Track abandonment if user leaves
      analytics.abandonWorkflow();
    };
  }, [id]);

  const handleQuickAction = (action: any) => {
    analytics.trackQuickAction('certificates', action.feature, id || 'cert-unknown', action.id);
    if (action.route) {
      router.push(action.route);
    }
  };

  const handleSuggestionPress = (suggestion: any) => {
    analytics.trackSuggestionClick(
      'certificates',
      suggestion.targetFeature,
      id || 'cert-unknown',
      suggestion.targetId,
      suggestion.type
    );
    if (suggestion.route) {
      router.push(suggestion.route);
    }
  };

  return (
    <ScreenWrapper screenName="CertificateDetail">
      <ScrollView className="flex-1 bg-background p-4">
        <View className="gap-4">
          <Text className="text-2xl font-bold text-foreground">🎓 Certificate Earned!</Text>
          <Text className="text-muted-foreground">Certificate ID: {id}</Text>

          {/* TODO: Implement certificate details fetching and display */}
          <View className="rounded-lg border border-border bg-card p-4">
            <Text className="mb-2 text-foreground">This screen will display:</Text>
            <Text className="text-muted-foreground">• Certificate information</Text>
            <Text className="text-muted-foreground">• Achievement details</Text>
            <Text className="text-muted-foreground">• Download/Share options</Text>
          </View>

          {/* Quick Actions (T083) */}
          {showQuickActions && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text className="text-lg font-semibold text-foreground">What's Next?</Text>
                <Button variant="ghost" onPress={() => setShowQuickActions(false)}>
                  <Text className="text-sm text-primary">Dismiss</Text>
                </Button>
              </View>
              <QuickActionsMenu
                currentFeature="certificates"
                onActionPress={handleQuickAction}
                layout="vertical"
                maxActions={4}
              />
            </View>
          )}

          {/* Suggested Content (T083) */}
          <View style={styles.section}>
            <Text className="mb-3 text-lg font-semibold text-foreground">Recommended for You</Text>
            <SuggestedContent
              currentFeature="certificates"
              context="certificate_earned"
              contextData={{
                certificateId: id,
                achievement: 'course_completion',
              }}
              onSuggestionPress={handleSuggestionPress}
              layout="list"
              maxSuggestions={5}
              groupByCategory
            />
          </View>

          <Button onPress={() => router.back()}>
            <Text>Go Back</Text>
          </Button>
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
});
