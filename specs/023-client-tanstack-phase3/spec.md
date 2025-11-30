# Feature Specification: Client TanStack Query Migration Phase 3

**Feature Branch**: `023-client-tanstack-phase3`  
**Created**: 2025-01-21  
**Status**: Draft  
**Input**: User description: "Client TanStack Query Migration Phase 3 - Complete migration of remaining 8 route pages from useState/useEffect to TanStack Query with offline support, error boundaries, and optimistic updates"

**Target Routes**: achievements, badges, quests, dashboard, learning, marketplace, notifications, transactions (8 routes)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Pages Offline (Priority: P1)

As a user with intermittent connectivity, I want to view previously loaded page content when offline so that I can continue using the app without network access.

**Why this priority**: Offline support is the core differentiator for mobile apps. Users expect seamless experience regardless of connectivity status, especially for content they've already viewed.

**Independent Test**: Can be fully tested by loading any page while online, disconnecting network, and verifying the cached content remains visible with an offline indicator displayed.

**Acceptance Scenarios**:

1. **Given** I have previously loaded the Learning page, **When** I lose network connectivity, **Then** I can still see all my courses with an offline indicator displayed
2. **Given** I have previously loaded the Badges page, **When** I am offline, **Then** I can view my earned badges and available badges from cache
3. **Given** I have previously loaded the Achievements page, **When** I am offline, **Then** I can view my achievements list with stale data indicator
4. **Given** I have previously loaded the Dashboard, **When** I go offline, **Then** I can see my stats, recent activity, and progress from cached data
5. **Given** I have previously loaded my Quests, **When** I am offline, **Then** I can view my active and completed quests
6. **Given** I have previously loaded the Marketplace, **When** I am offline, **Then** I can browse available items from cache
7. **Given** I have previously loaded Transactions, **When** I am offline, **Then** I can view my transaction history
8. **Given** I have previously loaded Notifications, **When** I am offline, **Then** I can view cached notifications

---

### User Story 2 - Experience Consistent Loading States (Priority: P1)

As a user navigating the app, I want to see polished loading states (skeleton screens) instead of blank pages or spinners so that the app feels fast and professional.

**Why this priority**: Loading experience directly impacts perceived performance and user satisfaction. Skeleton screens reduce perceived wait time by up to 40%.

**Independent Test**: Can be fully tested by navigating to any page on slow network and verifying skeleton placeholders appear immediately.

**Acceptance Scenarios**:

1. **Given** I navigate to the Learning page, **When** data is loading, **Then** I see skeleton placeholders for course cards
2. **Given** I navigate to the Badges page, **When** data is loading, **Then** I see skeleton badge items
3. **Given** I navigate to the Achievements page, **When** data is loading, **Then** I see skeleton achievement items
4. **Given** I navigate to the Dashboard, **When** data is loading, **Then** I see skeleton cards for stats and activity
5. **Given** I navigate to any list page, **When** content is loading, **Then** the skeleton matches the actual content layout

---

### User Story 3 - Recover from Errors Gracefully (Priority: P1)

As a user who encounters an error, I want to see helpful error messages with retry options so that I can recover without restarting the app.

**Why this priority**: Error handling is critical for user trust. Poor error states cause user abandonment.

**Independent Test**: Can be fully tested by simulating API errors and verifying retry buttons function correctly.

**Acceptance Scenarios**:

1. **Given** the Learning page fails to load, **When** I see the error state, **Then** I see a clear message and retry button
2. **Given** I click retry on any error state, **When** the retry is triggered, **Then** the page attempts to reload the data
3. **Given** a background refresh fails, **When** I have cached data, **Then** I continue seeing cached data with a refresh failure notification
4. **Given** a network error occurs during mutation, **When** network restores, **Then** the mutation retries automatically

---

### User Story 4 - Interact with Instant Feedback (Priority: P2)

As a user performing actions, I want immediate visual feedback for my interactions so that I know my actions are registered before server confirmation.

**Why this priority**: Optimistic updates create snappy user experience and reduce perceived latency.

**Independent Test**: Can be fully tested by completing a quest/action and verifying UI updates immediately before server response.

**Acceptance Scenarios**:

1. **Given** I mark a quest as complete, **When** I tap complete, **Then** the quest immediately shows as completed before server confirms
2. **Given** I purchase an item in Marketplace, **When** I confirm purchase, **Then** my balance updates immediately
3. **Given** I mark a notification as read, **When** I interact with it, **Then** it immediately appears as read
4. **Given** an optimistic update fails on server, **When** server returns error, **Then** the UI rolls back to previous state with error message

---

### User Story 5 - Navigate with Fresh Data (Priority: P2)

As a user navigating between pages, I want to see fresh data without excessive loading so that I stay informed without delays.

**Why this priority**: Smart caching with appropriate stale times balances freshness with performance.

**Independent Test**: Can be fully tested by navigating back to a page and verifying data is fresh without unnecessary loading.

**Acceptance Scenarios**:

1. **Given** I return to Dashboard within 30 seconds, **When** data is still fresh, **Then** I see cached data without refetch
2. **Given** I return to Dashboard after 1 minute, **When** data is stale, **Then** data refetches in background while showing cached data
3. **Given** I pull to refresh on any page, **When** I trigger refresh, **Then** fresh data loads immediately
4. **Given** I switch between pages rapidly, **When** I navigate, **Then** no unnecessary network requests are made

---

### User Story 6 - Experience Smooth Infinite Scrolling (Priority: P2)

As a user browsing lists, I want to scroll through content smoothly with more items loading automatically so that I can browse without interruption.

**Why this priority**: Infinite scroll is expected behavior for mobile apps with list content.

**Independent Test**: Can be fully tested by scrolling to bottom of any list and verifying more items load automatically.

**Acceptance Scenarios**:

1. **Given** I scroll to the bottom of Notifications, **When** more items exist, **Then** next page loads automatically
2. **Given** I scroll to the bottom of Transactions, **When** more items exist, **Then** next page loads seamlessly
3. **Given** I reach the end of available items, **When** no more pages exist, **Then** I see "No more items" indicator
4. **Given** pagination fails, **When** I scroll, **Then** I see retry option for loading more

---

### Edge Cases

- What happens when user has never loaded a page (no cache) and is offline? → Show "No cached data available" with option to retry when online
- How does system handle rapid page navigation? → Cancel in-flight requests for abandoned pages, prioritize current page
- What happens when cached data is older than 24 hours? → Show stale indicator, attempt background refresh
- How does system handle partial data loads (some API fails, others succeed)? → Show available data with error indicator for failed sections
- What happens during app cold start with stale cache? → Load from cache immediately, background refresh

## Requirements *(mandatory)*

### Functional Requirements

#### Data Fetching Migration

- **FR-001**: System MUST migrate Learning page to use TanStack Query for all data fetching
- **FR-002**: System MUST migrate Badges page to use TanStack Query for badge data
- **FR-003**: System MUST migrate Achievements page to use TanStack Query for achievement data
- **FR-004**: System MUST migrate Dashboard to use TanStack Query for stats and activity data
- **FR-005**: System MUST migrate Quests page to use TanStack Query for quest data
- **FR-006**: System MUST migrate Marketplace components to use TanStack Query for items data
- **FR-007**: System MUST migrate Transactions list to use TanStack Query for transaction history
- **FR-008**: System MUST migrate Course list to use TanStack Query for course data
- **FR-009**: System MUST migrate Notifications list to use TanStack Query with infinite scroll

#### Offline Support

- **FR-010**: System MUST persist query cache to device storage using AsyncStorage with 24-hour garbage collection time
- **FR-011**: System MUST display offline indicator when device loses connectivity
- **FR-012**: System MUST display stale data indicator when showing cached data older than configured threshold
- **FR-013**: System MUST allow offline viewing of all previously cached content
- **FR-013a**: System MUST block mutations when offline and display "Requires internet connection" message

#### Loading States

- **FR-014**: System MUST display skeleton loading states while data loads
- **FR-015**: System MUST display empty states when no data exists
- **FR-016**: System MUST show placeholder content that matches actual content layout

#### Error Handling

- **FR-017**: System MUST display error states with retry functionality
- **FR-018**: System MUST provide error boundaries to prevent page crashes
- **FR-019**: System MUST retry failed requests 3 times with exponential backoff (1s, 2s, 4s delays)
- **FR-020**: System MUST show toast notifications for background refresh failures

#### Mutations & Optimistic Updates

- **FR-021**: System MUST provide optimistic updates for quest completion
- **FR-022**: System MUST provide optimistic updates for marketplace purchases
- **FR-023**: System MUST provide optimistic updates for notification read status
- **FR-024**: System MUST rollback optimistic updates on server error
- **FR-025**: System MUST invalidate related queries after successful mutations

#### Performance

- **FR-026**: System MUST implement tiered stale times: Dashboard (30s), Quests/Achievements (2min), Learning/Badges (5min), Notifications/Transactions (1min)
- **FR-027**: System MUST cancel abandoned queries when user navigates away
- **FR-028**: System MUST prefetch data for likely navigation targets
- **FR-029**: System MUST implement pagination with 20 items per page for all list views

### Key Entities

- **Course**: Learning content with title, description, progress, enrollment status
- **Badge**: Achievement markers with image, name, criteria, earned status
- **Achievement**: User accomplishments with title, description, unlock date
- **Quest**: Gamified tasks with title, objectives, completion status, rewards
- **MarketplaceItem**: Purchasable items with name, price, availability
- **Transaction**: Financial/point history with type, amount, timestamp
- **Notification**: User alerts with title, body, read status, timestamp
- **DashboardStats**: Aggregated metrics for user overview

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All 9 target pages load successfully without useState/useEffect for API data
- **SC-002**: Users can view cached content on all pages while offline
- **SC-003**: Page navigation feels instant (cached data appears in under 100ms)
- **SC-004**: Error recovery rate improves - users can retry and succeed on 90% of transient errors
- **SC-005**: Loading states provide visual feedback within 16ms of navigation
- **SC-006**: Optimistic updates show visual change within 50ms of user action
- **SC-007**: Background refreshes complete without disrupting user interaction
- **SC-008**: App maintains responsiveness during data fetching (no UI freezes)
- **SC-009**: All mutations properly invalidate related queries on success
- **SC-010**: Infinite scroll loads next page before user reaches end of current content

## Clarifications

### Session 2025-01-21

- Q: What should be the stale time configuration for different data types? → A: Tiered approach - Dashboard: 30s, Quests/Achievements: 2min, Learning/Badges: 5min, Notifications/Transactions: 1min
- Q: Should mutations be queued for offline execution or blocked? → A: Block mutations when offline with clear "Requires internet connection" message
- Q: What is the page size for paginated lists? → A: 20 items per page
- Q: How should the system handle retry attempts for failed API requests? → A: 3 retries with exponential backoff (1s, 2s, 4s delays)
- Q: How long should the garbage collection time be for cached query data? → A: 24 hours

## Assumptions

1. Existing TanStack Query infrastructure from Phase 2 (query client, persister, query keys factory) is stable and reusable
2. Backend APIs for all target pages are already implemented and functioning
3. Existing shared components (ErrorState, OfflineIndicator, StaleDataIndicator) from Phase 2 can be reused
4. Device storage (AsyncStorage) has sufficient space for cache persistence
5. Network detection utilities from Phase 2 are available and accurate
