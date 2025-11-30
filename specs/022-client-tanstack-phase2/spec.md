# Feature Specification: Complete TanStack Query Migration Phase 2

**Feature Branch**: `022-client-tanstack-phase2`  
**Created**: November 30, 2025  
**Status**: Draft  
**Input**: User description: "Complete TanStack Query migration phase 2 - migrate remaining components (achievements, badges, admin, analytics, quests, social) from useState/useEffect to TanStack Query hooks"

## Overview

This specification continues the TanStack Query migration started in specs 020 and 021. The goal is to migrate all remaining components that still use `useState/useEffect` patterns for data fetching to use TanStack Query hooks, providing unified caching, automatic background refresh, offline support, and optimistic updates across the entire application.

### Background

- **Spec 020**: Established TanStack Query infrastructure and migrated TransactionList, MarketplaceList, CertificateList, FollowLists
- **Spec 021**: Migrated TransactionDetail, MarketplaceDetail, NotificationSettings with optimistic updates
- **Spec 022 (this)**: Complete migration of remaining 12+ components in achievements, badges, admin, analytics, quests, and social domains

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Instant Achievement Display with Cache (Priority: P1)

As a user viewing my achievements and badges, I want to see them instantly from cache when returning to the screen, so I don't have to wait for network requests every time.

**Why this priority**: Achievements and badges are core gamification elements users access frequently. Caching provides immediate feedback and reinforces engagement.

**Independent Test**: Open achievements screen → navigate away → return → data appears instantly (<100ms) from cache

**Acceptance Scenarios**:

1. **Given** user has viewed achievements before, **When** user navigates to achievements screen, **Then** cached achievements display immediately while background refresh occurs
2. **Given** user is offline with cached achievement data, **When** user opens achievements screen, **Then** cached data displays with offline indicator
3. **Given** user earns a new achievement, **When** user views achievements, **Then** new achievement appears after background refresh
4. **Given** user pulls down on achievements list, **When** refresh completes, **Then** list updates with fresh data from server

---

### User Story 2 - Responsive Quest Progress with Optimistic Updates (Priority: P1)

As a user completing quest steps, I want to see my progress update immediately when I complete an action, so I feel rewarded and engaged without waiting for server confirmation.

**Why this priority**: Quest progress is the primary engagement loop. Immediate feedback is critical for user satisfaction and continued engagement.

**Independent Test**: Complete a quest step → UI updates instantly → server confirms (or reverts on error)

**Acceptance Scenarios**:

1. **Given** user is on quest detail screen, **When** user completes a quest step, **Then** progress bar and step status update immediately (optimistic)
2. **Given** quest step completion fails on server, **When** error occurs, **Then** UI reverts to previous state and shows error toast
3. **Given** user has viewed quest before, **When** user returns to quest detail, **Then** progress displays from cache instantly
4. **Given** user is offline, **When** user attempts to complete quest step, **Then** action queues for sync when online

---

### User Story 3 - Admin Dashboard with Real-time Stats (Priority: P2)

As an admin viewing the dashboard, I want to see key stats with automatic refresh, so I have up-to-date information without manual refresh.

**Why this priority**: Admin dashboard is accessed less frequently but requires accurate data. Auto-refresh ensures admins always see current stats.

**Independent Test**: Open admin dashboard → stats load with stale-while-revalidate → background refresh updates data

**Acceptance Scenarios**:

1. **Given** admin opens dashboard, **When** page loads, **Then** cached stats display immediately while fresh data loads
2. **Given** admin is viewing dashboard, **When** background refresh completes, **Then** stats update smoothly without page flicker
3. **Given** admin data is stale (>5 minutes old), **When** admin views dashboard, **Then** stale indicator appears with "last updated" timestamp
4. **Given** admin dashboard fetch fails, **When** error occurs, **Then** error state displays with retry button

---

### User Story 4 - Analytics Dashboard with Efficient Data Loading (Priority: P2)

As a user viewing my analytics, I want charts and stats to load efficiently without blocking the UI, so I can see partial data while the rest loads.

**Why this priority**: Analytics involves multiple data sources. Progressive loading improves perceived performance.

**Independent Test**: Open analytics → summary loads first → charts load progressively → all data cached for instant return

**Acceptance Scenarios**:

1. **Given** user opens analytics, **When** page loads, **Then** summary stats appear first, charts load progressively
2. **Given** user has viewed analytics before, **When** user returns, **Then** all cached data displays instantly
3. **Given** user selects different time range, **When** range changes, **Then** new data loads with loading indicator on affected sections only
4. **Given** chart data fails to load, **When** error occurs, **Then** only failed chart shows error, other data remains visible

---

### User Story 5 - Social Feed with Infinite Scroll (Priority: P2)

As a user browsing the social feed, I want posts to load continuously as I scroll, with previously viewed posts persisting in memory.

**Why this priority**: Social features drive engagement. Smooth infinite scroll is expected behavior for social feeds.

**Independent Test**: Scroll through posts → new posts load automatically → scroll back → previous posts still visible

**Acceptance Scenarios**:

1. **Given** user is viewing social feed, **When** user scrolls to bottom, **Then** next page loads automatically
2. **Given** user has scrolled through 50 posts, **When** user scrolls back to top, **Then** all 50 posts remain in memory (no reload)
3. **Given** user pulls down on feed, **When** refresh completes, **Then** new posts prepend to existing list
4. **Given** user likes a post, **When** action occurs, **Then** like count updates immediately (optimistic)

---

### User Story 6 - Group Management with Cache (Priority: P3)

As a user managing groups, I want group lists and details to load quickly and reflect my actions immediately.

**Why this priority**: Groups are a secondary social feature. Caching improves UX but is less critical than core features.

**Independent Test**: View group list → view group detail → return to list → both cached

**Acceptance Scenarios**:

1. **Given** user views group list, **When** list loads, **Then** data is cached for instant subsequent access
2. **Given** user joins a group, **When** action completes, **Then** UI updates immediately and cache invalidates
3. **Given** user views group messages, **When** navigating away and back, **Then** messages appear from cache

---

### Edge Cases

- What happens when user has no achievements/badges? → Show empty state with call-to-action
- How does system handle quest completion during offline? → Queue action, sync when online, show pending indicator
- What if analytics API returns partial data? → Display available data, show error for missing sections
- How does infinite scroll handle reaching end of feed? → Show "You're all caught up" message
- What if admin stats API is slow (>3s)? → Show skeleton loaders, don't block other stats

## Requirements *(mandatory)*

### Functional Requirements

**Achievement & Badge Hooks**:
- **FR-001**: System MUST provide `useAchievements()` hook returning paginated achievements with cache
- **FR-002**: System MUST provide `useUserBadges(userId)` hook returning user's earned badges
- **FR-003**: System MUST provide `useBadges()` hook returning all available badges with earn status
- **FR-004**: Achievement/badge data MUST be cached with 5-minute stale time

**Quest Hooks**:
- **FR-005**: System MUST provide `useQuestProgress(questId)` hook with real-time progress data
- **FR-006**: System MUST provide `useCompleteQuestStep()` mutation with optimistic updates
- **FR-007**: Quest mutations MUST queue for offline sync if network unavailable
- **FR-008**: Quest detail MUST show cached progress immediately on return navigation

**Admin Hooks**:
- **FR-009**: System MUST provide `useAdminStats()` hook for dashboard statistics
- ~~**FR-010**: System MUST provide `useAdminUsers()` hook with search and pagination~~ *[REMOVED - AdminUsers component out of scope; admin uses single dashboard]*
- **FR-011**: Admin data MUST auto-refresh every 5 minutes while dashboard is visible

**Analytics Hooks**:
- **FR-012**: System MUST provide `useUserAnalytics()` hook for user statistics
- **FR-013**: System MUST provide `useEngagementChart(timeRange)` hook for chart data
- **FR-014**: Analytics queries MUST support independent loading (charts load separately)

**Social Hooks**:
- **FR-015**: System MUST provide `useInfiniteSocialPosts()` hook with cursor-based pagination (20 items per page)
- **FR-016**: System MUST provide `useLikePost()` mutation with optimistic count update
- **FR-017**: Social feed MUST maintain scroll position and limit to 10 pages in memory (200 posts max) before garbage collection
- **FR-018**: System MUST provide `useGroups()` and `useGroup(groupId)` hooks with cache

**Cross-Cutting**:
- **FR-019**: All new hooks MUST use centralized `queryKeys` factory from `core/query/keys.ts`
- **FR-020**: All hooks MUST integrate with existing offline persistence (AsyncStorage)
- **FR-021**: All list components MUST show empty state when no data available
- **FR-022**: All detail components MUST show error state with retry on fetch failure
- **FR-023**: Background refetch MUST show subtle loading indicator (spinner in header/pull area)
- **FR-024**: Failed mutations MUST show error toast with manual retry button (no automatic retry)

### Key Entities

- **Achievement**: User accomplishment with title, description, icon, earned status, earnedAt timestamp
- **Badge**: Gamification reward with name, description, tier (bronze/silver/gold), imageUrl, criteria
- **Quest**: Multi-step challenge with title, description, steps[], progress, rewards, status
- **QuestStep**: Individual quest action with description, isCompleted, completedAt
- **SocialPost**: User-generated content with author, content, likes, comments, createdAt
- **Group**: User community with name, description, members, memberCount, isJoined

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Cached screens load in <100ms (vs 500-2000ms current network fetch)
- **SC-002**: Zero `useState/useEffect` data fetching patterns in migrated components
- **SC-003**: All migrated components support offline viewing with cached data
- **SC-004**: Optimistic updates complete UI update in <50ms (before server response)
- **SC-005**: Infinite scroll maintains 60fps during continuous scrolling
- **SC-006**: Background refresh occurs automatically per configured stale times
- **SC-007**: Failed mutations show error toast and revert optimistic changes within 500ms

## Migration Targets

### Components to Migrate

| Component | Current Pattern | Target Hook(s) | Priority |
|-----------|-----------------|----------------|----------|
| `AchievementsList.tsx` | useState/useEffect | `useAchievements()` | P1 |
| `AchievementCard.tsx` | Props only | No change (presentational) | - |
| `BadgesList.tsx` | useState/useEffect | `useBadges()`, `useUserBadges()` | P1 |
| `BadgeCard.tsx` | Props only | No change (presentational) | - |
| `QuestDetail.tsx` | useState/useEffect | `useQuest()`, `useQuestProgress()` | P1 |
| `QuestsList.tsx` | useState/useEffect | `useQuests()` | P1 |
| `AdminDashboard.tsx` | useState/useEffect | `useAdminStats()` | P2 |
| ~~`AdminUsers.tsx`~~ | ~~useState/useEffect~~ | ~~`useAdminUsers()`~~ | ~~P2~~ *[OUT OF SCOPE]* |
| `AnalyticsDashboard.tsx` | useState/useEffect | `useUserAnalytics()`, `useEngagementChart()` | P2 |
| `SocialFeed.tsx` | useState/useEffect | `useInfiniteSocialPosts()` | P2 |
| `PostCard.tsx` | Props + mutation props | `useLikePost()` | P2 |
| `GroupList.tsx` | useState/useEffect | `useGroups()` | P3 |
| `GroupDetail.tsx` | useState/useEffect | `useGroup()` | P3 |

### Hooks to Create

| Hook | Query/Mutation | Service Method | Cache Time |
|------|----------------|----------------|------------|
| `useAchievements` | Query | `gamificationService.getAchievements()` | 5 min |
| `useUserBadges` | Query | `gamificationService.getUserBadges()` | 5 min |
| `useBadges` | Query | `gamificationService.getBadges()` | 10 min |
| `useQuestProgress` | Query | `questService.getProgress()` | 1 min |
| `useCompleteQuestStep` | Mutation | `questService.completeStep()` | - |
| `useAdminStats` | Query | `adminService.getStats()` | 5 min |
| ~~`useAdminUsers`~~ | ~~Query~~ | ~~`adminService.getUsers()`~~ | ~~2 min~~ *[OUT OF SCOPE]* |
| `useUserAnalytics` | Query | `analyticsService.getUserAnalytics()` | 5 min |
| `useEngagementChart` | Query | `analyticsService.getEngagement()` | 5 min |
| `useInfiniteSocialPosts` | Infinite Query | `socialService.getPosts()` | 2 min |
| `useLikePost` | Mutation | `socialService.likePost()` | - |
| `useGroups` | Query | `socialService.getGroups()` | 5 min |
| `useGroup` | Query | `socialService.getGroup()` | 5 min |

## Clarifications

### Session 2025-11-30

- Q: What to do if a service method is missing or has a different signature during implementation? → A: Extend existing service with client-side adapter/wrapper to match expected signature
- Q: What page size and memory limit for infinite scroll pagination? → A: 20 items per page, limit to 10 pages in memory (200 posts max)
- Q: What retry behavior for failed mutations after optimistic revert? → A: Show error toast with manual retry button (no auto-retry)

## Assumptions

- Existing TanStack Query infrastructure from spec 020 is stable and working
- All target services (`gamificationService`, `questService`, `adminService`, `analyticsService`, `socialService`) have the required API methods; if methods are missing or have different signatures, create client-side adapter/wrapper to match expected hook interface
- Query key factory in `core/query/keys.ts` can be extended for new domains
- Existing `OfflineIndicator` and `StaleDataIndicator` components can be reused

## Out of Scope

- Server-side changes (API endpoints assumed to exist)
- New UI designs (using existing component patterns)
- WebSocket real-time updates (separate future spec)
- Push notification integration (separate feature)
