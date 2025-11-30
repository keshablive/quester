# Quickstart Guide: Client Image & List Performance Optimization

**Feature**: 019-client-image-list-performance  
**Date**: November 29, 2025

## Prerequisites

Before starting implementation:

1. **Expo SDK 54+** - Already satisfied (package.json shows `"expo": "^54.0.0"`)
2. **TypeScript 5.9+** - Already satisfied
3. **Branch**: `019-client-image-list-performance`

## Installation

### Step 1: Install Dependencies

```bash
cd client
npx expo install expo-image @shopify/flash-list
```

This installs:
- `expo-image` - High-performance image component with caching
- `@shopify/flash-list` - 10x faster list rendering

### Step 2: Verify Installation

```bash
npx expo doctor
```

No additional configuration needed - both packages work out of the box with Expo.

---

## Quick Implementation Examples

### 1. Replace Image with expo-image

**Before:**
```tsx
import { Image } from 'react-native';

<Image 
  source={{ uri: course.imageUrl }} 
  style={{ width: 200, height: 150 }} 
/>
```

**After:**
```tsx
import { Image } from 'expo-image';

<Image 
  source={course.imageUrl}  // Simpler API - string works directly
  style={{ width: 200, height: 150 }}
  contentFit="cover"
  transition={300}  // Smooth fade-in
  placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}  // Optional
/>
```

### 2. Replace FlatList with FlashList

**Before:**
```tsx
import { FlatList } from 'react-native';

<FlatList
  data={achievements}
  renderItem={({ item }) => <AchievementCard achievement={item} />}
  keyExtractor={(item) => item.id}
/>
```

**After:**
```tsx
import { FlashList } from '@shopify/flash-list';

<FlashList
  data={achievements}
  renderItem={({ item }) => <AchievementCard achievement={item} />}
  keyExtractor={(item) => item.id}
  estimatedItemSize={100}  // Required: approximate item height
/>
```

### 3. Code Splitting with React.lazy

**Before (admin.tsx):**
```tsx
import { AdminDashboard } from '@/components/pages/admin/AdminDashboard';

export default function AdminScreen() {
  return <AdminDashboard />;
}
```

**After:**
```tsx
import { lazy, Suspense } from 'react';
import { ActivityIndicator, View } from 'react-native';

const AdminDashboard = lazy(() => import('@/components/pages/admin/AdminDashboard'));

export default function AdminScreen() {
  return (
    <Suspense fallback={
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    }>
      <AdminDashboard />
    </Suspense>
  );
}
```

### 4. Using Split Auth Contexts

**Before (any component):**
```tsx
import { useAuth } from '@/core/auth/AuthContext';

function MyComponent() {
  const { isAuthenticated, user, biometric } = useAuth();
  // Component re-renders when ANY auth state changes
}
```

**After (optimized):**
```tsx
import { useCoreAuth } from '@/core/auth/hooks/useCoreAuth';

function MyComponent() {
  const { isAuthenticated, user } = useCoreAuth();
  // Component only re-renders when core auth state changes
}
```

**For backward compatibility (no changes needed):**
```tsx
import { useAuth } from '@/core/auth/AuthContext';
// useAuth() still works exactly as before
```

---

## File-by-File Migration Checklist

### expo-image Migration (7 files)

| File | Replace | With |
|------|---------|------|
| `components/pages/learning/CourseCard.tsx` | `Image` from react-native | `Image` from expo-image |
| `components/pages/learning/CourseDetail.tsx` | `Image` from react-native | `Image` from expo-image |
| `components/pages/learning/LearningLeaderboardWidget.tsx` | `Image` from react-native | `Image` from expo-image |
| `components/pages/learning/LearningAchievementsGrid.tsx` | `Image` from react-native | `Image` from expo-image |
| `components/pages/learning/InstructorBadgeAwardModal.tsx` | `Image` from react-native | `Image` from expo-image |
| `components/pages/marketplace/MarketplaceCard.tsx` | `Image` from react-native | `Image` from expo-image |
| `components/pages/marketplace/MarketplaceDetail.tsx` | `Image` from react-native | `Image` from expo-image |

### FlashList Migration

| File | Replace | Notes |
|------|---------|-------|
| `app/achievements.tsx` | `FlatList` | Add `estimatedItemSize={80}` |
| Other list components | `FlatList` | Find with `grep -r "FlatList" components/` |

### Code Splitting

| File | Action |
|------|--------|
| `app/admin.tsx` | Wrap with React.lazy + Suspense |
| `app/analytics.tsx` | Wrap with React.lazy + Suspense |
| `app/reports.tsx` | Wrap with React.lazy + Suspense |

### AuthContext Split

| New File | Purpose |
|----------|---------|
| `core/auth/contexts/CoreAuthContext.tsx` | User, tokens, basic auth methods |
| `core/auth/contexts/TwoFactorContext.tsx` | 2FA state and methods |
| `core/auth/contexts/BiometricContext.tsx` | Biometric state and methods |
| `core/auth/providers/AuthProviders.tsx` | Composite provider |
| `core/auth/hooks/useCoreAuth.ts` | Hook for core auth only |
| `core/auth/hooks/useTwoFactor.ts` | Hook for 2FA only |
| `core/auth/hooks/useBiometricAuth.ts` | Hook for biometric only |

---

## Testing Checklist

### Image Caching
- [ ] Navigate to screen with images
- [ ] Navigate away
- [ ] Return to screen - images should appear instantly
- [ ] Check network tab - no re-downloads

### List Performance
- [ ] Open achievements screen with 50+ items
- [ ] Scroll rapidly up and down
- [ ] No visible jank or stuttering
- [ ] Memory usage remains stable

### Code Splitting
- [ ] Measure initial bundle size before/after
- [ ] Navigate to admin screen
- [ ] Verify loading indicator appears
- [ ] Screen loads within 2 seconds

### Auth Context
- [ ] Existing auth flows still work
- [ ] Toggle 2FA settings
- [ ] Verify unrelated screens don't re-render (React DevTools)

---

## Common Issues & Solutions

### expo-image not caching

**Issue**: Images re-download on each visit

**Solution**: Ensure `cachePolicy="disk"` (default, but check if overridden)

```tsx
<Image source={url} cachePolicy="disk" />
```

### FlashList blank items

**Issue**: List shows blank items while scrolling

**Solution**: Ensure `estimatedItemSize` is close to actual item size

```tsx
// Measure your item height, then set it
<FlashList estimatedItemSize={120} />
```

### Code split chunk fails to load

**Issue**: Network error loading chunk

**Solution**: Wrap in error boundary with retry

```tsx
<ErrorBoundary onError={handleChunkError} onRetry={reload}>
  <Suspense fallback={<Loading />}>
    <LazyComponent />
  </Suspense>
</ErrorBoundary>
```

### useAuth() throws error after split

**Issue**: "useAuth must be used within AuthProvider"

**Solution**: Ensure `_layout.tsx` uses new `AuthProviders` wrapper

```tsx
// app/_layout.tsx
import { AuthProviders } from '@/core/auth';

<AuthProviders>
  {children}
</AuthProviders>
```

---

## Performance Verification

### Bundle Size
```bash
npx expo export --platform web --output-dir dist
du -sh dist/
```

### React DevTools Profiler
1. Enable React DevTools in Expo Go
2. Start recording
3. Perform actions (login, toggle settings)
4. Check which components re-rendered

### Expected Outcomes
- [ ] Images: <100ms display on revisit
- [ ] Lists: 60fps maintained during scroll
- [ ] Bundle: 15%+ smaller initial size
- [ ] Re-renders: Reduced by ~60% for non-auth operations
