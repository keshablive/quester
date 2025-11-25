/**
 * Analytics Utilities
 * Feature 003, T046: Navigation analytics tracking
 *
 * Tracks user navigation patterns and engagement metrics
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface NavigationEvent {
  type: 'navigation' | 'feature_discovery' | 'search' | 'quick_action';
  feature?: string;
  screen?: string;
  action?: string;
  metadata?: Record<string, any>;
  timestamp: number;
}

export interface AnalyticsSession {
  sessionId: string;
  startTime: number;
  endTime?: number;
  events: NavigationEvent[];
}

const STORAGE_KEY = '@analytics_data';
const SESSION_KEY = '@analytics_session';
const MAX_EVENTS = 1000;

/**
 * Track navigation event
 */
export async function trackNavigation(
  feature: string,
  screen?: string,
  metadata?: Record<string, any>
): Promise<void> {
  const event: NavigationEvent = {
    type: 'navigation',
    feature,
    screen,
    metadata,
    timestamp: Date.now(),
  };

  await addEvent(event);
}

/**
 * Track feature discovery event
 */
export async function trackFeatureDiscovery(
  action: string,
  featureId: string,
  metadata?: Record<string, any>
): Promise<void> {
  const event: NavigationEvent = {
    type: 'feature_discovery',
    action,
    metadata: { ...metadata, featureId },
    timestamp: Date.now(),
  };

  await addEvent(event);
}

/**
 * Track search event
 */
export async function trackSearch(
  query: string,
  resultsCount: number,
  metadata?: Record<string, any>
): Promise<void> {
  const event: NavigationEvent = {
    type: 'search',
    action: 'query',
    metadata: { ...metadata, query, resultsCount },
    timestamp: Date.now(),
  };

  await addEvent(event);
}

/**
 * Track quick action event
 */
export async function trackQuickAction(
  actionId: string,
  feature: string,
  metadata?: Record<string, any>
): Promise<void> {
  const event: NavigationEvent = {
    type: 'quick_action',
    action: actionId,
    feature,
    metadata,
    timestamp: Date.now(),
  };

  await addEvent(event);
}

/**
 * Add event to storage
 */
async function addEvent(event: NavigationEvent): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    const events: NavigationEvent[] = stored ? JSON.parse(stored) : [];

    events.push(event);

    // Keep only last MAX_EVENTS
    if (events.length > MAX_EVENTS) {
      events.splice(0, events.length - MAX_EVENTS);
    }

    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  } catch (error) {
    console.error('Failed to track analytics event:', error);
  }
}

/**
 * Get all analytics events
 */
export async function getAnalyticsEvents(): Promise<NavigationEvent[]> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Failed to get analytics events:', error);
    return [];
  }
}

/**
 * Clear analytics data
 */
export async function clearAnalytics(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
    await AsyncStorage.removeItem(SESSION_KEY);
  } catch (error) {
    console.error('Failed to clear analytics:', error);
  }
}

/**
 * Start analytics session
 */
export async function startSession(): Promise<string> {
  const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const session: AnalyticsSession = {
    sessionId,
    startTime: Date.now(),
    events: [],
  };

  try {
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch (error) {
    console.error('Failed to start session:', error);
  }

  return sessionId;
}

/**
 * End analytics session
 */
export async function endSession(): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(SESSION_KEY);
    if (stored) {
      const session: AnalyticsSession = JSON.parse(stored);
      session.endTime = Date.now();
      await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
    }
  } catch (error) {
    console.error('Failed to end session:', error);
  }
}

/**
 * Get analytics summary
 */
export async function getAnalyticsSummary(): Promise<{
  totalEvents: number;
  navigationEvents: number;
  searchEvents: number;
  featureDiscoveryEvents: number;
  quickActionEvents: number;
  averageSessionDuration: number;
}> {
  const events = await getAnalyticsEvents();

  return {
    totalEvents: events.length,
    navigationEvents: events.filter((e) => e.type === 'navigation').length,
    searchEvents: events.filter((e) => e.type === 'search').length,
    featureDiscoveryEvents: events.filter((e) => e.type === 'feature_discovery').length,
    quickActionEvents: events.filter((e) => e.type === 'quick_action').length,
    averageSessionDuration: 0, // Calculate from session data
  };
}
