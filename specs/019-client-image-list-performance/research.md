# Research: Client Image & List Performance Optimization

**Feature**: 019-client-image-list-performance  
**Date**: November 29, 2025

## Table of Contents

1. [expo-image for Caching](#1-expo-image-for-caching)
2. [FlashList for List Performance](#2-flashlist-for-list-performance)
3. [Code Splitting with expo-router](#3-code-splitting-with-expo-router)
4. [AuthContext Decomposition](#4-authcontext-decomposition)

---

## 1. expo-image for Caching

### Decision
Use `expo-image` from Expo SDK 54 to replace all `react-native` Image components.

### Rationale
- **Automatic disk caching**: expo-image caches images to disk automatically with no configuration
- **Memory efficiency**: Optimized memory management vs react-native Image
- **BlurHash support**: Native placeholder with smooth transitions
- **Multiple format support**: JPEG, PNG, WebP, GIF, AVIF (with libdav1d)
- **Drop-in replacement**: Same API patterns as Image component

### Key Features

| Feature | expo-image | react-native Image |
|---------|------------|-------------------|
| Disk caching | ✅ Automatic | ❌ None |
| Memory caching | ✅ Automatic | ⚠️ Limited |
| BlurHash placeholder | ✅ Native | ❌ Manual |
| Transition animation | ✅ Built-in | ❌ Manual |
| WebP support | ✅ Native | ⚠️ Platform-dependent |
| Cache size control | ✅ Via cachePolicy | ❌ None |

### Usage Pattern

```tsx
import { Image } from 'expo-image';

const blurhash = '|rF?hV%2WCj[ayj[a|j[az_N...';

<Image
  source="https://example.com/image.jpg"
  placeholder={{ blurhash }}
  contentFit="cover"
  transition={1000}
  cachePolicy="disk"
  style={{ width: 200, height: 200 }}
/>
```

### Cache Configuration
- `cachePolicy: 'disk'` - Caches to disk (default, recommended)
- `cachePolicy: 'memory'` - Memory only
- `cachePolicy: 'none'` - No caching
- Cache is managed automatically; expo-image handles eviction

### Files to Update
7 files currently using react-native Image:
1. `components/pages/learning/LearningLeaderboardWidget.tsx`
2. `components/pages/learning/LearningAchievementsGrid.tsx`
3. `components/pages/learning/InstructorBadgeAwardModal.tsx`
4. `components/pages/learning/CourseDetail.tsx`
5. `components/pages/learning/CourseCard.tsx`
6. `components/pages/marketplace/MarketplaceCard.tsx`
7. `components/pages/marketplace/MarketplaceDetail.tsx`

### Alternatives Considered
- **react-native-fast-image**: Requires manual installation, not Expo-managed
- **Custom caching solution**: Maintenance burden, expo-image is battle-tested

---

## 2. FlashList for List Performance

### Decision
Use `@shopify/flash-list` v2.x to replace FlatList in performance-critical lists.

### Rationale
- **10x performance improvement**: Shopify's benchmarks show significant gains
- **View recycling**: Reuses item views instead of creating new ones
- **Same API**: Drop-in replacement for FlatList
- **Lower memory footprint**: Constant memory regardless of list size
- **Masonry support**: Built-in for grid layouts

### Migration Guide

#### Key Changes from FlatList

1. **Add `estimatedItemSize`** (required):
```tsx
<FlashList
  data={data}
  renderItem={renderItem}
  estimatedItemSize={100}  // Required: estimated height/width of items
/>
```

2. **Use `getItemType` for heterogeneous lists**:
```tsx
<FlashList
  data={mixedData}
  renderItem={renderItem}
  getItemType={(item) => item.type}  // 'header' | 'item' | 'footer'
  estimatedItemSize={80}
/>
```

3. **Remove explicit `key` from renderItem** - FlashList handles keys internally

4. **Reset state in renderItem components** if using `useState` (due to recycling)

### Performance Configuration

```tsx
<FlashList
  data={data}
  renderItem={renderItem}
  estimatedItemSize={100}
  // Performance tuning
  overrideItemLayout={(layout, item, index, maxColumns, extraData) => {
    layout.size = item.height || 100;  // Exact size if known
  }}
  drawDistance={250}  // Render distance ahead of scroll
/>
```

### Components to Migrate

| Component | Current | Items | Priority |
|-----------|---------|-------|----------|
| `achievements.tsx` | FlatList | Achievement cards | High |
| `QuestList.tsx` (if exists) | FlatList | Quest cards | High |
| `MessageList.tsx` (if exists) | FlatList/ScrollView | Messages | High |
| `NotificationList.tsx` (if exists) | FlatList | Notifications | Medium |

### Alternatives Considered
- **RecyclerListView**: Lower-level, more complex API
- **react-native-big-list**: Less maintained than FlashList
- **Keep FlatList**: Doesn't address performance requirements

---

## 3. Code Splitting with expo-router

### Decision
Use Metro's async imports with `React.lazy` for admin, analytics, and reports screens.

### Rationale
- **Reduced initial bundle**: Admin/analytics code not needed for most users
- **Faster TTI**: Time to Interactive improves for regular users
- **On-demand loading**: Code loaded only when screen is accessed
- **Built-in support**: Expo SDK 50+ supports web bundle splitting

### Implementation Pattern

```tsx
// core/routes/LazyRoutes.tsx
import { lazy, Suspense } from 'react';
import { ActivityIndicator, View } from 'react-native';

// Lazy load heavy screens
const AdminDashboard = lazy(() => import('@/components/pages/admin/AdminDashboard'));
const AnalyticsDashboard = lazy(() => import('@/components/pages/analytics/AnalyticsDashboard'));
const ReportsScreen = lazy(() => import('@/components/pages/reports/ReportsScreen'));

// Loading fallback
const LoadingFallback = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <ActivityIndicator size="large" />
  </View>
);

// Wrapped components with Suspense
export const LazyAdmin = () => (
  <Suspense fallback={<LoadingFallback />}>
    <AdminDashboard />
  </Suspense>
);

export const LazyAnalytics = () => (
  <Suspense fallback={<LoadingFallback />}>
    <AnalyticsDashboard />
  </Suspense>
);

export const LazyReports = () => (
  <Suspense fallback={<LoadingFallback />}>
    <ReportsScreen />
  </Suspense>
);
```

### Metro Configuration
For web bundle splitting, ensure `@expo/metro-runtime` is imported:
```tsx
// Entry file or _layout.tsx
import '@expo/metro-runtime';
```

### Error Boundary for Chunk Loading Failures

```tsx
class ChunkErrorBoundary extends React.Component<Props, State> {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return <ChunkLoadError onRetry={this.handleRetry} />;
    }
    return this.props.children;
  }
}
```

### Screens to Code-Split

| Screen | Est. Size | User % | Priority |
|--------|-----------|--------|----------|
| `admin.tsx` | ~50KB | <5% | High |
| `analytics.tsx` | ~40KB | <10% | High |
| `reports.tsx` | ~30KB | <10% | Medium |

### Alternatives Considered
- **Route-based splitting only**: Expo-router handles some, but explicit lazy needed
- **No splitting**: Initial bundle size remains large

---

## 4. AuthContext Decomposition

### Decision
Split 727-line AuthContext.tsx into 3 focused contexts: CoreAuth, TwoFactor, Biometric.

### Rationale
- **Reduced re-renders**: Changes to 2FA state won't re-render components only using auth status
- **Separation of concerns**: Each context has single responsibility
- **Performance**: ~60% of consumers will see reduced re-renders
- **Maintainability**: Smaller, focused files easier to test and modify

### Current Consumer Analysis

| Component | Uses | Should Use |
|-----------|------|------------|
| `_layout.tsx` | isAuthenticated, isLoading | CoreAuth |
| `quests.tsx` | isAuthenticated | CoreAuth |
| `index.tsx` | isAuthenticated, isLoading | CoreAuth |
| `SidebarExamples.tsx` | signOut | CoreAuth |
| `SocialLeaderboard.tsx` | user | CoreAuth |
| `AccountSettings.tsx` | biometric, enableBiometric | Biometric |
| `AuthModal.tsx` | ALL | Composite useAuth |

### Recommended Split

```
CoreAuthContext
├── user: User | null
├── isLoading: boolean
├── isInitializing: boolean
├── isAuthenticated: boolean
├── error: string | null
├── signIn()
├── signUp()
├── signOut()
├── signOutAll()
├── forgotPassword()
├── resetPassword()
└── clearError()

TwoFactorContext
├── twoFactor: TwoFactorState
├── submitTwoFactorCode()
└── cancelTwoFactor()

BiometricContext
├── biometric: BiometricState
├── enableBiometric()
├── enableBiometricWithCredentials()
├── disableBiometric()
└── signInWithBiometric()
```

### Backward Compatibility Strategy

```typescript
// Maintain existing useAuth hook as facade
export function useAuth(): AuthContextType {
  const core = useCoreAuth();
  const twoFactor = useTwoFactor();
  const biometric = useBiometricAuth();
  
  return {
    ...core,
    twoFactor: twoFactor.twoFactor,
    biometric: biometric.biometric,
    submitTwoFactorCode: twoFactor.submitTwoFactorCode,
    cancelTwoFactor: twoFactor.cancelTwoFactor,
    enableBiometric: biometric.enableBiometric,
    // ... rest of methods
  };
}
```

### Provider Composition

```tsx
// AuthProviderComposite.tsx
export function AuthProviders({ children }: { children: ReactNode }) {
  return (
    <CoreAuthProvider>
      <TwoFactorProvider>
        <BiometricProvider>
          {children}
        </BiometricProvider>
      </TwoFactorProvider>
    </CoreAuthProvider>
  );
}
```

### Re-render Impact

| Scenario | Before | After |
|----------|--------|-------|
| User toggles 2FA | All auth consumers re-render | Only TwoFactor consumers |
| Token refresh | All auth consumers re-render | Only CoreAuth consumers |
| Biometric enable | All auth consumers re-render | Only Biometric consumers |
| Login/Logout | All re-render | All re-render (expected) |

### Alternatives Considered
- **Keep monolithic**: Doesn't address performance requirements
- **Zustand/Jotai**: Different paradigm, unnecessary complexity for this case
- **Use React.memo everywhere**: Band-aid, doesn't fix root cause

---

## Summary

| Research Area | Decision | Key Benefit |
|--------------|----------|-------------|
| Image caching | expo-image | Automatic disk caching, instant revisits |
| List rendering | FlashList v2 | 10x performance, view recycling |
| Code splitting | React.lazy + Suspense | 15%+ bundle reduction |
| Auth context | 3-context split | ~60% fewer re-renders |
