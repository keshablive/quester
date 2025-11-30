# Data Model: Client TanStack Query Migration Phase 3

**Feature**: 023-client-tanstack-phase3  
**Date**: 2025-01-21  
**Status**: Complete

## Overview

This document defines the data types and query patterns for the TanStack Query migration. Most types already exist from Phase 2; this documents the expected structures for completeness.

## Entity Types

### Achievement

```typescript
interface Achievement {
  id: string;
  title: string;
  description: string;
  icon?: string;
  points: number;
  isEarned: boolean;
  earnedAt?: string;  // ISO date string
  criteria?: {
    type: string;
    target: number;
    current: number;
  };
}
```

**Query Key**: `queryKeys.achievements.all`  
**Stale Time**: 2 minutes  
**Hooks**: `useAchievements()`, `useUserAchievements(userId)`

### Badge

```typescript
interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  imageUrl?: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  earned: boolean;
  earnedAt?: string;
  requirement?: string;
}
```

**Query Key**: `queryKeys.badges.all`  
**Stale Time**: 5 minutes  
**Hooks**: `useBadges()`, `useUserBadges(userId)`

### Quest

```typescript
interface Quest {
  id: string;
  title: string;
  description: string;
  type: 'daily' | 'weekly' | 'story' | 'challenge';
  status: 'available' | 'in_progress' | 'completed' | 'expired';
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  xpReward: number;
  coinReward?: number;
  objectives: QuestObjective[];
  progress: number;
  maxProgress: number;
  expiresAt?: string;
  completedAt?: string;
}

interface QuestObjective {
  id: string;
  description: string;
  target: number;
  current: number;
  completed: boolean;
}
```

**Query Key**: `queryKeys.quests.all`, `queryKeys.quests.detail(id)`  
**Stale Time**: 2 minutes  
**Hooks**: `useQuests(filters)`, `useQuest(id)`, `useDailyQuests()`

### DashboardStats

```typescript
interface DashboardStats {
  totalXp: number;
  level: number;
  levelProgress: number;
  nextLevelXp: number;
  currentStreak: number;
  longestStreak: number;
  coursesCompleted: number;
  coursesInProgress: number;
  achievementsUnlocked: number;
  totalAchievements: number;
  questsCompleted: number;
  badgesEarned: number;
}
```

**Query Key**: `queryKeys.dashboard.stats`  
**Stale Time**: 30 seconds  
**Hooks**: `useDashboardStats()`

### ActivityItem

```typescript
interface ActivityItem {
  id: string;
  type: 'course_progress' | 'achievement' | 'quest' | 'badge' | 'level_up';
  title: string;
  description: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}
```

**Query Key**: `queryKeys.dashboard.activity`  
**Stale Time**: 30 seconds  
**Hooks**: `useRecentActivity()`

### Notification

```typescript
interface Notification {
  id: string;
  type: 'achievement' | 'quest' | 'social' | 'system' | 'message';
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
}
```

**Query Key**: `queryKeys.notifications.all`, `queryKeys.notifications.infinite`  
**Stale Time**: 1 minute  
**Hooks**: `useNotifications()`, `useUnreadNotificationCount()`

### Transaction

```typescript
interface Transaction {
  id: string;
  type: 'credit' | 'debit' | 'transfer' | 'purchase' | 'reward';
  amount: number;
  currency: 'coins' | 'xp' | 'gems';
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  description: string;
  createdAt: string;
  metadata?: {
    itemId?: string;
    itemName?: string;
    source?: string;
  };
}
```

**Query Key**: `queryKeys.transactions.all`, `queryKeys.transactions.infinite`  
**Stale Time**: 1 minute  
**Hooks**: `useTransactions()`, `useInfiniteTransactions()`

### MarketplaceItem

```typescript
interface MarketplaceItem {
  id: string;
  name: string;
  description: string;
  type: 'property' | 'classified';
  price: number;
  currency: 'coins' | 'gems';
  imageUrl?: string;
  sellerId: string;
  sellerName: string;
  status: 'available' | 'sold' | 'reserved';
  createdAt: string;
  metadata?: Record<string, unknown>;
}
```

**Query Key**: `queryKeys.marketplace.all`, `queryKeys.marketplace.properties`, `queryKeys.marketplace.classifieds`  
**Stale Time**: 5 minutes  
**Hooks**: `useInfiniteMarketplaceProperties()`, `useInfiniteMarketplaceClassifieds()`

### Course

```typescript
interface Course {
  id: string;
  title: string;
  description: string;
  thumbnailUrl?: string;
  duration: number;  // minutes
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  lessonsCount: number;
  completedLessons: number;
  progress: number;  // 0-100
  isEnrolled: boolean;
  instructor: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
}
```

**Query Key**: `queryKeys.courses.all`, `queryKeys.courses.detail(id)`  
**Stale Time**: 5 minutes  
**Hooks**: `useCourses()`, `useCourse(id)`, `useCourseProgress(id)`

## Query Key Hierarchy

```typescript
// Existing in core/query/keys.ts
export const queryKeys = {
  achievements: {
    all: ['achievements'],
    list: () => [...queryKeys.achievements.all, 'list'],
    detail: (id: string) => [...queryKeys.achievements.all, 'detail', id],
  },
  badges: {
    all: ['badges'],
    list: () => [...queryKeys.badges.all, 'list'],
    user: (userId: string) => [...queryKeys.badges.all, 'user', userId],
  },
  quests: {
    all: ['quests'],
    list: (filters?: QuestFilters) => [...queryKeys.quests.all, 'list', filters],
    detail: (id: string) => [...queryKeys.quests.all, 'detail', id],
    daily: () => [...queryKeys.quests.all, 'daily'],
  },
  dashboard: {
    all: ['dashboard'],
    stats: () => [...queryKeys.dashboard.all, 'stats'],
    activity: () => [...queryKeys.dashboard.all, 'activity'],
  },
  notifications: {
    all: ['notifications'],
    list: () => [...queryKeys.notifications.all, 'list'],
    infinite: () => [...queryKeys.notifications.all, 'infinite'],
    unreadCount: () => [...queryKeys.notifications.all, 'unreadCount'],
  },
  transactions: {
    all: ['transactions'],
    list: () => [...queryKeys.transactions.all, 'list'],
    infinite: () => [...queryKeys.transactions.all, 'infinite'],
  },
  marketplace: {
    all: ['marketplace'],
    properties: () => [...queryKeys.marketplace.all, 'properties'],
    classifieds: () => [...queryKeys.marketplace.all, 'classifieds'],
  },
  courses: {
    all: ['courses'],
    list: () => [...queryKeys.courses.all, 'list'],
    detail: (id: string) => [...queryKeys.courses.all, 'detail', id],
    progress: (id: string) => [...queryKeys.courses.all, 'progress', id],
  },
};
```

## Stale Time Constants

```typescript
// core/query/constants.ts
export const STALE_TIMES = {
  // High-frequency updates (30 seconds)
  DASHBOARD: 30 * 1000,
  
  // Medium-frequency updates (1 minute)
  NOTIFICATIONS: 60 * 1000,
  TRANSACTIONS: 60 * 1000,
  
  // Progress-related (2 minutes)
  QUESTS: 2 * 60 * 1000,
  ACHIEVEMENTS: 2 * 60 * 1000,
  
  // Stable content (5 minutes)
  COURSES: 5 * 60 * 1000,
  BADGES: 5 * 60 * 1000,
  LEARNING: 5 * 60 * 1000,
  MARKETPLACE: 5 * 60 * 1000,
  
  // Default
  DEFAULT: 5 * 60 * 1000,
} as const;

// Garbage collection time
export const GC_TIME = 24 * 60 * 60 * 1000; // 24 hours
```

## Mutation Patterns

### Quest Completion (FR-021)

```typescript
// Optimistic update for quest completion
useMutation({
  mutationFn: (questId: string) => questService.complete(questId),
  onMutate: async (questId) => {
    await queryClient.cancelQueries({ queryKey: queryKeys.quests.detail(questId) });
    const previousQuest = queryClient.getQueryData(queryKeys.quests.detail(questId));
    
    queryClient.setQueryData(queryKeys.quests.detail(questId), (old: Quest) => ({
      ...old,
      status: 'completed',
      completedAt: new Date().toISOString(),
    }));
    
    return { previousQuest };
  },
  onError: (err, questId, context) => {
    queryClient.setQueryData(queryKeys.quests.detail(questId), context?.previousQuest);
  },
  onSettled: (_, __, questId) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.quests.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.stats });
  },
});
```

### Marketplace Purchase (FR-022)

```typescript
// Optimistic update for marketplace purchase
useMutation({
  mutationFn: (itemId: string) => marketplaceService.purchase(itemId),
  onMutate: async (itemId) => {
    // Update item status optimistically
    // Update user balance optimistically
  },
  onError: (err, itemId, context) => {
    // Rollback item status
    // Rollback user balance
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.marketplace.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.users.current() });
    queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all });
  },
});
```

### Notification Read Status (FR-023)

```typescript
// Already implemented in Phase 2
// See: core/hooks/mutations/useNotificationMutations.ts
```

## Cache Invalidation Rules

| Action | Invalidates |
|--------|-------------|
| Complete Quest | `quests.all`, `dashboard.stats`, `achievements.all` |
| Claim Achievement | `achievements.all`, `dashboard.stats`, `users.current` |
| Purchase Item | `marketplace.all`, `transactions.all`, `users.current` |
| Mark Notification Read | `notifications.all`, `notifications.unreadCount` |
| Complete Course | `courses.all`, `dashboard.stats`, `achievements.all` |
| Earn Badge | `badges.all`, `dashboard.stats` |

## Pagination Configuration

| List | Page Size | Scroll Behavior |
|------|-----------|-----------------|
| Notifications | 20 | Infinite scroll |
| Transactions | 20 | Infinite scroll |
| Marketplace Items | 20 | Infinite scroll |
| Quests | 20 | Load more button |
| Courses | 20 | Grid with pagination |
