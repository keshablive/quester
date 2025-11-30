# Quickstart: Client Performance Optimization

**Feature**: 018-client-performance
**Date**: 2025-11-29

## Prerequisites

- Node.js 18+
- Expo CLI installed
- React DevTools browser extension (for profiling)

## Setup

```bash
# Navigate to client directory
cd client

# Install dependencies (if not already)
npm install

# Start development server
npm run dev
```

## Development Workflow

### 1. Verify Current State

Before making changes, verify current behavior:

```bash
# Run TypeScript check
npx tsc --noEmit

# Check for existing any types
grep -r ": any" --include="*.ts" --include="*.tsx" core/
```

### 2. Make Changes by Priority

**P1 (Critical)**:
1. Remove mock data fallbacks from `courses.service.ts` and `certificates.service.ts`
2. Add React.memo to `QuestCard`, `MessageItem`, `PostCard`
3. Fix useEffect dependencies in `CommunicateDashboard.tsx`

**P2 (Important)**:
4. Remove deprecated `useDashboardData` hook
5. Fix `any` types in target files

**P3 (Enhancement)**:
6. Add AbortController support to API client

### 3. Validate Performance

After adding React.memo:

1. Open React DevTools → Profiler
2. Start recording
3. Scroll through a list (quests, messages)
4. Stop recording
5. Check that memoized components show "Did not render" on scroll

### 4. Validate Type Safety

```bash
# Run TypeScript in strict mode
npx tsc --noEmit --strict

# Should complete with no errors
```

### 5. Test Error Handling

1. Disable network (airplane mode or DevTools throttle)
2. Navigate to a page that fetches data
3. Verify inline error state appears (not mock data)
4. Verify toast notification for network error
5. Test retry button functionality

## Key Files

| Purpose | File |
|---------|------|
| API Client | `core/api/client.ts` |
| Mock Data Issues | `core/api/services/courses.service.ts` |
| Mock Data Issues | `core/api/services/certificates.service.ts` |
| React.memo Target | `components/pages/quests/QuestCard.tsx` |
| useEffect Issue | `components/pages/communicate/CommunicateDashboard.tsx` |
| Type Issues | `core/types/quest.ts`, `core/utils/error.ts`, `core/utils/common.ts` |
| Deprecated Hook | `core/hooks/queries/useDashboard.ts` |
| New Component | `components/shared/ErrorState.tsx` (to create) |

## Success Verification

- [ ] `npm run dev` starts without errors
- [ ] `npx tsc --noEmit` passes
- [ ] No `any` types in target files (grep returns empty)
- [ ] React DevTools shows memoized components not re-rendering on scroll
- [ ] Error states display correctly when API fails
- [ ] No console warnings about useEffect dependencies

## Troubleshooting

### TypeScript Errors After Removing `any`

If removing `any` causes cascade type errors:
1. Define proper interface for the data structure
2. Use generics for flexible typing
3. Use `unknown` with type guards for truly unknown data

### React.memo Not Working

If components still re-render:
1. Check if props are new objects each render (use useMemo)
2. Add custom comparison function as second argument
3. Verify parent isn't forcing re-render

### useEffect Infinite Loop

If fixing dependencies causes loop:
1. Extract fetch function with useCallback
2. Ensure callback deps are stable
3. Consider splitting into multiple effects
