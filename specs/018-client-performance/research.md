# Research: Client Performance Optimization

**Feature**: 018-client-performance
**Date**: 2025-11-29
**Status**: Complete

## Research Tasks

### 1. Mock Data Fallback Inventory

**Objective**: Identify all services returning mock data in catch blocks

**Findings**:

| File | Line | Issue |
|------|------|-------|
| `core/api/services/courses.service.ts` | 46 | Returns mock courses array on error |
| `core/api/services/courses.service.ts` | 82 | Returns mock course object on error |
| `core/api/services/courses.service.ts` | 105 | Returns mock lessons array on error |
| `core/api/services/certificates.service.ts` | 22 | Returns mock certificates on error |

**Decision**: Remove all mock data fallbacks, throw errors to propagate to UI
**Rationale**: Silent failures hide production issues; error boundaries handle display
**Alternatives Rejected**: Keeping fallbacks with error logging - still hides issues from users

---

### 2. Components Missing React.memo

**Objective**: Identify list item components that re-render unnecessarily

**Findings**:

| Component | File | Rendered In | Impact |
|-----------|------|-------------|--------|
| `QuestCard` | `components/pages/quests/QuestCard.tsx` | QuestList (FlatList) | High - many items |
| `MessageItem` | `components/pages/communicate/Messages/MessageItem.tsx` | MessageList | High - many items |
| `PostCard` | `components/pages/communicate/Social/PostCard.tsx` | Feed | Medium - social feed |

**Decision**: Wrap with React.memo, add custom comparison for complex props
**Rationale**: FlatList/ScrollView renders cause all children to re-render
**Alternatives Rejected**: useMemo on parent - doesn't prevent child re-renders

---

### 3. useEffect Dependency Issues

**Objective**: Identify useEffect hooks with incorrect dependencies

**Findings**:

| File | Line | Issue | Risk |
|------|------|-------|------|
| `CommunicateDashboard.tsx` | 51 | Dependencies: `[recentThreads]` but uses `unreadCount`, `userGroups` inside | Stale closures |
| `CommunicateDashboard.tsx` | 51 | `loadDashboardData` called but not in deps | Missing dependency |

**Decision**: Fix dependencies, use useCallback for functions, consider extracting to separate effects
**Rationale**: Exhaustive deps rule prevents stale closure bugs
**Alternatives Rejected**: Disable lint rule - masks real bugs

---

### 4. Deprecated Hooks Inventory

**Objective**: Identify deprecated hooks and their usages

**Findings**:

| Hook | File | Issue | Usages |
|------|------|-------|--------|
| `useDashboardData` | `core/hooks/queries/useDashboard.ts` | Duplicates TanStack Query caching logic | 0 (defined but unused) |

**Decision**: Remove `useDashboardData` entirely - it's not being used
**Rationale**: Dead code removal; already migrated to TanStack Query hooks
**Alternatives Rejected**: Keep for backward compat - no consumers exist

---

### 5. Type Safety (`any` Usage) Inventory

**Objective**: Identify files with `any` types that need fixing

**Findings**:

| File | Line | Usage | Fix Strategy |
|------|------|-------|--------------|
| `core/utils/error.ts` | 131 | `(error as any).message` | Use type guard |
| `core/utils/error.ts` | 185 | `Record<string, any>` | Use `Record<string, unknown>` |
| `core/types/quest.ts` | 13-14 | `content: any; metadata?: any` | Define proper interfaces |
| `core/utils/common.ts` | 98 | `(...args: any[]) => any` | Use generic types |
| `core/utils/common.ts` | 129 | `(...args: any[]) => any` | Use generic types |
| `core/types/index.ts` | 112-115 | Theme types with `any` | Define ColorValue type |
| `core/types/components.ts` | 149, 151, 179, 189 | Select/Form types | Use generics properly |

**Decision**: Replace with proper types, use `unknown` with type guards where needed
**Rationale**: TypeScript strict mode compliance per constitution
**Alternatives Rejected**: `// @ts-ignore` - hides type errors

---

### 6. AbortController Pattern Research

**Objective**: Best practices for request cancellation in React Native + TanStack Query

**Findings**:

- TanStack Query provides `signal` in queryFn for automatic cancellation
- API client should accept AbortSignal parameter
- Default timeout: 10 seconds (per clarification)
- Mutations should NOT be cancelled

**Decision**: 
1. Update `apiClient` to accept optional `signal` parameter
2. Add default 10s timeout via AbortController
3. Pass signal through to fetch/axios calls
4. TanStack Query handles component unmount cancellation automatically

**Rationale**: Native browser/RN support, integrates with TanStack Query
**Alternatives Rejected**: Manual cleanup in useEffect - TanStack Query does this better

---

### 7. Error Display Pattern Research

**Objective**: Best practices for inline errors vs toast notifications

**Findings**:

- Inline errors: Best for data/content failures (empty state replacement)
- Toast notifications: Best for network-level issues (non-blocking)
- Existing: `@/components/ui` has Toast infrastructure
- Existing: Need to create ErrorState component for inline errors

**Decision**: 
1. Create `ErrorState` shared component for inline errors
2. Use existing Toast for network errors
3. Error boundaries at route level catch unhandled errors

**Rationale**: Per clarification - combination approach
**Alternatives Rejected**: Full-screen error boundary only - too disruptive

---

## Summary

| Research Area | Status | Complexity |
|---------------|--------|------------|
| Mock data removal | ✅ Complete | Low - 4 files |
| React.memo addition | ✅ Complete | Low - 3 components |
| useEffect fixes | ✅ Complete | Medium - logic restructure |
| Hook deprecation | ✅ Complete | Low - remove unused code |
| Type safety | ✅ Complete | Medium - 7 files |
| AbortController | ✅ Complete | Medium - API client update |
| Error display | ✅ Complete | Low - 1 new component |

**All NEEDS CLARIFICATION items resolved via spec clarification session.**
