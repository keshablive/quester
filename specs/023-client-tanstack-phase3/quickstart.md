# Quickstart Guide: Client TanStack Query Migration Phase 3

**Feature**: 023-client-tanstack-phase3  
**Date**: 2025-01-21

## Overview

This guide provides step-by-step instructions for migrating route files from useState/useEffect to TanStack Query hooks. Phase 2 has already created the hooks and shared components - this phase focuses on integrating them into route files.

## Prerequisites

Ensure you have:
- Phase 2 completed (hooks, shared components exist)
- TanStack Query DevTools for debugging (optional but recommended)
- Understanding of React Native and Expo Router

## Migration Pattern

### Before (useState/useEffect)

```tsx
// app/achievements.tsx - BEFORE
import React, { useState, useEffect, useCallback } from 'react';
import { achievementsService, Achievement } from '@/core';

export default function AchievementsPage() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadAchievements();
  }, []);

  const loadAchievements = async () => {
    try {
      setLoading(true);
      const data = await achievementsService.getAchievements();
      setAchievements(data);
    } catch (err) {
      console.error('Failed to load achievements:', err);
    } finally {
      setLoading(false);
    }
  };

  // ... render with manual state management
}
```

### After (TanStack Query)

```tsx
// app/achievements.tsx - AFTER
import React from 'react';
import { View } from 'react-native';
import { AchievementsList } from '@/components/pages/achievements';
import { OfflineIndicator } from '@/components/shared';

export default function AchievementsPage() {
  return (
    <View className="flex-1 bg-background">
      <OfflineIndicator />
      <AchievementsList />
    </View>
  );
}
```

## Step-by-Step Migration

### Step 1: Identify the Existing Hook

Check `client/core/hooks/queries/` for the appropriate hook:

```bash
# List available hooks
ls client/core/hooks/queries/
```

Common hooks for this migration:
- `useAchievements` - Achievement data
- `useBadges` - Badge data
- `useQuests` - Quest data
- `useDashboardStats` - Dashboard statistics
- `useNotifications` - Notification data
- `useTransactions` - Transaction data

### Step 2: Identify the Existing Component

Check `client/components/pages/` for pre-built list components:

- `AchievementsList` - Full achievements list with loading/error states
- `BadgesList` - Full badges list with filtering
- `QuestList` - Quest list with filters
- `NotificationList` - Notifications with infinite scroll
- `TransactionList` - Transactions with infinite scroll
- `MarketplaceList` - Marketplace items with tabs

### Step 3: Replace Route File

**Pattern for simple routes** (use pre-built component):

```tsx
// app/[feature].tsx
import { View } from 'react-native';
import { FeatureList } from '@/components/pages/[feature]';
import { OfflineIndicator } from '@/components/shared';

export default function FeaturePage() {
  return (
    <View className="flex-1 bg-background">
      <OfflineIndicator />
      <FeatureList />
    </View>
  );
}
```

**Pattern for routes with modals/navigation** (use hooks directly):

```tsx
// app/quests.tsx
import React, { useState } from 'react';
import { View, Modal } from 'react-native';
import { QuestList, QuestDetail } from '@/components/pages/quests';
import { useQuest } from '@/core/hooks/queries';
import { useCompleteQuest } from '@/core/hooks/mutations';
import { OfflineIndicator } from '@/components/shared';

export default function QuestsPage() {
  const [selectedQuestId, setSelectedQuestId] = useState<string | null>(null);
  
  // Use TanStack Query hook for selected quest
  const { data: selectedQuest } = useQuest(selectedQuestId!, {
    enabled: !!selectedQuestId,
  });
  
  // Use mutation hook for quest completion
  const completeQuestMutation = useCompleteQuest();

  return (
    <View className="flex-1 bg-background">
      <OfflineIndicator />
      <QuestList onQuestPress={(quest) => setSelectedQuestId(quest.id)} />
      
      <Modal visible={!!selectedQuest}>
        <QuestDetail
          quest={selectedQuest}
          onComplete={() => completeQuestMutation.mutate(selectedQuest.id)}
          onClose={() => setSelectedQuestId(null)}
        />
      </Modal>
    </View>
  );
}
```

### Step 4: Add Shared Components

Always include these shared components for consistent UX:

```tsx
import { 
  OfflineIndicator,      // Shows offline status banner
  StaleDataIndicator,    // Shows when data is stale
  ErrorState,            // Error display with retry
  MutationErrorToast,    // Toast for mutation failures
} from '@/components/shared';
```

### Step 5: Verify Error Handling

Ensure error states are handled:

```tsx
// Inside list component (already implemented in Phase 2)
const { data, error, isLoading, refetch } = useFeatureData();

if (error && !data) {
  return (
    <ErrorState
      title="Failed to Load"
      message={error.message}
      onRetry={refetch}
    />
  );
}
```

## Route File Checklist

For each route file migration:

- [ ] Remove useState for data
- [ ] Remove useEffect for fetching
- [ ] Remove manual loading state
- [ ] Remove manual error state
- [ ] Import pre-built list component OR use hook directly
- [ ] Add `<OfflineIndicator />` at top of view
- [ ] Verify skeleton loading shows during fetch
- [ ] Verify error state shows on failure
- [ ] Verify pull-to-refresh works
- [ ] Test offline viewing of cached data

## Files to Migrate

### Priority 1 (Simple replacement)

| Route File | Replace With | Notes |
|------------|--------------|-------|
| `app/achievements.tsx` | `<AchievementsList />` | Component exists |
| `app/badges.tsx` | `<BadgesList />` | Component exists |

### Priority 2 (Verify integration)

| Route File | Component | Notes |
|------------|-----------|-------|
| `app/dashboard.tsx` | Uses `DashboardHeader`, `StatsCards`, etc. | Verify hooks in sub-components |
| `app/learning.tsx` | Uses `LearningDashboard`, `CourseList` | Verify hooks in sub-components |

### Priority 3 (Add mutations)

| Route File | Component | Notes |
|------------|-----------|-------|
| `app/quests.tsx` | `<QuestList />` | Add `useCompleteQuest` mutation |
| `app/marketplace.tsx` | `<MarketplaceList />` | Add purchase mutation |

## Mutation Hooks Usage

### Quest Completion

```tsx
import { useCompleteQuest, useStartQuest, useAbandonQuest } from '@/core/hooks/mutations';

function QuestActions({ questId }: { questId: string }) {
  const completeMutation = useCompleteQuest();
  const startMutation = useStartQuest();
  const abandonMutation = useAbandonQuest();
  
  return (
    <>
      <Button onPress={() => startMutation.mutate(questId)}>
        Start Quest
      </Button>
      <Button onPress={() => completeMutation.mutate(questId)}>
        Complete
      </Button>
      <Button onPress={() => abandonMutation.mutate(questId)}>
        Abandon
      </Button>
    </>
  );
}
```

### Marketplace Purchase

```tsx
import { usePurchaseItem } from '@/core/hooks/mutations';

function PurchaseButton({ itemId }: { itemId: string }) {
  const purchaseMutation = usePurchaseItem();
  const { isConnected } = useNetworkStatus();
  
  return (
    <Button
      onPress={() => {
        if (!isConnected) {
          showToast('Requires internet connection');
          return;
        }
        purchaseMutation.mutate(itemId);
      }}
      disabled={purchaseMutation.isPending}
    >
      {purchaseMutation.isPending ? 'Processing...' : 'Purchase'}
    </Button>
  );
}
```

## Testing Checklist

For each migrated route:

1. **Loading State**
   - [ ] Skeleton appears on first load
   - [ ] Skeleton matches content layout

2. **Cached Data**
   - [ ] Data appears instantly on return navigation
   - [ ] Background refresh happens automatically

3. **Error Handling**
   - [ ] Error state shows on API failure
   - [ ] Retry button works
   - [ ] Error toast shows for mutations

4. **Offline Support**
   - [ ] Cached data visible when offline
   - [ ] Offline indicator appears
   - [ ] Mutations blocked with message

5. **Pull to Refresh**
   - [ ] Pull gesture triggers refresh
   - [ ] Loading indicator during refresh
   - [ ] Data updates after refresh

## Troubleshooting

### "No cached data" when offline

- Ensure user visited page while online first
- Check AsyncStorage has data: `npx expo install @react-native-async-storage/async-storage`
- Verify query client persister is configured

### Data not refreshing

- Check stale time configuration
- Verify query key matches
- Use React Query DevTools to inspect cache

### Optimistic update not working

- Ensure mutation hook has `onMutate` callback
- Check query client has correct query key for setQueryData
- Verify rollback in `onError` callback

### Type errors after migration

- Ensure using correct type imports from `@/core`
- Check hook return types match component props
- Verify data structure (array vs paginated response)
