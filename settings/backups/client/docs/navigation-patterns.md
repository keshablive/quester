# Navigation Patterns - Quester Platform

**Version**: 1.0  
**Last Updated**: November 13, 2025  
**Status**: Production Ready

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Components](#components)
4. [Hooks & Utilities](#hooks--utilities)
5. [Usage Examples](#usage-examples)
6. [Accessibility Guidelines](#accessibility-guidelines)
7. [Analytics Integration](#analytics-integration)
8. [Performance Best Practices](#performance-best-practices)
9. [Testing Patterns](#testing-patterns)
10. [Troubleshooting](#troubleshooting)

---

## Overview

The Quester navigation system provides unified feature discovery and cross-platform navigation with built-in analytics, accessibility, and performance optimization.

### Key Features

- **Feature Discovery Carousel**: Dynamic featured content with analytics tracking
- **Bottom Tab Navigation**: Badge notifications with auto-clear functionality
- **Quick Actions Menu**: Context-aware shortcuts for common tasks
- **Global Search**: Multi-feature search with recent history
- **Cross-Feature Actions**: Deep links between related features
- **Notification Badges**: Real-time count updates with 99+ overflow
- **SC-002 Tracking**: 40% feature discovery increase measurement

### Success Criteria

**SC-002: Feature Discovery Enhancement**
- **Baseline**: 25% discovery rate
- **Target**: 35% discovery rate (40% increase)
- **Tracking**: Carousel views, feature taps, conversions

---

## Architecture

### NavigationContext Pattern

Global navigation state management using React Context:

```typescript
interface NavigationState {
  notifications: Record<FeatureType, number>;
  currentFeature: FeatureType | null;
  previousFeature: FeatureType | null;
  navigationHistory: Array<{ feature: FeatureType; timestamp: number }>;
  featureVisitCounts: Record<FeatureType, number>;
}
```

### Data Flow

```
User Action → Component → Hook → Analytics → Storage
                ↓
            Navigation
```

1. **User Interaction**: Tap feature card, bottom tab, or quick action
2. **Component Handler**: Processes event, calls hooks
3. **Hook Updates**: Tracks metrics, updates state
4. **Analytics Recording**: Logs event to AsyncStorage
5. **Navigation**: Routes to destination screen

### File Structure

```
client/
├── components/navigation/
│   ├── bottom-tab-bar.tsx           # Tab navigation with badges
│   ├── feature-discovery-carousel.tsx # Featured content carousel
│   ├── feature-card.tsx              # Individual feature card
│   ├── quick-actions-menu.tsx        # Context-aware shortcuts
│   ├── cross-feature-actions.tsx     # Deep links between features
│   ├── global-search-bar.tsx         # Multi-feature search
│   └── notification-badge.tsx        # Badge component
├── lib/hooks/
│   ├── use-navigation.ts             # NavigationContext hook
│   └── use-feature-discovery.ts      # Feature carousel hook
├── lib/utils/
│   ├── analytics.ts                  # General navigation analytics
│   └── feature-discovery-analytics.ts # SC-002 specific tracking
└── docs/
    └── navigation-patterns.md         # This document
```

---

## Components

### BottomTabBar

Bottom tab navigation with notification badges and auto-clear functionality.

**Props**:
```typescript
interface BottomTabBarProps {
  tabs: Array<{ name: string; label: string; icon: string }>;
  activeTab: string;
  onTabPress: (tabName: string) => void;
}
```

**Features**:
- Dynamic notification badges (99+ overflow)
- Active tab highlighting
- Auto-clear notifications on press
- Feature navigation tracking
- Platform-specific touch targets (44pt iOS, 48dp Android)
- Full accessibility support

**Example**:
```tsx
import { BottomTabBar } from '@/components/navigation/bottom-tab-bar';

const tabs = [
  { name: 'home', label: 'Home', icon: 'home' },
  { name: 'quests', label: 'Quests', icon: 'target' },
  { name: 'courses', label: 'Courses', icon: 'book-open' },
  { name: 'marketplace', label: 'Marketplace', icon: 'shopping-bag' },
  { name: 'profile', label: 'Profile', icon: 'user' }
];

<BottomTabBar 
  tabs={tabs} 
  activeTab="home" 
  onTabPress={(tab) => router.push(`/(tabs)/${tab}`)} 
/>
```

### FeatureDiscoveryCarousel

Horizontal scrolling carousel for featured content with analytics.

**Props**:
```typescript
interface FeatureDiscoveryCarouselProps {
  features: FeatureCardData[];
  onFeaturePress: (feature: FeatureCardData) => void;
}
```

**Features**:
- Horizontal scrolling with snap-to-card
- Loading skeleton states
- Empty state handling
- Automatic view tracking
- Scroll depth measurement

**Example**:
```tsx
import { FeatureDiscoveryCarousel } from '@/components/navigation/feature-discovery-carousel';

<FeatureDiscoveryCarousel 
  features={features} 
  onFeaturePress={handleFeaturePress} 
/>
```

### FeatureCard

Individual feature card with icon, title, description, and action button.

**Props**:
```typescript
interface FeatureCardData {
  id: string;
  type: 'quest' | 'course' | 'marketplace' | 'property' | 'video' | 'live';
  title: string;
  description: string;
  icon: string;
  actionLabel: string;
}
```

**Features**:
- Icon integration (Lucide)
- Tap to navigate
- Visual feedback (pressed state)
- Accessibility labels and hints

**Example**:
```tsx
<FeatureCard 
  data={featureData} 
  onPress={handlePress}
  testID="feature-card-quest-1"
/>
```

### QuickActionsMenu

Context-aware quick action buttons for common tasks.

**Props**:
```typescript
interface QuickActionsMenuProps {
  context?: 'home' | 'quest' | 'course' | 'marketplace';
  onActionPress: (actionId: string) => void;
}
```

**Features**:
- Context-aware action suggestions
- Icon + label layout
- Quick access to frequent tasks
- Analytics tracking per action

### GlobalSearchBar

Multi-feature search with recent search history.

**Props**:
```typescript
interface GlobalSearchBarProps {
  placeholder?: string;
  onSearch: (query: string) => void;
  onFocus?: () => void;
}
```

**Features**:
- Real-time search
- Recent search history (max 10)
- Clear button
- Search result count tracking
- Multi-feature filtering

### NotificationBadge

Badge component for displaying notification counts.

**Props**:
```typescript
interface NotificationBadgeProps {
  count: number;
  maxCount?: number; // Default: 99
  size?: 'small' | 'medium' | 'large';
}
```

**Features**:
- Overflow handling (99+)
- Size variants
- Auto-hide when count is 0
- Accessible count announcement

---

## Hooks & Utilities

### useNavigation

Access navigation state and update notification counts.

**API**:
```typescript
const {
  notifications,           // Record<FeatureType, number>
  currentFeature,          // FeatureType | null
  previousFeature,         // FeatureType | null
  navigationHistory,       // Array<{ feature, timestamp }>
  featureVisitCounts,      // Record<FeatureType, number>
  updateNotificationCount, // (feature, count) => void
  clearNotificationCount,  // (feature) => void
  trackFeature,            // (feature) => void
} = useNavigation();
```

**Example**:
```tsx
import { useNavigation } from '@/lib/hooks/use-navigation';

function QuestsScreen() {
  const { notifications, clearNotificationCount } = useNavigation();

  useEffect(() => {
    // Clear badge when viewing quests
    clearNotificationCount('quests');
  }, []);

  return (
    <View>
      <Text>You have {notifications.quests} new quests</Text>
    </View>
  );
}
```

### useFeatureDiscovery

Fetch featured content and track discovery metrics.

**API**:
```typescript
const {
  items,              // FeatureDiscoveryItem[]
  loading,            // boolean
  error,              // string | null
  metrics,            // FeatureDiscoveryMetrics
  trackView,          // () => void
  trackFeatureView,   // (featureId) => void
  trackConversion,    // (featureId) => void
  refresh,            // () => Promise<void>
  clearMetrics,       // () => void
} = useFeatureDiscovery();
```

**Example**:
```tsx
import { useFeatureDiscovery } from '@/lib/hooks/use-feature-discovery';

function HomeScreen() {
  const {
    items,
    loading,
    trackView,
    trackFeatureView,
    trackConversion,
  } = useFeatureDiscovery();

  useEffect(() => {
    trackView(); // Track carousel view
  }, []);

  const handleFeatureTap = (item) => {
    trackFeatureView(item.id);
    trackFeatureCardTap(item.type); // SC-002 analytics
  };

  const handleNavigate = (item) => {
    trackConversion(item.id);
    trackFeatureConversion(item.type); // SC-002 analytics
    router.push(`/${item.type}/${item.id}`);
  };

  return (
    <FeatureDiscoveryCarousel
      items={items}
      loading={loading}
      onFeatureTap={handleFeatureTap}
      onNavigate={handleNavigate}
    />
  );
}
```

---

## Usage Examples

### Complete Home Screen Integration

```tsx
import React, { useEffect, useCallback } from 'react';
import { View, ScrollView, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { FeatureDiscoveryCarousel } from '@/components/navigation/feature-discovery-carousel';
import { useFeatureDiscovery } from '@/lib/hooks/use-feature-discovery';
import {
  trackCarouselView,
  trackFeatureCardTap,
  trackFeatureConversion,
} from '@/lib/utils/feature-discovery-analytics';
import { trackNavigation } from '@/lib/utils/analytics';

export default function HomeScreen() {
  const router = useRouter();
  const {
    items,
    loading,
    error,
    trackView,
    trackFeatureView,
    trackConversion,
    refresh,
  } = useFeatureDiscovery();

  // Track carousel view on mount
  useEffect(() => {
    trackView();
    trackCarouselView();
    trackNavigation('home', 'home-screen');
  }, []);

  // Handle feature press with full analytics
  const handleFeaturePress = useCallback((feature) => {
    // Hook-level tracking
    trackFeatureView(feature.id);

    // SC-002 analytics
    trackFeatureCardTap(feature.type);

    // Route mapping
    const routes = {
      quest: '/quests',
      course: '/courses',
      marketplace: '/marketplace',
      video: '/videos',
    };

    const route = routes[feature.type];
    if (route) {
      // Track conversion
      trackConversion(feature.id);
      trackFeatureConversion(feature.type);

      // Navigate
      trackNavigation('home', route, {
        featureId: feature.id,
        featureType: feature.type,
      });
      router.push(route);
    }
  }, [router]);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    await refresh();
  }, [refresh]);

  return (
    <ScrollView
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={handleRefresh} />
      }>
      {error ? (
        <ErrorView message={error} />
      ) : (
        <FeatureDiscoveryCarousel
          features={items}
          onFeaturePress={handleFeaturePress}
        />
      )}
    </ScrollView>
  );
}
```

### Bottom Tab Navigation Setup

```tsx
// In your _layout.tsx
import { BottomTabBar } from '@/components/navigation/bottom-tab-bar';
import { useNavigation } from '@/lib/hooks/use-navigation';

export default function TabLayout() {
  const router = useRouter();
  const { notifications, trackFeature } = useNavigation();

  const tabs = [
    { name: 'home', label: 'Home', icon: 'home' },
    { name: 'quests', label: 'Quests', icon: 'target' },
    { name: 'courses', label: 'Courses', icon: 'book-open' },
    { name: 'marketplace', label: 'Marketplace', icon: 'shopping-bag' },
    { name: 'profile', label: 'Profile', icon: 'user' },
  ];

  const handleTabPress = (tabName: string) => {
    trackFeature(tabName as FeatureType);
    router.push(`/(tabs)/${tabName}`);
  };

  return (
    <View style={{ flex: 1 }}>
      <Slot />
      <BottomTabBar
        tabs={tabs}
        activeTab={currentTab}
        onTabPress={handleTabPress}
      />
    </View>
  );
}
```

### Global Search Integration

```tsx
import { GlobalSearchBar } from '@/components/navigation/global-search-bar';
import { trackSearch } from '@/lib/utils/analytics';

function SearchScreen() {
  const [results, setResults] = useState([]);

  const handleSearch = async (query: string) => {
    const searchResults = await searchAllFeatures(query);
    setResults(searchResults);

    // Track search event
    await trackSearch(query, searchResults.length, {
      features: searchResults.map(r => r.type),
      timestamp: Date.now(),
    });
  };

  return (
    <View>
      <GlobalSearchBar
        placeholder="Search quests, courses, properties..."
        onSearch={handleSearch}
      />
      <SearchResults results={results} />
    </View>
  );
}
```

---

## Accessibility Guidelines

### WCAG 2.1 AA/AAA Compliance

All navigation components follow WCAG 2.1 Level AA/AAA standards:

#### Required Accessibility Props

```tsx
// ✅ CORRECT: Full accessibility support
<Pressable
  accessibilityRole="button"
  accessibilityLabel="View Quest: Daily Challenge"
  accessibilityHint="Double tap to navigate to quest details"
  accessibilityState={{ disabled: false }}
  accessible={true}>
  <Text>Daily Challenge</Text>
</Pressable>

// ❌ INCORRECT: Missing accessibility props
<Pressable onPress={handlePress}>
  <Text>Daily Challenge</Text>
</Pressable>
```

#### Touch Target Sizes

**Minimum Sizes**:
- iOS: 44pt × 44pt
- Android: 48dp × 48dp

```tsx
const styles = StyleSheet.create({
  touchTarget: {
    minHeight: Platform.select({ ios: 44, android: 48 }),
    minWidth: Platform.select({ ios: 44, android: 48 }),
  },
});
```

#### Screen Reader Support

```tsx
// Tab navigation
<View
  accessibilityRole="tablist"
  accessibilityLabel="Bottom navigation">
  {tabs.map((tab, index) => (
    <Pressable
      key={tab.name}
      accessibilityRole="tab"
      accessibilityLabel={`${tab.label}${notifications[tab.name] > 0 ? `, ${notifications[tab.name]} notifications` : ''}`}
      accessibilityState={{ selected: activeTab === tab.name }}
      accessibilityHint={`Activate to navigate to ${tab.label}`}
    />
  ))}
</View>

// Decorative elements (hidden from screen readers)
<Icon
  name="chevron-right"
  accessibilityElementsHidden={true}
  importantForAccessibility="no"
/>
```

#### Color Contrast

**Minimum Ratios**:
- Normal text: 4.5:1 (WCAG AA)
- Large text (≥18pt/14pt bold): 3:1 (WCAG AA)
- UI components: 3:1 (WCAG AA)

```tsx
const colors = {
  // ✅ CORRECT: 7.0:1 contrast ratio
  primary: '#2563EB',   // Blue
  onPrimary: '#FFFFFF', // White

  // ✅ CORRECT: 4.8:1 contrast ratio
  secondary: '#6B7280', // Gray
  onSecondary: '#FFFFFF',

  // ❌ INCORRECT: 2.1:1 contrast ratio (too low)
  // lightGray: '#E5E7EB',
  // onLightGray: '#FFFFFF',
};
```

#### Reduce Motion

Respect user preference for reduced motion:

```tsx
import { useReducedMotion } from 'react-native-reanimated';

function FeatureCard() {
  const reducedMotion = useReducedMotion();

  return (
    <Animated.View
      style={{
        opacity: reducedMotion ? 1 : fadeAnim,
        transform: reducedMotion ? [] : [{ scale: scaleAnim }],
      }}>
      <FeatureContent />
    </Animated.View>
  );
}
```

---

## Analytics Integration

### Event Tracking

#### Navigation Events

```typescript
import { trackNavigation } from '@/lib/utils/analytics';

// Track screen navigation
await trackNavigation('quests', 'quest-detail', {
  questId: '123',
  source: 'feature-carousel',
  timestamp: Date.now(),
});
```

#### Feature Discovery Events

```typescript
import {
  trackCarouselView,
  trackFeatureCardTap,
  trackFeatureConversion,
} from '@/lib/utils/feature-discovery-analytics';

// Track carousel view
await trackCarouselView();

// Track feature card tap
await trackFeatureCardTap('quest');

// Track conversion (navigation to feature)
await trackFeatureConversion('quest');
```

#### Search Events

```typescript
import { trackSearch } from '@/lib/utils/analytics';

await trackSearch('blockchain courses', 42, {
  filter: 'courses',
  sortBy: 'relevance',
});
```

#### Quick Action Events

```typescript
import { trackQuickAction } from '@/lib/utils/analytics';

await trackQuickAction('create-quest', 'quests', {
  context: 'home-screen',
});
```

### SC-002 Progress Tracking

Monitor 40% feature discovery increase:

```typescript
import {
  getProgress,
  isTargetMet,
  getAnalyticsSummary,
} from '@/lib/utils/feature-discovery-analytics';

// Check progress
const progress = await getProgress();
console.log(progress);
// {
//   current: 0.32,      // 32% discovery rate
//   target: 0.35,       // 35% target (40% increase from 25% baseline)
//   baseline: 0.25,     // 25% baseline
//   percentage: 91.4,   // 91.4% of target achieved
//   isTargetMet: false  // Not yet at target
// }

// Check if target met
const targetMet = await isTargetMet();

// Get full analytics summary
const summary = await getAnalyticsSummary();
console.log(summary);
// {
//   totalCarouselViews: 1250,
//   totalFeatureTaps: 456,
//   totalConversions: 145,
//   discoveryRate: 0.32,
//   topFeatures: [
//     { type: 'quest', taps: 180, conversions: 62, rate: 0.34 },
//     { type: 'course', taps: 156, conversions: 48, rate: 0.31 },
//     // ...
//   ]
// }
```

### Analytics Best Practices

1. **Track Early**: Call tracking functions at component mount or user interaction
2. **Batch Async**: Use `await` for critical tracking, fire-and-forget for non-critical
3. **Include Context**: Add metadata for better analysis
4. **Respect Privacy**: Don't track PII without consent
5. **Storage Limits**: Max 1000 events (auto-cleanup on overflow)

---

## Performance Best Practices

### Component Optimization

#### React.memo

Wrap components that render frequently:

```tsx
// ✅ CORRECT: Memoized for performance
export const BottomTabBar = React.memo<BottomTabBarProps>(({ tabs, activeTab, onTabPress }) => {
  // Component logic
});

// ❌ INCORRECT: Re-renders on every parent update
export const BottomTabBar = ({ tabs, activeTab, onTabPress }) => {
  // Component logic
};
```

#### useCallback

Memoize event handlers passed to child components:

```tsx
// ✅ CORRECT: Stable reference
const handleFeaturePress = useCallback((feature) => {
  trackFeatureView(feature.id);
  router.push(`/${feature.type}`);
}, [router]);

// ❌ INCORRECT: New function on every render
const handleFeaturePress = (feature) => {
  trackFeatureView(feature.id);
  router.push(`/${feature.type}`);
};
```

#### useMemo

Memoize expensive computations:

```tsx
// ✅ CORRECT: Computed once per items change
const sortedFeatures = useMemo(() => {
  return items.sort((a, b) => b.priority - a.priority);
}, [items]);

// ❌ INCORRECT: Computed on every render
const sortedFeatures = items.sort((a, b) => b.priority - a.priority);
```

### FlatList Optimization

```tsx
<FlatList
  data={features}
  renderItem={renderFeatureCard}
  keyExtractor={(item) => item.id}
  
  // Performance optimizations
  getItemLayout={(data, index) => ({
    length: CARD_HEIGHT,
    offset: CARD_HEIGHT * index,
    index,
  })}
  removeClippedSubviews={true}
  windowSize={21}
  maxToRenderPerBatch={10}
  updateCellsBatchingPeriod={50}
  initialNumToRender={5}
/>
```

### Caching Strategy

```tsx
// 30-minute cache for feature discovery data
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

const loadCachedItems = async () => {
  const cached = await AsyncStorage.getItem(CACHE_KEY);
  if (cached) {
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp < CACHE_DURATION) {
      return data;
    }
  }
  return null;
};
```

---

## Testing Patterns

### Component Testing

```tsx
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { BottomTabBar } from '@/components/navigation/bottom-tab-bar';

describe('BottomTabBar', () => {
  it('renders all tabs with labels', () => {
    const tabs = [
      { name: 'home', label: 'Home', icon: 'home' },
      { name: 'quests', label: 'Quests', icon: 'target' },
    ];

    const { getByText } = render(
      <BottomTabBar tabs={tabs} activeTab="home" onTabPress={jest.fn()} />
    );

    expect(getByText('Home')).toBeTruthy();
    expect(getByText('Quests')).toBeTruthy();
  });

  it('calls onTabPress with tab name', () => {
    const onTabPress = jest.fn();
    const { getByText } = render(
      <BottomTabBar tabs={tabs} activeTab="home" onTabPress={onTabPress} />
    );

    fireEvent.press(getByText('Quests'));
    expect(onTabPress).toHaveBeenCalledWith('quests');
  });
});
```

### Accessibility Testing

```tsx
it('has proper accessibility props', () => {
  const { getByLabelText } = render(<BottomTabBar {...props} />);

  const homeTab = getByLabelText(/Home/);
  expect(homeTab).toHaveAccessibilityRole('tab');
  expect(homeTab).toHaveAccessibilityState({ selected: true });
  expect(homeTab).toHaveAccessibilityHint(/navigate to Home/);
});

it('meets minimum touch target size (44pt iOS)', () => {
  const { getByTestId } = render(<BottomTabBar {...props} />);

  const tab = getByTestId('tab-home');
  const style = tab.props.style;

  expect(style.minHeight).toBeGreaterThanOrEqual(44);
  expect(style.minWidth).toBeGreaterThanOrEqual(44);
});
```

### E2E Testing (Detox)

```typescript
describe('Navigation Flow', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  it('navigates between tabs', async () => {
    await element(by.text('Quests')).tap();
    await expect(element(by.id('quests-screen'))).toBeVisible();

    await element(by.text('Courses')).tap();
    await expect(element(by.id('courses-screen'))).toBeVisible();
  });

  it('clears notification badge when tab is pressed', async () => {
    await expect(element(by.id('notification-badge-quests'))).toBeVisible();

    await element(by.text('Quests')).tap();
    await waitFor(element(by.id('notification-badge-quests')))
      .not.toBeVisible()
      .withTimeout(2000);
  });
});
```

---

## Troubleshooting

### Common Issues

#### Issue: Notification badges not updating

**Symptoms**: Badge count doesn't change after clearing notifications

**Solution**: Ensure `clearNotificationCount` is called in screen `useEffect`:

```tsx
useEffect(() => {
  clearNotificationCount('quests');
}, []);
```

#### Issue: Analytics not tracking

**Symptoms**: Events not appearing in storage

**Solution**: Check AsyncStorage permissions and verify tracking calls:

```tsx
// Debug analytics
import { getAnalyticsEvents } from '@/lib/utils/analytics';

const events = await getAnalyticsEvents();
console.log('Analytics events:', events);
```

#### Issue: Feature discovery carousel empty

**Symptoms**: No items displayed in carousel

**Solution**: Check cache and error state:

```tsx
const { items, loading, error, refresh } = useFeatureDiscovery();

useEffect(() => {
  if (error) {
    console.error('Feature discovery error:', error);
  }
  if (items.length === 0 && !loading) {
    refresh(); // Force refresh
  }
}, [items, loading, error]);
```

#### Issue: Navigation context not available

**Symptoms**: `useNavigation` returns undefined

**Solution**: Ensure `NavigationProvider` wraps your app:

```tsx
// In _layout.tsx
import { NavigationProvider } from '@/lib/contexts/NavigationContext';

export default function RootLayout() {
  return (
    <NavigationProvider>
      <Stack />
    </NavigationProvider>
  );
}
```

### Debugging Tips

1. **Enable logging**: Add console.log statements in tracking functions
2. **Check AsyncStorage**: Use React Native Debugger to inspect storage
3. **Verify routes**: Ensure route mappings are correct
4. **Test accessibility**: Use iOS VoiceOver or Android TalkBack
5. **Profile performance**: Use React DevTools Profiler

---

## Appendix

### Route Mapping Reference

```typescript
const ROUTE_MAP: Record<string, string> = {
  // Feature types to routes
  quest: '/(tabs)/quests',
  quests: '/(tabs)/quests',
  course: '/(tabs)/courses',
  courses: '/(tabs)/courses',
  learning: '/(tabs)/courses',
  marketplace: '/marketplace',
  property: '/properties',
  social: '/(tabs)/feed',
  feed: '/(tabs)/feed',
  messages: '/(tabs)/messages',
  messaging: '/(tabs)/messages',
  video: '/(tabs)/videos',
  videos: '/(tabs)/videos',
  live: '/(tabs)/videos',
  profile: '/(tabs)/profile',
  settings: '/settings',
  notifications: '/notifications',
};
```

### Icon Mapping Reference

```typescript
const ICON_MAP: Record<string, string> = {
  quest: 'trophy',
  quests: 'trophy',
  course: 'book',
  courses: 'book',
  learning: 'book-open',
  marketplace: 'shopping-bag',
  property: 'home',
  social: 'heart',
  messages: 'message-square',
  video: 'video',
  live: 'radio',
  profile: 'user',
};
```

### TypeScript Types

```typescript
// Feature types
type FeatureType =
  | 'quest' | 'quests'
  | 'course' | 'courses' | 'learning'
  | 'marketplace' | 'property'
  | 'social' | 'feed'
  | 'messages' | 'messaging'
  | 'video' | 'videos' | 'live'
  | 'profile';

// Analytics event types
type AnalyticsEventType =
  | 'navigation'
  | 'feature_discovery'
  | 'search'
  | 'quick_action';

// Navigation state
interface NavigationState {
  notifications: Record<FeatureType, number>;
  currentFeature: FeatureType | null;
  previousFeature: FeatureType | null;
  navigationHistory: Array<{
    feature: FeatureType;
    timestamp: number;
  }>;
  featureVisitCounts: Record<FeatureType, number>;
}
```

---

**Document Version**: 1.0  
**Last Updated**: November 13, 2025  
**Maintained By**: Quester Platform Team  
**Next Review**: December 13, 2025
