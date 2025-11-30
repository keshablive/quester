# Feature Specification: Complete TanStack Query Component Integration

**Feature Branch**: `021-client-tanstack-completion`  
**Created**: November 30, 2025  
**Status**: Draft  
**Input**: User description: "Complete TanStack Query migration - Wire existing query hooks into remaining page components (transactions, marketplace, certificates, settings), replacing useState/useEffect patterns with cached, offline-capable data fetching"

## Overview

This feature completes the TanStack Query migration started in spec 020. The infrastructure is fully built:

- Query hooks exist in `core/hooks/queries/` for all major features (transactions, marketplace, certificates, notifications)
- Query client configured with differentiated stale times and offline persistence
- Mutation hooks with optimistic updates ready in `core/hooks/mutations/`
- InfiniteScrollList component supports TanStack Query infinite queries

The remaining work is **integration** — wiring these existing hooks into page components that still use manual `useState`/`useEffect` patterns. This is primarily a component update task, not infrastructure work.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Instant Transaction History (Priority: P1)

As a user who makes purchases, I want my transaction history to display instantly when I return to the Transactions screen, showing cached data while fresh data loads in the background.

**Why this priority**: Transactions involve financial data. Users check transaction history frequently to verify purchases. Instant display builds trust and reduces perceived latency.

**Independent Test**: Open Transactions screen, note load time. Navigate away, return immediately — transactions should appear in <100ms from cache.

**Acceptance Scenarios**:

1. **Given** user has previously viewed transactions, **When** user navigates to Transactions screen, **Then** cached transactions display immediately while background refresh occurs
2. **Given** user pulls down on transaction list, **When** pull gesture completes, **Then** fresh data loads and replaces cache
3. **Given** user is offline with cached data, **When** user opens Transactions screen, **Then** cached data displays with "Viewing offline data" indicator
4. **Given** user scrolls through transactions, **When** user approaches list end, **Then** next page loads automatically without button press

---

### User Story 2 - Fast Marketplace Browsing (Priority: P1)

As a user browsing properties and classifieds, I want listings to load instantly when I navigate between views, so I can compare items without waiting for repeated network requests.

**Why this priority**: Marketplace is revenue-generating. Slow browsing causes abandonment. Currently uses manual state with no caching.

**Independent Test**: Browse marketplace, view a property detail, go back to list, view same property — second view should be instant from cache.

**Acceptance Scenarios**:

1. **Given** user viewed marketplace list, **When** user navigates away and returns, **Then** list displays from cache immediately
2. **Given** user viewed property detail, **When** user views same property again, **Then** detail loads instantly (<100ms)
3. **Given** user switches between Properties and Classifieds tabs, **When** returning to a previously viewed tab, **Then** that tab's data displays from cache
4. **Given** user is offline, **When** user navigates to marketplace, **Then** cached items display with offline indicator

---

### User Story 3 - Responsive Settings Updates (Priority: P2)

As a user managing notification preferences, I want toggles to respond immediately when I tap them, even before the server confirms, so the interface feels snappy.

**Why this priority**: Settings toggles are high-frequency interactions. 500-1000ms server round-trip makes the app feel sluggish. Optimistic updates provide instant feedback.

**Independent Test**: Toggle a notification setting — UI should update instantly. Disable network, toggle again — should still work (queued for sync).

**Acceptance Scenarios**:

1. **Given** user is on notification settings, **When** user toggles a setting, **Then** UI updates immediately without waiting for server
2. **Given** server request fails after optimistic update, **When** error response received, **Then** UI reverts to previous state with error toast
3. **Given** user is offline, **When** user toggles setting, **Then** change appears applied and syncs when connection returns

---

### User Story 4 - Certificate Display with Cache (Priority: P2)

As a user who has completed courses, I want my certificates to load instantly from cache when I view them, showing my achievements without delay.

**Why this priority**: Certificates represent accomplishments. Instant display enhances the reward experience. Currently uses deprecated hook.

**Independent Test**: View certificates screen, navigate away, return — certificates should appear instantly from cache.

**Acceptance Scenarios**:

1. **Given** user has earned certificates, **When** user navigates to certificates, **Then** certificates display from cache immediately
2. **Given** user views certificate detail, **When** user returns to list, **Then** list maintains state and position
3. **Given** user is offline, **When** user views certificates, **Then** cached certificates display (sharing disabled)

---

### User Story 5 - Seamless Infinite Scrolling (Priority: P3)

As a user scrolling through long lists (followers, transactions), I want content to load seamlessly as I scroll without "Load More" buttons, and already-loaded items should remain visible when scrolling back.

**Why this priority**: InfiniteScrollList component exists with query mode support. This story ensures consistent usage across all paginated lists.

**Independent Test**: Scroll through followers list — new items should load automatically near end. Scroll back up — all loaded items still visible.

**Acceptance Scenarios**:

1. **Given** user is viewing paginated list, **When** user scrolls near end, **Then** next page loads automatically
2. **Given** user has scrolled through multiple pages, **When** user scrolls back to top, **Then** all loaded items remain (no re-fetching)
3. **Given** page load fails mid-scroll, **When** user scrolls to that section, **Then** retry button appears for just that page

---

### Edge Cases

- What happens when cache is corrupted? → Clear cache and refetch from server on next access
- What happens when user is offline for extended period? → Show cached data with timestamp; display "Data may be outdated" warning if cache >1 hour old
- What happens when optimistic update conflicts with server state? → Server state wins, UI reverts with toast notification
- What happens during rapid toggle spam on settings? → Debounce mutations with 300ms interval, only send final state after pause

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Transaction list component MUST use `useInfiniteTransactions` hook instead of manual state management
- **FR-002**: Transaction detail component MUST use `useTransaction` hook for individual transaction data
- **FR-003**: Marketplace list component MUST use `useMarketplaceProperties` and `useMarketplaceClassifieds` hooks
- **FR-004**: Marketplace detail component MUST use `useMarketplaceProperty` or `useMarketplaceClassified` based on item type
- **FR-005**: Notification settings component MUST use `useNotificationSettings` and `useUpdateNotificationSettings` hooks
- **FR-006**: Certificate list component MUST use `useCertificates` hook, replacing deprecated patterns
- **FR-007**: All paginated lists MUST use `InfiniteScrollList` component in query mode where applicable
- **FR-008**: All screens MUST display offline indicator when showing cached data without network
- **FR-009**: Pull-to-refresh MUST be available on all list screens using `refetch` from query hooks
- **FR-010**: Error states MUST show retry button using `refetch` function from query hooks
- **FR-011**: Empty states in list components MUST display action-oriented prompts encouraging user engagement (e.g., "No transactions yet. Start shopping!"). Note: Detail views (TransactionDetail, MarketplaceDetail, NotificationSettings) do not require empty states as they are only shown when an item is selected.
- **FR-012**: Background refetch MUST show subtle loading indicator (spinner in header/pull area) while cached data remains visible
- **FR-013**: Mutations MUST invalidate related queries only (item detail + parent list), preserving unrelated cache
- **FR-014**: Each migrated component MUST pass manual testing checklist verifying: cache display, offline behavior, pull-to-refresh, and error handling

### Components to Update

| Component | Current Pattern | Target Hook | Priority |
|-----------|-----------------|-------------|----------|
| `app/transactions.tsx` | Thin wrapper, delegates to list | Already correct | - |
| `components/pages/transactions/TransactionList.tsx` | Uses useInfiniteTransactions | Already migrated | - |
| `components/pages/transactions/TransactionDetail.tsx` | useState/useEffect | useTransaction | P1 |
| `components/pages/marketplace/MarketplaceList.tsx` | Uses useInfiniteMarketplace* | Already migrated | - |
| `components/pages/marketplace/MarketplaceDetail.tsx` | useState/useEffect | useMarketplaceProperty, useMarketplaceClassified | P1 |
| `components/pages/settings/NotificationSettings.tsx` | useState only (no server sync) | useNotificationSettings, useUpdateNotificationSettings | P2 |
| `components/pages/learning/CertificateList.tsx` | Uses useCertificates | Already migrated | - |
| `components/shared/FollowLists.tsx` | Uses useFollowers/useFollowing | Already migrated | - |

### Key Entities

- **Query Hook**: Pre-built hooks in `core/hooks/queries/` that wrap TanStack Query with project defaults
- **Mutation Hook**: Hooks in `core/hooks/mutations/` with optimistic update support and error rollback
- **InfiniteScrollList**: Reusable component supporting both query mode and manual mode

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Cached data displays in <100ms on subsequent screen visits for transactions, marketplace, and certificates
- **SC-002**: Zero `useState`/`useEffect` data fetching patterns remain in migrated components
- **SC-003**: All list screens support pull-to-refresh using TanStack Query's refetch
- **SC-004**: Optimistic updates complete UI changes in <50ms for settings toggles
- **SC-005**: Users can browse previously loaded content when offline across all migrated screens
- **SC-006**: Infinite scroll maintains 60fps during pagination loads (no jank)

## Dependencies

- **Spec 020**: TanStack Query infrastructure (COMPLETED) — provides query client, keys, persistence, hooks
- **Existing Hooks**: All required query hooks already implemented in `core/hooks/queries/`
- **InfiniteScrollList**: Component already supports TanStack Query mode

## Clarifications

### Session 2025-11-30

- Q: How should empty states be displayed when user has zero items? → A: Show empty state with action prompt (e.g., "No transactions yet. Start shopping!")
- Q: What debounce interval for rapid toggle mutations? → A: 300ms debounce (balanced responsiveness and efficiency)
- Q: Should background refetch show loading indicator when cached data visible? → A: Subtle indicator (small spinner in header or pull-to-refresh area)
- Q: What cache invalidation scope after mutations? → A: Invalidate related queries (item detail + parent list)
- Q: How to verify each component is correctly migrated? → A: Manual testing checklist per component (cache, offline, refresh verified)

## Assumptions

- Query hooks in `core/hooks/queries/` are complete and tested
- API services return data in formats expected by query hooks
- InfiniteScrollList component's query mode is functional
- AsyncStorage persistence is working correctly

## Out of Scope

- Creating new query hooks (all needed hooks exist)
- Server-side changes (API contracts unchanged)
- Real-time WebSocket features
- New UI components (using existing components)
