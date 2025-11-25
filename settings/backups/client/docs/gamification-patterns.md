# Gamification Patterns Guide

**Last Updated**: November 13, 2025  
**Feature**: 003-ui-ux-optimization  
**Phase 3 - User Story 2**: Gamification System

---

## Overview

This guide documents the gamification system implementation patterns, component usage, hooks, and best practices for integrating XP tracking, level-ups, badges, and leaderboards across the Quester platform.

---

## Table of Contents

1. [Components](#components)
2. [Hooks](#hooks)
3. [Integration Patterns](#integration-patterns)
4. [Real-Time Updates](#real-time-updates)
5. [Performance Optimization](#performance-optimization)
6. [Accessibility Guidelines](#accessibility-guidelines)
7. [Testing Patterns](#testing-patterns)
8. [Examples](#examples)

---

## Components

### XPGainAnimation

Displays an animated XP gain notification when users earn experience points.

**Location**: `@/components/gamification/xp-gain-animation.tsx`

**Props**:
```typescript
interface XPGainAnimationProps {
  amount: number;           // XP amount gained
  source: XPSource;         // Source of XP ('quest_completion', 'course_completion', etc.)
  visible: boolean;         // Control visibility
  onDismiss: () => void;   // Callback when animation completes
}

type XPSource = 
  | 'quest_completion' 
  | 'course_completion' 
  | 'marketplace_purchase' 
  | 'social_interaction' 
  | 'badge_earned';
```

**Usage**:
```tsx
import { XPGainAnimation } from '@/components/gamification/xp-gain-animation';

<XPGainAnimation
  amount={100}
  source="quest_completion"
  visible={showAnimation}
  onDismiss={() => setShowAnimation(false)}
/>
```

**Features**:
- Slide-up animation with fade
- Lottie confetti effects
- Source-specific labels
- Auto-dismisses after 3 seconds
- Accessible with screen reader announcements

---

### LevelUpModal

Celebrates level-ups with confetti and displays unlocked features.

**Location**: `@/components/gamification/level-up-modal.tsx`

**Props**:
```typescript
interface LevelUpModalProps {
  visible: boolean;
  level: number;
  unlockedFeatures: string[];
  onDismiss: () => void;
}
```

**Usage**:
```tsx
import LevelUpModal from '@/components/gamification/level-up-modal';

<LevelUpModal
  visible={showLevelUp}
  level={5}
  unlockedFeatures={['Advanced Quests', 'Premium Marketplace']}
  onDismiss={() => setShowLevelUp(false)}
/>
```

**Features**:
- Full-screen modal overlay
- Confetti animation
- Lists unlocked features
- Dismissible via button or backdrop tap
- WCAG 2.1 Level AA compliant

---

### BadgeUnlockNotification

Toast-style notification for newly earned badges.

**Location**: `@/components/gamification/badge-unlock-notification.tsx`

**Props**:
```typescript
interface BadgeUnlockNotificationProps {
  badge: Badge;
  visible: boolean;
  onDismiss: () => void;
  onShare?: () => void;
}

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}
```

**Usage**:
```tsx
import { BadgeUnlockNotification } from '@/components/gamification/badge-unlock-notification';

<BadgeUnlockNotification
  badge={newBadge}
  visible={showBadge}
  onDismiss={handleDismiss}
  onShare={handleShare}
/>
```

**Features**:
- Rarity-based styling (colors, borders)
- Share to social media option
- Auto-dismiss after 5 seconds
- Swipe-to-dismiss gesture
- Haptic feedback support

---

### GamificationHeader

Compact header showing current level, XP, and progress.

**Location**: `@/components/gamification/gamification-header.tsx`

**Props**:
```typescript
interface GamificationHeaderProps {
  compact?: boolean;
  hideWhenInactive?: boolean;
  onPress?: () => void;
}
```

**Usage**:
```tsx
import { GamificationHeader } from '@/components/gamification/gamification-header';

// Standard mode
<GamificationHeader />

// Compact mode (for list headers)
<GamificationHeader compact />

// With navigation
<GamificationHeader onPress={() => router.push('/gamification')} />
```

**Features**:
- Displays current level and XP
- Progress bar to next level
- New badge indicator (red dot)
- Top 100 rank badge
- Pulse animation on XP changes
- Tap to navigate to dashboard

**Integration Examples**:
```tsx
// Feed screen
<View style={styles.headerContainer}>
  <GamificationHeader compact />
</View>

// Home screen
<GamificationHeader />
```

---

### LeaderboardWidget

Displays top users and current user ranking.

**Location**: `@/components/gamification/leaderboard-widget.tsx`

**Props**:
```typescript
interface LeaderboardWidgetProps {
  data: LeaderboardUser[];
  currentUserId?: string;
  compact?: boolean;
  loading?: boolean;
  error?: boolean;
  onRefresh?: () => void;
  onFilterChange?: (filter: LeaderboardFilter) => void;
  currentFilter?: LeaderboardFilter;
  showFilters?: boolean;
  maxUsers?: number;
  onViewAll?: () => void;
  fetchLeaderboard?: (filter: LeaderboardFilter) => void;
}
```

**Usage**:
```tsx
import { LeaderboardWidget } from '@/components/gamification/leaderboard-widget';

<LeaderboardWidget
  data={leaderboardData}
  currentUserId={userId}
  loading={isLoading}
  onRefresh={handleRefresh}
  showFilters
  maxUsers={10}
/>
```

**Features**:
- Top N users display (default 5, configurable)
- Rank badges: 🥇 Gold (#1), 🥈 Silver (#2), 🥉 Bronze (#3)
- Current user highlighting
- Filter by feature (quests, courses, marketplace, social)
- Pull-to-refresh
- Loading/error/empty states
- Performance optimized with FlatList

---

## Hooks

### useGamificationFeedback

Manages XP tracking, level-up detection, and badge notifications.

**Location**: `@/lib/hooks/use-gamification-feedback.ts`

**API**:
```typescript
const {
  awardXP,              // (amount, source) => void
  dismissXPAnimation,   // () => void
  dismissLevelUpModal,  // () => void
  activeXPAnimation,    // { amount, source } | null
  showLevelUpModal,     // boolean
  levelUpInfo,          // { level, unlockedFeatures } | null
} = useGamificationFeedback();
```

**Usage**:
```tsx
import { useGamificationFeedback } from '@/lib/hooks/use-gamification-feedback';

function QuestCompletionScreen() {
  const {
    awardXP,
    activeXPAnimation,
    showLevelUpModal,
    levelUpInfo,
    dismissXPAnimation,
    dismissLevelUpModal,
  } = useGamificationFeedback();

  const handleQuestComplete = () => {
    // Award 100 XP for quest completion
    awardXP(100, 'quest_completion');
  };

  return (
    <>
      {activeXPAnimation && (
        <XPGainAnimation
          amount={activeXPAnimation.amount}
          source={activeXPAnimation.source}
          visible={true}
          onDismiss={dismissXPAnimation}
        />
      )}

      {showLevelUpModal && levelUpInfo && (
        <LevelUpModal
          visible={true}
          level={levelUpInfo.level}
          unlockedFeatures={levelUpInfo.unlockedFeatures}
          onDismiss={dismissLevelUpModal}
        />
      )}
    </>
  );
}
```

**Features**:
- Sequential XP gain queue (prevents overlapping animations)
- Automatic level-up detection
- Level threshold calculations (100 XP per level)
- Unlocked features based on level
- Context-based state management

---

### useLeaderboard

Fetches and manages leaderboard data with caching and real-time updates.

**Location**: `@/lib/hooks/use-leaderboard.ts`

**API**:
```typescript
const {
  data,                  // LeaderboardUser[]
  loading,               // boolean
  error,                 // string | null
  filter,                // LeaderboardFilter
  currentUserId,         // string | null
  fetchLeaderboard,      // (filter?) => Promise<void>
  refresh,               // () => Promise<void>
  changeFilter,          // (newFilter) => void
  setCurrentUserId,      // (userId) => void
  getCurrentUserRank,    // () => LeaderboardUser | null
  getTopUsers,           // (n) => LeaderboardUser[]
  isUserInTop,           // (userId, n) => boolean
} = useLeaderboard(options);
```

**Options**:
```typescript
interface UseLeaderboardOptions {
  autoFetch?: boolean;          // Default: true
  realTime?: boolean;           // Default: true
  defaultFilter?: LeaderboardFilter;
}
```

**Usage**:
```tsx
import { useLeaderboard } from '@/lib/hooks/use-leaderboard';

function LeaderboardScreen() {
  const {
    data,
    loading,
    refresh,
    getTopUsers,
    getCurrentUserRank,
  } = useLeaderboard({
    autoFetch: true,
    realTime: true,
  });

  const top10 = getTopUsers(10);
  const myRank = getCurrentUserRank();

  return (
    <LeaderboardWidget
      data={top10}
      currentUserId={myRank?.userId}
      loading={loading}
      onRefresh={refresh}
    />
  );
}
```

**Features**:
- Map-based caching per filter combination
- Auto-fetch on mount
- Real-time rank updates via WebSocket
- Filter by feature and timeframe
- Helper methods for common queries
- Offline support with cached fallback

---

## Integration Patterns

### Quest Completion

**File**: `app/quest-completion-example.tsx`

```tsx
import { useGamificationFeedback } from '@/lib/hooks/use-gamification-feedback';
import { XPGainAnimation } from '@/components/gamification/xp-gain-animation';
import LevelUpModal from '@/components/gamification/level-up-modal';

export default function QuestCompletionScreen() {
  const {
    awardXP,
    dismissXPAnimation,
    dismissLevelUpModal,
    activeXPAnimation,
    showLevelUpModal,
    levelUpInfo,
  } = useGamificationFeedback();

  useEffect(() => {
    // Award XP on quest completion
    awardXP(100, 'quest_completion');
  }, []);

  return (
    <>
      {activeXPAnimation && (
        <XPGainAnimation
          amount={activeXPAnimation.amount}
          source={activeXPAnimation.source}
          visible={true}
          onDismiss={dismissXPAnimation}
        />
      )}

      {showLevelUpModal && levelUpInfo && (
        <LevelUpModal
          visible={true}
          level={levelUpInfo.level}
          unlockedFeatures={levelUpInfo.unlockedFeatures}
          onDismiss={dismissLevelUpModal}
        />
      )}
      
      {/* Your quest completion UI */}
    </>
  );
}
```

**XP Reward**: 100 XP

---

### Course/Lesson Completion

**File**: `app/(tabs)/courses/[id]/player.tsx`

```tsx
const handleComplete = async (grade?: number) => {
  const result = await completeMutation.mutateAsync({
    lessonId: lesson.id,
    grade,
    timeSpent: 0,
  });

  // Award XP with gamification feedback
  awardXP(result.xpAwarded || 150, 'course_completion');

  // Show success message...
};
```

**XP Reward**: 150 XP (or server-provided amount)

---

### Marketplace Purchase

**File**: `app/marketplace/transaction/[id].tsx`

```tsx
useEffect(() => {
  if (paymentSuccess) {
    // Award XP for marketplace purchase
    awardXP(75, 'marketplace_purchase');
  }
}, [paymentSuccess]);
```

**XP Reward**: 75 XP

---

### Social Interactions

**File**: `app/(tabs)/feed.tsx`

```tsx
const handleLike = useCallback(async (postId: string) => {
  // ... like logic
  
  // Award XP for liking a post
  awardXP(10, 'social_interaction');
}, [awardXP]);

const handleShare = useCallback(async (postId: string) => {
  // ... share logic
  
  // Award XP for sharing a post
  awardXP(15, 'social_interaction');
}, [awardXP]);
```

**XP Rewards**:
- Like post: 10 XP
- Share post: 15 XP
- Comment: 20 XP (to be implemented)

---

## Real-Time Updates

### WebSocket Subscription

**Location**: `@/lib/contexts/real-time-context.tsx`

**Supported Events**:
```typescript
// XP gained
'xp_gain': { userId, amount, source, newXP, newLevel }

// Level up
'level_up': { userId, level, unlockedFeatures }

// Badge earned
'badge_earned': { userId, badgeId, badgeName, rarity }

// Leaderboard update
'leaderboard_update': { userId, rank, xp, level }
```

**Usage with subscribe helper**:
```tsx
import { useRealTime } from '@/lib/contexts/real-time-context';

function MyComponent() {
  const { subscribe } = useRealTime();

  useEffect(() => {
    // Subscribe returns an unsubscribe function
    const unsubscribe = subscribe('xp_gain', (data) => {
      console.log(`User ${data.userId} gained ${data.amount} XP`);
      // Update UI accordingly
    });

    return unsubscribe; // Cleanup on unmount
  }, [subscribe]);
}
```

**Usage with on/off**:
```tsx
import { useRealTime } from '@/lib/contexts/real-time-context';

function MyComponent() {
  const { on, off } = useRealTime();

  useEffect(() => {
    const handleLevelUp = (data: any) => {
      console.log(`User reached level ${data.level}!`);
    };

    on('level_up', handleLevelUp);

    return () => {
      off('level_up', handleLevelUp);
    };
  }, [on, off]);
}
```

---

## Performance Optimization

### Component Memoization

All gamification components use `React.memo` to prevent unnecessary re-renders:

```tsx
export const XPGainAnimation = React.memo(({ amount, source, visible, onDismiss }) => {
  // Component implementation
});
```

### Hook Optimization

**useCallback for Event Handlers**:
```tsx
const handleDismiss = useCallback(() => {
  setVisible(false);
  onDismiss?.();
}, [onDismiss]);
```

**useMemo for Expensive Calculations**:
```tsx
const topUsers = useMemo(() => {
  return data.slice(0, maxUsers).sort((a, b) => a.rank - b.rank);
}, [data, maxUsers]);
```

### FlatList Optimization

LeaderboardWidget uses optimized FlatList:
```tsx
<FlatList
  data={data}
  renderItem={renderItem}
  keyExtractor={keyExtractor}
  getItemLayout={getItemLayout}  // Fixed-height optimization
  removeClippedSubviews={true}   // Memory optimization
  windowSize={21}                // Render window
  initialNumToRender={10}        // Initial render count
/>
```

### Caching Strategy

useLeaderboard implements Map-based caching:
```tsx
const cacheKey = `${filter.feature}_${filter.timeframe}`;
cacheRef.current.set(cacheKey, leaderboardData);
```

---

## Accessibility Guidelines

### Screen Reader Support

All components include proper ARIA labels and roles:

```tsx
<View
  accessibilityRole="button"
  accessibilityLabel="Level 5 - 250 of 500 XP (50%)"
  accessibilityHint="Tap to view gamification dashboard"
>
  <GamificationHeader />
</View>
```

### Announcements

XP gains are announced to screen readers:
```tsx
<View accessibilityLiveRegion="polite">
  <Text>You gained 100 XP!</Text>
</View>
```

### Keyboard Navigation

All interactive elements support keyboard navigation:
- Tab/Shift+Tab to navigate
- Enter/Space to activate
- Escape to dismiss modals

### Color Contrast

All text meets WCAG 2.1 Level AA contrast ratios:
- Normal text: 4.5:1 minimum
- Large text: 3:1 minimum
- UI components: 3:1 minimum

---

## Testing Patterns

### Component Tests

**Example**: XPGainAnimation
```tsx
import { render } from '@testing-library/react-native';
import { XPGainAnimation } from '@/components/gamification/xp-gain-animation';

describe('XPGainAnimation', () => {
  it('renders XP amount and source', () => {
    const { getByText } = render(
      <XPGainAnimation
        amount={100}
        source="quest_completion"
        visible={true}
        onDismiss={jest.fn()}
      />
    );

    expect(getByText('+100 XP')).toBeTruthy();
    expect(getByText('Quest Completion')).toBeTruthy();
  });
});
```

### Hook Tests

**Example**: useGamificationFeedback
```tsx
import { renderHook, act } from '@testing-library/react-native';
import { useGamificationFeedback } from '@/lib/hooks/use-gamification-feedback';

describe('useGamificationFeedback', () => {
  it('awards XP and triggers animation', () => {
    const { result } = renderHook(() => useGamificationFeedback());

    act(() => {
      result.current.awardXP(100, 'quest_completion');
    });

    expect(result.current.activeXPAnimation).toEqual({
      amount: 100,
      source: 'quest_completion',
    });
  });

  it('detects level-up at threshold', () => {
    const { result } = renderHook(() => useGamificationFeedback());

    act(() => {
      result.current.awardXP(500, 'quest_completion'); // Level up at 500 XP
    });

    expect(result.current.showLevelUpModal).toBe(true);
    expect(result.current.levelUpInfo?.level).toBe(5);
  });
});
```

### Integration Tests

Test complete flows:
```tsx
it('completes quest and shows XP animation', async () => {
  const { getByText, findByText } = render(<QuestCompletionScreen />);

  fireEvent.press(getByText('Complete Quest'));

  // Wait for XP animation
  expect(await findByText('+100 XP')).toBeTruthy();
  expect(await findByText('Quest Completion')).toBeTruthy();
});
```

---

## Examples

### Complete Dashboard Screen

**File**: `app/(tabs)/profile/gamification.tsx`

```tsx
import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { ScreenWrapper } from '@/components/screen-wrapper';
import { Text } from '@/components/ui/text';
import { GamificationHeader } from '@/components/gamification/gamification-header';
import { LeaderboardWidget } from '@/components/gamification/leaderboard-widget';
import { useLeaderboard } from '@/lib/hooks/use-leaderboard';

export default function GamificationDashboardScreen() {
  const { data, loading, error, refresh, getTopUsers } = useLeaderboard({
    autoFetch: true,
    realTime: true,
  });

  const topUsers = getTopUsers(10);

  return (
    <ScreenWrapper screenName="GamificationDashboard">
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerWrapper}>
          <GamificationHeader />
        </View>

        <View style={styles.section}>
          <Text variant="h2">Your Progress</Text>
          <Text variant="muted">
            Track your level, XP, and achievements
          </Text>
        </View>

        <View style={styles.section}>
          <Text variant="h3">Leaderboard</Text>
          <LeaderboardWidget
            data={topUsers}
            loading={loading}
            error={!!error}
            onRefresh={refresh}
            showFilters
            maxUsers={10}
          />
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  headerWrapper: {
    paddingVertical: 8,
  },
  section: {
    marginTop: 16,
    marginBottom: 8,
  },
});
```

### Complete Feature Integration

All major features now award XP:
- ✅ Quest completion: 100 XP
- ✅ Course/lesson completion: 150 XP
- ✅ Marketplace purchase: 75 XP
- ✅ Social interactions: 10-15 XP

---

## Best Practices

### 1. Sequential XP Awards

Use `awardXP` for automatic queueing:
```tsx
// Good: Sequential processing
awardXP(100, 'quest_completion');
awardXP(50, 'badge_earned');

// Bad: Manual queue management
setXPQueue([...xpQueue, { amount: 100, source: 'quest_completion' }]);
```

### 2. Cleanup Subscriptions

Always unsubscribe in useEffect cleanup:
```tsx
useEffect(() => {
  const unsubscribe = subscribe('xp_gain', handleXPGain);
  return unsubscribe; // Important!
}, [subscribe]);
```

### 3. Error Handling

Handle loading and error states:
```tsx
{loading && <LoadingSpinner />}
{error && <ErrorMessage message={error} />}
{!loading && !error && data.length === 0 && <EmptyState />}
```

### 4. Accessibility First

Always include accessibility props:
```tsx
<Button
  accessibilityRole="button"
  accessibilityLabel="View leaderboard"
  accessibilityHint="Opens the full leaderboard screen"
>
  <Text>View All</Text>
</Button>
```

### 5. Performance Testing

Test with large datasets:
```tsx
// Test with 1000+ leaderboard entries
const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
  rank: i + 1,
  userId: `user-${i}`,
  username: `User ${i}`,
  xp: 10000 - i * 10,
  level: Math.floor((10000 - i * 10) / 100),
}));
```

---

## Troubleshooting

### Issue: XP animation not showing

**Solution**: Ensure `useGamificationFeedback` is called at component root:
```tsx
// Good
function MyScreen() {
  const { awardXP, activeXPAnimation } = useGamificationFeedback();
  // ...
}

// Bad
function MyScreen() {
  const handleClick = () => {
    const { awardXP } = useGamificationFeedback(); // ❌ Hooks must be at top level
  };
}
```

### Issue: Leaderboard not updating in real-time

**Solution**: Check WebSocket connection status:
```tsx
const { status } = useRealTime();
console.log('WebSocket status:', status);

// Ensure realTime option is enabled
const { data } = useLeaderboard({ realTime: true });
```

### Issue: Level-up modal not appearing

**Solution**: Verify level threshold calculation:
```tsx
// Default: 100 XP per level
// Level 1: 0-99 XP
// Level 2: 100-199 XP
// Level 3: 200-299 XP
// etc.

const currentLevel = Math.floor(totalXP / 100);
```

---

## Migration Guide

### From Manual XP Tracking

**Before**:
```tsx
const [xp, setXp] = useState(0);
const [level, setLevel] = useState(1);

const handleQuestComplete = () => {
  const newXP = xp + 100;
  setXp(newXP);
  
  const newLevel = Math.floor(newXP / 100);
  if (newLevel > level) {
    setLevel(newLevel);
    showLevelUpModal();
  }
};
```

**After**:
```tsx
const { awardXP } = useGamificationFeedback();

const handleQuestComplete = () => {
  awardXP(100, 'quest_completion');
  // Level-up detection and modal handled automatically
};
```

---

## Future Enhancements

- [ ] Streak tracking (daily login, consecutive wins)
- [ ] Achievement system (complex multi-criteria badges)
- [ ] Seasonal leaderboards with rewards
- [ ] Guild/team leaderboards
- [ ] XP multipliers and boosters
- [ ] Customizable XP rewards per action
- [ ] Badge showcase on profile
- [ ] Social sharing of achievements

---

## Support

For questions or issues related to gamification:
- See test files in `__tests__/components/gamification/`
- Check hook tests in `__tests__/hooks/`
- Review integration examples in feature completion screens

---

**End of Gamification Patterns Guide**
