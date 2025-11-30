# Implementation Plan: Client Image & List Performance Optimization

**Branch**: `019-client-image-list-performance` | **Date**: November 29, 2025 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/019-client-image-list-performance/spec.md`

## Summary

Optimize client-side performance by: (1) replacing `react-native` Image with `expo-image` for automatic caching with 100MB limit, (2) migrating `FlatList` to `@shopify/flash-list` for 10x faster list rendering, (3) implementing route-based code splitting for admin/analytics/reports screens, and (4) decomposing the 727-line AuthContext into focused contexts (AuthState, TwoFactor, Biometric) to reduce unnecessary re-renders.

## Technical Context

**Language/Version**: TypeScript 5.9, React 19.1.0, React Native 0.81.5  
**Primary Dependencies**: Expo SDK 54, expo-router 6.0.10, TanStack Query 5.90, NativeWind 4.2  
**Storage**: AsyncStorage (auth tokens), expo-secure-store (credentials), expo-image disk cache  
**Testing**: Manual testing via Expo Go, React DevTools Profiler for render verification  
**Target Platform**: iOS 15+, Android 10+, Web (via expo-web)  
**Project Type**: Mobile app with cross-platform support (Expo managed workflow)  
**Performance Goals**: 60fps list scrolling, <100ms image display on revisit, 15% bundle reduction  
**Constraints**: 100MB max image cache, maintain backward compatibility during AuthContext migration  
**Scale/Scope**: ~50 screens, 7 Image usages, 8+ FlatList/ScrollView components, 727-line AuthContext

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Multi-Tenancy | ✅ N/A | Client-side feature, no database queries |
| II. Security First | ✅ Pass | No sensitive data handling changes; auth tokens remain secure |
| III. Type Safety | ⚠️ Watch | Must maintain strict typing for new components and split contexts |
| IV. Error Handling | ⚠️ Watch | Image load errors, chunk loading failures need explicit handling |
| V. Context Propagation | ✅ Pass | AuthContext split maintains proper context patterns |
| VI. Consistency & Pattern Adherence | ✅ Pass | Following existing patterns; expo-image/FlashList are standard Expo patterns |
| VII. Observability & Debugging | ⚠️ Watch | Log image cache events, chunk loading metrics |

**Gate Status**: ✅ PASS - No violations requiring justification

## Project Structure

### Documentation (this feature)

```text
specs/019-client-image-list-performance/
├── plan.md              # This file
├── research.md          # Phase 0 output - expo-image, FlashList, code splitting research
├── data-model.md        # Phase 1 output - Context types, image cache config
├── quickstart.md        # Phase 1 output - Migration guide
├── contracts/           # Phase 1 output - TypeScript interfaces for split contexts
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
client/
├── core/
│   ├── auth/
│   │   ├── AuthContext.tsx          # MODIFY: Split into multiple contexts
│   │   ├── AuthStateContext.tsx     # NEW: Core auth state only
│   │   ├── TwoFactorContext.tsx     # NEW: 2FA-specific state
│   │   ├── BiometricContext.tsx     # NEW: Biometric-specific state
│   │   ├── AuthProviderComposite.tsx # NEW: Combines all auth providers
│   │   └── types.ts                 # MODIFY: Add split context types
│   ├── components/
│   │   ├── OptimizedImage.tsx       # NEW: expo-image wrapper component
│   │   └── OptimizedList.tsx        # NEW: FlashList wrapper component
│   └── routes/
│       └── LazyRoutes.tsx           # NEW: Code-split route definitions
├── components/
│   └── pages/
│       ├── learning/                # MODIFY: Replace Image → OptimizedImage
│       │   ├── CourseCard.tsx
│       │   ├── CourseDetail.tsx
│       │   ├── LearningAchievementsGrid.tsx
│       │   ├── LearningLeaderboardWidget.tsx
│       │   └── InstructorBadgeAwardModal.tsx
│       └── marketplace/             # MODIFY: Replace Image → OptimizedImage
│           ├── MarketplaceCard.tsx
│           └── MarketplaceDetail.tsx
├── app/
│   ├── _layout.tsx                  # MODIFY: Use new AuthProviderComposite
│   ├── admin.tsx                    # MODIFY: Lazy load
│   ├── analytics.tsx                # MODIFY: Lazy load
│   ├── reports.tsx                  # MODIFY: Lazy load
│   └── achievements.tsx             # MODIFY: FlatList → FlashList
└── package.json                     # MODIFY: Add expo-image, @shopify/flash-list
```

**Structure Decision**: Web application structure - client is the frontend with existing server backend. Changes are client-only, focused on performance optimization without architectural changes.

## Complexity Tracking

> No constitution violations requiring justification. Feature follows established patterns.
