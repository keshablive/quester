/**
 * Feature Discovery Analytics
 * Feature 003, T047A: Track feature discovery metrics for SC-002
 *
 * Success Criteria: 40% increase in feature discovery
 * Tracks: Carousel views, feature card taps, conversion to feature usage
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface FeatureDiscoveryAnalytics {
  // SC-002 Metrics
  carouselViews: number;
  featureCardTaps: Record<string, number>;
  featureConversions: Record<string, number>;
  lastUpdated: number;

  // Additional metrics
  averageViewTime: number;
  scrollDepth: number;
  bounceRate: number;
}

const STORAGE_KEY = '@feature_discovery_analytics';
const BASELINE_DISCOVERY_RATE = 0.25; // 25% baseline
const TARGET_DISCOVERY_RATE = 0.35; // 35% target (40% increase)

/**
 * Initialize or load analytics data
 */
export async function loadAnalytics(): Promise<FeatureDiscoveryAnalytics> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Failed to load feature discovery analytics:', error);
  }

  return {
    carouselViews: 0,
    featureCardTaps: {},
    featureConversions: {},
    lastUpdated: Date.now(),
    averageViewTime: 0,
    scrollDepth: 0,
    bounceRate: 0,
  };
}

/**
 * Save analytics data
 */
export async function saveAnalytics(data: FeatureDiscoveryAnalytics): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save feature discovery analytics:', error);
  }
}

/**
 * Track carousel view (SC-002)
 */
export async function trackCarouselView(): Promise<void> {
  const analytics = await loadAnalytics();
  analytics.carouselViews += 1;
  analytics.lastUpdated = Date.now();
  await saveAnalytics(analytics);
}

/**
 * Track feature card tap (SC-002)
 */
export async function trackFeatureCardTap(featureType: string): Promise<void> {
  const analytics = await loadAnalytics();
  analytics.featureCardTaps[featureType] = (analytics.featureCardTaps[featureType] || 0) + 1;
  analytics.lastUpdated = Date.now();
  await saveAnalytics(analytics);
}

/**
 * Track feature conversion (user navigated to feature) (SC-002)
 */
export async function trackFeatureConversion(featureType: string): Promise<void> {
  const analytics = await loadAnalytics();
  analytics.featureConversions[featureType] = (analytics.featureConversions[featureType] || 0) + 1;
  analytics.lastUpdated = Date.now();
  await saveAnalytics(analytics);
}

/**
 * Track carousel view time
 */
export async function trackViewTime(durationMs: number): Promise<void> {
  const analytics = await loadAnalytics();
  
  // Calculate running average
  const currentTotal = analytics.averageViewTime * analytics.carouselViews;
  const newTotal = currentTotal + durationMs;
  analytics.averageViewTime = newTotal / (analytics.carouselViews + 1);
  
  await saveAnalytics(analytics);
}

/**
 * Track scroll depth (how far user scrolled in carousel)
 */
export async function trackScrollDepth(depth: number): Promise<void> {
  const analytics = await loadAnalytics();
  analytics.scrollDepth = Math.max(analytics.scrollDepth, depth);
  await saveAnalytics(analytics);
}

/**
 * Calculate feature discovery rate (SC-002)
 */
export async function calculateDiscoveryRate(): Promise<number> {
  const analytics = await loadAnalytics();
  
  const totalTaps = Object.values(analytics.featureCardTaps).reduce((sum, count) => sum + count, 0);
  const totalConversions = Object.values(analytics.featureConversions).reduce((sum, count) => sum + count, 0);
  
  if (totalTaps === 0) return 0;
  
  return totalConversions / totalTaps;
}

/**
 * Check if SC-002 target is met (40% increase in feature discovery)
 */
export async function isTargetMet(): Promise<boolean> {
  const currentRate = await calculateDiscoveryRate();
  return currentRate >= TARGET_DISCOVERY_RATE;
}

/**
 * Get progress towards SC-002 target
 */
export async function getProgress(): Promise<{
  current: number;
  target: number;
  baseline: number;
  percentage: number;
  isTargetMet: boolean;
}> {
  const currentRate = await calculateDiscoveryRate();
  const percentage = (currentRate / TARGET_DISCOVERY_RATE) * 100;
  
  return {
    current: currentRate,
    target: TARGET_DISCOVERY_RATE,
    baseline: BASELINE_DISCOVERY_RATE,
    percentage: Math.min(percentage, 100),
    isTargetMet: currentRate >= TARGET_DISCOVERY_RATE,
  };
}

/**
 * Get analytics summary for reporting
 */
export async function getAnalyticsSummary(): Promise<{
  carouselViews: number;
  totalTaps: number;
  totalConversions: number;
  conversionRate: number;
  topFeatures: Array<{ feature: string; taps: number; conversions: number }>;
  averageViewTime: number;
  scrollDepth: number;
}> {
  const analytics = await loadAnalytics();
  
  const totalTaps = Object.values(analytics.featureCardTaps).reduce((sum, count) => sum + count, 0);
  const totalConversions = Object.values(analytics.featureConversions).reduce((sum, count) => sum + count, 0);
  const conversionRate = totalTaps > 0 ? totalConversions / totalTaps : 0;
  
  // Get top features by taps
  const topFeatures = Object.entries(analytics.featureCardTaps)
    .map(([feature, taps]) => ({
      feature,
      taps,
      conversions: analytics.featureConversions[feature] || 0,
    }))
    .sort((a, b) => b.taps - a.taps)
    .slice(0, 5);
  
  return {
    carouselViews: analytics.carouselViews,
    totalTaps,
    totalConversions,
    conversionRate,
    topFeatures,
    averageViewTime: analytics.averageViewTime,
    scrollDepth: analytics.scrollDepth,
  };
}

/**
 * Clear analytics data
 */
export async function clearAnalytics(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear feature discovery analytics:', error);
  }
}

/**
 * Export analytics data for reporting
 */
export async function exportAnalytics(): Promise<string> {
  const analytics = await loadAnalytics();
  const summary = await getAnalyticsSummary();
  const progress = await getProgress();
  
  return JSON.stringify({
    analytics,
    summary,
    progress,
    exportedAt: Date.now(),
  }, null, 2);
}
