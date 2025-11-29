# Feature Specification: Client TanStack Query Migration

**Feature Branch**: `020-client-tanstack-query-migration`  
**Created**: November 30, 2025  
**Status**: Draft  
**Input**: User description: "Client TanStack Query Migration - Migrate 10+ page components from manual useState/useEffect patterns to TanStack Query for caching, offline support, and request deduplication"

## Overview

The Quester client application currently has 10+ page components using manual `useState`/`useEffect` patterns for data fetching. This creates several problems:
- No request caching (data re-fetched on every navigation)
- No offline support (users see errors when disconnected)
- No request deduplication (multiple components fetching same data)
- Boilerplate code repeated in every component (loading, error, data states)
- No automatic background refetching (stale data shown to users)

The application already has TanStack Query infrastructure set up in `core/query/` with proper cache configuration, offline persistence, and query hooks for some features (learning, social, gamification). This feature extends that pattern to remaining page components.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Transaction History with Offline Access (Priority: P1)

As a user who makes purchases in the marketplace, I want my transaction history to load instantly when I navigate to the Transactions screen, and I want to see my recent transactions even when offline, so I can track my spending without waiting for network requests.

**Why this priority**: Transactions involve real money - users need reliable, fast access to their purchase history. This is also one of the largest manual-state components with the most boilerplate to eliminate.

**Independent Test**: Navigate to Transactions screen, observe instant load from cache. Turn on airplane mode, navigate away and back - transactions still visible with "offline" indicator.

**Acceptance Scenarios**:

1. **Given** user has previously viewed transactions, **When** user navigates to Transactions screen, **Then** cached transactions display immediately (<100ms) while fresh data loads in background
2. **Given** user is offline, **When** user navigates to Transactions screen, **Then** cached transactions display with "Viewing offline data" indicator
3. **Given** user is online and viewing transactions, **When** new transaction completes elsewhere, **Then** transaction list updates automatically within 30 seconds
4. **Given** user pulls down on transaction list, **When** pull-to-refresh gesture completes, **Then** fresh data loads from server and replaces stale data

---

### User Story 2 - Marketplace Browsing with Instant Navigation (Priority: P1)

As a user browsing the marketplace, I want items to load instantly when I navigate between screens, and I want previously viewed item details to be available immediately, so I can compare items without waiting for repeated network requests.

**Why this priority**: Marketplace is a revenue-generating feature. Slow loading causes cart abandonment. Currently uses manual state with no caching.

**Independent Test**: Browse marketplace, view item detail, go back, view same item - second view loads instantly from cache. View different item, observe that list maintains scroll position.

**Acceptance Scenarios**:

1. **Given** user viewed marketplace list, **When** user navigates away and returns, **Then** list displays from cache immediately with background refresh
2. **Given** user viewed item detail, **When** user views same item again, **Then** detail loads instantly from cache (<50ms)
3. **Given** user is viewing marketplace, **When** user filters or searches, **Then** results display progressively with loading skeleton for uncached items
4. **Given** user is offline, **When** user navigates to marketplace, **Then** cached items display with "Viewing offline data" indicator

---

### User Story 3 - Certificate Display with Prefetching (Priority: P2)

As a user who has completed courses, I want my certificates to load instantly when I navigate to view them, and I want certificate details to be prefetched when I hover or long-press on a certificate card, so viewing certificates feels instantaneous.

**Why this priority**: Certificates represent user achievements - instant display enhances the reward experience. Currently uses deprecated hook.

**Independent Test**: Complete a course, navigate to certificates, observe instant display. Long-press a certificate, navigate to detail - instant display.

**Acceptance Scenarios**:

1. **Given** user has earned certificates, **When** user navigates to Certificates screen, **Then** certificates display from cache immediately
2. **Given** user long-presses a certificate card, **When** user then taps to view detail, **Then** detail displays instantly (prefetched)
3. **Given** user is offline, **When** user views certificate list, **Then** cached certificates display with sharing disabled

---

### User Story 4 - Notification Settings with Optimistic Updates (Priority: P2)

As a user managing my notification preferences, I want changes to apply instantly when I toggle settings, even before the server confirms, so the UI feels responsive and I don't have to wait for network round-trips.

**Why this priority**: Settings changes are frequent, small operations that benefit greatly from optimistic updates. Provides snappy UI feel.

**Independent Test**: Toggle a notification setting - UI updates immediately. If server fails, UI reverts with error toast.

**Acceptance Scenarios**:

1. **Given** user is on notification settings, **When** user toggles a setting, **Then** UI updates immediately (optimistic) without waiting for server
2. **Given** server request fails after optimistic update, **When** error is received, **Then** UI reverts to previous state and shows error toast
3. **Given** user is offline, **When** user toggles setting, **Then** change is queued and synced when connection returns

---

### User Story 5 - Infinite Scroll Lists with Seamless Loading (Priority: P2)

As a user scrolling through long lists (followers, achievements, etc.), I want content to load seamlessly as I scroll without manual "Load More" buttons, and I want already-loaded items to remain visible when I scroll back up.

**Why this priority**: Current InfiniteScrollList component uses FlatList with manual pagination. TanStack Query's infinite queries provide better UX with automatic page management.

**Independent Test**: Scroll through followers list - new items load automatically as user approaches end. Scroll back up - previously loaded items still visible, no re-fetching.

**Acceptance Scenarios**:

1. **Given** user is viewing a paginated list, **When** user scrolls near the end, **Then** next page loads automatically without button press
2. **Given** user has scrolled through multiple pages, **When** user scrolls back to top, **Then** all loaded items remain visible (no re-fetching)
3. **Given** page load fails, **When** user scrolls to that section, **Then** retry button appears for just that page

---

### Edge Cases

- What happens when cache is corrupted? → Clear cache and refetch from server
- What happens when user is offline for extended period? → Show cached data with timestamp; warn "Data may be outdated" if cached data >1 hour old
- What happens when paginated data changes mid-scroll? → Handle cursor-based pagination to prevent duplicate/missing items
- What happens when optimistic update conflicts with server state? → Server state wins, UI reverts with notification
- What happens when cache grows too large? → Automatic eviction based on QUERY_GC_TIME (24 hours default)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST cache all fetched data using TanStack Query with differentiated stale times (1 min for financial/transaction data, 5 min for catalog/marketplace data)
- **FR-002**: System MUST display cached data immediately while fetching fresh data in background
- **FR-003**: System MUST persist query cache to AsyncStorage for offline access
- **FR-004**: System MUST deduplicate identical requests made within the stale time window
- **FR-005**: System MUST support pull-to-refresh to force cache invalidation and refetch
- **FR-006**: System MUST display loading skeletons during initial fetch (no cached data available)
- **FR-007**: System MUST display error states with retry capability when requests fail (3 retries before error)
- **FR-008**: System MUST support optimistic updates for mutation operations
- **FR-009**: System MUST revert optimistic updates when server returns error
- **FR-010**: System MUST support infinite scroll pagination with automatic page loading
- **FR-011**: System MUST prefetch data on user intent signals (hover, long-press, navigation)
- **FR-012**: System MUST indicate when displaying offline/stale data to users
- **FR-013**: System MUST queue mutations when offline and sync when connection returns; show toast with retry option if sync fails
- **FR-014**: System MUST log cache events (hits, misses, stale data) in development mode only for debugging

### Key Entities

- **Query Hook**: Wrapper around TanStack Query's useQuery with project-specific defaults (stale time, retry logic, error handling)
- **Mutation Hook**: Wrapper around useMutation with optimistic update support and error rollback
- **Infinite Query Hook**: Wrapper around useInfiniteQuery for paginated lists with cursor support
- **Query Key Factory**: Centralized key generation for cache invalidation and prefetching

### Components to Migrate

| Component | Current Pattern | Target Hook |
|-----------|----------------|-------------|
| app/transactions.tsx | useState/useEffect | useTransactions, useTransaction |
| app/marketplace.tsx | useState/useEffect | useMarketplaceProperties, useMarketplaceClassifieds |
| components/pages/learning/CertificateCard.tsx | deprecated hook | useCertificates, useCertificate |
| app/notifications.tsx (settings) | useState/useEffect | useNotificationSettings, useUpdateNotificationSettings |
| components/shared/InfiniteScrollList.tsx | FlatList/manual | useInfiniteQuery integration |
| components/shared/FollowLists.tsx | FlatList | useFollowers, useFollowing |

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Cached data displays in <100ms on subsequent screen visits (vs current 500-2000ms)
- **SC-002**: Zero network requests made for data accessed within differentiated stale times (per FR-001: 1 min transactions, 5 min catalog)
- **SC-003**: App remains functional when offline for previously visited screens
- **SC-004**: 50% reduction in data fetching boilerplate code (useState/useEffect patterns)
- **SC-005**: Optimistic updates complete UI change in <50ms (vs current 500-1000ms round-trip wait)
- **SC-006**: Infinite scroll maintains 60fps during pagination loads

## Assumptions

- TanStack Query infrastructure already exists in core/query/ and is properly configured
- AsyncStorage persistence is already set up via @tanstack/query-async-storage-persister
- API services in core/api/services/ return data in consistent formats
- Existing query hooks in core/hooks/queries/ serve as patterns to follow
- FlashList is available via OptimizedList wrapper for list components

## Clarifications

### Session 2025-11-30

- Q: How many retry attempts before showing error to user? → A: 3 retries (TanStack Query default)
- Q: Should stale times differ by data type? → A: Yes, 1 min for transactions, 5 min for marketplace/certificates
- Q: When to warn users about outdated offline data? → A: Warn when cached data is older than 1 hour
- Q: How to handle queued mutation sync failures? → A: Toast notification with retry option
- Q: Should cache behavior be observable? → A: Log cache events in development mode only

## Out of Scope

- Server-side changes (API endpoints remain unchanged)
- Real-time subscriptions (WebSocket integration is separate feature)
- GraphQL migration (REST APIs continue to be used)
- Database caching (this is client-side caching only)
