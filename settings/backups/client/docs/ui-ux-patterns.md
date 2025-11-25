# UI/UX Patterns Guide - Feature 003

**Last Updated**: November 15, 2025  
**Feature**: 003-ui-ux-optimization  
**Purpose**: Comprehensive guide to UI/UX patterns implemented across the mobile app

---

## Table of Contents

1. [Component Patterns](#component-patterns)
2. [Navigation Patterns](#navigation-patterns)
3. [Gamification Patterns](#gamification-patterns)
4. [Workflow Integration Patterns](#workflow-integration-patterns)
5. [Accessibility Patterns](#accessibility-patterns)
6. [Performance Patterns](#performance-patterns)
7. [Error Handling Patterns](#error-handling-patterns)
8. [Real-Time Patterns](#real-time-patterns)
9. [Marketplace Patterns](#marketplace-patterns)

---

## Component Patterns

### React Native Reusables Pattern

**Always use shadcn/ui components** from `@/components/ui/`:

```tsx
// ✅ CORRECT - Use React Native Reusables
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';

<Button onPress={handlePress}>
  <Text>Click Me</Text>  {/* Always wrap text in Text component */}
</Button>

// ❌ INCORRECT - Never use native components directly
import { Button as RNButton, Text as RNText } from 'react-native';
<RNButton title="Click Me" />  {/* Don't use native Button */}
```

**Key Rules**:
- Import all UI components from `@/components/ui/[component]`
- Always wrap Button text in `<Text>` component
- Never use native `<Text>`, `<Button>`, `<Input>` directly

### Component Structure Pattern

```tsx
import React from 'react';
import { View } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';

interface MyComponentProps {
  title: string;
  onAction: () => void;
}

export const MyComponent = React.memo<MyComponentProps>(({ title, onAction }) => {
  return (
    <View 
      className="p-4"
      accessibilityRole="region"
      accessibilityLabel={`${title} section`}
    >
      <Text className="text-lg font-bold mb-2">{title}</Text>
      <Button onPress={onAction}>
        <Text>Action</Text>
      </Button>
    </View>
  );
});

MyComponent.displayName = 'MyComponent';
```

**Pattern Elements**:
1. React.memo for performance optimization
2. NativeWind className styling
3. Full accessibility props
4. displayName for debugging

---

## Navigation Patterns

### Feature Cards Pattern

```tsx
import { FeatureCard } from '@/components/navigation/feature-card';

<FeatureCard
  feature={{
    type: 'courses',
    title: 'Courses',
    description: 'Browse learning materials',
    icon: 'BookOpen',
    color: '#3b82f6',
    count: 24,
    isActive: true,
  }}
  onPress={() => router.push('/courses')}
  variant="default"
  size="medium"
/>
```

**Use Cases**:
- Home screen feature navigation
- Dashboard quick access
- Category browsing

**Variants**:
- `default`: Full card with icon, title, description, count
- `compact`: Minimal card with icon and title only
- `minimal`: Icon and count only

**Sizes**: `small`, `medium`, `large`

### Quick Actions Pattern

```tsx
import QuickActionsMenu from '@/components/navigation/quick-actions-menu';

<QuickActionsMenu
  currentFeature="courses"
  onActionPress={(action) => {
    if (action.route) router.push(action.route);
  }}
  layout="horizontal"  // or "grid"
  maxActions={3}
/>
```

**Context-Aware Actions**:
- `courses`: Browse Courses, Start Learning, View Progress
- `quests`: Browse Quests, Active Quests, Completed Quests
- `marketplace`: Browse Marketplace, Sell Item, My Transactions

### Breadcrumb Navigation Pattern

```tsx
import { BreadcrumbNav } from '@/components/navigation/breadcrumb-nav';

<BreadcrumbNav
  path={[
    { label: 'Home', route: '/' },
    { label: 'Courses', route: '/courses' },
    { label: 'React Native Basics' },  // Current page (no route)
  ]}
  onNavigate={(route) => router.push(route)}
/>
```

---

## Gamification Patterns

### XP Gain Animation Pattern

```tsx
import { XPGainAnimation } from '@/components/gamification/xp-gain-animation';
import { useGamificationFeedback } from '@/lib/hooks/use-gamification-feedback';

const MyScreen = () => {
  const { awardXP, dismissXPAnimation, activeXPAnimation } = useGamificationFeedback();

  const handleAction = () => {
    // Award XP for action
    awardXP(50, 'quest_completed');
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
      {/* Screen content */}
    </>
  );
};
```

**XP Values**:
- Quest completion: 100 XP
- Course completion: 150 XP
- Marketplace purchase: 75 XP
- Post creation: 25 XP
- Comment: 10 XP

### Level Up Modal Pattern

```tsx
import LevelUpModal from '@/components/gamification/level-up-modal';

{showLevelUpModal && levelUpInfo && (
  <LevelUpModal
    visible={true}
    level={levelUpInfo.level}
    unlockedFeatures={levelUpInfo.unlockedFeatures}
    onDismiss={dismissLevelUpModal}
  />
)}
```

**Features Unlocked by Level**:
- Level 5: Advanced quest creation
- Level 10: Marketplace seller privileges
- Level 15: Live streaming capabilities
- Level 20: Badge customization

### Progress Ring Pattern

```tsx
import { ProgressRing } from '@/components/gamification/progress-ring';

<ProgressRing
  progress={75}  // 0-100
  size={120}
  strokeWidth={8}
  color="#3b82f6"
  showPercentage={true}
/>
```

**Common Uses**:
- Quest completion progress
- Course progress
- Daily goal tracking
- Achievement progress

---

## Workflow Integration Patterns

### Suggested Content Pattern

```tsx
import SuggestedContent from '@/components/workflow/suggested-content';

<SuggestedContent
  currentFeature="courses"
  context="course_completed"
  contextData={{ courseId: '123' }}
  onSuggestionPress={(suggestion) => {
    if (suggestion.route) router.push(suggestion.route);
  }}
  layout="list"  // or "grid", "carousel"
  maxSuggestions={3}
/>
```

**Context Types**:
- `course_completed`: Suggest related courses, quests
- `quest_started`: Suggest related quests, courses
- `payment_received`: Suggest marketplace items, selling
- `error_occurred`: Suggest help resources, support

### Workflow Analytics Pattern

```tsx
import { useWorkflowAnalytics } from '@/lib/utils/workflow-analytics';

const MyScreen = () => {
  const analytics = useWorkflowAnalytics();

  useEffect(() => {
    const workflowId = `course_${courseId}_${Date.now()}`;
    analytics.startWorkflow(workflowId, 'courses', courseId);

    return () => {
      analytics.completeWorkflow(workflowId);
    };
  }, [courseId]);

  const handleAction = (actionId: string) => {
    analytics.trackQuickAction('courses', 'quests', courseId, actionId);
  };
};
```

---

## Accessibility Patterns

### Form Accessibility Pattern

```tsx
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

<View className="gap-2">
  <Label nativeID="email-label">
    <Text>Email Address</Text>
  </Label>
  <Input
    nativeID="email-input"
    aria-labelledby="email-label"
    accessibilityLabel="Email address input"
    accessibilityHint="Enter your email to continue"
    value={email}
    onChangeText={setEmail}
    keyboardType="email-address"
    autoCapitalize="none"
  />
</View>
```

**Required Accessibility Props**:
- `accessibilityRole`: Define element role (button, link, text)
- `accessibilityLabel`: Descriptive label for screen readers
- `accessibilityHint`: Additional context for actions
- `accessibilityState`: State information (checked, disabled, selected)

### List Accessibility Pattern

```tsx
<FlatList
  data={items}
  accessibilityRole="list"
  accessibilityLabel="Course list"
  renderItem={({ item }) => (
    <View accessibilityRole="listitem">
      <Text>{item.title}</Text>
    </View>
  )}
/>
```

### Error Message Accessibility Pattern

```tsx
{error && (
  <View 
    className="bg-destructive/10 p-3 rounded-md"
    accessibilityRole="alert"
    accessibilityLive="assertive"
  >
    <Text className="text-destructive">{error}</Text>
  </View>
)}
```

---

## Performance Patterns

### FlatList Optimization Pattern

```tsx
import { FlatList } from 'react-native';

<FlatList
  data={items}
  keyExtractor={(item) => item.id}
  renderItem={renderItem}
  // Performance optimizations
  removeClippedSubviews={true}
  maxToRenderPerBatch={10}
  updateCellsBatchingPeriod={50}
  initialNumToRender={10}
  windowSize={21}
  getItemLayout={(data, index) => ({
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * index,
    index,
  })}
  // Memory management
  onEndReachedThreshold={0.5}
  onEndReached={loadMore}
/>
```

### useMemo Pattern

```tsx
import { useMemo } from 'react';

const MyComponent = ({ data, filter }) => {
  // Memoize expensive computations
  const filteredData = useMemo(() => {
    return data.filter(item => item.type === filter);
  }, [data, filter]);

  const sortedData = useMemo(() => {
    return [...filteredData].sort((a, b) => a.date - b.date);
  }, [filteredData]);

  return <ListView items={sortedData} />;
};
```

### useCallback Pattern

```tsx
import { useCallback } from 'react';

const MyComponent = ({ onSave }) => {
  // Memoize callbacks passed to child components
  const handlePress = useCallback(() => {
    console.log('Button pressed');
    onSave();
  }, [onSave]);

  return <ChildComponent onPress={handlePress} />;
};
```

### Screen Performance Monitoring Pattern

```tsx
import { useScreenPerformanceMetrics } from '@/lib/hooks/use-performance-metrics';

const MyScreen = () => {
  useScreenPerformanceMetrics('MyScreen');
  
  // Screen implementation
};
```

---

## Error Handling Patterns

### Error Boundary Pattern

```tsx
import { ScreenWrapper } from '@/components/screen-wrapper';

const MyScreen = () => {
  return (
    <ScreenWrapper screenName="MyScreen">
      {/* Screen content - any errors caught by boundary */}
      <Content />
    </ScreenWrapper>
  );
};
```

**Never use try-catch for render errors** - Use ErrorBoundary instead.

### API Error Handling Pattern

```tsx
import { apiClient } from '@/lib/api-client';

const fetchData = async () => {
  try {
    const result = await apiClient.get('/endpoint');
    return result;
  } catch (error) {
    if (error.response?.status === 401) {
      // Handle unauthorized
      router.push('/login');
    } else if (error.response?.status === 404) {
      // Handle not found
      setError('Resource not found');
    } else {
      // Generic error
      setError(error.message || 'An error occurred');
    }
    throw error;
  }
};
```

### Offline Error Pattern

```tsx
import { useOfflineStatus } from '@/lib/hooks/use-offline-status';

const MyComponent = () => {
  const { isOffline } = useOfflineStatus();

  if (isOffline) {
    return (
      <View className="p-4 bg-yellow-500/10">
        <Text className="text-yellow-700">
          You're offline. Some features may be limited.
        </Text>
      </View>
    );
  }

  return <OnlineContent />;
};
```

---

## Real-Time Patterns

### WebSocket Connection Pattern

```tsx
import { realTimeService } from '@/lib/services/real-time-service';

useEffect(() => {
  // Connect
  realTimeService.connect();

  // Subscribe to events
  const handleMessage = (data) => {
    console.log('New message:', data);
  };

  realTimeService.subscribe('chat', 'new_message', handleMessage);

  // Cleanup
  return () => {
    realTimeService.unsubscribe('chat', 'new_message', handleMessage);
  };
}, []);
```

### Typing Indicator Pattern

```tsx
import { TypingIndicator } from '@/components/real-time/typing-indicator';

<TypingIndicator
  users={typingUsers}
  maxDisplay={3}
/>
```

### Live Reactions Pattern

```tsx
import { LiveReactions } from '@/components/real-time/live-reactions';

<LiveReactions
  reactions={recentReactions}
  onReactionPress={(emoji) => handleReaction(emoji)}
/>
```

### Real-Time Notifications Pattern

```tsx
import { Toast } from '@/components/real-time/toast';

<Toast
  message="New message from John"
  type="info"  // info, success, warning, error
  duration={3000}
  onDismiss={() => setShowToast(false)}
  onAction={() => router.push('/chat')}
  actionLabel="View"
/>
```

---

## Marketplace Patterns

### Seller Reputation Pattern

```tsx
import { SellerReputationCard } from '@/components/marketplace/seller-reputation-card';

<SellerReputationCard
  reputation={{
    totalSales: 150,
    averageRating: 4.8,
    totalReviews: 95,
    responseTime: '< 2 hours',
    reputationScore: 87,
    badges: [
      { id: '1', name: 'Top Seller', icon: 'award' },
      { id: '2', name: 'Fast Responder', icon: 'zap' },
    ],
  }}
  variant="full"  // or "compact"
  onPress={() => router.push('/seller-profile')}
  onBadgePress={(badgeId) => console.log('Badge:', badgeId)}
/>
```

**Reputation Score Colors**:
- Green (Excellent): ≥80
- Yellow (Good): 60-79
- Red (Poor): <60

### Multi-Step Checkout Pattern

```tsx
import { useCheckout } from '@/hooks/use-checkout';
import { CheckoutProgress } from '@/components/marketplace/checkout-progress';
import { PricingBreakdown } from '@/components/marketplace/pricing-breakdown';

const CheckoutScreen = () => {
  const {
    currentStep,
    pricing,
    canProceed,
    nextStep,
    previousStep,
    selectPaymentMethod,
    completePurchase,
  } = useCheckout({
    listingId: id,
    basePrice: listing.price,
    onSuccess: (transaction) => {
      router.push(`/transaction/${transaction.id}`);
    },
  });

  return (
    <>
      <CheckoutProgress currentStep={currentStep} />
      <PricingBreakdown pricing={pricing} />
      <Button onPress={nextStep} disabled={!canProceed}>
        <Text>Continue</Text>
      </Button>
    </>
  );
};
```

### Escrow Status Pattern

```tsx
import { EscrowStatusIndicator } from '@/components/marketplace/escrow-status-indicator';

<EscrowStatusIndicator
  escrow={{
    status: 'held',
    releaseDate: Date.now() + 7 * 24 * 60 * 60 * 1000,
    daysRemaining: 7,
    canConfirm: true,
    canDispute: true,
  }}
  userType="buyer"  // or "seller"
  onConfirmDelivery={() => confirmDelivery(escrowId)}
  onInitiateDispute={() => initiateDispute(escrowId)}
/>
```

### Wallet Management Pattern

```tsx
import { useWallet } from '@/hooks/use-wallet';
import { WalletBalance } from '@/components/marketplace/wallet-balance';

const WalletScreen = () => {
  const {
    wallet,
    availableBalance,
    pendingEscrow,
    totalEarnings,
    withdraw,
  } = useWallet({ autoRefresh: true });

  return (
    <WalletBalance
      wallet={wallet}
      onWithdraw={() => router.push('/wallet/withdraw')}
      onViewTransactions={() => router.push('/transactions')}
      onViewEscrow={() => router.push('/escrow')}
    />
  );
};
```

### Transaction Receipt Pattern

```tsx
import { TransactionReceipt } from '@/components/marketplace/transaction-receipt';

<TransactionReceipt
  transaction={{
    id: 'txn_123',
    type: 'purchase',
    amount: 99.99,
    status: 'completed',
    description: 'React Native Course',
    createdAt: Date.now(),
  }}
  onDownload={() => downloadReceipt(transaction.id)}
  onContactSupport={() => router.push('/support')}
/>
```

---

## Design Tokens

### Colors

```tsx
// Primary
primary: 'hsl(221, 83%, 53%)'  // #3b82f6

// Status Colors
success: 'hsl(142, 76%, 36%)'  // green
warning: 'hsl(48, 96%, 53%)'   // yellow
error: 'hsl(0, 84%, 60%)'      // red
info: 'hsl(199, 89%, 48%)'     // blue

// Neutral
foreground: 'hsl(0, 0%, 98%)'  // white
background: 'hsl(222, 47%, 11%)' // dark
muted: 'hsl(217, 33%, 17%)'    // gray
```

### Typography

```tsx
// Text Component Variants
<Text className="text-4xl font-bold">Heading 1</Text>
<Text className="text-3xl font-bold">Heading 2</Text>
<Text className="text-2xl font-semibold">Heading 3</Text>
<Text className="text-xl font-medium">Heading 4</Text>
<Text className="text-lg">Body Large</Text>
<Text className="text-base">Body</Text>
<Text className="text-sm">Body Small</Text>
<Text className="text-xs">Caption</Text>
```

### Spacing

```tsx
// NativeWind Spacing Classes
p-1  // 4px
p-2  // 8px
p-3  // 12px
p-4  // 16px
p-6  // 24px
p-8  // 32px

gap-2  // 8px gap
gap-3  // 12px gap
gap-4  // 16px gap
```

---

## Testing Patterns

### Component Test Pattern

```tsx
import { render, fireEvent } from '@testing-library/react-native';
import { MyComponent } from '@/components/my-component';

describe('MyComponent', () => {
  it('should render correctly', () => {
    const { getByText } = render(<MyComponent title="Test" />);
    expect(getByText('Test')).toBeTruthy();
  });

  it('should handle press', () => {
    const onPress = jest.fn();
    const { getByRole } = render(<MyComponent onPress={onPress} />);
    
    fireEvent.press(getByRole('button'));
    expect(onPress).toHaveBeenCalled();
  });

  it('should be accessible', () => {
    const { getByLabelText } = render(<MyComponent />);
    expect(getByLabelText('My component')).toBeTruthy();
  });
});
```

### Hook Test Pattern

```tsx
import { renderHook, act } from '@testing-library/react-hooks';
import { useMyHook } from '@/hooks/use-my-hook';

describe('useMyHook', () => {
  it('should initialize with default values', () => {
    const { result } = renderHook(() => useMyHook());
    expect(result.current.value).toBe(0);
  });

  it('should update value', () => {
    const { result } = renderHook(() => useMyHook());
    
    act(() => {
      result.current.increment();
    });
    
    expect(result.current.value).toBe(1);
  });
});
```

### E2E Test Pattern

```tsx
import { by, element, expect as detoxExpect } from 'detox';

describe('MyScreen E2E', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  it('should display screen', async () => {
    await detoxExpect(element(by.text('My Screen'))).toBeVisible();
  });

  it('should navigate on button press', async () => {
    await element(by.id('navigate-button')).tap();
    await detoxExpect(element(by.text('Next Screen'))).toBeVisible();
  });
});
```

---

## Summary

This guide covers all major UI/UX patterns implemented in Feature 003. Key principles:

1. **Always use React Native Reusables** - Never use native components directly
2. **Accessibility First** - All components have proper ARIA attributes
3. **Performance Optimized** - Use React.memo, useMemo, useCallback
4. **Error Boundaries** - Wrap screens in ScreenWrapper
5. **Real-Time Updates** - Use WebSocket service for live data
6. **Test-Driven** - Write tests first, then implement

For more details, see:
- Component migration guide: `docs/component-migration-guide.md`
- Accessibility reference: `docs/accessibility-quick-reference.md`
- Performance guide: `docs/performance-guide.md`
- Phase completion summaries: `docs/phase-*-completion-summary.md`
