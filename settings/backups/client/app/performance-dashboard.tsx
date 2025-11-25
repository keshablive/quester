/**
 * Performance Dashboard Screen
 *
 * Developer tool accessible from settings for monitoring app performance.
 * Shows aggregated metrics, per-screen performance, and export functionality.
 *
 * Phase 5, T130: Create performance dashboard view in developer menu
 *
 * @module performance-dashboard-screen
 */

import React from 'react';
import { Stack } from 'expo-router';
import { PerformanceDashboard } from '@/components/developer/performance-dashboard';
import { ScreenWrapper } from '@/components/screen-wrapper';

export default function PerformanceDashboardScreen() {
  return (
    <>
      <Stack.Screen
        options={{
          title: 'Performance Dashboard',
          headerLargeTitle: false,
        }}
      />
      <ScreenWrapper screenName="PerformanceDashboardScreen">
        <PerformanceDashboard />
      </ScreenWrapper>
    </>
  );
}
