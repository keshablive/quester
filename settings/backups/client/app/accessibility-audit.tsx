/**
 * Accessibility Audit Viewer (Phase 6, T173)
 *
 * Developer tool for viewing accessibility audit results:
 * - Component-level accessibility violations
 * - WCAG compliance status
 * - Missing labels and hints
 * - Color contrast issues
 * - Keyboard navigation problems
 *
 * Accessible via developer menu after enabling developer mode
 */

import React, { useState, useEffect } from 'react';
import { View, ScrollView, RefreshControl, Pressable } from 'react-native';
import { Text } from '@/components/ui/text';
import { Stack, router } from 'expo-router';
import { useDeveloperMode } from '@/lib/contexts/developer-mode-context';
import { ScreenWrapper } from '@/components/screen-wrapper';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Icon } from '@/components/ui/icon';
import {
  CheckCircle,
  AlertCircle,
  XCircle,
  Eye,
  ChevronDown,
  ChevronRight,
} from 'lucide-react-native';

interface A11yIssue {
  id: string;
  severity: 'critical' | 'serious' | 'moderate' | 'minor';
  component: string;
  screen: string;
  rule: string;
  description: string;
  wcagCriteria: string;
  impact: string;
  howToFix: string;
}

export default function AccessibilityAuditScreen() {
  const { state } = useDeveloperMode();
  const [refreshing, setRefreshing] = useState(false);
  const [expandedIssues, setExpandedIssues] = useState<Set<string>>(new Set());
  const [filterSeverity, setFilterSeverity] = useState<string | null>(null);

  // Route guard: redirect if developer mode is disabled
  useEffect(() => {
    if (!state.enabled && !__DEV__) {
      console.warn('[AccessibilityAudit] Developer mode required - redirecting to settings');
      router.replace('/settings');
    }
  }, [state.enabled]);

  if (!state.enabled && !__DEV__) {
    return null;
  }

  const onRefresh = async () => {
    setRefreshing(true);
    // Simulate audit refresh
    await new Promise((resolve) => setTimeout(resolve, 800));
    setRefreshing(false);
  };

  const toggleIssue = (id: string) => {
    const newExpanded = new Set(expandedIssues);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedIssues(newExpanded);
  };

  // Mock accessibility issues (in real implementation, this comes from automated scanning)
  const issues: A11yIssue[] = [
    {
      id: 'a11y-001',
      severity: 'critical',
      component: 'ProfileCard',
      screen: 'Profile',
      rule: 'missing-accessibility-label',
      description: 'Button missing accessibilityLabel',
      wcagCriteria: 'WCAG 2.1 Level A - 4.1.2 Name, Role, Value',
      impact: 'Screen reader users cannot identify button purpose',
      howToFix: 'Add accessibilityLabel="Edit Profile" prop to the button component',
    },
    {
      id: 'a11y-002',
      severity: 'serious',
      component: 'CourseCard',
      screen: 'Courses',
      rule: 'insufficient-color-contrast',
      description: 'Text color contrast ratio is 3.2:1 (minimum 4.5:1 required)',
      wcagCriteria: 'WCAG 2.1 Level AA - 1.4.3 Contrast (Minimum)',
      impact: 'Users with low vision may have difficulty reading text',
      howToFix: 'Change text color from #888888 to #666666 or darker',
    },
    {
      id: 'a11y-003',
      severity: 'moderate',
      component: 'ChatMessage',
      screen: 'Chat',
      rule: 'missing-accessibility-hint',
      description: 'Interactive element missing accessibilityHint',
      wcagCriteria: 'WCAG 2.1 Level A - 2.4.4 Link Purpose',
      impact: 'Screen reader users may not understand what action will occur',
      howToFix: 'Add accessibilityHint="Double tap to view full message" prop',
    },
    {
      id: 'a11y-004',
      severity: 'minor',
      component: 'BadgeIcon',
      screen: 'Profile',
      rule: 'decorative-image-not-hidden',
      description: 'Decorative image not hidden from screen readers',
      wcagCriteria: 'WCAG 2.1 Level A - 1.1.1 Non-text Content',
      impact: 'Screen readers announce unnecessary decorative content',
      howToFix: 'Add accessibilityElementsHidden={true} or accessible={false} to decorative images',
    },
  ];

  const filteredIssues = filterSeverity
    ? issues.filter((issue) => issue.severity === filterSeverity)
    : issues;

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'text-red-600';
      case 'serious':
        return 'text-orange-600';
      case 'moderate':
        return 'text-yellow-600';
      case 'minor':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return XCircle;
      case 'serious':
        return AlertCircle;
      case 'moderate':
        return AlertCircle;
      case 'minor':
        return Eye;
      default:
        return Eye;
    }
  };

  const severityCounts = {
    critical: issues.filter((i) => i.severity === 'critical').length,
    serious: issues.filter((i) => i.severity === 'serious').length,
    moderate: issues.filter((i) => i.severity === 'moderate').length,
    minor: issues.filter((i) => i.severity === 'minor').length,
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Accessibility Audit',
          headerLargeTitle: false,
        }}
      />

      <ScreenWrapper screenName="AccessibilityAuditScreen">
        <ScrollView
          className="flex-1 bg-background"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
          {/* Header */}
          <View className="border-b border-border bg-card px-6 py-4">
            <View className="mb-2 flex-row items-center gap-2">
              <Icon as={Eye} size={24} className="text-foreground" />
              <Text className="text-2xl font-bold text-foreground">Accessibility Audit</Text>
            </View>
            <Text className="text-sm text-muted-foreground">
              WCAG compliance status and accessibility violations
            </Text>
          </View>

          {/* Summary Cards */}
          <View className="flex-row flex-wrap gap-3 p-6">
            <Pressable
              onPress={() => setFilterSeverity(filterSeverity === 'critical' ? null : 'critical')}
              className="min-w-[45%] flex-1">
              <Card className={filterSeverity === 'critical' ? 'border-red-600' : ''}>
                <CardContent className="py-4">
                  <View className="items-center">
                    <Icon as={XCircle} size={32} className="text-red-600" />
                    <Text className="mt-2 text-3xl font-bold text-foreground">
                      {severityCounts.critical}
                    </Text>
                    <Text className="text-sm text-muted-foreground">Critical</Text>
                  </View>
                </CardContent>
              </Card>
            </Pressable>

            <Pressable
              onPress={() => setFilterSeverity(filterSeverity === 'serious' ? null : 'serious')}
              className="min-w-[45%] flex-1">
              <Card className={filterSeverity === 'serious' ? 'border-orange-600' : ''}>
                <CardContent className="py-4">
                  <View className="items-center">
                    <Icon as={AlertCircle} size={32} className="text-orange-600" />
                    <Text className="mt-2 text-3xl font-bold text-foreground">
                      {severityCounts.serious}
                    </Text>
                    <Text className="text-sm text-muted-foreground">Serious</Text>
                  </View>
                </CardContent>
              </Card>
            </Pressable>

            <Pressable
              onPress={() => setFilterSeverity(filterSeverity === 'moderate' ? null : 'moderate')}
              className="min-w-[45%] flex-1">
              <Card className={filterSeverity === 'moderate' ? 'border-yellow-600' : ''}>
                <CardContent className="py-4">
                  <View className="items-center">
                    <Icon as={AlertCircle} size={32} className="text-yellow-600" />
                    <Text className="mt-2 text-3xl font-bold text-foreground">
                      {severityCounts.moderate}
                    </Text>
                    <Text className="text-sm text-muted-foreground">Moderate</Text>
                  </View>
                </CardContent>
              </Card>
            </Pressable>

            <Pressable
              onPress={() => setFilterSeverity(filterSeverity === 'minor' ? null : 'minor')}
              className="min-w-[45%] flex-1">
              <Card className={filterSeverity === 'minor' ? 'border-blue-600' : ''}>
                <CardContent className="py-4">
                  <View className="items-center">
                    <Icon as={Eye} size={32} className="text-blue-600" />
                    <Text className="mt-2 text-3xl font-bold text-foreground">
                      {severityCounts.minor}
                    </Text>
                    <Text className="text-sm text-muted-foreground">Minor</Text>
                  </View>
                </CardContent>
              </Card>
            </Pressable>
          </View>

          {filterSeverity && (
            <View className="px-6">
              <Button variant="outline" onPress={() => setFilterSeverity(null)}>
                <Text>Clear Filter</Text>
              </Button>
            </View>
          )}

          {/* Issues List */}
          <View className="px-6 py-4">
            <Card>
              <CardHeader>
                <CardTitle>Accessibility Issues</CardTitle>
                <CardDescription>
                  {filteredIssues.length} issue{filteredIssues.length !== 1 ? 's' : ''} found
                </CardDescription>
              </CardHeader>
              <CardContent className="gap-4">
                {filteredIssues.map((issue, index) => {
                  const isExpanded = expandedIssues.has(issue.id);
                  return (
                    <View key={issue.id}>
                      <Pressable onPress={() => toggleIssue(issue.id)}>
                        <View className="flex-row items-start gap-3">
                          <Icon
                            as={getSeverityIcon(issue.severity)}
                            size={20}
                            className={getSeverityColor(issue.severity)}
                          />
                          <View className="flex-1">
                            <View className="mb-2 flex-row items-center gap-2">
                              <Badge
                                variant={
                                  issue.severity === 'critical' || issue.severity === 'serious'
                                    ? 'destructive'
                                    : 'secondary'
                                }>
                                <Text className="text-xs font-medium capitalize">
                                  {issue.severity}
                                </Text>
                              </Badge>
                              <Text className="text-xs text-muted-foreground">
                                {issue.screen} › {issue.component}
                              </Text>
                            </View>
                            <Text className="font-semibold text-foreground">
                              {issue.description}
                            </Text>
                            <Text className="mt-1 text-xs text-muted-foreground">
                              Rule: {issue.rule}
                            </Text>
                          </View>
                          <Icon
                            as={isExpanded ? ChevronDown : ChevronRight}
                            size={20}
                            className="text-muted-foreground"
                          />
                        </View>

                        {isExpanded && (
                          <View className="ml-8 mt-3 gap-2">
                            <View>
                              <Text className="text-xs font-semibold text-foreground">
                                WCAG Criteria
                              </Text>
                              <Text className="mt-1 text-xs text-muted-foreground">
                                {issue.wcagCriteria}
                              </Text>
                            </View>
                            <View>
                              <Text className="text-xs font-semibold text-foreground">Impact</Text>
                              <Text className="mt-1 text-xs text-muted-foreground">
                                {issue.impact}
                              </Text>
                            </View>
                            <View>
                              <Text className="text-xs font-semibold text-foreground">
                                How to Fix
                              </Text>
                              <Text className="mt-1 font-mono text-xs text-muted-foreground">
                                {issue.howToFix}
                              </Text>
                            </View>
                          </View>
                        )}
                      </Pressable>
                      {index < filteredIssues.length - 1 && <Separator className="mt-4" />}
                    </View>
                  );
                })}
              </CardContent>
            </Card>
          </View>

          {/* Best Practices */}
          <View className="px-6 pb-8">
            <Card className="bg-muted/30">
              <CardHeader>
                <CardTitle>Accessibility Best Practices</CardTitle>
              </CardHeader>
              <CardContent className="gap-3">
                <View className="flex-row gap-2">
                  <Icon as={CheckCircle} size={20} className="text-green-600" />
                  <Text className="flex-1 text-sm text-muted-foreground">
                    Always provide accessibilityLabel for interactive elements
                  </Text>
                </View>
                <View className="flex-row gap-2">
                  <Icon as={CheckCircle} size={20} className="text-green-600" />
                  <Text className="flex-1 text-sm text-muted-foreground">
                    Maintain minimum 4.5:1 contrast ratio for text (WCAG AA)
                  </Text>
                </View>
                <View className="flex-row gap-2">
                  <Icon as={CheckCircle} size={20} className="text-green-600" />
                  <Text className="flex-1 text-sm text-muted-foreground">
                    Use accessibilityRole to communicate element types to screen readers
                  </Text>
                </View>
                <View className="flex-row gap-2">
                  <Icon as={CheckCircle} size={20} className="text-green-600" />
                  <Text className="flex-1 text-sm text-muted-foreground">
                    Test with VoiceOver (iOS) and TalkBack (Android) screen readers
                  </Text>
                </View>
              </CardContent>
            </Card>
          </View>
        </ScrollView>
      </ScreenWrapper>
    </>
  );
}
